import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  History,
  Info,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useJournal } from '../lib/store';
import { programs } from '../data/exercises';
import { getExercise, workoutTypes, repLabel } from '../domain/exercises';
import WorkoutBuilder from '../components/WorkoutBuilder';
import GuidedSession from '../components/GuidedSession';
import PlanSettings from '../components/PlanSettings';
import WorkoutEditor from '../components/WorkoutEditor';
import WorkoutLibrary from '../components/WorkoutLibrary';
import SessionClock from '../components/SessionClock';
import SessionHistory from '../components/SessionHistory';
import LoadInput from '../components/LoadInput';
import { fromKg, loadText } from '../domain/loads';
import { durationText, sessionDurationMs, timeText } from '../domain/routines';
import {
  alternativeExercises,
  completeSession,
  createSession,
  logSet,
  nextTemplate,
  recommendExercise,
  sessionOverview,
  startEmptySession,
  requestSessionStop,
  continueSession,
  discardSession,
} from '../domain/training';
import { dateLabel, dayKey, uid } from '../domain/dates';
import {
  Button,
  Card,
  Empty,
  Field,
  FormError,
  Heading,
  Modal,
  Tag,
  useTask,
} from '../components/ui';

function SetRow({ session, entry, set }) {
  const { state, change } = useJournal();
  const task = useTask();
  const [input, setInput] = useState({
    weightKg: set.weightKg ?? '',
    inputUnit: set.inputUnit || entry.displayUnit || 'kg',
    inputWeight:
      set.inputWeight ??
      (set.weightKg != null
        ? fromKg(set.weightKg, set.inputUnit || entry.displayUnit || 'kg')
        : ''),
    reps: set.reps ?? '',
    rir: set.rir ?? '',
    warmup: set.warmup,
  });
  const exercise = getExercise(state, entry.exerciseId);
  return (
    <div className={`set-row ${set.completed ? 'logged' : ''}`}>
      <span className="set-number">{set.warmup ? 'W' : set.number}</span>
      {set.completed ? (
        <>
          <strong>{loadText(set)}</strong>
          <strong>
            {set.reps} <small>reps</small>
          </strong>
          <span>{set.rir == null ? '—' : `${set.rir} RIR`}</span>
          <button
            className="set-check"
            aria-label={`Undo set ${set.number}`}
            title="Undo set"
            disabled={task.busy}
            onClick={() =>
              task.run(() =>
                change((draft) => {
                  const s = draft.sessions.find((s) => s.id === session.id);
                  if (s?.status !== 'active') throw new Error('Session is no longer active.');
                  const target = s.exercises
                    .find((e) => e.id === entry.id)
                    .sets.find((t) => t.id === set.id);
                  target.completed = false;
                  draft.restUntil = null;
                }),
              )
            }
          >
            <Check size={18} />
          </button>
        </>
      ) : (
        <>
          <LoadInput
            value={input}
            compact
            ariaLabel={(unit) => `Set ${set.number} weight ${unit}`}
            unitLabel={`Set ${set.number} load unit`}
            onChange={(load) => setInput({ ...input, ...load })}
          />
          <input
            aria-label={`Set ${set.number} reps`}
            inputMode="numeric"
            type="number"
            min="1"
            max="100"
            placeholder={`${entry.plan.reps?.[0] || exercise.reps[0]}–${entry.plan.reps?.[1] || exercise.reps[1]}`}
            value={input.reps}
            onChange={(e) => setInput({ ...input, reps: e.target.value })}
          />
          <select
            aria-label={`Set ${set.number} RIR`}
            value={input.rir}
            onChange={(e) => setInput({ ...input, rir: e.target.value })}
          >
            <option value="">—</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 5 ? '+' : ''}
              </option>
            ))}
          </select>
          <button
            className="set-log"
            disabled={task.busy || entry.skipped || entry.pain}
            aria-label={`Log set ${set.number}`}
            onClick={() =>
              task.run(async () => {
                if (input.weightKg === '' || input.reps === '')
                  throw new Error('Enter the load and repetitions first.');
                await change((draft) =>
                  logSet(draft, session.id, entry.id, set.id, {
                    weightKg: Number(input.weightKg),
                    inputUnit: input.inputUnit,
                    inputWeight: Number(input.inputWeight),
                    reps: Number(input.reps),
                    rir: input.rir === '' ? null : Number(input.rir),
                    warmup: input.warmup,
                  }),
                );
              })
            }
          >
            {task.busy ? '…' : <Check size={18} />}
          </button>
        </>
      )}
      {task.error && (
        <p className="form-error set-error" role="alert">
          {task.error}
        </p>
      )}
    </div>
  );
}

function ExerciseCard({ session, entry, index }) {
  const { state, change } = useJournal();
  const task = useTask();
  const exercise = getExercise(state, entry.exerciseId);
  const [swap, setSwap] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const update = (fn) =>
    task.run(() =>
      change((draft) => {
        const s = draft.sessions.find((s) => s.id === session.id);
        if (s?.status !== 'active') throw new Error('Session is no longer active.');
        fn(s.exercises.find((e) => e.id === entry.id));
      }),
    );
  return (
    <Card className={`exercise-card ${entry.skipped ? 'skipped' : ''}`}>
      <div className="exercise-heading">
        <span className="exercise-index">{String(index + 1).padStart(2, '0')}</span>
        <div>
          <h3>{exercise.name}</h3>
          <p>
            {exercise.muscle} · {exercise.unit}
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse exercise' : 'Expand exercise'}
        >
          {expanded ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
        </button>
      </div>
      {expanded && (
        <>
          <div className={`plan-reason ${entry.plan.kind === 'increase' ? 'positive' : ''}`}>
            <Info size={17} />
            <p>{entry.plan.reason}</p>
          </div>
          <p className="exercise-cue">{exercise.cue}</p>
          <div className="row exercise-meta">
            <span>
              <Clock3 size={14} />
              {entry.plan.restSeconds}s rest
            </span>
            <span>{repLabel(entry.plan.reps || exercise.reps)} reps · working sets</span>
          </div>
          {entry.plan.kind === 'review_pain' && (
            <p className="notice">
              No load is prescribed after a pain report. Skip this movement or review it with a
              qualified professional. Only enter a load after it is appropriate for you.
            </p>
          )}
          <div className="set-labels">
            <span>SET</span>
            <span>LOAD (KG)</span>
            <span>REPS</span>
            <span>RIR*</span>
            <span>LOG</span>
          </div>
          {entry.sets.map((set) => (
            <SetRow key={set.id} session={session} entry={entry} set={set} />
          ))}
          <div className="actions exercise-actions">
            <button
              className="text-btn"
              disabled={task.busy || entry.sets.length >= 20 || entry.skipped || entry.pain}
              onClick={() =>
                update((e) =>
                  e.sets.push({
                    id: uid(),
                    number: e.sets.length + 1,
                    weightKg: entry.plan.weightKg,
                    reps: null,
                    rir: null,
                    completed: false,
                    warmup: false,
                  }),
                )
              }
            >
              <Plus size={14} />
              Working set
            </button>
            <button
              className="text-btn muted"
              disabled={task.busy || entry.sets.length >= 20 || entry.skipped || entry.pain}
              onClick={() =>
                update((e) =>
                  e.sets.push({
                    id: uid(),
                    number: e.sets.length + 1,
                    weightKg: null,
                    reps: null,
                    rir: null,
                    completed: false,
                    warmup: true,
                  }),
                )
              }
            >
              + Warm-up
            </button>
            {alternativeExercises(entry.exerciseId, state).length > 0 &&
              !entry.sets.some((s) => s.completed) && (
                <button className="text-btn muted" onClick={() => setSwap(true)}>
                  <RefreshCw size={13} />
                  Swap
                </button>
              )}
            <button
              className="text-btn muted"
              disabled={task.busy}
              onClick={() =>
                update((e) => {
                  e.skipped = !e.skipped;
                })
              }
            >
              {entry.skipped ? 'Unskip' : 'Skip'}
            </button>
          </div>
          <label className="checkbox pain-check">
            <input
              type="checkbox"
              checked={entry.pain}
              onChange={(e) =>
                update((target) => {
                  target.pain = e.target.checked;
                })
              }
            />
            <ShieldAlert size={14} />
            Pain with this movement · pause and review
          </label>
          <FormError error={task.error} />
        </>
      )}
      {swap && (
        <Modal title="Swap this movement" onClose={() => setSwap(false)}>
          <p className="muted">
            Choose an alternative in the same movement pattern. Its own history determines its load.
          </p>
          <div className="stack">
            {alternativeExercises(entry.exerciseId, state).map((option) => (
              <Button
                variant="secondary"
                key={option.id}
                disabled={task.busy}
                onClick={() =>
                  task.run(async () => {
                    const plan = recommendExercise(state, option.id, state.checkins[dayKey()]);
                    await change((draft) => {
                      const s = draft.sessions.find((s) => s.id === session.id);
                      if (s.status !== 'active') throw new Error('Session is no longer active.');
                      const target = s.exercises.find((e) => e.id === entry.id);
                      if (target.sets.some((set) => set.completed))
                        throw new Error('Undo logged sets before swapping.');
                      Object.assign(target, {
                        exerciseId: option.id,
                        plan,
                        pain: false,
                        skipped: false,
                        sets: Array.from({ length: plan.sets }, (_, i) => ({
                          id: uid(),
                          number: i + 1,
                          weightKg: plan.weightKg,
                          reps: null,
                          rir: null,
                          completed: false,
                          warmup: false,
                        })),
                      });
                    });
                    setSwap(false);
                  })
                }
              >
                {option.name}
                <ArrowRight size={16} />
              </Button>
            ))}
          </div>
          <FormError error={task.error} />
        </Modal>
      )}
    </Card>
  );
}

export default function Train() {
  const { state, change } = useJournal();
  const task = useTask();
  const [modal, setModal] = useState(null);
  const [history, setHistory] = useState(null);
  const [allSets, setAllSets] = useState(false);
  const [builderType, setBuilderType] = useState('full');
  const [finishName, setFinishName] = useState(null);
  const [remember, setRemember] = useState(true);
  const [removeUnused, setRemoveUnused] = useState(true);
  const template = nextTemplate(state);
  const overview = sessionOverview(state, template);
  const session = state.sessions.find((s) => s.status === 'active');
  const completed = state.sessions
    .filter((s) => s.status === 'completed')
    .slice()
    .reverse();
  const logged =
    session?.exercises.reduce(
      (sum, e) => sum + e.sets.filter((s) => s.completed && !s.warmup).length,
      0,
    ) || 0;
  const savedSets =
    session?.exercises.reduce(
      (sum, entry) => sum + entry.sets.filter((set) => set.completed).length,
      0,
    ) || 0;
  useEffect(() => {
    if (session?.pendingStopAt && !modal) setModal('stop');
  }, [session?.id, session?.pendingStopAt, modal]);
  const stop = (next = 'stop') =>
    task.run(async () => {
      const stoppedAt = new Date().toISOString();
      await change((draft) => requestSessionStop(draft, session.id, stoppedAt));
      setModal(next === 'finish' && !logged ? 'stop' : next);
    });
  const resume = () =>
    task.run(async () => {
      await change((draft) => continueSession(draft, session.id));
      setModal(null);
    });
  const discard = () =>
    task.run(async () => {
      await change((draft) => discardSession(draft, session.id));
      setModal(null);
      setFinishName(null);
    });
  return (
    <>
      {!session && (
        <Heading eyebrow="TRAIN WITH INTENTION" title="Your next workout">
          <Button variant="secondary" onClick={() => setModal('plan')}>
            {state.profile.trainingDays} days / week · Edit plan
          </Button>
        </Heading>
      )}
      {!session ? (
        <>
          <WorkoutLibrary />
          <Card className="manual-workout">
            <p className="eyebrow">YOUR CHOICE</p>
            <h2>What are you training today?</h2>
            <p>Choose the exercises, sets, reps, and weight you want to record.</p>
            <div className="workout-types">
              {workoutTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="secondary"
                  onClick={() => {
                    setBuilderType(type.id);
                    setModal('build');
                  }}
                >
                  {type.label}
                </Button>
              ))}
            </div>
            <div className="actions">
              <Button
                disabled={task.busy}
                onClick={() =>
                  task.run(() =>
                    change((draft) => {
                      draft.sessions.push(
                        startEmptySession(draft, {
                          name: `Workout ${draft.sessions.filter((item) => item.date === dayKey()).length + 1}`,
                        }),
                      );
                    }),
                  )
                }
              >
                Start workout timer
              </Button>
              <Button
                onClick={() => {
                  setBuilderType('full');
                  setModal('build');
                }}
              >
                <Plus size={17} />
                Choose exercises
              </Button>
              {completed.length > 0 && (
                <Button variant="ghost" onClick={() => setModal('repeat')}>
                  Repeat last workout
                </Button>
              )}
            </div>
          </Card>
          <details className="optional-section suggested-workout">
            <summary>
              Optional example workout{' '}
              <span>Optional · use it when you want a ready-made plan</span>
            </summary>
            <Card className="session-preview">
              <div>
                <Tag tone="sage">UP NEXT</Tag>
                <h2>{template.name}</h2>
                <p>{template.focus}</p>
                <div className="actions">
                  <span className="muted">
                    <Clock3 size={15} />
                    About {overview.minutes} minutes, at your pace
                  </span>
                  <Button
                    disabled={task.busy}
                    onClick={() =>
                      task.run(() =>
                        change((draft) => {
                          draft.sessions.push(createSession(draft));
                        }),
                      )
                    }
                  >
                    <Play size={17} />
                    Start session
                  </Button>
                </div>
                <FormError error={task.error} />
              </div>
              <div className="preview-list">
                {template.exerciseIds.map((id, index) => {
                  const exercise = getExercise(state, id);
                  const plan = recommendExercise(state, id, state.checkins[dayKey()]);
                  return (
                    <div key={id}>
                      <span className="exercise-index">{index + 1}</span>
                      <div>
                        <strong>{exercise.name}</strong>
                        <small>
                          {plan.sets} × {plan.reps.join('–')} · {exercise.unit}
                        </small>
                      </div>
                      <Tag tone={plan.kind === 'increase' ? 'lime' : ''}>
                        {plan.weightKg == null ? 'Choose load' : `${plan.weightKg} kg`}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            </Card>
            <div className="notice">
              <Info size={19} />
              <span>
                Warm up with lighter preparation sets. The guided view takes you through one
                exercise at a time. Adjust the load whenever you need to.
              </span>
            </div>
            <details className="optional-section">
              <summary>
                See an example rotation{' '}
                <span>{(programs[state.profile.trainingDays] || programs[3]).length} workouts</span>
              </summary>
              <Card>
                <h3>Example rotation</h3>
                <p className="muted">
                  Sessions advance when completed. A missed day does not double your next workout.
                </p>
                <div className="rotation">
                  {(programs[state.profile.trainingDays] || programs[3]).map((t, i) => (
                    <div key={t.name} className={i === template.index ? 'next' : ''}>
                      <span>0{i + 1}</span>
                      <strong>{t.name}</strong>
                      <small>{t.focus}</small>
                      {i === template.index && <Tag tone="sage">NEXT</Tag>}
                    </div>
                  ))}
                </div>
              </Card>
            </details>
          </details>
        </>
      ) : (
        <>
          <div className="active-bar">
            <div>
              <span className="status-dot" />
              <h1>{session.name}</h1>
              <small>{logged} working sets saved</small>
            </div>
            <Button disabled={task.busy} onClick={() => stop('finish')}>
              <Check size={17} />
              Finish session
            </Button>
          </div>
          <SessionClock session={session} onStop={() => stop()} busy={task.busy} />
          <FormError error={task.error} />
          <WorkoutEditor session={session} onAdd={() => setModal('add')} />
          <div className="view-switch">
            <button className={!allSets ? 'active' : ''} onClick={() => setAllSets(false)}>
              Guide me
            </button>
            <button className={allSets ? 'active' : ''} onClick={() => setAllSets(true)}>
              All exercises & tools
            </button>
          </div>
          {!allSets ? (
            <GuidedSession
              session={session}
              onFinish={() => stop('finish')}
              showAll={() => setAllSets(true)}
              onAdd={() => setModal('add')}
            />
          ) : (
            <div className="training-layout">
              <div className="stack">
                {session.exercises.map((entry, i) => (
                  <ExerciseCard key={entry.id} session={session} entry={entry} index={i} />
                ))}
              </div>
              <div className="stack training-aside">
                <Card>
                  <Dumbbell size={25} />
                  <h3>Good reps beat rushed reps.</h3>
                  <p className="muted">
                    Work within the suggested range, with controlled technique. Keep about 2 good
                    reps in reserve while establishing your baseline.
                  </p>
                  <p className="fine-print">
                    * RIR: 0 means no more reps; 5+ means at least five left. Leaving it blank holds
                    automatic load progression.
                  </p>
                  <Tag tone="sage">
                    <Check size={13} />
                    Every set saves locally
                  </Tag>
                </Card>
                <Card>
                  <Field label="Session notes">
                    <textarea
                      maxLength={2000}
                      defaultValue={session.notes}
                      placeholder="Technique notes, equipment, how it felt…"
                      onBlur={(e) => {
                        const value = e.target.value;
                        task.run(() =>
                          change((draft) => {
                            const s = draft.sessions.find((s) => s.id === session.id);
                            if (s?.status === 'active') s.notes = value;
                          }),
                        );
                      }}
                    />
                  </Field>
                  <FormError error={task.error} />
                </Card>
                <Button
                  variant="danger"
                  disabled={task.busy}
                  onClick={() => (savedSets ? stop('discard') : discard())}
                >
                  <Trash2 size={16} />
                  Discard this session
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="section-head history-heading">
        <div>
          <p className="eyebrow">THE WORK ADDS UP</p>
          <h2>Session history</h2>
        </div>
        <History size={23} />
      </div>
      {completed.length ? (
        <Card className="history-list">
          {completed.map((s) => (
            <button key={s.id} onClick={() => setHistory(s)}>
              <span className="icon-tile sage">
                <Check size={20} />
              </span>
              <div>
                <strong>{s.name}</strong>
                <small>
                  {dateLabel(s.date)} · {timeText(s.startedAt)} ·{' '}
                  {durationText(sessionDurationMs(s))} · {s.location ? `${s.location} · ` : ''}
                  {s.exercises.reduce(
                    (n, e) => n + e.sets.filter((set) => set.completed && !set.warmup).length,
                    0,
                  )}{' '}
                  working sets
                </small>
              </div>
              <ArrowRight size={18} />
            </button>
          ))}
        </Card>
      ) : (
        <Card>
          <Empty icon={Dumbbell} title="Your first session starts the story.">
            Complete a workout to build your training history.
          </Empty>
        </Card>
      )}
      {modal === 'plan' && <PlanSettings onClose={() => setModal(null)} />}
      {['build', 'repeat', 'add'].includes(modal) && (
        <WorkoutBuilder
          initialType={builderType}
          repeat={modal === 'repeat' ? completed[0] : undefined}
          session={modal === 'add' ? session : undefined}
          onClose={() => setModal(null)}
          onStarted={() => {
            setAllSets(false);
            window.scrollTo(0, 0);
          }}
        />
      )}
      {modal === 'stop' && session && (
        <Modal title="Stop this session?" onClose={resume}>
          <div className="stack">
            <p>
              {savedSets
                ? `${savedSets} saved sets are still in this active session. Choose whether to keep or discard it.`
                : 'No sets have been saved. If this was an accidental start, discard it without adding anything to your history.'}
            </p>
            <Button disabled={task.busy || !logged} onClick={() => setModal('finish')}>
              Save & finish
            </Button>
            {!logged && <small>There are no working sets to save.</small>}
            <Button
              variant="danger"
              disabled={task.busy}
              onClick={() => (savedSets ? setModal('discard') : discard())}
            >
              Discard session
            </Button>
            <Button variant="secondary" disabled={task.busy} onClick={resume}>
              Continue workout
            </Button>
            <FormError error={task.error} />
          </div>
        </Modal>
      )}
      {session && ['finish', 'discard'].includes(modal) && (
        <Modal
          title={modal === 'finish' ? 'Finish this session?' : 'Discard this session?'}
          onClose={resume}
        >
          <div className="stack">
            <p>
              {modal === 'finish'
                ? `${logged} working sets logged. Any unfinished sets will remain unlogged in your history.`
                : `Discard this active session and its ${savedSets} saved sets? This removes them from this session. Other completed sessions and saved routines are kept.`}
            </p>
            {modal === 'finish' && (
              <>
                <Field label="Workout name for history and next time">
                  <input
                    maxLength={100}
                    value={finishName ?? session.name}
                    onChange={(event) => setFinishName(event.target.value)}
                  />
                </Field>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={removeUnused}
                    onChange={(event) => setRemoveUnused(event.target.checked)}
                  />
                  Remove exercises with no saved sets
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  Remember this workout for next time
                </label>
              </>
            )}
            <FormError error={task.error} />
            <Button
              variant={modal === 'discard' ? 'danger' : 'primary'}
              disabled={task.busy}
              onClick={() =>
                task.run(async () => {
                  await change((draft) => {
                    if (modal === 'finish') {
                      const current = draft.sessions.find((item) => item.id === session.id);
                      current.name = (finishName ?? current.name).trim();
                      if (!current.name) throw new Error('Name this workout before finishing.');
                      if (removeUnused)
                        current.exercises = current.exercises.filter((entry) =>
                          entry.sets.some((set) => set.completed),
                        );
                      completeSession(draft, session.id, { remember });
                    } else {
                      discardSession(draft, session.id);
                    }
                  });
                  setModal(null);
                  setFinishName(null);
                })
              }
            >
              {modal === 'finish' ? 'Complete session' : 'Discard session'}
            </Button>
            {modal === 'finish' && (
              <Button
                variant="danger"
                disabled={task.busy}
                onClick={() => (savedSets ? setModal('discard') : discard())}
              >
                Discard instead
              </Button>
            )}
            <Button variant="secondary" disabled={task.busy} onClick={resume}>
              Continue workout
            </Button>
          </div>
        </Modal>
      )}
      {history && <SessionHistory sessionId={history.id} onClose={() => setHistory(null)} />}
    </>
  );
}
