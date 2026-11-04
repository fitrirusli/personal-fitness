import { muscleGroups, exerciseMuscles, homeEquipmentOptions } from '../data/muscles';
import { allExercises, getExercise } from './exercises';
import { dayKey, shiftDay, weekDays, weekday } from './dates';

export function muscleSettings(state) {
  return {
    targets: Object.fromEntries(
      muscleGroups.map(({ id }) => [id, state.muscleSettings?.targets?.[id] ?? 2]),
    ),
    homeEquipment: state.muscleSettings?.homeEquipment || ['Bodyweight'],
    reminder: state.muscleSettings?.reminder || { enabled: false, days: [4, 0], time: '20:00' },
  };
}

export function validMuscleIds(ids) {
  return (
    Array.isArray(ids) &&
    ids.length <= muscleGroups.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => muscleGroups.some((group) => group.id === id))
  );
}

export function validateMuscleSettings(settings) {
  if (
    !settings ||
    typeof settings !== 'object' ||
    Array.isArray(settings) ||
    !settings.targets ||
    typeof settings.targets !== 'object' ||
    Array.isArray(settings.targets) ||
    Object.entries(settings.targets).some(
      ([id, target]) =>
        !muscleGroups.some((group) => group.id === id) ||
        !Number.isInteger(target) ||
        target < 0 ||
        target > 7,
    ) ||
    !Array.isArray(settings.homeEquipment) ||
    new Set(settings.homeEquipment).size !== settings.homeEquipment.length ||
    settings.homeEquipment.some((item) => !homeEquipmentOptions.includes(item)) ||
    !settings.reminder ||
    typeof settings.reminder.enabled !== 'boolean' ||
    !Array.isArray(settings.reminder.days) ||
    !settings.reminder.days.length ||
    settings.reminder.days.length > 7 ||
    new Set(settings.reminder.days).size !== settings.reminder.days.length ||
    settings.reminder.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    typeof settings.reminder.time !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.reminder.time)
  )
    throw new Error('Check weekly muscle targets, home equipment, and reminder settings.');
  return settings;
}

export function mappedMuscles(exercise) {
  if (exercise?.primaryMuscles) return { primary: exercise.primaryMuscles, secondary: [] };
  return exerciseMuscles[exercise?.id] || { primary: [], secondary: [] };
}

export function weeklyMuscles(state, date = dayKey(), through = dayKey()) {
  const days = weekDays(date);
  const settings = muscleSettings(state);
  const rows = muscleGroups.map((group) => ({
    ...group,
    target: settings.targets[group.id],
    dates: new Set(),
    secondaryDates: new Set(),
    sets: 0,
    evidence: [],
  }));
  const unknown = new Set();
  for (const session of state.sessions) {
    if (session.status !== 'completed' || !days.includes(session.date) || session.date > through)
      continue;
    for (const entry of session.exercises) {
      const sets = entry.sets.filter((set) => set.completed && !set.warmup && set.reps > 0);
      if (!sets.length) continue;
      const exercise = getExercise(state, entry.exerciseId);
      const mapped = mappedMuscles(exercise);
      if (!mapped.primary.length) unknown.add(entry.exerciseId);
      for (const row of rows) {
        if (mapped.primary.includes(row.id)) {
          row.dates.add(session.date);
          row.sets += sets.length;
          row.evidence.push({
            date: session.date,
            name: exercise.name,
            sets: sets.length,
            location: session.location || 'unspecified',
            pain: entry.pain,
          });
        }
        if (mapped.secondary.includes(row.id)) row.secondaryDates.add(session.date);
      }
    }
  }
  return {
    days,
    unknown: [...unknown],
    rows: rows.map((row) => ({
      ...row,
      dates: [...row.dates].sort(),
      secondaryDates: [...row.secondaryDates].sort(),
      count: row.dates.size,
      remaining: Math.max(0, row.target - row.dates.size),
    })),
  };
}

export function muscleSuggestions(state, location = 'gym', date = dayKey(), focus = 'all') {
  const coverage = weeklyMuscles(state, date, date);
  const equipment = muscleSettings(state).homeEquipment;
  const checkin = state.checkins[date];
  if (checkin?.pain || checkin?.soreness >= 4 || checkin?.energy <= 2)
    return {
      hold: 'Your check-in suggests pain or low readiness. Review recovery before adding work.',
      choices: [],
    };
  const recentMuscles = new Set(
    state.sessions
      .filter(
        (session) =>
          session.status === 'completed' &&
          session.date >= shiftDay(date, -1) &&
          session.date <= date,
      )
      .flatMap((session) =>
        session.exercises
          .filter((entry) => entry.sets.some((set) => set.completed && !set.warmup && set.reps > 0))
          .flatMap((entry) => mappedMuscles(getExercise(state, entry.exerciseId)).primary),
      ),
  );
  const candidates = coverage.rows.filter(
    (row) =>
      row.target > 0 &&
      row.remaining > 0 &&
      !recentMuscles.has(row.id) &&
      (focus === 'all' || row.id === focus),
  );
  const choices = allExercises(state)
    .map((exercise) => {
      const primary = mappedMuscles(exercise).primary;
      const targets = candidates.filter((row) => primary.includes(row.id));
      const recentPain = state.sessions.some(
        (session) =>
          session.date >= shiftDay(date, -7) &&
          session.date <= date &&
          session.exercises.some((entry) => entry.exerciseId === exercise.id && entry.pain),
      );
      const recentlyWorked = primary.some((id) => recentMuscles.has(id));
      return {
        exercise,
        targets,
        score: targets.reduce((sum, row) => sum + row.remaining, 0),
        recentPain,
        recentlyWorked,
      };
    })
    .filter(
      (choice) =>
        choice.score > 0 &&
        !choice.recentPain &&
        !choice.recentlyWorked &&
        (location !== 'home' || equipment.includes(choice.exercise.equipment)),
    )
    .sort((a, b) => b.score - a.score);
  // Show varied options before repeating several alternatives for the same group.
  const pool = [...choices];
  const covered = new Set();
  const varied = [];
  while (pool.length && varied.length < 6) {
    pool.sort((a, b) => {
      const newScore = (choice) =>
        choice.targets.reduce((sum, row) => sum + (covered.has(row.id) ? 0 : row.remaining), 0);
      const overlap = (choice) => choice.targets.filter((row) => covered.has(row.id)).length;
      return newScore(b) - newScore(a) || overlap(a) - overlap(b);
    });
    const choice = pool.shift();
    varied.push(choice);
    choice.targets.forEach((row) => covered.add(row.id));
  }
  // Offer alternatives, not an automatically assembled or doubled workout.
  return { hold: null, choices: varied };
}

export const MUSCLE_NOTIFICATION_BASE = 840000;
export function muscleReminderPlan(state, now = new Date()) {
  const settings = muscleSettings(state);
  if (!state.profile || !settings.reminder.enabled) return [];
  const today = dayKey(now);
  const plan = [];
  // Future weeks have no logged work yet. Any journal change rebuilds the plan.
  for (let offset = 0; offset < 28; offset++) {
    const date = shiftDay(today, offset);
    if (!settings.reminder.days.includes(weekday(date))) continue;
    const at = new Date(`${date}T${settings.reminder.time}:00+08:00`);
    if (at.getTime() <= new Date(now).getTime()) continue;
    const coverage = weeklyMuscles(state, date, today);
    const gaps = coverage.rows.filter((row) => row.target > 0 && row.remaining > 0);
    if (!gaps.length) continue;
    plan.push({
      id: MUSCLE_NOTIFICATION_BASE + offset + 1,
      title: 'Weekly muscle check',
      body: 'Your saved records have muscle targets left this week. Open Personal Fitness to review them. Allow recovery; there is no need to catch up in one session.',
      schedule: { at },
      isExactNotification: false,
      channelId: 'weekly-muscles',
      smallIcon: 'ic_stat_muscle',
      extra: { kind: 'weekly-muscles', week: coverage.days[0] },
    });
  }
  return plan;
}
