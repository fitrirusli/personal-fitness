import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Bell, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useJournal } from '../lib/store';
import { dayKey, dateLabel, shiftDay } from '../domain/dates';
import { getExercise } from '../domain/exercises';
import { muscleGroups, homeEquipmentOptions } from '../data/muscles';
import {
  muscleSettings,
  weeklyMuscles,
  muscleSuggestions,
  validateMuscleSettings,
} from '../domain/muscles';
import {
  reminderStatus,
  watchReminderStatus,
  requestMuscleReminderPermission,
} from '../lib/muscle-reminders';
import { Button, Card, Field, FormError, Modal, SaveButton, Tag, useTask } from './ui';
import WorkoutBuilder from './WorkoutBuilder';

function WeeklySettings({ onClose }) {
  const { state, mode, change } = useJournal();
  const [form, setForm] = useState(() => muscleSettings(state));
  const [mappings, setMappings] = useState({});
  const [exerciseId, setExerciseId] = useState(state.customExercises?.[0]?.id || '');
  const task = useTask();
  const native = Capacitor.isNativePlatform();
  const selectedMapping =
    mappings[exerciseId] || getExercise(state, exerciseId)?.primaryMuscles || [];
  const reminder = (key, value) =>
    setForm((previous) => ({ ...previous, reminder: { ...previous.reminder, [key]: value } }));
  return (
    <Modal title="Weekly muscle targets" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          task.run(async () => {
            validateMuscleSettings(form);
            if (form.reminder.enabled && mode !== 'personal')
              throw new Error('Use your personal journal to enable Android reminders.');
            if (form.reminder.enabled && native) await requestMuscleReminderPermission();
            await change((draft) => {
              draft.muscleSettings = form;
              for (const exercise of draft.customExercises || [])
                if (Object.hasOwn(mappings, exercise.id))
                  exercise.primaryMuscles = mappings[exercise.id];
            });
            onClose();
          });
        }}
      >
        <p className="muted">
          Choose how many separate days you want to train each group, Monday–Sunday. One completed
          working set counts as a direct day; this does not measure whether training volume is
          sufficient.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setForm((previous) => ({
              ...previous,
              targets: Object.fromEntries(muscleGroups.map(({ id }) => [id, 2])),
            }))
          }
        >
          Set all groups to 2 days
        </Button>
        <div className="muscle-target-fields">
          {muscleGroups.map((group) => (
            <Field key={group.id} label={`${group.label} days / week`}>
              <select
                value={form.targets[group.id]}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    targets: { ...previous.targets, [group.id]: Number(event.target.value) },
                  }))
                }
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <option key={value} value={value}>
                    {value === 0 ? 'Off' : `${value} ${value === 1 ? 'day' : 'days'}`}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
        <fieldset className="muscle-checks">
          <legend>Equipment available at home</legend>
          {homeEquipmentOptions.map((item) => (
            <label className="checkbox" key={item}>
              <input
                type="checkbox"
                checked={form.homeEquipment.includes(item)}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    homeEquipment: event.target.checked
                      ? [...previous.homeEquipment, item]
                      : previous.homeEquipment.filter((value) => value !== item),
                  }))
                }
              />
              {item}
            </label>
          ))}
        </fieldset>
        {!!state.customExercises?.length && (
          <details className="optional-section">
            <summary>
              Map my own exercises <span>Unknown groups do not count automatically</span>
            </summary>
            <Field label="Personal exercise to map">
              <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
                {state.customExercises.map((exercise) => (
                  <option value={exercise.id} key={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset className="muscle-checks">
              <legend>Direct muscle groups</legend>
              {muscleGroups.map((group) => (
                <label className="checkbox" key={group.id}>
                  <input
                    type="checkbox"
                    checked={selectedMapping.includes(group.id)}
                    onChange={(event) =>
                      setMappings((previous) => ({
                        ...previous,
                        [exerciseId]: event.target.checked
                          ? [...selectedMapping, group.id]
                          : selectedMapping.filter((id) => id !== group.id),
                      }))
                    }
                  />
                  {group.label}
                </label>
              ))}
            </fieldset>
          </details>
        )}
        <div className="reminder-settings stack">
          <h3>
            <Bell size={18} /> Weekly reminders
          </h3>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.reminder.enabled}
              disabled={(!native && !form.reminder.enabled) || mode !== 'personal'}
              onChange={(event) => reminder('enabled', event.target.checked)}
            />
            Remind me when weekly muscle targets are incomplete
          </label>
          <p className="fine-print">
            {native
              ? 'Android asks for notification permission when you save. Reminders use saved records and are cancelled for a week when all enabled targets are met.'
              : 'Background notifications work in the Android APK. This web app shows gaps while open; it cannot notify after the browser closes.'}
          </p>
          <fieldset className="muscle-checks">
            <legend>Reminder days</legend>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
              <label className="checkbox" key={label}>
                <input
                  type="checkbox"
                  checked={form.reminder.days.includes(index)}
                  onChange={(event) =>
                    reminder(
                      'days',
                      event.target.checked
                        ? [...form.reminder.days, index]
                        : form.reminder.days.filter((day) => day !== index),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <Field label="Reminder time (Malaysia / Singapore)">
            <input
              type="time"
              required
              value={form.reminder.time}
              onChange={(event) => reminder('time', event.target.value)}
            />
          </Field>
          <small>
            Schedules cover the next 28 days and refresh when you open or use the app. Android may
            delay delivery. A reminder is a check-in, not an instruction to train through pain or
            catch up all at once.
          </small>
        </div>
        <FormError error={task.error} />
        <SaveButton busy={task.busy}>Save weekly targets</SaveButton>
      </form>
    </Modal>
  );
}

export default function WeeklyMuscles() {
  const { state, mode } = useJournal();
  const navigate = useNavigate();
  const [today, setToday] = useState(dayKey());
  const [weekOffset, setWeekOffset] = useState(0);
  const [location, setLocation] = useState('gym');
  const [focus, setFocus] = useState('all');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(reminderStatus);
  useEffect(() => {
    const timer = setInterval(() => setToday(dayKey()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => watchReminderStatus(setStatus), []);
  const coverage = weeklyMuscles(state, shiftDay(today, weekOffset * 7), today);
  const enabled = coverage.rows.filter((row) => row.target > 0);
  const gaps = enabled.filter((row) => row.remaining > 0);
  const effectiveFocus = gaps.some((row) => row.id === focus) ? focus : 'all';
  const suggestions = muscleSuggestions(state, location, today, effectiveFocus);
  const active = state.sessions.find((session) => session.status === 'active');
  const choices = suggestions.choices.filter(
    ({ exercise }) => !active?.exercises.some((entry) => entry.exerciseId === exercise.id),
  );
  const settings = muscleSettings(state);
  return (
    <>
      <div id="weekly-muscles">
        <Card className="weekly-muscles">
          <div className="section-head">
            <div>
              <p className="eyebrow">WEEKLY MUSCLE CHECK</p>
              <h2>What still needs attention?</h2>
            </div>
            <Button variant="secondary" onClick={() => setModal('settings')}>
              Targets & reminders
            </Button>
          </div>
          <div className="week-controls">
            <button
              className="icon-btn"
              aria-label="Previous muscle week"
              onClick={() => setWeekOffset((value) => value - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong>
              {dateLabel(coverage.days[0])} – {dateLabel(coverage.days[6])}
            </strong>
            <button
              className="icon-btn"
              aria-label="Next muscle week"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((value) => Math.min(0, value + 1))}
            >
              <ChevronRight size={18} />
            </button>
            {weekOffset !== 0 && (
              <button className="text-btn" onClick={() => setWeekOffset(0)}>
                This week
              </button>
            )}
          </div>
          <p className="muscle-summary" role="status">
            {!enabled.length
              ? 'Weekly targets are off.'
              : gaps.length
                ? `${gaps.length} of ${enabled.length} groups below your chosen target${weekOffset === 0 ? ' so far' : ''}.`
                : 'All enabled weekly targets reached in your saved records.'}
          </p>
          <div className="muscle-grid">
            {coverage.rows.map((row) => (
              <button
                className={`muscle-row ${row.target > 0 && !row.remaining ? 'reached' : ''}`}
                key={row.id}
                onClick={() => setSelected(row)}
                aria-label={`${row.label}: ${row.count} of ${row.target} direct days`}
              >
                <span>
                  <strong>{row.label}</strong>
                  {row.target > 0 && !row.remaining && <Check size={15} />}
                </span>
                <b>
                  {row.count}
                  <small> / {row.target || 'off'} days</small>
                </b>
                <small>
                  {row.sets} working sets ·{' '}
                  {row.remaining
                    ? `${row.remaining} ${row.remaining === 1 ? 'day' : 'days'} left`
                    : row.target
                      ? 'Target reached'
                      : 'Not targeted'}
                </small>
                {!!row.secondaryDates.length && (
                  <small>
                    Also assisted on {row.secondaryDates.length}{' '}
                    {row.secondaryDates.length === 1 ? 'day' : 'days'}
                  </small>
                )}
              </button>
            ))}
          </div>
          <p className="fine-print">
            Direct work only · one day counts once, even across gym and home · completed workouts
            only. Tap a group for evidence. Warm-ups and plans alone do not count.
          </p>
          {!!coverage.unknown.length && (
            <p className="notice">
              {coverage.unknown.length} logged personal{' '}
              {coverage.unknown.length === 1 ? 'exercise has' : 'exercises have'} no muscle mapping.
              Map them in Targets & reminders so they can count.
            </p>
          )}
          {weekOffset === 0 && !!gaps.length && (
            <details className="optional-section muscle-suggestions" open>
              <summary>
                Ideas for your next workout <span>Choose what suits you</span>
              </summary>
              <Field label="Suggestion location">
                <select value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="gym">Gym</option>
                  <option value="home">Home · my available equipment</option>
                </select>
              </Field>
              <Field label="Muscle to focus">
                <select value={effectiveFocus} onChange={(event) => setFocus(event.target.value)}>
                  <option value="all">Any group below target</option>
                  {gaps.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label} · {row.remaining} days left
                    </option>
                  ))}
                </select>
              </Field>
              {suggestions.hold ? (
                <p className="notice">{suggestions.hold}</p>
              ) : (
                <>
                  <p className="fine-print">
                    Options for groups below target that were not directly trained today or
                    yesterday. This spacing check does not establish full recovery. Review how you
                    feel and choose your own sets and load.
                  </p>
                  {choices.slice(0, 3).map(({ exercise, targets }) => (
                    <div className="muscle-suggestion" key={exercise.id}>
                      <div>
                        <strong>{exercise.name}</strong>
                        <small>
                          {targets.map((row) => row.label).join(' + ')} · {exercise.equipment}
                        </small>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setModal({ exerciseId: exercise.id })}
                      >
                        {active ? 'Add to workout' : 'Choose exercise'}
                      </Button>
                    </div>
                  ))}
                  {!choices.length && (
                    <p>
                      No matching exercise is available with these settings and recovery checks.
                      Adjust home equipment, map a personal exercise, or review another day.
                    </p>
                  )}
                  {location === 'home' && (
                    <p className="fine-print">
                      Available: {settings.homeEquipment.join(', ') || 'none selected'}. Some groups
                      need equipment or a suitable personal exercise. Edit this in Targets &
                      reminders.
                    </p>
                  )}
                </>
              )}
            </details>
          )}
          <div className="muscle-reminder-status">
            <Bell size={15} />
            <small>
              {mode === 'demo'
                ? 'Demo mode · Android reminders paused.'
                : status.error ||
                  (settings.reminder.enabled
                    ? status.permission === 'granted'
                      ? `${status.count} Android reminders scheduled. Rechecked after records change.`
                      : status.permission === 'web'
                        ? 'Android reminders are enabled in your settings; use the APK for delivery.'
                        : 'Android notification permission or scheduling needs review. Open Targets & reminders.'
                    : 'Android reminders are off. Enable them in Targets & reminders.')}
            </small>
          </div>
        </Card>
      </div>
      {modal === 'settings' && <WeeklySettings onClose={() => setModal(null)} />}
      {modal?.exerciseId && (
        <WorkoutBuilder
          initialExerciseIds={[modal.exerciseId]}
          initialLocation={location}
          session={active}
          onClose={() => setModal(null)}
          onStarted={() => navigate('/train')}
        />
      )}
      {selected && (
        <Modal title={`${selected.label} · recorded muscle work`} onClose={() => setSelected(null)}>
          <div className="stack">
            <p>
              {selected.count} direct days / {selected.target || 'off'} target · {selected.sets}{' '}
              working sets.
            </p>
            {selected.evidence.length ? (
              selected.evidence.map((entry, index) => (
                <div className="notice" key={index}>
                  <strong>{entry.name}</strong>
                  <span>
                    {dateLabel(entry.date)} ·{' '}
                    {entry.location === 'unspecified' ? 'Location not recorded' : entry.location} ·{' '}
                    {entry.sets} working sets{entry.pain ? ' · Pain reported; review activity' : ''}
                  </span>
                </div>
              ))
            ) : (
              <p>No completed direct working sets recorded for this group in this week.</p>
            )}
            <p className="fine-print">
              Secondary assistance:{' '}
              {selected.secondaryDates.map((date) => dateLabel(date)).join(', ') || 'none recorded'}
              . Assistance is shown separately, without converting it into direct sets. These are
              broad tracking categories, not measurements of muscle activation or recovery.
            </p>
            <Tag>Monday–Sunday · Malaysia / Singapore</Tag>
          </div>
        </Modal>
      )}
    </>
  );
}
