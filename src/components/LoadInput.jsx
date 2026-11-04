import { fromKg, toKg } from '../domain/loads';
import { Field } from './ui';

export default function LoadInput({
  value,
  onChange,
  label = 'Weight',
  unitLabel = 'Weight unit',
  ariaLabel,
  required = true,
  compact = false,
}) {
  const unit = value.inputUnit || 'kg';
  const empty = value.weightKg == null || value.weightKg === '';
  const raw = empty ? '' : (value.inputWeight ?? fromKg(value.weightKg, unit));
  return (
    <div className={`load-control ${compact ? 'compact-load' : ''}`}>
      <Field label={`${label} (${unit})`}>
        <input
          aria-label={
            typeof ariaLabel === 'function'
              ? ariaLabel(unit)
              : ariaLabel
                ? `${ariaLabel} (${unit})`
                : undefined
          }
          type="number"
          inputMode="decimal"
          min="0"
          max={unit === 'lb' ? 2204.6226 : 1000}
          step="any"
          required={required}
          placeholder={unit}
          value={raw}
          onChange={(event) => {
            const inputWeight = event.target.value;
            onChange({
              weightKg: inputWeight === '' ? '' : toKg(inputWeight, unit),
              inputWeight: inputWeight === '' ? '' : Number(inputWeight),
              inputUnit: unit,
            });
          }}
        />
      </Field>
      <Field label={unitLabel}>
        <select
          value={unit}
          onChange={(event) => {
            const inputUnit = event.target.value;
            onChange({
              weightKg: value.weightKg,
              inputUnit,
              inputWeight: empty ? '' : fromKg(value.weightKg, inputUnit),
            });
          }}
        >
          <option value="kg">kg</option>
          <option value="lb">lb</option>
        </select>
      </Field>
      {unit === 'lb' && (
        <small className="converted-load">
          {empty
            ? 'Stored in kg after conversion'
            : `≈ ${Number(Number(value.weightKg).toFixed(2))} kg`}
        </small>
      )}
    </div>
  );
}
