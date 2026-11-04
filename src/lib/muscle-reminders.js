import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { MUSCLE_NOTIFICATION_BASE, muscleReminderPlan, muscleSettings } from '../domain/muscles';

let status = { permission: Capacitor.isNativePlatform() ? 'unknown' : 'web', count: 0 };
const listeners = new Set();
export const reminderStatus = () => status;
export function watchReminderStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function report(next) {
  status = next;
  for (const listener of listeners) listener(next);
}

export async function requestMuscleReminderPermission() {
  if (!Capacitor.isNativePlatform())
    throw new Error(
      'Background reminders are available in the Android APK. The web app shows your weekly gaps while open.',
    );
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const result = await LocalNotifications.requestPermissions();
  if (result.display !== 'granted')
    throw new Error(
      'Notifications are blocked. Allow them in Android app settings, then enable reminders again.',
    );
}

// Only owned reminder IDs are cancelled. Other app notifications are left alone.
export async function reconcileMuscleReminders(plugin, state, mode, now = new Date()) {
  const pending = await plugin.getPending();
  const owned = pending.notifications
    .filter(({ id }) => id > MUSCLE_NOTIFICATION_BASE && id <= MUSCLE_NOTIFICATION_BASE + 28)
    .map(({ id }) => ({ id }));
  if (owned.length) await plugin.cancel({ notifications: owned });
  if (mode !== 'personal' || !state?.profile || !muscleSettings(state).reminder.enabled)
    return { permission: 'off', count: 0 };
  const permission = await plugin.checkPermissions();
  if (permission.display !== 'granted') return { permission: permission.display, count: 0 };
  const notifications = muscleReminderPlan(state, now);
  if (notifications.length) {
    await plugin.createChannel({
      id: 'weekly-muscles',
      name: 'Weekly muscle reminders',
      description: 'Check unfinished weekly muscle targets in your saved records.',
      importance: 3,
      visibility: -1,
    });
    await plugin.schedule({ notifications });
  }
  return {
    permission: 'granted',
    count: notifications.length,
    through: notifications.at(-1)?.schedule.at,
  };
}

let queue = Promise.resolve();
function refresh(state, mode) {
  if (!Capacitor.isNativePlatform()) return;
  queue = queue
    .catch(() => {})
    .then(async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        report(await reconcileMuscleReminders(LocalNotifications, state, mode));
      } catch (error) {
        report({
          permission: 'error',
          count: 0,
          error: `Android reminders could not be updated: ${error.message}`,
        });
      }
    });
}

export function useMuscleReminders(state, mode) {
  useEffect(() => {
    const update = () => refresh(state, mode);
    const timer = setTimeout(update, 250);
    const tick = setInterval(update, 60 * 60 * 1000);
    const visible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', visible);
    let dispose;
    let closed = false;
    if (Capacitor.isNativePlatform())
      import('@capacitor/local-notifications')
        .then(async ({ LocalNotifications }) => {
          const handle = await LocalNotifications.addListener(
            'localNotificationActionPerformed',
            ({ notification }) => {
              if (notification.extra?.kind !== 'weekly-muscles') return;
              window.location.hash = '/';
              setTimeout(
                () => document.getElementById('weekly-muscles')?.scrollIntoView({ block: 'start' }),
                250,
              );
            },
          );
          dispose = () => handle.remove();
          if (closed) dispose();
        })
        .catch((error) => report({ permission: 'error', count: 0, error: error.message }));
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', visible);
      dispose?.();
    };
  }, [state, mode]);
}
