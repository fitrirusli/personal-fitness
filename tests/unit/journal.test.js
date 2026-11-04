import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { emptyJournal, openJournal, validateJournal } from '../../src/lib/journal';
import { decodeBackup, encodeBackup } from '../../src/lib/backup';
import { dayKey, uid } from '../../src/domain/dates';
describe('private journal persistence', () => {
  it('commits concurrent writes without losing records and persists after reopening', async () => {
    const mode = uid();
    const a = await openJournal(mode);
    const b = await openJournal(mode);
    await Promise.all([
      a.change((s) => {
        s.water.push({ id: uid(), date: dayKey(), ml: 250 });
      }),
      b.change((s) => {
        s.water.push({ id: uid(), date: dayKey(), ml: 500 });
      }),
    ]);
    expect((await a.read()).water).toHaveLength(2);
    a.close();
    b.close();
    const reopened = await openJournal(mode);
    expect((await reopened.read()).revision).toBe(2);
    reopened.close();
  });
  it('rolls back rejected mutations', async () => {
    const repo = await openJournal(uid());
    await expect(
      repo.change((s) => {
        s.water.push({ id: uid(), date: dayKey(), ml: -1 });
      }),
    ).rejects.toThrow();
    expect((await repo.read()).water).toEqual([]);
    repo.close();
  });
  it('keeps demo and personal namespaces separate', async () => {
    const demo = await openJournal(`demo-${uid()}`);
    const personal = await openJournal(`personal-${uid()}`);
    await demo.replace(demoJournal());
    expect((await personal.read()).profile).toBeNull();
    demo.close();
    personal.close();
  });
  it('rejects malformed imports, duplicate IDs, impossible dates, and unsafe keys', () => {
    expect(validateJournal(demoJournal())).toBeTruthy();
    for (const mutate of [
      (s) => {
        s.meals = {};
      },
      (s) => {
        s.meals.push(s.meals[0]);
      },
      (s) => {
        s.meals[0].date = '2026-02-31';
      },
      (s) => {
        s.sessions[0].exercises[0].exerciseId = 'unknown';
      },
      (s) => {
        s.profile.weekdays = null;
      },
      (s) => {
        s.meals[0].food.source.url = 'javascript:alert(1)';
      },
    ]) {
      const state = demoJournal();
      mutate(state);
      expect(() => validateJournal(state)).toThrow();
    }
    expect(() => validateJournal(JSON.parse('{"__proto__":{"polluted":true}}'))).toThrow();
  });
  it('round-trips encrypted backups and rejects wrong passwords or modified ciphertext', async () => {
    const state = demoJournal();
    const text = await encodeBackup(state, 'test-password-123');
    expect(text).not.toContain('Alex');
    expect(await decodeBackup(text, 'test-password-123')).toEqual(state);
    await expect(decodeBackup(text, 'wrong')).rejects.toThrow();
    const envelope = JSON.parse(text);
    envelope.data = `${envelope.data[0] === 'A' ? 'B' : 'A'}${envelope.data.slice(1)}`;
    await expect(decodeBackup(JSON.stringify(envelope), 'test-password-123')).rejects.toThrow();
    await expect(encodeBackup(emptyJournal(), 'short')).rejects.toThrow();
  });
});
