import { useState } from 'react';
import { trainingOptions } from '../data/exercises';
import { useJournal } from '../lib/store';
import { Button, Field, FormError, Modal, SaveButton, useTask } from './ui';
import { uid } from '../domain/dates';

export const weekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function ScheduleFields({ value, onChange }) {
  return (
    <div className="stack schedule-fields">
      <Field label="Training days per week">
        <select
          value={value.trainingDays}
          onChange={(event) => {
            const option = trainingOptions.find((item) => item.days === Number(event.target.value));
            onChange({ ...value, trainingDays: option.days, weekdays: [...option.weekdays] });
          }}
        >
          {trainingOptions.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <details className="optional-section">
        <summary>
          Change which days <span>{value.weekdays.map((day) => weekNames[day]).join(', ')}</span>
        </summary>
        <Field
          label="Your training days"
          hint={`Choose ${value.trainingDays} days. Your exercise split is entirely your choice.`}
        >
          <div className="day-picker">
            {weekNames.map((name, day) => (
              <button
                key={name}
                type="button"
                aria-pressed={value.weekdays.includes(day)}
                className={value.weekdays.includes(day) ? 'selected' : ''}
                onClick={() =>
                  onChange({
                    ...value,
                    weekdays: value.weekdays.includes(day)
                      ? value.weekdays.filter((item) => item !== day)
                      : [...value.weekdays, day],
                  })
                }
              >
                {name}
              </button>
            ))}
          </div>
        </Field>
      </details>
    </div>
  );
}
export default function PlanSettings({ onClose }) {
  const { state, change } = useJournal();
  const task = useTask();
  const [value, setValue] = useState({
    trainingDays: state.profile.trainingDays,
    weekdays: [...state.profile.weekdays],
  });
  const [slots, setSlots] = useState(() =>
    (state.weeklySchedule || []).map((slot) => ({ ...slot })),
  );
  return (
    <Modal title="Your weekly plan" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          task.run(async () => {
            if (!slots.length && value.weekdays.length !== value.trainingDays)
              throw new Error(`Choose exactly ${value.trainingDays} days.`);
            if (slots.some((slot) => !slot.name.trim()))
              throw new Error('Name each planned workout.');
            await change((draft) => {
              const days = slots.length
                ? [...new Set(slots.map((slot) => slot.weekday))].sort()
                : value.weekdays;
              draft.profile.trainingDays = days.length;
              draft.profile.weekdays = days;
              draft.weeklySchedule = slots.map((slot) => ({ ...slot, name: slot.name.trim() }));
            });
            onClose();
          });
        }}
      >
        <p className="muted">
          Make your own split: upper/lower, push/pull, legs, or anything you name. Two days does not
          mean full body. You can plan more than one workout on the same day.
        </p>
        <ScheduleFields value={value} onChange={setValue} />
        <h3>Your weekly workouts</h3>
        <p className="fine-print">
          Optional. Filled workout slots set your planned training days. They never block an extra
          session on another day.
        </p>
        {slots.map((slot, index) => (
          <div className="plan-slot stack" key={slot.id}>
            <div className="form-grid">
              <Field label={`Workout ${index + 1} day`}>
                <select
                  value={slot.weekday}
                  onChange={(event) =>
                    setSlots((previous) =>
                      previous.map((item) =>
                        item.id === slot.id
                          ? { ...item, weekday: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                >
                  {weekNames.map((name, day) => (
                    <option key={name} value={day}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Workout ${index + 1} name`}>
                <input
                  maxLength={100}
                  required
                  value={slot.name}
                  onChange={(event) =>
                    setSlots((previous) =>
                      previous.map((item) =>
                        item.id === slot.id ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Upper body, Lower body, Evening pull…"
                />
              </Field>
            </div>
            <Field label={`Workout ${index + 1} saved routine`}>
              <select
                value={slot.templateId || ''}
                onChange={(event) => {
                  const template = state.workoutTemplates?.find(
                    (item) => item.id === event.target.value,
                  );
                  setSlots((previous) =>
                    previous.map((item) =>
                      item.id === slot.id
                        ? {
                            ...item,
                            templateId: template?.id || null,
                            name: template?.name || item.name,
                          }
                        : item,
                    ),
                  );
                }}
              >
                <option value="">Choose exercises on the day</option>
                {state.workoutTemplates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSlots((previous) => previous.filter((item) => item.id !== slot.id))}
            >
              Remove planned workout {index + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={slots.length >= 70}
          onClick={() =>
            setSlots((previous) => [
              ...previous,
              { id: uid(), weekday: value.weekdays[0] ?? 1, name: 'My workout', templateId: null },
            ])
          }
        >
          Add planned workout
        </Button>
        {state.sessions.some((s) => s.status === 'active') && (
          <p className="notice">
            Your current workout is kept. The new schedule applies to your next workout.
          </p>
        )}
        <FormError error={task.error} />
        <SaveButton busy={task.busy}>Use this plan</SaveButton>
      </form>
    </Modal>
  );
}
