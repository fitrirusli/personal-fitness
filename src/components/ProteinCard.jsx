import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Target } from 'lucide-react';
import { useJournal } from '../lib/store';
import { proteinProgress, proteinTarget } from '../domain/nutrition';
import { dayKey, dateLabel } from '../domain/dates';
import { Button, Card, Field, FormError, Meter, Modal, SaveButton, useTask } from './ui';

function ProteinTarget({ onClose }) {
  const { state, change } = useJournal();
  const task = useTask();
  const [mode, setMode] = useState('manual');
  const [grams, setGrams] = useState(proteinTarget(state.profile) || '');
  const [weight, setWeight] = useState(
    state.profile.proteinEstimateWeightKg || state.profile.weightKg || '',
  );
  const estimate =
    weight !== '' && Number(weight) >= 35 && Number(weight) <= 200
      ? Math.round(Number(weight) * 1.6)
      : null;
  return (
    <Modal title="Your daily protein target" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          task.run(async () => {
            const target = mode === 'manual' ? Number(grams) : estimate;
            if (!Number.isFinite(target) || target < 1 || target > 400)
              throw new Error('Enter a target from 1 to 400 g, or a supported body weight.');
            await change((draft) => {
              draft.profile.dailyProteinTarget = target;
              draft.profile.proteinTargetSource = mode === 'manual' ? 'manual' : 'weight-estimate';
              if (mode === 'estimate') draft.profile.proteinEstimateWeightKg = Number(weight);
            });
            onClose();
          });
        }}
      >
        <div className="view-switch">
          <button
            type="button"
            className={mode === 'manual' ? 'active' : ''}
            onClick={() => setMode('manual')}
          >
            Enter grams
          </button>
          <button
            type="button"
            disabled={state.profile.clinicianTargets}
            className={mode === 'estimate' ? 'active' : ''}
            onClick={() => setMode('estimate')}
          >
            Help estimate
          </button>
        </div>
        {mode === 'manual' ? (
          <Field label="Daily protein target (g)">
            <input
              required
              autoFocus
              type="number"
              min={1}
              max={400}
              step="any"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              placeholder="Your chosen daily grams"
            />
          </Field>
        ) : (
          <>
            <Field label="Body weight for estimate (kg)">
              <input
                required
                type="number"
                min={35}
                max={200}
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <p className="notice">
              {estimate ? `${estimate} g / day` : 'Enter your weight for a starting estimate.'} ·
              1.6 g/kg for an adult who trains. This is a starting estimate, not a measured
              requirement.
            </p>
          </>
        )}
        <p className="muted">
          No calorie setup is needed. Use your individually recommended target if you have one.
        </p>
        <FormError error={task.error} />
        <SaveButton busy={task.busy}>Save protein target</SaveButton>
      </form>
    </Modal>
  );
}

export default function ProteinCard({ date = dayKey(), onLogFood }) {
  const { state } = useJournal();
  const [editing, setEditing] = useState(false);
  const progress = proteinProgress(state, date);
  return (
    <>
      <Card className={`protein-card ${progress.status === 'reached' ? 'protein-reached' : ''}`}>
        <div className="section-head">
          <div>
            <p className="eyebrow">PROTEIN</p>
            <h2>
              {progress.status === 'reached'
                ? 'Logged target reached.'
                : date === dayKey()
                  ? 'Enough protein today?'
                  : `Protein · ${dateLabel(date)}`}
            </h2>
          </div>
          <button className="text-btn" onClick={() => setEditing(true)}>
            <Target size={16} />
            {progress.target ? 'Edit target' : 'Set target'}
          </button>
        </div>
        <div className="protein-total">
          <strong>
            {Number(progress.amount.toFixed(1)).toLocaleString()}
            <small> g</small>
          </strong>
          <span>{progress.target ? `/ ${progress.target} g target` : 'protein recorded'}</span>
          {progress.status === 'reached' && <Check size={25} />}
        </div>
        <Meter value={progress.amount} max={progress.target || 100} />
        <p className="protein-message" role="status">
          {progress.status === 'unset'
            ? 'Set a protein-only target to see how much is left.'
            : progress.status === 'reached'
              ? 'Your known logged protein meets your chosen target.'
              : progress.status === 'empty'
                ? 'Log your food to check your protein against your target.'
                : `${progress.remaining} g left to your target, based on known logged food.`}
        </p>
        {progress.missing > 0 && (
          <p className="fine-print">
            Protein is unknown for {progress.missing} food{' '}
            {progress.missing === 1 ? 'entry' : 'entries'}. Your actual total may be higher.
          </p>
        )}
        <div className="actions">
          {onLogFood ? (
            <Button variant="secondary" onClick={onLogFood}>
              <Plus size={16} />
              Add a meal
            </Button>
          ) : (
            <Link className="btn secondary" to="/food">
              <Plus size={16} />
              Log food
            </Link>
          )}
          <small>Compare logged food with your target; unlogged meals are not counted.</small>
        </div>
      </Card>
      {editing && <ProteinTarget onClose={() => setEditing(false)} />}
    </>
  );
}
