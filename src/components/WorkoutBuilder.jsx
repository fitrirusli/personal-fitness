import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Search, X } from 'lucide-react';
import { useJournal } from '../lib/store';
import { allExercises, getExercise, validateExercise, workoutTypes } from '../domain/exercises';
import {
  addSessionExercises,
  createCustomSession,
  exerciseHistory,
  recommendExercise,
} from '../domain/training';
import { uid } from '../domain/dates';
import { muscleGroups, homeEquipmentOptions } from '../data/muscles';
import { Button, Field, FormError, Modal, SaveButton, Tag, useTask } from './ui';
import LoadInput from './LoadInput';
import { fromKg } from '../domain/loads';

export default function WorkoutBuilder({
  onClose,
  onStarted,
  session,
  initialType = 'full',
  repeat,
  template,
  initialExerciseIds = [],
  initialLocation = 'gym',
}) {
  const { state, change } = useJournal();
  const targets = useRef(null);
  const task = useTask();
  const [dayType, setDayType] = useState(template?.dayType || initialType);
  const [name, setName] = useState(
    template
      ? template.name
      : repeat
        ? `${repeat.name}`
        : workoutTypes.find((item) => item.id === initialType)?.label || 'My workout',
  );
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [newExercise, setNewExercise] = useState(null);
  const [location, setLocation] = useState(
    session?.location || template?.location || repeat?.location || initialLocation,
  );
  const [selected, setSelected] = useState(() =>
    template
      ? template.exerciseChoices.map((choice) => ({ ...choice }))
      : repeat
        ? repeat.exercises
            .filter(
              (entry) => !entry.skipped || entry.sets.some((set) => set.completed && !set.warmup),
            )
            .map((entry) => {
              const work = entry.sets.filter((set) => set.completed && !set.warmup);
              const exercise = getExercise(state, entry.exerciseId);
              return {
                exerciseId: entry.exerciseId,
                sets: work.length || exercise.sets,
                reps: work.at(-1)?.reps || entry.plan.targetReps || exercise.reps[0],
                weightKg: work.at(-1)?.weightKg ?? entry.plan.weightKg ?? '',
                ...(work.at(-1)?.inputUnit
                  ? { inputUnit: work.at(-1).inputUnit, inputWeight: work.at(-1).inputWeight }
                  : {}),
              };
            })
        : initialExerciseIds.map(choiceFor),
  );
  const type = workoutTypes.find((item) => item.id === dayType);
  const available = allExercises(state).filter(
    (exercise) =>
      (!session || !session.exercises.some((entry) => entry.exerciseId === exercise.id)) &&
      (showAll || location !== 'home' || homeEquipmentOptions.includes(exercise.equipment)) &&
      (!query.trim()
        ? showAll ||
          !type?.patterns ||
          type.patterns.includes(exercise.pattern) ||
          exercise.pattern === 'custom'
        : `${exercise.name} ${exercise.muscle}`.toLowerCase().includes(query.toLowerCase().trim())),
  );
  const choose = (exercise) => {
    if (selected.some((entry) => entry.exerciseId === exercise.id)) {
      setSelected(selected.filter((entry) => entry.exerciseId !== exercise.id));
      return;
    }
    setSelected([...selected, choiceFor(exercise.id)]);
  };
  function choiceFor(exerciseId) {
    const plan = recommendExercise(state, exerciseId);
    const last = exerciseHistory(state, exerciseId)
      .at(-1)
      ?.sets.filter((set) => set.completed && !set.warmup)
      .at(-1);
    const inputUnit = last?.inputUnit || 'kg';
    return {
      exerciseId,
      sets: plan.sets,
      reps: plan.reps[0],
      weightKg: plan.weightKg ?? '',
      inputUnit,
      inputWeight: plan.weightKg != null ? fromKg(plan.weightKg, inputUnit) : '',
    };
  }
  const edit = (id, key, value) =>
    setSelected((previous) =>
      previous.map((entry) => (entry.exerciseId === id ? { ...entry, [key]: value } : entry)),
    );
  const move = (index, offset) => {
    const next = [...selected];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    setSelected(next);
  };
  const start = (event) => {
    event.preventDefault();
    task.run(async () => {
      await change((draft) => {
        if (session) addSessionExercises(draft, session.id, selected);
        else
          draft.sessions.push(
            createCustomSession(draft, {
              name,
              dayType,
              location,
              exercises: selected,
              templateId: template?.id,
              scheduledSlotId: template?.scheduleSlotId,
            }),
          );
      });
      onStarted?.();
      onClose();
    });
  };
  const createExercise = () =>
    task.run(async () => {
      const exercise = validateExercise({
        id: `custom-${uid()}`,
        name: newExercise.name.trim(),
        muscle: newExercise.muscle.trim() || 'My exercise',
        primaryMuscles: newExercise.primaryMuscles,
        pattern: 'custom',
        equipment: newExercise.equipment,
        loadKind: newExercise.loadKind,
        unit:
          newExercise.loadKind === 'bodyweight'
            ? 'bodyweight (0 kg added)'
            : newExercise.loadKind === 'assistance'
              ? 'kg · assistance'
              : newExercise.equipment === 'Dumbbell'
                ? 'kg · per dumbbell'
                : 'kg · total / this equipment',
        increment: 0,
        sets: 3,
        reps: [8, 12],
        rest: 90,
        cue: 'Keep the equipment setup and load convention consistent between sessions.',
      });
      await change((draft) => {
        draft.customExercises ||= [];
        draft.customExercises.push(exercise);
      });
      setSelected((previous) => [
        ...previous,
        {
          exerciseId: exercise.id,
          sets: 3,
          reps: 8,
          weightKg: exercise.loadKind === 'bodyweight' ? 0 : '',
        },
      ]);
      setNewExercise(null);
    });
  return (
    <Modal
      title={session ? 'Add exercises to this workout' : 'Choose today’s exercises'}
      onClose={onClose}
      wide
    >
      <form onSubmit={start} className="stack workout-builder">
        <p className="muted">
          Pick what you want to train. Your selection and weights are yours to change.
        </p>
        {!session && (
          <>
            <Field label="Workout location">
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="gym">Gym</option>
                <option value="home">Home</option>
              </select>
            </Field>
            <div className="workout-types" role="group" aria-label="Workout type">
              {workoutTypes.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  aria-pressed={dayType === option.id}
                  className={dayType === option.id ? 'active' : ''}
                  onClick={() => {
                    setDayType(option.id);
                    setName(option.label);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <details className="optional-section">
              <summary>
                Workout name <span>{name}</span>
              </summary>
              <Field label="Workout name">
                <input
                  value={name}
                  required
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            </details>
          </>
        )}
        {selected.length > 0 &&
          (session ? (
            <Button type="button" onClick={start} disabled={task.busy}>
              Add {selected.length} to workout
            </Button>
          ) : (
            <button
              className="text-btn"
              type="button"
              onClick={() =>
                targets.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
              }
            >
              Set weights & reps for {selected.length} selected{' '}
              {selected.length === 1 ? 'exercise' : 'exercises'} ↓
            </button>
          ))}
        <div className="builder-columns">
          <section>
            <div className="search-field">
              <Search size={18} />
              <input
                aria-label="Search exercises"
                placeholder="Search exercise or muscle…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="checkbox builder-all">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all exercises, whatever the day type
            </label>
            <div className="exercise-library">
              {available.map((exercise) => {
                const picked = selected.some((entry) => entry.exerciseId === exercise.id);
                const last = exerciseHistory(state, exercise.id)
                  .at(-1)
                  ?.sets.filter((set) => set.completed && !set.warmup)
                  .at(-1);
                return (
                  <button
                    type="button"
                    key={exercise.id}
                    aria-pressed={picked}
                    className={picked ? 'picked' : ''}
                    onClick={() => choose(exercise)}
                  >
                    <span className="library-check">
                      {picked ? <Check size={15} /> : <Plus size={15} />}
                    </span>
                    <div>
                      <strong>{exercise.name}</strong>
                      <small>
                        {exercise.muscle} · {exercise.equipment}
                      </small>
                      {last && (
                        <small>
                          Last recorded: {last.weightKg} kg × {last.reps}
                        </small>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setNewExercise({
                  name: query.trim(),
                  muscle: '',
                  equipment: 'Machine',
                  loadKind: 'external',
                  primaryMuscles: [],
                })
              }
            >
              <Plus size={16} />
              Create my own exercise
            </Button>
          </section>
          <section className="builder-selected" ref={targets}>
            <div className="row">
              <h3>Your exercises</h3>
              <Tag>{selected.length} selected</Tag>
            </div>
            {!selected.length && (
              <p className="muted">
                Tap exercises to add them. Then set your sets, reps, and starting weight here.
              </p>
            )}
            {selected.map((entry, index) => {
              const exercise = getExercise(state, entry.exerciseId);
              return (
                <div className="selected-exercise" key={entry.exerciseId}>
                  <div className="row">
                    <strong>{exercise.name}</strong>
                    <div className="row">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Move ${exercise.name} up`}
                        disabled={!index}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Move ${exercise.name} down`}
                        disabled={index === selected.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remove ${exercise.name} from selection`}
                        onClick={() =>
                          setSelected(
                            selected.filter((item) => item.exerciseId !== entry.exerciseId),
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  <small>{exercise.unit}</small>
                  <div className="builder-targets">
                    <Field label="Sets">
                      <input
                        aria-label={`Sets for ${exercise.name}`}
                        required
                        type="number"
                        min={1}
                        max={20}
                        value={entry.sets}
                        onChange={(e) => edit(entry.exerciseId, 'sets', e.target.value)}
                      />
                    </Field>
                    <Field label="Reps">
                      <input
                        aria-label={`Reps for ${exercise.name}`}
                        required
                        type="number"
                        min={1}
                        max={100}
                        value={entry.reps}
                        onChange={(e) => edit(entry.exerciseId, 'reps', e.target.value)}
                      />
                    </Field>
                    <LoadInput
                      value={entry}
                      required={false}
                      ariaLabel={`Weight for ${exercise.name}`}
                      unitLabel={`Weight unit for ${exercise.name}`}
                      onChange={(load) =>
                        setSelected((previous) =>
                          previous.map((item) =>
                            item.exerciseId === entry.exerciseId ? { ...item, ...load } : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </section>
        </div>
        <FormError error={task.error} />
        <SaveButton busy={task.busy} disabled={!selected.length || task.busy}>
          {session ? 'Add selected exercises' : 'Start my workout'}
        </SaveButton>
      </form>
      {newExercise && (
        <div className="new-exercise-panel stack">
          <div className="row">
            <h3>New exercise</h3>
            <button
              className="icon-btn"
              aria-label="Cancel new exercise"
              onClick={() => setNewExercise(null)}
            >
              <X size={17} />
            </button>
          </div>
          <Field label="New exercise name">
            <input
              autoFocus
              maxLength={100}
              value={newExercise.name}
              onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
            />
          </Field>
          <Field label="Muscle or category">
            <input
              maxLength={80}
              value={newExercise.muscle}
              onChange={(e) => setNewExercise({ ...newExercise, muscle: e.target.value })}
            />
          </Field>
          <fieldset className="muscle-checks">
            <legend>Direct muscle groups for weekly tracking (optional)</legend>
            {muscleGroups.map((group) => (
              <label className="checkbox" key={group.id}>
                <input
                  type="checkbox"
                  checked={newExercise.primaryMuscles.includes(group.id)}
                  onChange={(event) =>
                    setNewExercise({
                      ...newExercise,
                      primaryMuscles: event.target.checked
                        ? [...newExercise.primaryMuscles, group.id]
                        : newExercise.primaryMuscles.filter((id) => id !== group.id),
                    })
                  }
                />
                {group.label}
              </label>
            ))}
          </fieldset>
          <div className="form-grid">
            <Field label="Equipment">
              <select
                value={newExercise.equipment}
                onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
              >
                {[
                  'Machine',
                  'Barbell',
                  'Dumbbell',
                  'Cable',
                  'Bodyweight',
                  'Resistance band',
                  'Other',
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Load type">
              <select
                value={newExercise.loadKind}
                onChange={(e) => setNewExercise({ ...newExercise, loadKind: e.target.value })}
              >
                <option value="external">Weight in kg</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="assistance">Assistance in kg</option>
              </select>
            </Field>
          </div>
          <FormError error={task.error} />
          <Button disabled={task.busy || !newExercise.name.trim()} onClick={createExercise}>
            Save exercise & select it
          </Button>
        </div>
      )}
    </Modal>
  );
}
