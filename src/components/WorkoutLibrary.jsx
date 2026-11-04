import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJournal } from '../lib/store';
import { plannedWorkouts } from '../domain/routines';
import { dayKey } from '../domain/dates';
import { Button, Card } from './ui';
import WorkoutBuilder from './WorkoutBuilder';
import { getExercise } from '../domain/exercises';

export default function WorkoutLibrary() {
  const { state } = useJournal();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  if (state.sessions.some((session) => session.status === 'active')) return null;
  const templates = [...(state.workoutTemplates || [])].sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt)),
  );
  const planned = plannedWorkouts(state, dayKey());
  if (!templates.length && !planned.length) return null;
  return (
    <>
      <Card className="workout-library">
        <p className="eyebrow">YOUR WORKOUTS, READY AGAIN</p>
        <h2>Pick up where you left off.</h2>
        {planned.map((slot) => (
          <div className="saved-routine" key={slot.id}>
            <div>
              <strong>Planned today · {slot.name}</strong>
              <small>
                {slot.template
                  ? `${slot.template.exerciseChoices.length} exercises`
                  : 'Choose your exercises today'}
              </small>
            </div>
            {slot.template ? (
              <Button variant="secondary" onClick={() => setSelected(slot.template)}>
                Review workout
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() =>
                  setSelected({
                    name: slot.name,
                    location: 'gym',
                    dayType: 'full',
                    exerciseChoices: [],
                    scheduleSlotId: slot.id,
                  })
                }
              >
                Build this workout
              </Button>
            )}
          </div>
        ))}
        <details className="optional-section" open={!planned.length}>
          <summary>
            Saved from your completed workouts <span>{templates.length} reusable workouts</span>
          </summary>
          {templates.map((template) => (
            <div className="saved-routine" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <small>
                  {template.exerciseChoices.length} exercises · {template.location}
                </small>
                <small>
                  {template.exerciseChoices
                    .slice(0, 2)
                    .map((choice) => getExercise(state, choice.exerciseId).name)
                    .join(' · ')}
                  {template.exerciseChoices.length > 2 ? '…' : ''}
                </small>
              </div>
              <Button variant="secondary" onClick={() => setSelected(template)}>
                Use workout
              </Button>
            </div>
          ))}
        </details>
        <p className="fine-print">
          Review the exercises and last recorded loads before starting. Completing a session
          remembers the actual working exercises unless you turn that option off.
        </p>
      </Card>
      {selected && (
        <WorkoutBuilder
          template={selected}
          onClose={() => setSelected(null)}
          onStarted={() => navigate('/train')}
        />
      )}
    </>
  );
}
