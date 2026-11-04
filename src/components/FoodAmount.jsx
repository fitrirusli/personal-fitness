import { portionGrams } from '../domain/nutrition';
import { Field } from './ui';

export default function FoodAmount({ food, amount, onChange, label = 'Portions' }) {
  const base = portionGrams(food);
  const portions = amount.portions ?? '';
  const grams = amount.grams ?? (portions === '' ? '' : Number((base * portions).toFixed(2)));
  const serving = food.portions?.[0]?.label.split(' · ')[0];
  return (
    <div className="stack">
      <div className="portion-choices" aria-label={`${label} presets`}>
        {[0.5, 1, 1.5, 2].map((count) => (
          <button
            type="button"
            key={count}
            className={Number(portions) === count ? 'active' : ''}
            aria-pressed={Number(portions) === count}
            onClick={() => onChange({ portions: count })}
          >
            {count === 0.5 ? '½' : count}× portion
          </button>
        ))}
      </div>
      <Field label={label}>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          max="100"
          step="any"
          value={portions}
          onChange={(event) =>
            onChange({ portions: event.target.value === '' ? '' : event.target.valueAsNumber })
          }
        />
      </Field>
      {serving && <p className="portion-caption">1 portion = {serving}</p>}
      {food.nutrientBasis !== 'portion' && (
        <details className="optional-section">
          <summary>Use grams instead</summary>
          <Field label={`${label} in grams`}>
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              max="20000"
              step="any"
              value={grams}
              onChange={(event) =>
                onChange({ grams: event.target.value === '' ? '' : event.target.valueAsNumber })
              }
            />
          </Field>
          {food.portions?.length > 1 && !food.local && (
            <Field label="Source portion">
              <select
                value=""
                onChange={(event) => onChange({ grams: Number(event.target.value) })}
              >
                <option value="" disabled>
                  Choose a measured serving…
                </option>
                {food.portions.map(({ label, grams }, index) => (
                  <option key={index} value={grams}>
                    {label} · {grams} g
                  </option>
                ))}
              </select>
            </Field>
          )}
        </details>
      )}
    </div>
  );
}
