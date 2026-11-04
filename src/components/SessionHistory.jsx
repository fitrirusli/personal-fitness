import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useJournal } from '../lib/store';
import { getExercise } from '../domain/exercises';
import { loadText } from '../domain/loads';
import { dateLabel } from '../domain/dates';
import { durationText, sessionDurationMs, timeText } from '../domain/routines';
import { removeHistoryExercise } from '../domain/history';
import { Button, FormError, Modal, Tag, useTask } from './ui';

export default function SessionHistory({ sessionId, onClose }) {
  const { state, change } = useJournal();
  const [pendingId, setPendingId] = useState(null);
  const task = useTask();
  const session = state.sessions.find(
    (item) => item.id === sessionId && item.status === 'completed',
  );
  if (!session) return null;
  const target = session.exercises.find((entry) => entry.id === pendingId);
  const lastWork =
    target &&
    !session.exercises.some(
      (entry) => entry.id !== target.id && entry.sets.some((set) => set.completed && !set.warmup),
    );
  const linked = state.workoutTemplates?.some((template) => template.sourceSessionId === sessionId);
  return (
    <Modal
      title={target ? 'Remove recorded exercise?' : `${session.name} · ${dateLabel(session.date)}`}
      onClose={() => (target ? setPendingId(null) : onClose())}
    >
      <div className="stack">
        {target ? (
          <>
            <p>
              Remove <strong>{getExercise(state, target.exerciseId).name}</strong> and its{' '}
              {target.sets.filter((set) => set.completed).length} saved sets from this workout?
            </p>
            <p className="notice">
              {lastWork
                ? 'No other working sets will remain. Confirming will remove this workout from history, including its remaining notes or warm-ups.'
                : 'Your other exercises, sets, notes, and workout times stay saved. Strength and weekly muscle totals will use the corrected record.'}
            </p>
            {linked && (
              <p className="fine-print">
                {lastWork
                  ? 'Its generated saved workout will also be removed; planned slots keep their names and let you choose exercises again.'
                  : 'The saved workout generated from this session will be updated too.'}
              </p>
            )}
            <FormError error={task.error} />
            <Button
              variant="danger"
              disabled={task.busy}
              onClick={() =>
                task.run(async () => {
                  const next = await change((draft) =>
                    removeHistoryExercise(draft, sessionId, target.id, {
                      expectedSessionRemoval: !!lastWork,
                    }),
                  );
                  setPendingId(null);
                  if (!next.sessions.some((item) => item.id === sessionId)) onClose();
                })
              }
            >
              Remove from history
            </Button>
            <Button variant="secondary" disabled={task.busy} onClick={() => setPendingId(null)}>
              Keep exercise
            </Button>
          </>
        ) : (
          <>
            <p>
              Started {timeText(session.startedAt)} · Finished {timeText(session.completedAt)} ·
              Duration {durationText(sessionDurationMs(session))} (includes rests)
            </p>
            {session.exercises.map((entry) => (
              <div key={entry.id} className="history-exercise">
                <div className="history-exercise-head">
                  <strong>{getExercise(state, entry.exerciseId).name}</strong>
                  <button
                    className="text-btn history-remove"
                    aria-label={`Remove ${getExercise(state, entry.exerciseId).name} from history`}
                    onClick={() => {
                      task.setError('');
                      setPendingId(entry.id);
                    }}
                  >
                    <Trash2 size={15} />
                    Remove exercise
                  </button>
                </div>
                {entry.pain && <Tag tone="peach">Pain reported</Tag>}
                <p>
                  {entry.sets
                    .filter((set) => set.completed)
                    .map(
                      (set) =>
                        `${set.warmup ? 'Warm-up: ' : ''}${loadText(set)} × ${set.reps} (${set.rir == null ? 'RIR unknown' : `${set.rir} RIR`})`,
                    )
                    .join(' · ') || 'No sets logged'}
                </p>
              </div>
            ))}
            {session.notes && <p className="notice">{session.notes}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
