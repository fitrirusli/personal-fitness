import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { exerciseById } from '../../src/data/exercises';
import {
  cardioPlan,
  completeSession,
  createSession,
  logSet,
  nextTemplate,
  recommendExercise,
} from '../../src/domain/training';
import { dayKey, shiftDay, uid } from '../../src/domain/dates';
import { emptyJournal } from '../../src/lib/journal';

function successful(id = 'bench-press', weight = 40) {
  const state = demoJournal();
  state.sessions = [];
  for (let n = 0; n < 2; n++) {
    const s = createSession(state);
    s.status = 'completed';
    s.completedAt = new Date(Date.now() + n).toISOString();
    s.exercises = [
      {
        id: uid(),
        exerciseId: id,
        pain: false,
        skipped: false,
        sets: Array.from({ length: exerciseById[id].sets }, () => ({
          completed: true,
          weightKg: weight,
          reps: exerciseById[id].reps[1],
          rir: 2,
          warmup: false,
        })),
      },
    ];
    state.sessions.push(s);
  }
  return state;
}
describe('explainable training decisions', () => {
  it('does not fabricate a first external load', () =>
    expect(recommendExercise(emptyJournal(), 'bench-press').weightKg).toBeNull());
  it('requires two comparable upper-range sessions before increasing', () => {
    const state = successful();
    expect(recommendExercise(state, 'bench-press')).toMatchObject({
      kind: 'increase',
      weightKg: 42.5,
    });
    state.sessions.pop();
    expect(recommendExercise(state, 'bench-press').kind).not.toBe('increase');
  });
  it('does not increase with unknown effort, warm-ups, or mixed loads', () => {
    for (const field of ['rir', 'warmup', 'weightKg']) {
      const state = successful();
      const set = state.sessions[1].exercises[0].sets[0];
      set[field] = { rir: null, warmup: true, weightKg: 45 }[field];
      expect(recommendExercise(state, 'bench-press').kind).not.toBe('increase');
    }
  });
  it('reduces assistance instead of adding it', () =>
    expect(recommendExercise(successful('assisted-pullup', 30), 'assisted-pullup')).toMatchObject({
      kind: 'increase',
      weightKg: 27.5,
    }));
  it('prioritizes pain and recovery over progression', () => {
    const state = successful();
    expect(recommendExercise(state, 'bench-press', { pain: true })).toMatchObject({
      weightKg: null,
      kind: 'review_pain',
    });
    expect(recommendExercise(state, 'bench-press', { energy: 1 })).toMatchObject({
      kind: 'recovery',
      sets: 2,
      weightKg: 40,
    });
  });
  it('uses each movement’s own history', () =>
    expect(recommendExercise(successful(), 'db-press').weightKg).toBeNull());
  it('does not advance rotation until a session is completed', () => {
    const state = successful();
    const before = nextTemplate(state).index;
    const s = createSession(state);
    state.sessions.push(s);
    expect(nextTemplate(state).index).toBe(before);
    const e = s.exercises[0];
    logSet(state, s.id, e.id, e.sets[0].id, { weightKg: 40, reps: 8, rir: 2 });
    completeSession(state, s.id);
    expect(nextTemplate(state).index).toBe((before + 1) % 3);
  });
  it('ignores duplicate set submissions and refuses empty completion', () => {
    const state = demoJournal();
    const s = createSession(state);
    state.sessions.push(s);
    const e = s.exercises[0];
    const set = e.sets[0];
    expect(() => completeSession(state, s.id)).toThrow();
    logSet(state, s.id, e.id, set.id, { weightKg: 70, reps: 8, rir: null });
    logSet(state, s.id, e.id, set.id, { weightKg: 90, reps: 10, rir: 2 });
    expect(set.weightKg).toBe(70);
    expect(() => createSession(state)).toThrow();
    expect(() => logSet(state, s.id, e.id, e.sets[1].id, { weightKg: NaN, reps: 8 })).toThrow();
  });
  it('uses this week only and counts vigorous minutes twice', () => {
    const state = demoJournal();
    const monday = dayKey();
    state.cardio = [
      { date: monday, minutes: 10, intensity: 'vigorous' },
      { date: shiftDay(monday, -14), minutes: 50, intensity: 'moderate' },
    ];
    expect(cardioPlan(state).minutes).toBe(20);
    state.checkins[monday].pain = true;
    expect(cardioPlan(state).duration).toBe(0);
  });
});
