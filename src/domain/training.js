import { programs } from '../data/exercises';
import { allExercises, getExercise } from './exercises';
import { dayKey, round, uid, weekDays, weekday, shiftDay } from './dates';
import { validLoadInput, fromKg } from './loads';
import { rememberWorkout } from './routines';

export function nextTemplate(state) {
  const chosenDays = Number(state.profile?.trainingDays || 3);
  const days = Object.hasOwn(programs, chosenDays) ? chosenDays : 3;
  const templates = programs[days] || programs[3];
  const completed = state.sessions.filter(
    (session) => session.status === 'completed' && session.programDays === days,
  );
  const last = completed.at(-1);
  const index = last ? (last.templateIndex + 1) % templates.length : 0;
  return { ...templates[index], index, programDays: days };
}

export function exerciseHistory(state, exerciseId) {
  return state.sessions
    .filter((session) => session.status === 'completed')
    .flatMap((session) =>
      session.exercises
        .filter((entry) => entry.exerciseId === exerciseId)
        .map((entry) => ({ ...entry, date: session.date, completedAt: session.completedAt })),
    )
    .filter((entry) => entry.sets.some((set) => set.completed && !set.warmup))
    .sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)));
}

export function recommendExercise(state, exerciseId, checkin = {}) {
  const exercise = getExercise(state, exerciseId);
  if (!exercise) throw new Error('This exercise is not in your library.');
  const history = exerciseHistory(state, exerciseId);
  const last = history.at(-1);
  const completed = last?.sets.filter((set) => set.completed && !set.warmup) || [];
  const lastLoad = completed.length ? completed[0].weightKg : null;
  const baseline = state.profile?.baselines?.[exerciseId];
  const base = {
    exerciseId,
    sets: exercise.sets,
    reps: [...exercise.reps],
    weightKg: lastLoad ?? baseline ?? (exercise.loadKind === 'bodyweight' ? 0 : null),
    kind: 'repeat',
    reason: 'Build consistent, controlled repetitions at this load.',
    restSeconds: exercise.rest,
  };
  if (checkin.pain || last?.pain)
    return {
      ...base,
      weightKg: null,
      kind: 'review_pain',
      reason: 'Pain was reported. Pause this movement and review it before selecting a load.',
    };
  if (checkin.energy <= 2 || checkin.soreness >= 4)
    return {
      ...base,
      sets: Math.max(1, exercise.sets - 1),
      kind: 'recovery',
      reason:
        'Your check-in suggests lower readiness. Consider one fewer working set and keep effort manageable.',
    };
  if (!last)
    return {
      ...base,
      kind: 'calibrate',
      reason:
        baseline != null
          ? 'Your own baseline is loaded. Confirm it with comfortable, controlled working sets.'
          : 'No comparable session yet. Choose a comfortable starting load; the app will learn from your logged sets.',
    };
  const successful = (entry) => {
    const work = entry.sets.filter((set) => set.completed && !set.warmup);
    return (
      !entry.pain &&
      work.length >= exercise.sets &&
      work.every(
        (set) =>
          set.reps >= exercise.reps[1] &&
          set.rir != null &&
          set.rir >= 2 &&
          set.weightKg === lastLoad,
      )
    );
  };
  if (history.length >= 2 && successful(history.at(-1)) && successful(history.at(-2))) {
    if (exercise.increment <= 0 && exercise.loadKind !== 'bodyweight')
      return {
        ...base,
        kind: 'review',
        reason: 'Your recorded reps improved. Choose your next load manually for this exercise.',
      };
    if (exercise.loadKind === 'bodyweight')
      return {
        ...base,
        kind: 'technique',
        reason:
          'You reached the top of the range twice. Keep control consistent or review a harder variation with a trainer.',
      };
    const load =
      exercise.loadKind === 'assistance'
        ? Math.max(0, lastLoad - exercise.increment)
        : lastLoad + exercise.increment;
    return {
      ...base,
      weightKg: round(load, 2),
      kind: 'increase',
      reason:
        exercise.loadKind === 'assistance'
          ? 'Two comparable sessions met the upper rep target with at least 2 reps in reserve. Try a little less assistance.'
          : 'Two comparable sessions met the upper rep target with at least 2 reps in reserve. Consider the smallest configured load increase.',
    };
  }
  if (
    completed.every((set) => set.reps >= exercise.reps[1]) &&
    completed.some((set) => set.rir == null)
  )
    return {
      ...base,
      kind: 'record_effort',
      reason:
        'Your reps reached the top of the range. Record reps in reserve before a load increase is suggested.',
    };
  const lowTwice =
    history.length >= 2 &&
    history
      .slice(-2)
      .every((entry) =>
        entry.sets
          .filter((set) => set.completed && !set.warmup)
          .some((set) => set.reps < exercise.reps[0]),
      );
  if (lowTwice)
    return {
      ...base,
      kind: 'review',
      reason:
        'Some sets fell below the rep range in two sessions. Review technique, rest, and recovery before adding load.',
    };
  return {
    ...base,
    kind: 'add_reps',
    reason:
      'Keep the load and work toward the top of the rep range. An extra controlled rep is progress too.',
  };
}

export function createSession(state, date = dayKey()) {
  if (state.sessions.some((session) => session.status === 'active'))
    throw new Error('Finish or discard your active session first.');
  const template = nextTemplate(state);
  const checkin = state.checkins[date] || {};
  return {
    id: uid(),
    date,
    name: template.name,
    focus: template.focus,
    templateIndex: template.index,
    programDays: template.programDays,
    status: 'active',
    startedAt: new Date().toISOString(),
    completedAt: null,
    notes: '',
    exercises: template.exerciseIds.map((id) => {
      const plan = recommendExercise(state, id, checkin);
      return {
        id: uid(),
        exerciseId: id,
        plan,
        pain: false,
        skipped: false,
        sets: Array.from({ length: plan.sets }, (_, index) => ({
          id: uid(),
          number: index + 1,
          weightKg: plan.weightKg,
          reps: null,
          rir: null,
          completed: false,
          warmup: false,
        })),
      };
    }),
  };
}

export function logSet(state, sessionId, entryId, setId, input) {
  if (!validLoadInput(input))
    throw new Error('The entered unit and converted weight do not match. Re-enter the load.');
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== 'active') throw new Error('This session is no longer active.');
  if (session.pendingStopAt) throw new Error('Continue the workout before logging another set.');
  const entry = session.exercises.find((item) => item.id === entryId);
  const set = entry?.sets.find((item) => item.id === setId);
  if (!set) throw new Error('This set is unavailable.');
  if (set.completed) return;
  if (entry.pain || entry.skipped)
    throw new Error('This movement is paused. Review pain or unskip it before logging.');
  if (
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 0 ||
    input.weightKg > 1000 ||
    !Number.isInteger(input.reps) ||
    input.reps < 1 ||
    input.reps > 100 ||
    (input.rir != null && (!Number.isInteger(input.rir) || input.rir < 0 || input.rir > 5))
  )
    throw new Error('Enter a valid load, 1–100 reps, and an optional RIR from 0 to 5.');
  Object.assign(set, { ...input, completed: true, loggedAt: new Date().toISOString() });
  if (!input.inputUnit) {
    delete set.inputUnit;
    delete set.inputWeight;
  }
  if (input.inputUnit) entry.displayUnit = input.inputUnit;
  state.restUntil = Date.now() + entry.plan.restSeconds * 1000;
}

export function completeSession(state, id, { remember = true } = {}) {
  const session = state.sessions.find((item) => item.id === id);
  if (!session || session.status !== 'active') throw new Error('This session is no longer active.');
  if (!session.exercises.some((entry) => entry.sets.some((set) => set.completed && !set.warmup)))
    throw new Error('Log at least one working set before completing a session.');
  session.status = 'completed';
  session.completedAt = session.pendingStopAt || new Date().toISOString();
  delete session.pendingStopAt;
  if (remember) rememberWorkout(state, session);
  state.restUntil = null;
}

export function requestSessionStop(state, id, at = new Date().toISOString()) {
  const session = state.sessions.find((item) => item.id === id);
  if (session?.status !== 'active') throw new Error('This session is no longer active.');
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) throw new Error('Invalid stop time.');
  session.pendingStopAt ||= at;
}
export function continueSession(state, id) {
  const session = state.sessions.find((item) => item.id === id);
  if (session?.status !== 'active') throw new Error('This session is no longer active.');
  delete session.pendingStopAt;
}
export function discardSession(state, id) {
  const session = state.sessions.find((item) => item.id === id);
  if (session?.status !== 'active') throw new Error('This session is no longer active.');
  state.sessions = state.sessions.filter((item) => item.id !== id);
  state.restUntil = null;
}

export function alternativeExercises(exerciseId, state = {}) {
  const source = getExercise(state, exerciseId);
  return allExercises(state).filter(
    (entry) =>
      entry.id !== exerciseId && entry.pattern !== 'custom' && entry.pattern === source?.pattern,
  );
}

export function cardioPlan(state, date = dayKey()) {
  const week = weekDays(date);
  const minutes = state.cardio
    .filter((entry) => week.includes(entry.date))
    .reduce((sum, entry) => sum + entry.minutes * (entry.intensity === 'vigorous' ? 2 : 1), 0);
  const goal = state.profile?.cardioGoalMinutes ?? 60;
  const recovery = state.checkins[date] || {};
  const remaining = Math.max(0, goal - minutes);
  const duration = Math.min(remaining, Math.max(0, state.profile?.cardioSessionMinutes ?? 15));
  return {
    minutes,
    goal,
    remaining,
    duration: recovery.pain ? 0 : duration,
    intensity: 'moderate',
    reason: recovery.pain
      ? 'Pain was reported. Review suitable activity before adding cardio.'
      : remaining
        ? 'A manageable session toward your chosen weekly activity goal. Moderate effort means you can still hold a conversation.'
        : 'You have met your chosen weekly activity goal. Additional activity is optional, based on recovery.',
  };
}

export function isTrainingDay(profile, date = dayKey()) {
  return (profile?.weekdays || [1, 3, 5]).includes(weekday(date));
}

export function dailyDirection(state, date = dayKey()) {
  const active = state.sessions.find((session) => session.status === 'active');
  const completed = state.sessions.filter(
    (session) => session.status === 'completed' && session.date === date,
  );
  const nextDate = Array.from({ length: 7 }, (_, i) => shiftDay(date, i + 1)).find((day) =>
    isTrainingDay(state.profile, day),
  );
  if (active) return { kind: 'active', session: active, nextDate };
  if (state.checkins[date]?.pain) return { kind: 'review', nextDate };
  if (completed.length) return { kind: 'done', session: completed.at(-1), nextDate };
  return { kind: isTrainingDay(state.profile, date) ? 'train' : 'rest', nextDate };
}

export function sessionOverview(state, template = nextTemplate(state), date = dayKey()) {
  const plans = template.exerciseIds.map((id) =>
    recommendExercise(state, id, state.checkins[date]),
  );
  const sets = plans.reduce((sum, plan) => sum + plan.sets, 0);
  const minutes =
    Math.round(
      (8 +
        plans.reduce(
          (sum, plan) =>
            sum + (plan.sets * 40 + Math.max(0, plan.sets - 1) * plan.restSeconds) / 60 + 1,
          0,
        )) /
        5,
    ) * 5;
  return { plans, sets, minutes };
}

export function nextSetDefaults(state, entry, set) {
  const earlier = entry.sets
    .filter((item) => item.completed && item.warmup === set.warmup && item.number < set.number)
    .at(-1);
  const last = exerciseHistory(state, entry.exerciseId)
    .at(-1)
    ?.sets.filter((item) => item.completed && !item.warmup)
    .at(-1);
  const source = earlier || set;
  const inputUnit = source.inputUnit || entry.displayUnit || last?.inputUnit || 'kg';
  return {
    weightKg: earlier?.weightKg ?? set.weightKg ?? '',
    inputUnit,
    inputWeight:
      source.weightKg != null
        ? source.inputUnit === inputUnit && source.inputWeight != null
          ? source.inputWeight
          : fromKg(source.weightKg, inputUnit)
        : '',
    reps:
      set.reps ??
      earlier?.reps ??
      entry.plan.targetReps ??
      Math.min(
        last?.reps || getExercise(state, entry.exerciseId).reps[0],
        (entry.plan.reps || getExercise(state, entry.exerciseId).reps)[1],
      ),
    rir: '',
  };
}

export function configuredExercise(state, input, date = dayKey()) {
  const exercise = getExercise(state, input.exerciseId);
  if (!exercise) throw new Error('Choose an exercise from your library.');
  const sets = Number(input.sets);
  const reps = Number(input.reps);
  const weightKg =
    input.weightKg === '' || input.weightKg == null
      ? exercise.loadKind === 'bodyweight'
        ? 0
        : null
      : Number(input.weightKg);
  if (
    !Number.isInteger(sets) ||
    sets < 1 ||
    sets > 20 ||
    !Number.isInteger(reps) ||
    reps < 1 ||
    reps > 100 ||
    (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000))
  )
    throw new Error('Use 1–20 sets, 1–100 reps, and a valid load.');
  const suggested = recommendExercise(state, exercise.id, state.checkins[date]);
  if (weightKg != null && !validLoadInput({ ...input, weightKg }))
    throw new Error('Check the entered load unit and conversion.');
  const plan = {
    ...suggested,
    sets,
    reps: [reps, reps],
    targetReps: reps,
    weightKg,
    kind: 'custom',
    reason: 'Your chosen sets, reps, and starting load. Log the actual values for each set.',
  };
  return {
    id: uid(),
    exerciseId: exercise.id,
    displayUnit: input.inputUnit || 'kg',
    plan,
    pain: false,
    skipped: false,
    sets: Array.from({ length: sets }, (_, index) => ({
      id: uid(),
      number: index + 1,
      weightKg,
      reps: null,
      rir: null,
      completed: false,
      warmup: false,
      ...(weightKg != null && input.inputUnit
        ? { inputUnit: input.inputUnit, inputWeight: Number(input.inputWeight) }
        : {}),
    })),
  };
}

export function createCustomSession(state, input, date = dayKey(), { allowEmpty = false } = {}) {
  if (input.location != null && !['gym', 'home'].includes(input.location))
    throw new Error('Choose gym or home for this workout.');
  if (state.sessions.some((session) => session.status === 'active'))
    throw new Error('Finish or discard your active workout first.');
  if (
    !input.name?.trim() ||
    input.name.trim().length > 100 ||
    !Array.isArray(input.exercises) ||
    (!input.exercises.length && !allowEmpty) ||
    input.exercises.length > 30 ||
    new Set(input.exercises.map((entry) => entry.exerciseId)).size !== input.exercises.length
  )
    throw new Error('Name your workout and choose 1–30 different exercises.');
  return {
    id: uid(),
    date,
    name: input.name.trim(),
    focus: 'Your selected exercises',
    kind: 'custom',
    dayType: input.dayType || 'full',
    location: input.location || 'gym',
    ...(input.templateId ? { templateId: input.templateId } : {}),
    ...(input.scheduledSlotId ? { scheduledSlotId: input.scheduledSlotId } : {}),
    templateIndex: null,
    programDays: null,
    status: 'active',
    startedAt: new Date().toISOString(),
    completedAt: null,
    notes: '',
    exercises: input.exercises.map((entry) => configuredExercise(state, entry, date)),
  };
}

export function addSessionExercises(state, sessionId, inputs) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (session?.status !== 'active') throw new Error('This workout is no longer active.');
  const ids = [
    ...session.exercises.map((entry) => entry.exerciseId),
    ...inputs.map((entry) => entry.exerciseId),
  ];
  if (!inputs.length || ids.length > 30 || new Set(ids).size !== ids.length)
    throw new Error('Choose different exercises, up to 30 per workout.');
  session.exercises.push(...inputs.map((entry) => configuredExercise(state, entry, session.date)));
}

export function startEmptySession(
  state,
  { name = 'My workout', location = 'gym' } = {},
  date = dayKey(),
) {
  return createCustomSession(state, { name, location, exercises: [] }, date, { allowEmpty: true });
}
export function moveSessionExercise(state, sessionId, entryId, offset) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (session?.status !== 'active') throw new Error('This workout is no longer active.');
  const index = session.exercises.findIndex((entry) => entry.id === entryId);
  const destination = index + offset;
  if (
    index < 0 ||
    ![-1, 1].includes(offset) ||
    destination < 0 ||
    destination >= session.exercises.length
  )
    return;
  [session.exercises[index], session.exercises[destination]] = [
    session.exercises[destination],
    session.exercises[index],
  ];
}
export function removeSessionExercise(state, sessionId, entryId, { allowCompleted = false } = {}) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (session?.status !== 'active' && !(allowCompleted && session?.status === 'completed'))
    throw new Error('This workout is no longer active.');
  const entry = session.exercises.find((item) => item.id === entryId);
  if (!entry) return;
  if (entry.sets.some((set) => set.completed))
    throw new Error('Undo the saved sets first to remove this exercise.');
  session.exercises = session.exercises.filter((item) => item.id !== entryId);
}
