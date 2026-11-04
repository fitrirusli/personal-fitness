import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { programs, trainingOptions } from '../../src/data/exercises';
import {
  createSession,
  logSet,
  completeSession,
  dailyDirection,
  nextSetDefaults,
  nextTemplate,
} from '../../src/domain/training';
import { validateJournal } from '../../src/lib/journal';
import { shiftDay } from '../../src/domain/dates';

describe('a short setup and a clear daily plan', () => {
  it.each(trainingOptions)(
    'supports a complete $days-day rotation and valid saved records',
    (option) => {
      const state = demoJournal();
      state.sessions = [];
      state.profile.trainingDays = option.days;
      state.profile.weekdays = option.weekdays;
      const examples = programs[option.days] || programs[3];
      for (let index = 0; index < examples.length; index++) {
        const session = createSession(state, shiftDay('2026-11-02', index));
        state.sessions.push(session);
        expect(session.name).toBe(examples[index].name);
        const entry = session.exercises[0];
        logSet(state, session.id, entry.id, entry.sets[0].id, {
          weightKg: 20,
          reps: 8,
          rir: 2,
          warmup: false,
        });
        completeSession(state, session.id);
        expect(validateJournal(state)).toBe(state);
      }
      expect(nextTemplate(state).index).toBe(0);
    },
  );
  it('distinguishes training, rest, completed training, pain, and resumed workouts', () => {
    const state = demoJournal();
    state.sessions = [];
    state.profile.trainingDays = 5;
    state.profile.weekdays = [1, 2, 4, 5, 6];
    state.checkins = {};
    expect(dailyDirection(state, '2026-11-02').kind).toBe('train');
    expect(dailyDirection(state, '2026-11-04').kind).toBe('rest');
    const session = createSession(state, '2026-11-02');
    state.sessions.push(session);
    expect(dailyDirection(state, '2026-11-03').kind).toBe('active');
    const entry = session.exercises[0];
    logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 20, reps: 8, rir: null });
    completeSession(state, session.id);
    expect(dailyDirection(state, '2026-11-02')).toMatchObject({
      kind: 'done',
      nextDate: '2026-11-03',
    });
    state.checkins['2026-11-03'] = { pain: true };
    expect(dailyDirection(state, '2026-11-03').kind).toBe('review');
  });
  it('carries actual load and reps to the next set without fabricating effort or a first load', () => {
    const state = demoJournal();
    state.sessions = [];
    const session = createSession(state);
    state.sessions.push(session);
    const entry = session.exercises[0];
    expect(nextSetDefaults(state, entry, entry.sets[0])).toMatchObject({ weightKg: '', rir: '' });
    logSet(state, session.id, entry.id, entry.sets[0].id, {
      weightKg: 25,
      reps: 11,
      rir: 2,
      warmup: false,
    });
    expect(nextSetDefaults(state, entry, entry.sets[1])).toEqual({
      weightKg: 25,
      reps: 11,
      rir: '',
      inputUnit: 'kg',
      inputWeight: 25,
    });
  });
});
