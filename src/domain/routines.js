import { dayKey, uid, weekday } from './dates';

export function workingExerciseChoices(session) {
  return session.exercises
    .filter((entry) => entry.sets.some((set) => set.completed && !set.warmup))
    .map((entry) => {
      const work = entry.sets.filter((set) => set.completed && !set.warmup);
      const last = work.at(-1);
      return {
        exerciseId: entry.exerciseId,
        sets: Math.min(20, work.length),
        reps: last.reps,
        weightKg: last.weightKg,
        ...(last.inputUnit ? { inputUnit: last.inputUnit, inputWeight: last.inputWeight } : {}),
      };
    });
}

export function rememberWorkout(state, session) {
  const exerciseChoices = workingExerciseChoices(session);
  if (!exerciseChoices.length) return null;
  state.workoutTemplates ||= [];
  const existing = state.workoutTemplates.find((item) =>
    session.templateId
      ? item.id === session.templateId
      : item.name === session.name &&
        item.location === (session.location || 'gym') &&
        item.exerciseChoices.map((choice) => choice.exerciseId).join('|') ===
          exerciseChoices.map((choice) => choice.exerciseId).join('|'),
  );
  const template = {
    id: existing?.id || uid(),
    name: session.name,
    location: session.location || 'gym',
    dayType: session.dayType || 'full',
    exerciseChoices,
    sourceSessionId: session.id,
    updatedAt: session.completedAt,
  };
  if (existing) Object.assign(existing, template);
  else if (state.workoutTemplates.length < 500) state.workoutTemplates.push(template);
  else return null;
  session.templateId = template.id;
  const planned = state.weeklySchedule?.find((slot) => slot.id === session.scheduledSlotId);
  if (planned) planned.templateId = template.id;
  return template;
}

export function plannedWorkouts(state, date = dayKey()) {
  return (state.weeklySchedule || [])
    .filter((slot) => slot.weekday === weekday(date))
    .map((slot) => ({
      ...slot,
      template: state.workoutTemplates?.find((item) => item.id === slot.templateId),
    }));
}

export function sessionDurationMs(session, now = Date.now()) {
  return Math.max(
    0,
    (session.completedAt || session.pendingStopAt
      ? Date.parse(session.completedAt || session.pendingStopAt)
      : Number(now)) - Date.parse(session.startedAt),
  );
}
export function durationText(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export const timeText = (timestamp) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(timestamp));
