import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useJournal } from '../lib/store';
import { getExercise } from '../domain/exercises';
import { moveSessionExercise, removeSessionExercise } from '../domain/training';
import { Button, Card, Field, FormError, useTask } from './ui';

export default function WorkoutEditor({ session, onAdd }) {
  const { state, change } = useJournal();
  const task = useTask();
  return (
    <Card className="workout-editor">
      <div className="section-head">
        <div>
          <h3>Edit your exercise order</h3>
          <small>Move any exercise. Remove unused ones before finishing.</small>
        </div>
        <Button onClick={onAdd}>Add exercises</Button>
      </div>
      <Field label="Active workout location">
        <select
          value={session.location || 'gym'}
          onChange={(event) => {
            const location = event.target.value;
            task.run(() =>
              change((draft) => {
                const current = draft.sessions.find((item) => item.id === session.id);
                if (current?.status !== 'active')
                  throw new Error('This workout is no longer active.');
                current.location = location;
              }),
            );
          }}
        >
          <option value="gym">Gym</option>
          <option value="home">Home</option>
        </select>
      </Field>
      {!session.exercises.length && (
        <p>Your workout is empty. Add any exercise to begin logging.</p>
      )}
      <details className="exercise-order-details">
        <summary>Reorder or remove exercises · {session.exercises.length} selected</summary>
        {session.exercises.map((entry, index) => {
          const name = getExercise(state, entry.exerciseId).name;
          const saved = entry.sets.some((set) => set.completed);
          return (
            <div className="workout-editor-row" key={entry.id}>
              <div>
                <strong>
                  {index + 1}. {name}
                </strong>
                <small>
                  {saved
                    ? 'Saved sets kept · undo them before removing'
                    : 'Not logged yet · can remove'}
                </small>
              </div>
              <div className="actions">
                <button
                  className="icon-btn"
                  aria-label={`Move ${name} earlier`}
                  disabled={task.busy || index === 0}
                  onClick={() =>
                    task.run(() =>
                      change((draft) => moveSessionExercise(draft, session.id, entry.id, -1)),
                    )
                  }
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Move ${name} later`}
                  disabled={task.busy || index === session.exercises.length - 1}
                  onClick={() =>
                    task.run(() =>
                      change((draft) => moveSessionExercise(draft, session.id, entry.id, 1)),
                    )
                  }
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${name} from workout`}
                  disabled={task.busy || saved}
                  onClick={() =>
                    task.run(() =>
                      change((draft) => removeSessionExercise(draft, session.id, entry.id)),
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </details>
      <FormError error={task.error} />
    </Card>
  );
}
