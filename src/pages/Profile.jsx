import { useState } from 'react';
import {
  Download,
  Upload,
  ShieldCheck,
  Trash2,
  Dumbbell,
  ArrowRight,
  Leaf,
  LockKeyhole,
} from 'lucide-react';
import { useJournal } from '../lib/store';
import { decodeBackup, encodeBackup, saveBackup } from '../lib/backup';
import { nutritionTargets } from '../domain/nutrition';
import { dayKey } from '../domain/dates';
import { useSearchParams } from 'react-router-dom';
import { ScheduleFields } from '../components/PlanSettings';
import {
  Button,
  Card,
  Field,
  FormError,
  Heading,
  Modal,
  SaveButton,
  Tag,
  useTask,
} from '../components/ui';

const initial = {
  name: '',
  age: '',
  heightCm: '',
  weightKg: '',
  sex: '',
  trainingDays: 3,
  weekdays: [1, 3, 5],
  activityLevel: 'light',
  nutritionMode: 'estimate',
  energyApproach: 'maintenance',
  cardioGoalMinutes: 60,
  cardioSessionMinutes: 15,
  waterGoalMl: '',
  vegetarian: false,
  allergies: [],
  clinicianTargets: false,
  manualTargets: { calories: '', protein: '', carbs: '', fat: '' },
};
const optionalNumber = (value) => (value === '' || value == null ? null : Number(value));
export function ProfileForm({ onboarding = false, onSaved }) {
  const { state, change, switchMode } = useJournal();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => ({ ...initial, ...state.profile }));
  const task = useTask();
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const target = nutritionTargets({
    ...form,
    age: optionalNumber(form.age),
    heightCm: optionalNumber(form.heightCm),
    weightKg: optionalNumber(form.weightKg),
  });
  const save = (event) => {
    event.preventDefault();
    task.run(async () => {
      if (!form.name.trim()) throw new Error('Enter a name or nickname.');
      if (form.weekdays.length !== Number(form.trainingDays))
        throw new Error(`Choose exactly ${form.trainingDays} training days.`);
      if (form.age != null && form.age !== '' && (Number(form.age) < 18 || Number(form.age) > 100))
        throw new Error('This app supports adults aged 18 and over.');
      const profile = {
        ...form,
        name: form.name.trim(),
        trainingDays: Number(form.trainingDays),
        age: optionalNumber(form.age),
        heightCm: optionalNumber(form.heightCm),
        weightKg: optionalNumber(form.weightKg),
        waterGoalMl: optionalNumber(form.waterGoalMl),
        cardioGoalMinutes: Number(form.cardioGoalMinutes),
        cardioSessionMinutes: Number(form.cardioSessionMinutes),
        manualTargets: Object.fromEntries(
          Object.entries(form.manualTargets || initial.manualTargets).map(([key, value]) => [
            key,
            optionalNumber(value),
          ]),
        ),
      };
      if (profile.nutritionMode === 'manual' && !nutritionTargets(profile))
        throw new Error('Complete all four manual targets. Energy must be at least 1,200 kcal.');
      await change((draft) => {
        const proteinFields = Object.fromEntries(
          ['dailyProteinTarget', 'proteinTargetSource', 'proteinEstimateWeightKg']
            .filter((key) => draft.profile?.[key] != null)
            .map((key) => [key, draft.profile[key]]),
        );
        draft.profile = { ...profile, ...proteinFields };
      });
      onSaved?.();
    });
  };
  return (
    <form onSubmit={save} className="stack">
      <div className="form-grid">
        <Field label="Name or nickname">
          <input
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="What should we call you?"
            autoComplete="given-name"
          />
        </Field>
      </div>
      <ScheduleFields value={form} onChange={setForm} />
      <div className="setup-promise">
        <Dumbbell size={20} />
        <div>
          <strong>Your workout is ready from this.</strong>
          <p>
            Choose your exercises, sets, reps, and weight when you start a workout; future sessions
            use your records.
          </p>
        </div>
      </div>
      <details
        className="optional-section"
        open={searchParams.get('section') === 'nutrition' || undefined}
      >
        <summary>
          Food targets and preferences <span>Optional · you can do this later</span>
        </summary>
        <div className="stack optional-body">
          <div className="section-label">
            <Leaf size={18} />
            <h3>Nutrition starting point</h3>
          </div>
          <p className="muted">
            Body measurements are optional. Use an estimate, enter your own targets, or just track
            food without targets.
          </p>
          <div className="form-grid three">
            <Field label="Age (years)">
              <input
                type="number"
                min="18"
                max="100"
                value={form.age ?? ''}
                onChange={(e) => set('age', e.target.value)}
              />
            </Field>
            <Field label="Height (cm)">
              <input
                type="number"
                min="100"
                max="250"
                step="0.1"
                value={form.heightCm ?? ''}
                onChange={(e) => set('heightCm', e.target.value)}
              />
            </Field>
            <Field label="Weight (kg, optional)">
              <input
                type="number"
                min="20"
                max="400"
                step="0.1"
                value={form.weightKg ?? ''}
                onChange={(e) => set('weightKg', e.target.value)}
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Nutrition targets">
              <select
                value={form.nutritionMode}
                onChange={(e) => set('nutritionMode', e.target.value)}
              >
                <option value="estimate">Estimate from my details</option>
                <option value="manual">Enter my own targets</option>
                <option value="off">Track without targets</option>
              </select>
            </Field>
            <Field
              label="Sex used for nutrition equations"
              hint="Optional. These reference equations use male/female categories."
            >
              <select value={form.sex} onChange={(e) => set('sex', e.target.value)}>
                <option value="">Prefer not to specify</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </div>
          {form.nutritionMode === 'estimate' && (
            <div className="form-grid">
              <Field label="Typical daily activity">
                <select
                  value={form.activityLevel}
                  onChange={(e) => set('activityLevel', e.target.value)}
                >
                  <option value="light">Mostly seated, some training</option>
                  <option value="moderate">Regular movement and training</option>
                  <option value="high">Very active work and training</option>
                </select>
              </Field>
              <Field label="Energy approach">
                <select
                  value={form.energyApproach}
                  onChange={(e) => set('energyApproach', e.target.value)}
                >
                  <option value="maintenance">Maintenance · support training</option>
                  <option value="gentle-deficit">Gentle reduction · 5% below estimate</option>
                </select>
              </Field>
            </div>
          )}
          {form.nutritionMode === 'manual' && (
            <div className="form-grid">
              {['calories', 'protein', 'carbs', 'fat'].map((key) => (
                <Field
                  key={key}
                  label={`${key === 'calories' ? 'Energy (kcal)' : `${key[0].toUpperCase()}${key.slice(1)} (g)`}`}
                >
                  <input
                    type="number"
                    required
                    min={key === 'calories' ? 1200 : 0}
                    max={key === 'calories' ? 10000 : 1000}
                    value={form.manualTargets?.[key] ?? ''}
                    onChange={(e) =>
                      set('manualTargets', { ...form.manualTargets, [key]: e.target.value })
                    }
                  />
                </Field>
              ))}
            </div>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.clinicianTargets}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  clinicianTargets: e.target.checked,
                  nutritionMode: e.target.checked ? 'manual' : p.nutritionMode,
                }))
              }
            />
            I use clinician-guided targets (disables general nutrient references).
          </label>
          {form.nutritionMode !== 'off' && (
            <div className="notice">
              {target ? (
                <>
                  <strong>
                    {target.calories.toLocaleString()} kcal · {target.protein} g protein
                  </strong>
                  <span>
                    {target.estimated
                      ? 'A starting estimate, not a measured requirement. Review with appetite, training performance, and longer-term trends.'
                      : 'Your entered targets.'}
                  </span>
                </>
              ) : (
                'Targets will appear when supported details or complete manual targets are available. Tracking still works without them.'
              )}
            </div>
          )}
          <div className="form-grid three">
            <Field
              label="Weekly cardio goal (minutes)"
              hint="Your chosen starting goal; build gradually."
            >
              <input
                required
                type="number"
                min="0"
                max="600"
                step="5"
                value={form.cardioGoalMinutes}
                onChange={(e) => set('cardioGoalMinutes', e.target.value)}
              />
            </Field>
            <Field label="Usual cardio session (minutes)">
              <input
                required
                type="number"
                min="5"
                max="120"
                step="5"
                value={form.cardioSessionMinutes}
                onChange={(e) => set('cardioSessionMinutes', e.target.value)}
              />
            </Field>
            <Field
              label="Water reminder goal (ml)"
              hint="Optional personal reminder, not a fluid prescription."
            >
              <input
                type="number"
                min="250"
                max="6000"
                step="250"
                value={form.waterGoalMl ?? ''}
                onChange={(e) => set('waterGoalMl', e.target.value)}
              />
            </Field>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.vegetarian}
              onChange={(e) => set('vegetarian', e.target.checked)}
            />
            Vegetarian food ideas
          </label>
          <Field
            label="Food allergies"
            hint="Starter foods do not certify allergens or cross-contact. Food ideas are disabled when an allergy is selected."
          >
            <div className="chips">
              {[
                'milk',
                'egg',
                'soy',
                'peanut',
                'tree nut',
                'wheat',
                'fish',
                'shellfish',
                'sesame',
                'other',
              ].map((allergen) => (
                <label className="checkbox compact" key={allergen}>
                  <input
                    type="checkbox"
                    checked={form.allergies.includes(allergen)}
                    onChange={() =>
                      set(
                        'allergies',
                        form.allergies.includes(allergen)
                          ? form.allergies.filter((item) => item !== allergen)
                          : [...form.allergies, allergen],
                      )
                    }
                  />
                  {allergen}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </details>
      <FormError error={task.error} />
      <div className="actions">
        <SaveButton busy={task.busy}>
          {onboarding ? 'Show today’s workout' : 'Save profile'}
        </SaveButton>
        {onboarding && (
          <Button type="button" variant="ghost" onClick={() => switchMode('demo')}>
            Explore fictional demo <ArrowRight size={17} />
          </Button>
        )}
      </div>
    </form>
  );
}

export function Onboarding() {
  return (
    <div className="onboarding">
      <div className="onboard-intro">
        <div className="brand">
          <span className="brand-mark">
            <Dumbbell />
          </span>
          personal<span>fitness</span>
        </div>
        <Tag tone="lime">YOUR TRAINING. WITH DIRECTION.</Tag>
        <h1>
          Open the app.
          <br />
          Know what to do.
          <br />
          <em>Make progress.</em>
        </h1>
        <p>A clear plan for the gym, food that supports it, and a record of the work you put in.</p>
        <div className="intro-features">
          <span>
            <ShieldCheck />
            Private on this device
          </span>
          <span>
            <Dumbbell />
            Progress at your pace
          </span>
          <span>
            <Leaf />
            Nutrition with context
          </span>
        </div>
        <small>
          For adults. General fitness guidance; adapt it with a qualified professional for injuries,
          pregnancy, or medical needs.
        </small>
      </div>
      <Card className="onboard-form">
        <p className="eyebrow">LET’S FIND YOUR RHYTHM</p>
        <h2>Your name. Your week. Ready.</h2>
        <ProfileForm onboarding />
      </Card>
    </div>
  );
}

export default function Profile() {
  const { state, mode, replace, reset, switchMode } = useJournal();
  const [modal, setModal] = useState(null);
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const task = useTask();
  const close = () => {
    setModal(null);
    setPassword('');
    setConfirm('');
    setFile(null);
    task.setError('');
  };
  const submit = (event) => {
    event.preventDefault();
    task.run(async () => {
      if (modal === 'export') {
        const text = await encodeBackup(state, password);
        await saveBackup(text, `personal-fitness-${dayKey()}.encrypted.json`);
        setNotice('Encrypted backup created. Store your password separately.');
      }
      if (modal === 'import') {
        if (confirm !== 'REPLACE' || !file)
          throw new Error('Choose a backup and type REPLACE to confirm.');
        if (file.size > 20 * 1024 * 1024) throw new Error('Choose a backup smaller than 20 MB.');
        const next = await decodeBackup(await file.text(), password);
        await replace(next);
        setNotice('Backup restored on this device.');
      }
      if (modal === 'delete') {
        if (confirm !== 'DELETE') throw new Error('Type DELETE to confirm.');
        await reset();
      }
      close();
    });
  };
  return (
    <>
      <Heading eyebrow="MAKE IT YOURS" title="Your profile">
        <Tag>
          <LockKeyhole size={13} />
          On-device storage
        </Tag>
      </Heading>
      <div className="profile-grid">
        <Card>
          <h2>Your starting plan</h2>
          <ProfileForm
            onSaved={() => setNotice('Profile saved. New sessions will use these settings.')}
          />
        </Card>
        <div className="stack">
          <Card className="privacy-card">
            <ShieldCheck size={34} />
            <h2>
              Your records.
              <br />
              Your device.
            </h2>
            <p>
              Workouts and meals stay in this browser or app. No account, analytics, advertising, or
              automatic upload.
            </p>
            <p>
              Export a backup before clearing browser data, uninstalling, or changing devices. App
              storage is private to the app, but is not separately password-encrypted on the device.
            </p>
            <Tag>Malaysia / Singapore time · UTC+8</Tag>
          </Card>
          <Card>
            <h3>Keep a safe copy</h3>
            <p className="muted">
              Backups use a password and AES-GCM encryption. We cannot recover a forgotten password.
            </p>
            <div className="stack">
              <Button variant="secondary" onClick={() => setModal('export')}>
                <Download size={17} />
                Export encrypted backup
              </Button>
              <Button variant="ghost" onClick={() => setModal('import')}>
                <Upload size={17} />
                Restore backup
              </Button>
            </div>
          </Card>
          <Card>
            <h3>Explore the app</h3>
            <p className="muted">
              The fictional demo uses a separate journal from your personal records.
            </p>
            <Button
              variant="secondary"
              onClick={() => switchMode(mode === 'demo' ? 'personal' : 'demo')}
            >
              {mode === 'demo' ? 'Return to my journal' : 'Open fictional demo'}
            </Button>
          </Card>
          <Card>
            <Button variant="danger" onClick={() => setModal('delete')}>
              <Trash2 size={16} />
              Delete {mode === 'demo' ? 'demo' : 'my'} journal
            </Button>
          </Card>
        </div>
      </div>
      {notice && (
        <div className="toast" role="status" onClick={() => setNotice('')}>
          {notice}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === 'export'
              ? 'Export encrypted backup'
              : modal === 'import'
                ? 'Restore a backup'
                : 'Delete this journal?'
          }
          onClose={close}
        >
          <form className="stack" onSubmit={submit}>
            {modal !== 'delete' && (
              <Field
                label="Backup password"
                hint={
                  modal === 'export'
                    ? 'At least 10 characters. Keep the password separate from the file.'
                    : 'Use the password chosen when the backup was created.'
                }
              >
                <input
                  autoFocus
                  type="password"
                  minLength={modal === 'export' ? 10 : 1}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={modal === 'export' ? 'new-password' : 'current-password'}
                />
              </Field>
            )}
            {modal === 'import' && (
              <>
                <Field label="Encrypted backup file">
                  <input
                    type="file"
                    accept=".json,application/json"
                    required
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </Field>
                <p>
                  This replaces the current {mode} journal. Export it first if you want to keep a
                  copy.
                </p>
              </>
            )}
            {modal !== 'export' && (
              <Field label={`Type ${modal === 'delete' ? 'DELETE' : 'REPLACE'} to confirm`}>
                <input
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                />
              </Field>
            )}
            {modal === 'delete' && (
              <p>
                All records in this {mode} journal will be removed from this device. This cannot be
                undone without a backup.
              </p>
            )}
            <FormError error={task.error} />
            <SaveButton busy={task.busy} variant={modal === 'delete' ? 'danger' : 'primary'}>
              {modal === 'delete'
                ? 'Delete journal'
                : modal === 'import'
                  ? 'Restore and replace'
                  : 'Create encrypted backup'}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
