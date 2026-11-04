import { describe, expect, it, vi } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { muscleGroups } from '../../src/data/muscles';
import { createCustomSession, logSet, completeSession } from '../../src/domain/training';
import {
  muscleSettings,
  weeklyMuscles,
  muscleSuggestions,
  muscleReminderPlan,
  MUSCLE_NOTIFICATION_BASE,
} from '../../src/domain/muscles';
import { reconcileMuscleReminders } from '../../src/lib/muscle-reminders';
import { validateJournal } from '../../src/lib/journal';
import { encodeBackup, decodeBackup } from '../../src/lib/backup';
import { getExercise } from '../../src/domain/exercises';

const monday = '2026-11-02';
const wednesday = '2026-11-04';
const now = new Date('2026-11-04T12:00:00+08:00');
function journal() {
  const state = demoJournal();
  state.sessions = [];
  state.checkins = {};
  state.muscleSettings = muscleSettings(state);
  return state;
}
function record(
  state,
  date,
  exerciseIds,
  { location = 'gym', warmup = false, finish = true } = {},
) {
  const session = createCustomSession(
    state,
    {
      name: 'Recorded test workout',
      location,
      exercises: exerciseIds.map((exerciseId) => ({ exerciseId, sets: 2, reps: 8, weightKg: 0 })),
    },
    date,
  );
  state.sessions.push(session);
  for (const entry of session.exercises) {
    logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 0, reps: 8, rir: 2 });
    entry.sets[0].warmup = warmup;
  }
  if (finish && !warmup) completeSession(state, session.id);
  return session;
}
const row = (state, id, date = wednesday) =>
  weeklyMuscles(state, date, date).rows.find((group) => group.id === id);
function onlyChest(state, target = 2) {
  state.muscleSettings.targets = Object.fromEntries(
    muscleGroups.map(({ id }) => [id, id === 'chest' ? target : 0]),
  );
}

describe('weekly direct muscle coverage', () => {
  it('deduplicates training dates across gym and home, while retaining sets and evidence', () => {
    const state = journal();
    record(state, monday, ['bench-press']);
    record(state, monday, ['home-pushup'], { location: 'home' });
    expect(row(state, 'chest')).toMatchObject({ count: 1, sets: 2, remaining: 1 });
    record(state, wednesday, ['home-pushup'], { location: 'home' });
    expect(row(state, 'chest')).toMatchObject({ count: 2, sets: 3, remaining: 0 });
    expect(row(state, 'chest').evidence.map((item) => item.location)).toEqual([
      'gym',
      'home',
      'home',
    ]);
    expect(row(state, 'triceps')).toMatchObject({ count: 0, sets: 0 });
    expect(row(state, 'triceps').secondaryDates).toHaveLength(2);
  });
  it('does not count plans, active workouts, warmups, previous weeks or future dates', () => {
    const state = journal();
    record(state, '2026-11-01', ['bench-press']);
    record(state, '2026-11-05', ['bench-press']);
    const warmup = record(state, monday, ['bench-press'], { warmup: true });
    warmup.status = 'completed';
    warmup.completedAt = now.toISOString();
    record(state, wednesday, ['bench-press'], { finish: false });
    expect(row(state, 'chest')).toMatchObject({ count: 0, sets: 0 });
  });
  it('shows unmapped personal exercises, then applies an explicit map and restores it with targets', async () => {
    const state = journal();
    state.customExercises = [
      {
        ...getExercise(state, 'home-pushup'),
        id: 'custom-floor-press',
        name: 'My floor press',
        primaryMuscles: [],
      },
    ];
    record(state, monday, ['custom-floor-press'], { location: 'home' });
    expect(weeklyMuscles(state, wednesday, wednesday).unknown).toEqual(['custom-floor-press']);
    expect(row(state, 'chest').count).toBe(0);
    state.customExercises[0].primaryMuscles = ['chest'];
    onlyChest(state, 1);
    expect(row(state, 'chest')).toMatchObject({ count: 1, remaining: 0 });
    const restored = await decodeBackup(
      await encodeBackup(state, 'muscle-test-password'),
      'muscle-test-password',
    );
    expect(row(restored, 'chest')).toMatchObject({ count: 1, target: 1 });
    expect(validateJournal(restored)).toBe(restored);
  });
  it('accepts old journals and rejects invalid settings, mappings and locations', () => {
    const state = journal();
    delete state.muscleSettings;
    expect(validateJournal(state)).toBe(state);
    expect(muscleSettings(state).targets.chest).toBe(2);
    state.muscleSettings = muscleSettings(state);
    state.muscleSettings.targets.chest = -1;
    expect(() => validateJournal(state)).toThrow();
    state.muscleSettings.targets.chest = 2;
    state.muscleSettings.reminder.time = '25:00';
    expect(() => validateJournal(state)).toThrow();
    state.muscleSettings.reminder.time = '20:00';
    state.customExercises = [
      { ...getExercise(state, 'home-squat'), id: 'custom-test', primaryMuscles: ['mystery'] },
    ];
    expect(() => validateJournal(state)).toThrow();
    state.customExercises = [];
    const session = record(state, monday, ['home-squat']);
    session.location = 'invalid';
    expect(() => validateJournal(state)).toThrow();
  });
  it('keeps historical weeks separate and resets coverage on Monday', () => {
    const state = journal();
    record(state, '2026-11-01', ['bench-press']);
    expect(row(state, 'chest', monday).count).toBe(0);
    expect(
      weeklyMuscles(state, '2026-11-01', monday).rows.find((group) => group.id === 'chest').count,
    ).toBe(1);
  });
});

describe('equipment and recovery-aware choices', () => {
  it('offers several muscle groups before repeated alternatives for the same group', () => {
    const choices = muscleSuggestions(journal(), 'gym', wednesday).choices.slice(0, 3);
    expect(
      new Set(choices.flatMap((choice) => choice.targets.map((group) => group.id))).size,
    ).toBeGreaterThanOrEqual(4);
  });
  it('uses selected home equipment, unmet targets, and direct muscle mappings', () => {
    const state = journal();
    onlyChest(state);
    const choices = muscleSuggestions(state, 'home', wednesday).choices;
    expect(choices.map((item) => item.exercise.id)).toEqual(['home-pushup']);
    expect(choices[0].targets[0].id).toBe('chest');
    expect(muscleSuggestions(state, 'home', wednesday, 'back').choices).toHaveLength(0);
    record(state, monday, ['home-pushup']);
    state.muscleSettings.targets.chest = 1;
    expect(muscleSuggestions(state, 'home', wednesday).choices).toHaveLength(0);
  });
  it('holds choices for poor readiness, pain, or direct work yesterday across the week boundary', () => {
    const state = journal();
    onlyChest(state);
    record(state, '2026-11-01', ['bench-press']);
    expect(muscleSuggestions(state, 'home', monday).choices).toHaveLength(0);
    state.checkins[wednesday] = { pain: true };
    expect(muscleSuggestions(state, 'home', wednesday).hold).toBeTruthy();
    state.checkins = {};
    state.sessions[0].exercises[0].pain = true;
    expect(
      muscleSuggestions(state, 'gym', wednesday).choices.some(
        (choice) => choice.exercise.id === 'bench-press',
      ),
    ).toBe(false);
  });
});

describe('local muscle reminders', () => {
  it('schedules only future selected times, rolls weeks, and removes a met week without suppressing next week', () => {
    const state = journal();
    onlyChest(state);
    expect(muscleReminderPlan(state, now)).toEqual([]);
    state.muscleSettings.reminder.enabled = true;
    const before = muscleReminderPlan(state, now);
    expect(before).toHaveLength(8);
    expect(before[0].schedule.at.toISOString()).toBe('2026-11-05T12:00:00.000Z');
    record(state, monday, ['bench-press']);
    record(state, wednesday, ['home-pushup']);
    const after = muscleReminderPlan(state, now);
    expect(after).toHaveLength(6);
    expect(after.every((notification) => notification.extra.week !== monday)).toBe(true);
    onlyChest(state, 0);
    expect(muscleReminderPlan(state, now)).toEqual([]);
  });
  it('cancels only owned reminders and never schedules in demo or with denied permission', async () => {
    const state = journal();
    state.muscleSettings.reminder.enabled = true;
    const plugin = {
      getPending: vi
        .fn()
        .mockResolvedValue({ notifications: [{ id: MUSCLE_NOTIFICATION_BASE + 1 }, { id: 7 }] }),
      cancel: vi.fn(),
      checkPermissions: vi.fn().mockResolvedValue({ display: 'denied' }),
      createChannel: vi.fn(),
      schedule: vi.fn(),
    };
    expect(await reconcileMuscleReminders(plugin, state, 'personal', now)).toEqual({
      permission: 'denied',
      count: 0,
    });
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: MUSCLE_NOTIFICATION_BASE + 1 }],
    });
    expect(plugin.schedule).not.toHaveBeenCalled();
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    expect((await reconcileMuscleReminders(plugin, state, 'demo', now)).count).toBe(0);
    expect(plugin.schedule).not.toHaveBeenCalled();
    const result = await reconcileMuscleReminders(plugin, state, 'personal', now);
    expect(result.count).toBe(8);
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });
});
