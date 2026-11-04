import { useState } from 'react';
import {
  Activity,
  Check,
  Dumbbell,
  Footprints,
  Plus,
  Ruler,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useJournal } from '../lib/store';
import { allExercises, getExercise } from '../domain/exercises';
import { exerciseHistory } from '../domain/training';
import { loadText } from '../domain/loads';
import { dayKey, dateLabel, shiftDay, uid, weekDays } from '../domain/dates';
import {
  Button,
  Card,
  Empty,
  Field,
  FormError,
  Heading,
  Modal,
  SaveButton,
  Stat,
  Tag,
  useTask,
} from '../components/ui';
import { CardioForm } from './Today';

function TrendChart({ points, label, unit = '' }) {
  if (!points.length)
    return (
      <Empty icon={TrendingUp} title="Your trend starts with a record.">
        Log a few comparable entries to see your progress.
      </Empty>
    );
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = points.map((p, i) => [
    32 + (i / Math.max(1, points.length - 1)) * 536,
    150 - ((p.value - min) / range) * 100,
  ]);
  return (
    <div className="chart">
      <svg
        viewBox="0 0 600 210"
        role="img"
        aria-label={`${label}: ${points.map((p) => `${dateLabel(p.date)} ${p.value}${unit}`).join(', ')}`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#83b294" stopOpacity=".32" />
            <stop offset="100%" stopColor="#83b294" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 100, 150].map((y) => (
          <line key={y} x1="32" y1={y} x2="568" y2={y} stroke="#e7ebe5" strokeDasharray="4 6" />
        ))}
        {coords.length > 1 && (
          <>
            <path
              d={`M ${coords[0][0]} 175 L ${coords.map((p) => p.join(' ')).join(' L ')} L ${coords.at(-1)[0]} 175 Z`}
              fill="url(#chart-fill)"
            />
            <polyline
              points={coords.map((p) => p.join(',')).join(' ')}
              stroke="#285d47"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
        {coords.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#285d47" stroke="white" strokeWidth="2" />
            <text
              x={x}
              y={y - 14}
              textAnchor="middle"
              fontSize="13"
              fill="#285d47"
              fontWeight="600"
            >
              {values[i]}
            </text>
            {(i === 0 || i === coords.length - 1) && (
              <text
                x={x}
                y="200"
                textAnchor={i === 0 ? 'start' : 'end'}
                fontSize="12"
                fill="#748074"
              >
                {dateLabel(points[i].date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Progress() {
  const { state, change } = useJournal();
  const [exerciseId, setExerciseId] = useState('bench-press');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ date: dayKey(), waistCm: '', weightKg: '' });
  const task = useTask();
  const week = weekDays();
  const completed = state.sessions.filter((s) => s.status === 'completed');
  const recent = completed.filter((s) => week.includes(s.date));
  const sets = recent.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (n, e) => n + e.sets.filter((set) => set.completed && !set.warmup).length,
        0,
      ),
    0,
  );
  const cardioMinutes = state.cardio
    .filter((c) => week.includes(c.date))
    .reduce((sum, c) => sum + c.minutes, 0);
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const days = weekDays(shiftDay(dayKey(), -(7 - i) * 7));
    return {
      label: dateLabel(days[0]),
      count: completed.filter((s) => days.includes(s.date)).length,
    };
  });
  const history = exerciseHistory(state, exerciseId).filter((e) =>
    e.sets.some((s) => s.completed && !s.warmup),
  );
  const exercise = getExercise(state, exerciseId);
  const points = history.slice(-10).map((entry) => ({
    date: entry.date,
    value: Math.max(...entry.sets.filter((s) => s.completed && !s.warmup).map((s) => s.weightKg)),
  }));
  const measures = state.measurements.slice().sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <Heading eyebrow="PROOF OF THE WORK" title="Strong is more than a number.">
        <Button variant="secondary" onClick={() => setModal('measurement')}>
          <Plus size={16} />
          Add measurement
        </Button>
      </Heading>
      <div className="progress-stats">
        <Card>
          <Stat
            label="Training days this week"
            value={new Set(recent.map((session) => session.date)).size}
            unit={`/ ${state.profile.trainingDays}`}
          />
          <small>{recent.length} sessions recorded this week</small>
          <Dumbbell />
        </Card>
        <Card>
          <Stat label="Working sets this week" value={sets} />
          <TrendingUp />
        </Card>
        <Card>
          <Stat label="Cardio this week" value={cardioMinutes} unit="min" />
          <Footprints />
        </Card>
        <Card>
          <Stat label="Total sessions completed" value={completed.length} />
          <Check />
        </Card>
      </div>
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">CONSISTENCY FIRST</p>
            <h2>Keep showing up.</h2>
          </div>
          <Tag>LAST 8 WEEKS</Tag>
        </div>
        <div className="weekly-chart">
          {weekly.map((w, i) => (
            <div key={i}>
              <strong>{w.count}</strong>
              <div>
                <span
                  style={{
                    height: `${Math.max(4, (w.count / Math.max(state.profile.trainingDays, ...weekly.map((w) => w.count))) * 110)}px`,
                  }}
                  className={i === 7 ? 'current' : ''}
                />
              </div>
              <small>{w.label}</small>
            </div>
          ))}
        </div>
      </Card>
      <div className="progress-grid">
        <Card>
          <div className="section-head">
            <div>
              <p className="eyebrow">PROGRESSIVE OVERLOAD</p>
              <h2>Watch the work grow.</h2>
            </div>
            <TrendingUp size={23} />
          </div>
          <Field label="Movement">
            <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              {allExercises(state).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="fine-print">
            Highest working-set load per session · {exercise.unit}.{' '}
            {exercise.loadKind === 'assistance'
              ? 'Less assistance can indicate progress.'
              : 'Compare reps and effort alongside load.'}{' '}
            Machine stacks and different equipment are not directly comparable.
          </p>
          <TrendChart points={points} label={`${exercise.name} working load`} unit="kg" />
          {history.length > 0 && (
            <div className="performance-table">
              <div>
                <span>DATE</span>
                <span>WORKING SETS · KG × REPS</span>
              </div>
              {history
                .slice(-5)
                .reverse()
                .map((entry, i) => (
                  <div key={i}>
                    <span>{dateLabel(entry.date)}</span>
                    <strong>
                      {entry.sets
                        .filter((s) => s.completed && !s.warmup)
                        .map(
                          (s) =>
                            `${s.inputUnit === 'lb' ? loadText(s) : Number(s.weightKg.toFixed(2))} × ${s.reps}`,
                        )
                        .join(' · ')}
                    </strong>
                  </div>
                ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="section-head">
            <div>
              <p className="eyebrow">OPTIONAL BODY TREND</p>
              <h2>Waist, over time.</h2>
            </div>
            <Ruler size={23} />
          </div>
          <p className="muted">
            Use a consistent measurement method. Strength, fitness, and consistency matter alongside
            body measurements.
          </p>
          <TrendChart
            points={measures
              .filter((m) => m.waistCm != null)
              .slice(-10)
              .map((m) => ({ date: m.date, value: m.waistCm }))}
            label="Waist circumference"
            unit="cm"
          />
          <div className="measurement-list">
            {measures
              .slice(-5)
              .reverse()
              .map((m) => (
                <div className="row" key={m.id}>
                  <span>{dateLabel(m.date)}</span>
                  <strong>
                    {m.waistCm != null ? `${m.waistCm} cm` : '—'}{' '}
                    <small>{m.weightKg != null ? `· ${m.weightKg} kg` : ''}</small>
                  </strong>
                  <button
                    className="icon-btn muted"
                    aria-label={`Delete measurement ${m.date}`}
                    onClick={() =>
                      task.run(() =>
                        change((draft) => {
                          draft.measurements = draft.measurements.filter(
                            (item) => item.id !== m.id,
                          );
                        }),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
          <Button variant="ghost" onClick={() => setModal('measurement')}>
            Record a measurement
            <Plus size={16} />
          </Button>
        </Card>
      </div>
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">BUILD YOUR ENGINE</p>
            <h2>Cardio log</h2>
          </div>
          <Button variant="secondary" onClick={() => setModal('cardio')}>
            <Plus size={16} />
            Log cardio
          </Button>
        </div>
        {state.cardio.length ? (
          <div className="cardio-history">
            {state.cardio
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15)
              .map((entry) => (
                <div key={entry.id}>
                  <span className="icon-tile sage">
                    <Activity size={18} />
                  </span>
                  <div>
                    <strong>{entry.activity}</strong>
                    <small>
                      {dateLabel(entry.date)} · {entry.intensity}
                    </small>
                  </div>
                  <strong>
                    {entry.minutes}
                    <small> min</small>
                  </strong>
                  <button
                    className="icon-btn muted"
                    aria-label={`Delete cardio ${entry.activity}`}
                    onClick={() =>
                      task.run(() =>
                        change((draft) => {
                          draft.cardio = draft.cardio.filter((c) => c.id !== entry.id);
                        }),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <Empty icon={Footprints} title="Build a comfortable baseline.">
            Log a walk, bike ride, or another activity you enjoy.
          </Empty>
        )}
      </Card>
      <FormError error={task.error} />
      {modal === 'cardio' && <CardioForm onClose={() => setModal(null)} />}{' '}
      {modal === 'measurement' && (
        <Modal title="Record a measurement" onClose={() => setModal(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              task.run(async () => {
                if (form.waistCm === '' && form.weightKg === '')
                  throw new Error('Enter at least one measurement.');
                await change((draft) => {
                  draft.measurements.push({
                    id: uid(),
                    date: form.date,
                    waistCm: form.waistCm === '' ? null : Number(form.waistCm),
                    weightKg: form.weightKg === '' ? null : Number(form.weightKg),
                  });
                });
                setModal(null);
                setForm({ date: dayKey(), waistCm: '', weightKg: '' });
              });
            }}
          >
            <Field label="Date">
              <input
                required
                type="date"
                max={dayKey()}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Waist (cm, optional)">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={form.waistCm}
                  onChange={(e) => setForm({ ...form, waistCm: e.target.value })}
                />
              </Field>
              <Field label="Weight (kg, optional)">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </Field>
            </div>
            <p className="muted">
              Measurements are records only. They do not automatically change your nutrition
              targets. Review those separately in Profile.
            </p>
            <FormError error={task.error} />
            <SaveButton busy={task.busy}>Save measurement</SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
