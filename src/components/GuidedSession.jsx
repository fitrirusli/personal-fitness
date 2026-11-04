import { useState } from 'react';
import { ArrowRight, Check, SkipForward, Undo2 } from 'lucide-react';
import { getExercise, repLabel } from '../domain/exercises';
import { logSet, nextSetDefaults } from '../domain/training';
import { useJournal } from '../lib/store';
import { Button, Card, Field, FormError, Meter, Tag, useTask } from './ui';
import LoadInput from './LoadInput';
import { loadText } from '../domain/loads';

function NextSet({ session, entry, set, onSaved }) {
  const { state, change } = useJournal();
  const task = useTask();
  const [input, setInput] = useState(() => nextSetDefaults(state, entry, set));
  const exercise = getExercise(state, entry.exerciseId);
  return (
    <form
      className="stack next-set"
      onSubmit={(event) => {
        event.preventDefault();
        task.run(async () => {
          if (input.weightKg === '')
            throw new Error('Choose a comfortable weight for this first set.');
          await change((draft) =>
            logSet(draft, session.id, entry.id, set.id, {
              weightKg: Number(input.weightKg),
              inputUnit: input.inputUnit,
              inputWeight: Number(input.inputWeight),
              reps: Number(input.reps),
              rir: input.rir === '' ? null : Number(input.rir),
              warmup: set.warmup,
            }),
          );
          onSaved({ entryId: entry.id, setId: set.id, name: exercise.name, ...input });
        });
      }}
    >
      <div className="row">
        <Tag tone="sage">
          {set.warmup
            ? 'WARM-UP'
            : `SET ${entry.sets.filter((item) => !item.warmup && item.number <= set.number).length} OF ${entry.sets.filter((item) => !item.warmup).length}`}
        </Tag>
        <small>Rest {entry.plan.restSeconds}s after saving</small>
      </div>
      <div className="guided-inputs">
        <LoadInput value={input} onChange={(load) => setInput({ ...input, ...load })} />
        <Field label="Reps">
          <input
            required
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            value={input.reps}
            onChange={(e) => setInput({ ...input, reps: e.target.value })}
          />
        </Field>
      </div>
      <div className="effort-choice">
        <span>
          Good reps left? <small>Optional</small>
        </span>
        <div role="group" aria-label="Good reps left after this set">
          {[
            ['', 'Not sure'],
            ['2', '2+ more'],
            ['1', '0–1 more'],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={input.rir === value}
              className={input.rir === value ? 'active' : ''}
              onClick={() => setInput({ ...input, rir: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <FormError error={task.error} />
      <Button type="submit" disabled={task.busy} className="guided-save">
        <Check size={20} />
        {task.busy ? 'Saving…' : `Save set ${set.number}`}
      </Button>
    </form>
  );
}

export default function GuidedSession({ session, onFinish, showAll, onAdd }) {
  const { state, change } = useJournal();
  const task = useTask();
  const [selected, setSelected] = useState(null);
  const [last, setLast] = useState(null);
  const pending = (entry) =>
    !entry.skipped && !entry.pain && entry.sets.some((set) => !set.completed);
  const entry =
    session.exercises.find((item) => item.id === selected) || session.exercises.find(pending);
  const set = entry?.sets.find((item) => !item.completed);
  const count = session.exercises.reduce(
    (n, item) => n + item.sets.filter((set) => !set.warmup).length,
    0,
  );
  const done = session.exercises.reduce(
    (n, item) => n + item.sets.filter((set) => set.completed && !set.warmup).length,
    0,
  );
  const pause = (pain) =>
    task.run(async () => {
      await change((draft) => {
        const s = draft.sessions.find((s) => s.id === session.id);
        if (s?.status !== 'active') throw new Error('This workout is no longer active.');
        const e = s.exercises.find((e) => e.id === entry.id);
        e.skipped = true;
        if (pain) e.pain = true;
      });
      setSelected(null);
    });
  return (
    <div className="guided-layout">
      <div className="stack">
        {last &&
          session.exercises.some(
            (item) =>
              item.id === last.entryId &&
              item.sets.some((set) => set.id === last.setId && set.completed),
          ) && (
            <div className="set-saved" role="status">
              <Check size={18} />
              <span>
                Saved · {last.name} · {loadText(last)} × {last.reps}
              </span>
              <button
                className="icon-btn"
                aria-label="Undo last saved set"
                disabled={task.busy}
                onClick={() =>
                  task.run(async () => {
                    await change((draft) => {
                      const s = draft.sessions.find((s) => s.id === session.id);
                      if (s?.status !== 'active')
                        throw new Error('This workout is no longer active.');
                      s.exercises
                        .find((e) => e.id === last.entryId)
                        .sets.find((set) => set.id === last.setId).completed = false;
                      draft.restUntil = null;
                    });
                    setSelected(last.entryId);
                    setLast(null);
                  })
                }
              >
                <Undo2 size={17} />
              </button>
            </div>
          )}
        <Card className="guided-workout">
          {entry ? (
            <>
              <p className="eyebrow">YOUR NEXT EXERCISE</p>
              <h2>{getExercise(state, entry.exerciseId).name}</h2>
              <p className="guided-prescription">
                <strong>
                  {entry.plan.sets || getExercise(state, entry.exerciseId).sets} sets ×{' '}
                  {repLabel(entry.plan.reps || getExercise(state, entry.exerciseId).reps)} reps
                </strong>
                <span>{getExercise(state, entry.exerciseId).unit}</span>
              </p>
              {entry.plan.weightKg == null && !entry.pain && (
                <p className="guide-calibration">
                  First time? Choose a comfortable weight after warming up.
                </p>
              )}
              {entry.pain ? (
                <p className="notice">
                  Pain flagged. Pause this movement and review suitable activity.
                </p>
              ) : set && !entry.skipped ? (
                <NextSet
                  key={`${entry.id}-${set.id}`}
                  session={session}
                  entry={entry}
                  set={set}
                  onSaved={(saved) => {
                    setLast(saved);
                    setSelected(null);
                  }}
                />
              ) : (
                <div className="stack">
                  <Tag tone="sage">{entry.skipped ? 'MOVEMENT SKIPPED' : 'EXERCISE COMPLETE'}</Tag>
                  <Button variant="secondary" onClick={() => setSelected(null)}>
                    Go to next exercise
                    <ArrowRight size={17} />
                  </Button>
                </div>
              )}
              <details className="optional-section">
                <summary>
                  Technique & why this plan <span>Open when you need guidance</span>
                </summary>
                <p>{getExercise(state, entry.exerciseId).cue}</p>
                <p>{entry.plan.reason}</p>
              </details>
              <div className="actions guide-extra">
                <button
                  className="text-btn muted"
                  onClick={() => pause(false)}
                  disabled={task.busy}
                >
                  <SkipForward size={14} />
                  Skip exercise
                </button>
                <button className="text-btn muted" onClick={() => pause(true)} disabled={task.busy}>
                  Pain? Pause this movement
                </button>
                <button className="text-btn" onClick={showAll}>
                  Swap, warm-up or edit sets
                </button>
              </div>
            </>
          ) : session.exercises.length === 0 ? (
            <div className="guide-complete">
              <h2>Your session has started.</h2>
              <p>Add the exercises you want to do. The workout timer is running.</p>
              <Button onClick={onAdd}>Add your first exercise</Button>
            </div>
          ) : (
            <div className="guide-complete">
              <Check size={36} />
              <h2>You’ve reached the end.</h2>
              <p>Review your saved sets, or finish this workout.</p>
              <Button onClick={onFinish}>
                Finish workout
                <Check size={18} />
              </Button>
              <button className="text-btn" onClick={showAll}>
                Review all sets
              </button>
            </div>
          )}
          <FormError error={task.error} />
        </Card>
      </div>
      <Card className="guide-queue">
        <div className="row">
          <h3>Your workout</h3>
          <span>
            {done}/{count} sets
          </span>
        </div>
        <Meter value={done} max={count} />
        {session.exercises.map((item, index) => {
          const completed = item.sets.filter((set) => set.completed && !set.warmup).length;
          const total = item.sets.filter((set) => !set.warmup).length;
          return (
            <button
              key={item.id}
              className={entry?.id === item.id ? 'current' : ''}
              onClick={() => setSelected(item.id)}
            >
              <span>{completed === total ? <Check size={16} /> : index + 1}</span>
              <div>
                <strong>{getExercise(state, item.exerciseId).name}</strong>
                <small>
                  {item.pain
                    ? 'Paused · pain'
                    : item.skipped
                      ? 'Skipped'
                      : `${completed}/${total} sets saved`}
                </small>
              </div>
            </button>
          );
        })}
        <p className="fine-print">
          Enter what you actually did. We carry your load and reps to the next set; you can change
          them.
        </p>
      </Card>
    </div>
  );
}
