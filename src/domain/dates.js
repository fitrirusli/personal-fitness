export const TIME_ZONE = 'Asia/Singapore';

export function dayKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDay(day, offset) {
  const date = new Date(`${day}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return dayKey(date);
}

export function weekday(day = dayKey()) {
  return new Date(`${day}T12:00:00+08:00`).getUTCDay();
}

export function weekDays(day = dayKey()) {
  const mondayOffset = (weekday(day) + 6) % 7;
  const monday = shiftDay(day, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftDay(monday, index));
}

export function dateLabel(day, options = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(day.length === 10 ? `${day}T12:00:00+08:00` : day));
}

export const round = (value, decimals = 1) =>
  Math.round((value + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
export const uid = () => crypto.randomUUID();
