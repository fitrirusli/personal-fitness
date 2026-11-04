export const KG_PER_LB = 0.45359237;
export const toKg = (value, unit = 'kg') =>
  Math.round(Number(value) * (unit === 'lb' ? KG_PER_LB : 1) * 1e6) / 1e6;
export const fromKg = (value, unit = 'kg') =>
  Math.round((Number(value) / (unit === 'lb' ? KG_PER_LB : 1)) * 10000) / 10000;
export function loadText(load) {
  if (load.weightKg == null || load.weightKg === '') return 'Choose load';
  const kg = Number(Number(load.weightKg).toFixed(2));
  return load.inputUnit === 'lb'
    ? `${Number(Number(load.inputWeight ?? fromKg(load.weightKg, 'lb')).toFixed(2))} lb (${kg} kg)`
    : `${kg} kg`;
}
export function validLoadInput(load) {
  if (load.inputUnit == null && load.inputWeight == null) return true;
  return (
    ['kg', 'lb'].includes(load.inputUnit) &&
    Number.isFinite(load.inputWeight) &&
    load.inputWeight >= 0 &&
    Number.isFinite(load.weightKg) &&
    load.weightKg >= 0 &&
    load.weightKg <= 1000 &&
    Math.abs(toKg(load.inputWeight, load.inputUnit) - load.weightKg) <= 0.0001
  );
}
