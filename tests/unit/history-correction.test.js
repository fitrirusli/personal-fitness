import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import {
  createCustomSession,
  logSet,
  completeSession,
  exerciseHistory,
} from '../../src/domain/training';
import { removeHistoryExercise } from '../../src/domain/history';
import { weeklyMuscles } from '../../src/domain/muscles';
import { validateJournal } from '../../src/lib/journal';
import { encodeBackup, decodeBackup } from '../../src/lib/backup';

const choice = (exerciseId) => ({ exerciseId, sets: 1, reps: 8, weightKg: 25 });
function fixture() {
  const state = demoJournal();
  state.sessions = [];
  state.workoutTemplates = [];
  state.weeklySchedule = [];
  state.checkins = {};
  return state;
}
function workout(state, ids = ['bench-press', 'pulldown'], templateId) {
  const session = createCustomSession(
    state,
    { name: 'Upper body', exercises: ids.map(choice), templateId },
    '2026-11-02',
  );
  session.notes = 'Keep this note';
  state.sessions.push(session);
  for (const entry of session.exercises)
    logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 25, reps: 8, rir: null });
  completeSession(state, session.id);
  return session;
}
describe('correct mistaken exercises in completed history', () => {
  it('requires a fresh confirmation if a concurrent change would remove the whole workout', () => {
    const state = fixture();
    const session = workout(state, ['bench-press']);
    const before = structuredClone(state);
    expect(() =>
      removeHistoryExercise(state, session.id, session.exercises[0].id, {
        expectedSessionRemoval: false,
      }),
    ).toThrow(/changed/);
    expect(state).toEqual(before);
  });
  it('removes the selected recorded entry, preserving other work and times and updating its generated routine', async () => {
    const state = fixture();
    const session = workout(state);
    const kept = structuredClone(session.exercises[1]);
    const startedAt = session.startedAt;
    const completedAt = session.completedAt;
    removeHistoryExercise(state, session.id, session.exercises[0].id);
    expect(session.exercises).toEqual([kept]);
    expect(session).toMatchObject({ startedAt, completedAt, notes: 'Keep this note' });
    expect(exerciseHistory(state, 'bench-press')).toEqual([]);
    expect(
      weeklyMuscles(state, '2026-11-02', '2026-11-02').rows.find((row) => row.id === 'chest').sets,
    ).toBe(0);
    expect(state.workoutTemplates[0].exerciseChoices.map((item) => item.exerciseId)).toEqual([
      'pulldown',
    ]);
    expect(validateJournal(state)).toBe(state);
    const restored = await decodeBackup(
      await encodeBackup(state, 'corrected-test-password'),
      'corrected-test-password',
    );
    expect(exerciseHistory(restored, 'bench-press')).toEqual([]);
    expect(restored.sessions[0].exercises).toEqual([kept]);
  });
  it('does not change a newer routine whose source is another completed session', () => {
    const state = fixture();
    const original = workout(state);
    const template = state.workoutTemplates[0];
    const newer = workout(state, ['bench-press', 'pulldown'], template.id);
    const snapshot = structuredClone(state.workoutTemplates[0]);
    removeHistoryExercise(state, original.id, original.exercises[0].id);
    expect(state.workoutTemplates[0]).toEqual(snapshot);
    expect(exerciseHistory(state, 'bench-press')).toHaveLength(1);
    expect(newer.exercises).toHaveLength(2);
    expect(validateJournal(state)).toBe(state);
  });
  it('removes an otherwise empty workout and only its generated template, clearing planned links', () => {
    const state = fixture();
    const mistaken = workout(state, ['bench-press']);
    const template = state.workoutTemplates[0];
    state.weeklySchedule = [
      { id: 'upper-slot', weekday: 1, name: 'Upper', templateId: template.id },
    ];
    const other = workout(state, ['pulldown']);
    const active = createCustomSession(state, {
      name: 'New workout',
      templateId: template.id,
      exercises: template.exerciseChoices,
    });
    state.sessions.push(active);
    const result = removeHistoryExercise(state, mistaken.id, mistaken.exercises[0].id);
    expect(result.removedSession).toBe(true);
    expect(state.sessions.map((session) => session.id)).toEqual([other.id, active.id]);
    expect(state.weeklySchedule[0]).toMatchObject({ name: 'Upper', templateId: null });
    expect(state.workoutTemplates).toHaveLength(1);
    expect(state.workoutTemplates[0].sourceSessionId).toBe(other.id);
    expect(active.templateId).toBeUndefined();
    expect(active.exercises[0].exerciseId).toBe('bench-press');
    expect(validateJournal(state)).toBe(state);
  });
  it('rejects active sessions and stale entry IDs before changing saved work', () => {
    const state = fixture();
    const session = workout(state);
    const before = structuredClone(state);
    expect(() => removeHistoryExercise(state, session.id, 'missing-entry')).toThrow();
    expect(state).toEqual(before);
    const active = createCustomSession(state, {
      name: 'Active',
      exercises: [choice('bench-press')],
    });
    state.sessions.push(active);
    expect(() => removeHistoryExercise(state, active.id, active.exercises[0].id)).toThrow();
    expect(active.exercises).toHaveLength(1);
  });
});
