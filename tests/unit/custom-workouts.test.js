import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { uid } from '../../src/domain/dates';
import { getExercise } from '../../src/domain/exercises';
import {
  addSessionExercises,
  createCustomSession,
  completeSession,
  logSet,
  nextTemplate,
  nextSetDefaults,
} from '../../src/domain/training';
import { emptyJournal, validateJournal } from '../../src/lib/journal';
import { decodeBackup, encodeBackup } from '../../src/lib/backup';

const choice = { exerciseId: 'leg-press', sets: 2, reps: 9, weightKg: 65 };
describe('self-selected workouts and records', () => {
  it('preserves chosen order, sets, reps and loads without advancing the weekly rotation', () => {
    const state = demoJournal();
    const before = nextTemplate(state).index;
    const session = createCustomSession(state, {
      name: 'My leg day',
      dayType: 'leg',
      exercises: [choice, { exerciseId: 'bench-press', sets: 1, reps: 12, weightKg: 30 }],
    });
    state.sessions.push(session);
    expect(session.exercises.map((entry) => entry.exerciseId)).toEqual([
      'leg-press',
      'bench-press',
    ]);
    const entry = session.exercises[0];
    expect(entry.sets).toHaveLength(2);
    expect(entry.plan).toMatchObject({ targetReps: 9, weightKg: 65 });
    expect(nextSetDefaults(state, entry, entry.sets[0]).reps).toBe(9);
    logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 70, reps: 10, rir: null });
    completeSession(state, session.id);
    expect(nextTemplate(state).index).toBe(before);
    expect(validateJournal(state)).toBe(state);
  });
  it('rejects duplicate exercises, bad targets and a second active workout', () => {
    const state = demoJournal();
    expect(() =>
      createCustomSession(state, { name: 'Bad', exercises: [choice, choice] }),
    ).toThrow();
    expect(() =>
      createCustomSession(state, { name: 'Bad', exercises: [{ ...choice, sets: 0 }] }),
    ).toThrow();
    state.sessions.push(createCustomSession(state, { name: 'Legs', exercises: [choice] }));
    expect(() => createCustomSession(state, { name: 'Again', exercises: [choice] })).toThrow();
  });
  it('adds different movements mid-session without losing logged sets', () => {
    const state = demoJournal();
    const session = createCustomSession(state, { name: 'Mixed', exercises: [choice] });
    state.sessions.push(session);
    const entry = session.exercises[0];
    logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 65, reps: 9, rir: 2 });
    addSessionExercises(state, session.id, [
      { exerciseId: 'pulldown', sets: 3, reps: 10, weightKg: 25 },
    ]);
    expect(entry.sets[0].completed).toBe(true);
    expect(session.exercises).toHaveLength(2);
    expect(() => addSessionExercises(state, session.id, [choice])).toThrow();
  });
  it('keeps a personal exercise definition and its history through encrypted restore', async () => {
    const state = demoJournal();
    const exercise = {
      id: `custom-${uid()}`,
      name: 'My incline machine',
      muscle: 'Chest',
      pattern: 'custom',
      equipment: 'Machine',
      loadKind: 'external',
      unit: 'kg · this machine',
      increment: 0,
      sets: 3,
      reps: [8, 12],
      rest: 90,
      cue: 'Keep the machine setup consistent.',
    };
    state.customExercises.push(exercise);
    const session = createCustomSession(state, {
      name: 'Upper day',
      exercises: [{ exerciseId: exercise.id, sets: 3, reps: 11, weightKg: 22.5 }],
    });
    state.sessions.push(session);
    const entry = session.exercises[0];
    logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 22.5, reps: 11, rir: 2 });
    completeSession(state, session.id);
    const restored = await decodeBackup(
      await encodeBackup(state, 'custom-backup-password'),
      'custom-backup-password',
    );
    expect(getExercise(restored, exercise.id).name).toBe(exercise.name);
    expect(restored.sessions.at(-1).exercises[0].sets[0]).toMatchObject({
      weightKg: 22.5,
      reps: 11,
      completed: true,
    });
    delete restored.customExercises;
    expect(() => validateJournal(restored)).toThrow();
  });
  it('still accepts older version-one journals without a personal exercise library', () => {
    const state = emptyJournal();
    delete state.customExercises;
    expect(validateJournal(state)).toBe(state);
  });
});
