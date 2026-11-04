import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import {
  startEmptySession,
  addSessionExercises,
  requestSessionStop,
  continueSession,
  discardSession,
  logSet,
  completeSession,
} from '../../src/domain/training';
import { sessionDurationMs } from '../../src/domain/routines';
import { validateJournal } from '../../src/lib/journal';
import { encodeBackup, decodeBackup } from '../../src/lib/backup';

function fixture() {
  const state = demoJournal();
  state.sessions = [];
  state.workoutTemplates = [];
  const session = startEmptySession(state);
  session.startedAt = '2026-11-02T00:00:00.000Z';
  state.sessions.push(session);
  return { state, session };
}
function saveSet(state, session) {
  addSessionExercises(state, session.id, [
    { exerciseId: 'bench-press', sets: 2, reps: 8, weightKg: 20 },
  ]);
  const entry = session.exercises[0];
  logSet(state, session.id, entry.id, entry.sets[0].id, { weightKg: 20, reps: 8, rir: 2 });
  return entry;
}
describe('stop a session without being forced to save it', () => {
  it('freezes the stop decision through reload/backup and resumes without losing the session', async () => {
    const { state, session } = fixture();
    const entry = saveSet(state, session);
    requestSessionStop(state, session.id, '2026-11-02T00:05:00.000Z');
    requestSessionStop(state, session.id, '2026-11-02T00:07:00.000Z');
    expect(sessionDurationMs(session, Date.parse('2026-11-02T00:20:00.000Z'))).toBe(300000);
    expect(() =>
      logSet(state, session.id, entry.id, entry.sets[1].id, { weightKg: 20, reps: 8, rir: 2 }),
    ).toThrow(/Continue/);
    const restored = await decodeBackup(
      await encodeBackup(state, 'stop-test-password'),
      'stop-test-password',
    );
    expect(restored.sessions[0].pendingStopAt).toBe('2026-11-02T00:05:00.000Z');
    continueSession(state, session.id);
    expect(session.pendingStopAt).toBeUndefined();
    expect(sessionDurationMs(session, Date.parse('2026-11-02T00:10:00.000Z'))).toBe(600000);
    expect(entry.sets[0].completed).toBe(true);
    expect(validateJournal(state)).toBe(state);
  });
  it('discards an accidental empty start without adding history or a routine', () => {
    const { state, session } = fixture();
    state.restUntil = 123;
    requestSessionStop(state, session.id);
    discardSession(state, session.id);
    expect(state.sessions).toEqual([]);
    expect(state.workoutTemplates).toEqual([]);
    expect(state.restUntil).toBeNull();
    expect(validateJournal(state)).toBe(state);
  });
  it('discards only the active session and keeps completed history and remembered routines', () => {
    const { state, session } = fixture();
    saveSet(state, session);
    completeSession(state, session.id);
    const active = startEmptySession(state);
    state.sessions.push(active);
    saveSet(state, active);
    requestSessionStop(state, active.id);
    discardSession(state, active.id);
    expect(state.sessions.map((item) => item.id)).toEqual([session.id]);
    expect(state.workoutTemplates).toHaveLength(1);
    expect(() => discardSession(state, session.id)).toThrow();
    expect(validateJournal(state)).toBe(state);
  });
  it('saves at the explicit stop time and rejects malformed persisted stop state', () => {
    const { state, session } = fixture();
    saveSet(state, session);
    requestSessionStop(state, session.id, '2026-11-02T00:05:00.000Z');
    completeSession(state, session.id);
    expect(session.completedAt).toBe('2026-11-02T00:05:00.000Z');
    expect(session.pendingStopAt).toBeUndefined();
    expect(sessionDurationMs(session)).toBe(300000);
    session.pendingStopAt = 'invalid';
    expect(() => validateJournal(state)).toThrow();
  });
});
