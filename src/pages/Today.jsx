import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Dumbbell,
  Flame,
  Footprints,
  Droplets,
  Moon,
  Check,
  Plus,
  HeartPulse,
} from 'lucide-react';
import { useJournal } from '../lib/store';
import { localFoods as foods } from '../data/local-foods';
import { cardioPlan, dailyDirection, isTrainingDay, startEmptySession } from '../domain/training';
import PlanSettings from '../components/PlanSettings';
import WorkoutBuilder from '../components/WorkoutBuilder';
import ProteinCard from '../components/ProteinCard';
import WeeklyMuscles from '../components/WeeklyMuscles';
import WorkoutLibrary from '../components/WorkoutLibrary';
import { workoutTypes } from '../domain/exercises';
import { nutrientTotals, nutritionTargets, foodIdeas, proteinTarget } from '../domain/nutrition';
import { dayKey, dateLabel, weekDays, uid } from '../domain/dates';
import {
  Button,
  Card,
  Field,
  FormError,
  Heading,
  Meter,
  Modal,
  SaveButton,
  Stat,
  Tag,
  useTask,
} from '../components/ui';

export function Checkin({ onClose }) {
  const { state, change } = useJournal();
  const today = dayKey();
  const [form, setForm] = useState(
    state.checkins[today] || { sleepHours: 7, energy: 3, soreness: 2, pain: false },
  );
  const task = useTask();
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  return (
    <Modal title="How are you feeling?" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          task.run(async () => {
            await change((draft) => {
              draft.checkins[today] = form;
            });
            onClose();
          });
        }}
      >
        <p className="muted">
          A quick check-in helps you choose a manageable session. Changes apply to your next new
          session.
        </p>
        <Field label="Sleep last night (hours)">
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            required
            value={form.sleepHours}
            onChange={(e) => set('sleepHours', Number(e.target.value))}
          />
        </Field>
        <Field label={`Energy · ${form.energy}/5`} hint="1 = drained · 5 = ready to go">
          <input
            type="range"
            min="1"
            max="5"
            value={form.energy}
            onChange={(e) => set('energy', Number(e.target.value))}
          />
        </Field>
        <Field label={`Muscle soreness · ${form.soreness}/5`} hint="1 = none · 5 = very sore">
          <input
            type="range"
            min="1"
            max="5"
            value={form.soreness}
            onChange={(e) => set('soreness', Number(e.target.value))}
          />
        </Field>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.pain}
            onChange={(e) => set('pain', e.target.checked)}
          />
          Pain or an injury concern today
        </label>
        {form.pain && (
          <p className="notice">
            Pause painful movements. Review suitable activity with a qualified professional before
            continuing.
          </p>
        )}
        <FormError error={task.error} />
        <SaveButton busy={task.busy}>Save check-in</SaveButton>
      </form>
    </Modal>
  );
}

export function CardioForm({ onClose }) {
  const { change } = useJournal();
  const [form, setForm] = useState({
    date: dayKey(),
    activity: 'Incline walk',
    minutes: 15,
    intensity: 'moderate',
  });
  const task = useTask();
  return (
    <Modal title="Log cardio" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          task.run(async () => {
            await change((draft) => {
              draft.cardio.push({ ...form, id: uid() });
            });
            onClose();
          });
        }}
      >
        <Field label="Date">
          <input
            type="date"
            required
            max={dayKey()}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Activity">
          <input
            required
            maxLength="80"
            value={form.activity}
            onChange={(e) => setForm({ ...form, activity: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Duration (minutes)">
            <input
              type="number"
              min="1"
              max="600"
              required
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
            />
          </Field>
          <Field label="Intensity">
            <select
              value={form.intensity}
              onChange={(e) => setForm({ ...form, intensity: e.target.value })}
            >
              <option value="moderate">Moderate · can talk</option>
              <option value="vigorous">Vigorous · few words</option>
            </select>
          </Field>
        </div>
        <p className="muted">
          Vigorous minutes count twice toward your moderate-equivalent weekly goal. No exercise
          calories are added to food targets.
        </p>
        <FormError error={task.error} />
        <SaveButton busy={task.busy}>Save cardio</SaveButton>
      </form>
    </Modal>
  );
}

export function MacroSummary({ entries, compact = false }) {
  const { state } = useJournal();
  const totals = nutrientTotals(entries);
  const target = { ...nutritionTargets(state.profile), protein: proteinTarget(state.profile) };
  return (
    <div className={`macro-summary ${compact ? 'compact' : ''}`}>
      {(compact ? ['protein', 'calories'] : ['calories', 'protein', 'carbs', 'fat']).map((key) => (
        <div key={key} className={`macro ${key}`}>
          <div className="row">
            <span>{key === 'calories' ? 'Energy' : key[0].toUpperCase() + key.slice(1)}</span>
            {key === 'protein' && <span className="dot" />}
          </div>
          <div className="macro-value">
            <strong>
              {totals[key].amount == null ? '—' : Math.round(totals[key].amount).toLocaleString()}
            </strong>
            <span>
              {target[key] != null ? `/ ${target[key].toLocaleString()}` : ''}{' '}
              {key === 'calories' ? 'kcal' : 'g'}
            </span>
          </div>
          <Meter
            value={target[key] != null ? totals[key].amount : 0}
            max={target?.[key] || 100}
            tone={key}
          />
          <small>
            {totals[key].total
              ? `${totals[key].known}/${totals[key].total} entries with data`
              : 'No food logged yet'}
          </small>
        </div>
      ))}
    </div>
  );
}

export default function Today() {
  const { state, change } = useJournal();
  const [modal, setModal] = useState(null);
  const [builderType, setBuilderType] = useState('full');
  const task = useTask();
  const navigate = useNavigate();
  const today = dayKey();
  const active = state.sessions.find((s) => s.status === 'active');
  const cardio = cardioPlan(state);
  const checkin = state.checkins[today];
  const meals = state.meals.filter((m) => m.date === today);
  const totals = nutrientTotals(meals);
  const ideas = foodIdeas(state.profile, [...foods, ...state.customFoods], totals, state.favorites);
  const week = weekDays(today);
  const sessions = state.sessions.filter((s) => s.status === 'completed' && week.includes(s.date));
  const water = state.water.filter((w) => w.date === today).reduce((sum, w) => sum + w.ml, 0);
  const direction = dailyDirection(state);
  return (
    <>
      <Heading
        eyebrow={dateLabel(today, { weekday: 'long' }).toUpperCase()}
        title={`Your plan today, ${state.profile.name}.`}
      >
        <Button variant="secondary" onClick={() => setModal('plan')}>
          {state.profile.trainingDays} days / week · Edit plan
        </Button>
      </Heading>
      <div className="week-strip">
        {week.map((date) => {
          const done = state.sessions.some((s) => s.date === date && s.status === 'completed');
          return (
            <div key={date} className={date === today ? 'today' : ''}>
              <span>{dateLabel(date, { weekday: 'short' }).split(',')[0].slice(0, 3)}</span>
              <strong>{Number(date.slice(-2))}</strong>
              <span
                className={`week-marker ${done ? 'done' : isTrainingDay(state.profile, date) ? 'planned' : ''}`}
              >
                {done ? <Check size={11} /> : ''}
              </span>
            </div>
          );
        })}
        <div className="week-copy">
          <strong>
            {new Set(sessions.map((session) => session.date)).size} / {state.profile.trainingDays}
          </strong>
          <span>training days · {sessions.length} sessions</span>
        </div>
      </div>
      <Card className="manual-workout today-choice">
        <p className="eyebrow">WORKOUT · YOUR WAY</p>
        <h2>
          {active
            ? active.name
            : direction.kind === 'done'
              ? 'Workout complete.'
              : 'What do you want to train today?'}
        </h2>
        <p>
          {active
            ? 'Your saved workout is ready to continue.'
            : 'Legs, pull, upper body, or a mix. Choose any exercises and set your own weights.'}
        </p>
        {active ? (
          <Link className="btn primary" to="/train">
            Continue workout
            <ArrowUpRight size={18} />
          </Link>
        ) : (
          <>
            <p className="fine-print">
              {
                state.sessions.filter(
                  (session) => session.status === 'completed' && session.date === today,
                ).length
              }{' '}
              sessions completed today. You can start another whenever you train.
            </p>
            <Button
              disabled={task.busy}
              onClick={() =>
                task.run(async () => {
                  await change((draft) => {
                    draft.sessions.push(
                      startEmptySession(draft, {
                        name: `Workout ${draft.sessions.filter((session) => session.date === today).length + 1}`,
                      }),
                    );
                  });
                  navigate('/train');
                })
              }
            >
              Start workout timer
            </Button>
            <div className="workout-types">
              {workoutTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setBuilderType(type.id);
                    setModal('build');
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setBuilderType('full');
                setModal('build');
              }}
            >
              <Plus size={17} />
              {direction.kind === 'done' ? 'Choose another workout' : 'Choose today’s exercises'}
            </Button>
          </>
        )}
      </Card>
      <WorkoutLibrary />
      <ProteinCard />
      <WeeklyMuscles />
      <Card className="quick-records">
        <div className="section-head">
          <div>
            <p className="eyebrow">RECORDS</p>
            <h2>Your work stays saved.</h2>
          </div>
          <Link className="text-btn" to="/train">
            View workouts
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <p>
          {state.sessions.filter((session) => session.status === 'completed').length} completed
          workouts · {state.meals.length} food entries
        </p>
        <div className="actions">
          <Link className="btn secondary" to="/food">
            Food diary
          </Link>
          <Link className="btn ghost" to="/progress">
            Strength & progress
          </Link>
        </div>
      </Card>
      <details className="optional-section extra-daily">
        <summary>
          Cardio, water & food ideas <span>Your extras for today</span>
        </summary>
        <div className="three-grid optional-body">
          <Card className="recovery">
            <div className="row">
              <span className="icon-tile peach">
                <HeartPulse size={22} />
              </span>
              <button className="text-btn" onClick={() => setModal('checkin')}>
                {checkin ? 'Update' : 'Check in'}
                <ArrowUpRight size={16} />
              </button>
            </div>
            <h3>How’s your engine?</h3>
            {checkin ? (
              <>
                <div className="recovery-stats">
                  <div>
                    <Moon size={16} />
                    <strong>{checkin.sleepHours}h</strong>
                    <span>sleep</span>
                  </div>
                  <div>
                    <Flame size={16} />
                    <strong>{checkin.energy}/5</strong>
                    <span>energy</span>
                  </div>
                  <div>
                    <Dumbbell size={16} />
                    <strong>{checkin.soreness}/5</strong>
                    <span>soreness</span>
                  </div>
                </div>
                <p>
                  {checkin.pain
                    ? 'Pain flagged. Review activity before training.'
                    : checkin.energy <= 2 || checkin.soreness >= 4
                      ? 'Take a lighter approach today. Your next plan will account for this.'
                      : 'Build on your rhythm. Keep your working sets controlled.'}
                </p>
              </>
            ) : (
              <>
                <p>Sleep, energy, and soreness help set the tone for your next session.</p>
                <Button variant="secondary" onClick={() => setModal('checkin')}>
                  Add today’s check-in
                </Button>
              </>
            )}
          </Card>
          <Card>
            <div className="row">
              <span className="icon-tile sage">
                <Footprints size={21} />
              </span>
              <button
                className="icon-btn"
                aria-label="Log cardio"
                onClick={() => setModal('cardio')}
              >
                <Plus size={19} />
              </button>
            </div>
            <h3>A little cardio goes a long way.</h3>
            <Stat label="Suggested next session" value={cardio.duration} unit="min" />
            <p>{cardio.reason}</p>
            <Meter value={cardio.minutes} max={cardio.goal} />
            <small>
              {cardio.minutes} / {cardio.goal} moderate-equivalent min this week
            </small>
            <p className="fine-print">
              Your chosen starting goal. General adult guidance is 150–300 moderate minutes per
              week; build gradually from your baseline.
            </p>
          </Card>
          <Card>
            <div className="row">
              <span className="icon-tile blue">
                <Droplets size={21} />
              </span>
              <Tag>HYDRATION</Tag>
            </div>
            <h3>Keep the bottle close.</h3>
            <Stat label="Water logged today" value={(water / 1000).toFixed(2)} unit="L" />
            {state.profile.waterGoalMl && (
              <>
                <Meter value={water} max={state.profile.waterGoalMl} tone="water" />
                <small>Personal reminder: {state.profile.waterGoalMl / 1000} L</small>
              </>
            )}
            <div className="actions water-actions">
              {[250, 500].map((ml) => (
                <Button
                  key={ml}
                  variant="secondary"
                  disabled={task.busy}
                  onClick={() =>
                    task.run(() =>
                      change((draft) => {
                        draft.water.push({ id: uid(), date: today, ml });
                      }),
                    )
                  }
                >
                  + {ml} ml
                </Button>
              ))}
            </div>
            {state.water.some((w) => w.date === today) && (
              <button
                className="text-btn muted"
                onClick={() =>
                  task.run(() =>
                    change((draft) => {
                      const index = draft.water.findLastIndex((w) => w.date === today);
                      if (index >= 0) draft.water.splice(index, 1);
                    }),
                  )
                }
              >
                Undo last entry
              </button>
            )}
            <FormError error={task.error} />
          </Card>
          <Card className="food-ideas">
            <div className="row">
              <span className="icon-tile peach">
                <Flame size={21} />
              </span>
              <Tag>FOOD IDEAS</Tag>
            </div>
            <h3>Make protein easier.</h3>
            {ideas.length ? (
              <>
                <p>
                  Options toward your target, based on food logged so far. Adjust to appetite and
                  your whole day.
                </p>
                {ideas.slice(0, 2).map((idea) => (
                  <Link className="food-idea" key={idea.food.id} to="/food">
                    <div>
                      <strong>{idea.food.name}</strong>
                      <small>
                        {idea.grams} g · ~{idea.calories} kcal
                      </small>
                    </div>
                    <span>
                      {idea.protein}g<small>protein</small>
                    </span>
                  </Link>
                ))}
              </>
            ) : (
              <>
                <p>
                  {state.profile.allergies.length
                    ? 'Check ingredients and allergen labels when choosing foods. Automatic food ideas are paused for your allergy settings.'
                    : meals.length
                      ? 'Keep a varied plate with protein, plants, and energy for training.'
                      : 'Log a meal to see ideas based on your protein target and food so far.'}
                </p>
                <Link className="text-btn" to="/food">
                  Open food diary
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </Card>
        </div>
      </details>
      {modal === 'plan' && <PlanSettings onClose={() => setModal(null)} />}
      {modal === 'build' && (
        <WorkoutBuilder
          initialType={builderType}
          onClose={() => setModal(null)}
          onStarted={() => navigate('/train')}
        />
      )}
      {modal === 'checkin' && <Checkin onClose={() => setModal(null)} />}{' '}
      {modal === 'cardio' && <CardioForm onClose={() => setModal(null)} />}
    </>
  );
}
