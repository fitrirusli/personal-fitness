import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import {
  startEmptySession,
  addSessionExercises,
  moveSessionExercise,
  removeSessionExercise,
  logSet,
  completeSession,
  createCustomSession,
  nextSetDefaults,
} from '../../src/domain/training';
import { toKg, loadText, validLoadInput } from '../../src/domain/loads';
import { durationText, sessionDurationMs, plannedWorkouts } from '../../src/domain/routines';
import { weeklyMuscles } from '../../src/domain/muscles';
import { validateJournal } from '../../src/lib/journal';
import { encodeBackup, decodeBackup } from '../../src/lib/backup';

const choice = (exerciseId = 'bench-press') => ({ exerciseId, sets: 2, reps: 8, weightKg: 20 });
function journal() {
  const state = demoJournal();
  state.sessions = [];
  state.checkins = {};
  state.workoutTemplates = [];
  state.weeklySchedule = [];
  return state;
}
function saveFirst(state, session, load = { weightKg: 20 }) {
  const entry = session.exercises[0];
  logSet(state, session.id, entry.id, entry.sets[0].id, { ...load, reps: 8, rir: 2 });
}

describe('flexible personal workouts', () => {
  it('starts a persisted timer before exercise selection and rejects finishing an empty workout', () => {
    const state = journal();
    const session = startEmptySession(state);
    state.sessions.push(session);
    expect(validateJournal(state)).toBe(state);
    expect(session.exercises).toEqual([]);
    expect(() => completeSession(state, session.id)).toThrow();
    const elapsed = sessionDurationMs(session, Date.parse(session.startedAt) + 125000);
    expect(durationText(elapsed)).toBe('00:02:05');
    expect(() => startEmptySession(state)).toThrow();
  });
  it('reorders stable entries and removes unperformed exercises without discarding saved work', () => {
    const state = journal();
    const session = startEmptySession(state);
    state.sessions.push(session);
    addSessionExercises(state, session.id, [choice(), choice('pulldown'), choice('triceps')]);
    const bench = session.exercises[0];
    const pull = session.exercises[1];
    saveFirst(state, session);
    moveSessionExercise(state, session.id, pull.id, -1);
    expect(session.exercises[1].id).toBe(bench.id);
    expect(bench.sets[0].completed).toBe(true);
    removeSessionExercise(state, session.id, pull.id);
    expect(session.exercises.map((entry) => entry.exerciseId)).toEqual(['bench-press', 'triceps']);
    expect(() => removeSessionExercise(state, session.id, bench.id)).toThrow();
    removeSessionExercise(state, session.id, session.exercises[1].id);
    completeSession(state, session.id);
    expect(() => moveSessionExercise(state, session.id, bench.id, 1)).toThrow();
  });
  it('keeps exact entered pounds and canonical kilograms through next-set carry-forward and encrypted restore', async () => {
    const state = journal();
    const session = createCustomSession(state, { name: 'Pound machine', exercises: [choice()] });
    state.sessions.push(session);
    const load = { weightKg: toKg(100, 'lb'), inputUnit: 'lb', inputWeight: 100 };
    expect(load.weightKg).toBe(45.359237);
    saveFirst(state, session, load);
    const entry = session.exercises[0];
    expect(nextSetDefaults(state, entry, entry.sets[1])).toMatchObject({
      ...load,
      reps: 8,
      rir: '',
    });
    completeSession(state, session.id);
    const restored = await decodeBackup(
      await encodeBackup(state, 'test-pound-password'),
      'test-pound-password',
    );
    expect(restored.sessions[0].exercises[0].sets[0]).toMatchObject(load);
    expect(loadText(load)).toBe('100 lb (45.36 kg)');
    expect(validLoadInput({ ...load, weightKg: 100 })).toBe(false);
  });
  it('allows three separate sessions in one day while muscle frequency counts that day once', () => {
    const state = journal();
    for (let index = 0; index < 3; index++) {
      const session = createCustomSession(
        state,
        { name: `Session ${index}`, exercises: [choice()] },
        '2026-11-02',
      );
      state.sessions.push(session);
      saveFirst(state, session);
      completeSession(state, session.id);
    }
    expect(state.sessions.filter((session) => session.status === 'completed')).toHaveLength(3);
    expect(new Set(state.sessions.map((session) => session.id)).size).toBe(3);
    expect(
      weeklyMuscles(state, '2026-11-02', '2026-11-02').rows.find((row) => row.id === 'chest').count,
    ).toBe(1);
    expect(validateJournal(state)).toBe(state);
  });
  it('remembers actual working exercises and updates an explicitly reused routine', () => {
    const state = journal();
    const session = createCustomSession(state, {
      name: 'Upper A',
      exercises: [choice(), choice('triceps')],
    });
    state.sessions.push(session);
    saveFirst(state, session);
    completeSession(state, session.id);
    const template = state.workoutTemplates[0];
    expect(template.exerciseChoices.map((entry) => entry.exerciseId)).toEqual(['bench-press']);
    state.weeklySchedule = [{ id: 'planned-upper', weekday: 1, name: 'Upper', templateId: null }];
    removeSessionExercise(state, session.id, session.exercises[1].id, { allowCompleted: true });
    expect(session.exercises).toHaveLength(1);
    const repeat = createCustomSession(state, {
      name: template.name,
      templateId: template.id,
      scheduledSlotId: 'planned-upper',
      exercises: template.exerciseChoices,
    });
    state.sessions.push(repeat);
    saveFirst(state, repeat, { weightKg: 25 });
    completeSession(state, repeat.id);
    expect(state.workoutTemplates).toHaveLength(1);
    expect(state.workoutTemplates[0].exerciseChoices[0].weightKg).toBe(25);
    expect(state.weeklySchedule[0].templateId).toBe(template.id);
  });
  it('keeps a personal upper/lower plan with multiple slots on one day and rejects dangling routines', async () => {
    const state = journal();
    state.profile.trainingDays = 2;
    state.profile.weekdays = [1, 4];
    state.weeklySchedule = [
      { id: 'upper', name: 'Upper body · morning', weekday: 1, templateId: null },
      { id: 'evening', name: 'Easy evening session', weekday: 1, templateId: null },
      { id: 'lower', name: 'Lower body', weekday: 4, templateId: null },
    ];
    expect(plannedWorkouts(state, '2026-11-02')).toHaveLength(2);
    expect(validateJournal(state)).toBe(state);
    const restored = await decodeBackup(
      await encodeBackup(state, 'test-plan-password'),
      'test-plan-password',
    );
    expect(restored.weeklySchedule).toEqual(state.weeklySchedule);
    state.weeklySchedule[0].templateId = 'missing';
    expect(() => validateJournal(state)).toThrow();
  });
  it('keeps old version-one journals without routines, schedules or photo fields valid', () => {
    const state = journal();
    delete state.workoutTemplates;
    delete state.weeklySchedule;
    delete state.mealPhotos;
    expect(validateJournal(state)).toBe(state);
  });
});
