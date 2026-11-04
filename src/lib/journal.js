import { openDB } from 'idb';
import { exerciseById, programs } from '../data/exercises';
import { getExercise, validateExercise } from '../domain/exercises';
import { nutrientKeys, nutrientLimit, validFoodAmount } from '../domain/nutrition';
import { validateMuscleSettings } from '../domain/muscles';
import { validLoadInput } from '../domain/loads';
import { MAX_PHOTOS, validateMealPhoto } from '../domain/meal-photos';

export function emptyJournal() {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: null,
    profile: null,
    sessions: [],
    customExercises: [],
    muscleSettings: null,
    workoutTemplates: [],
    weeklySchedule: [],
    mealPhotos: [],
    meals: [],
    customFoods: [],
    cardio: [],
    water: [],
    measurements: [],
    checkins: {},
    fullDays: [],
    favorites: [],
    restUntil: null,
  };
}

const collections = [
  'sessions',
  'meals',
  'customFoods',
  'cardio',
  'water',
  'measurements',
  'fullDays',
  'favorites',
];
const validDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const number = (value, min, max) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const fail = () => {
  throw new Error(
    'This file is not a valid Personal Fitness backup. Your current records were kept.',
  );
};
function inspect(value, depth = 0) {
  if (depth > 25) fail();
  if (typeof value === 'number' && !Number.isFinite(value)) fail();
  if (typeof value === 'string' && value.length > 20000) fail();
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail();
      inspect(value[key], depth + 1);
    }
  }
}
function uniqueIds(items) {
  const ids = new Set();
  for (const item of items) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !item.id ||
      item.id.length > 120 ||
      ids.has(item.id)
    )
      fail();
    ids.add(item.id);
  }
}
function validFood(food) {
  if (
    !food ||
    typeof food.name !== 'string' ||
    !food.name.trim() ||
    food.name.length > 160 ||
    !food.nutrients ||
    typeof food.nutrients !== 'object' ||
    Array.isArray(food.nutrients) ||
    typeof food.id !== 'string' ||
    (food.nutrientBasis != null && food.nutrientBasis !== 'portion') ||
    (food.nutrientBasis === 'portion' && nutrientKeys.every((key) => food.nutrients[key] == null))
  )
    fail();
  for (const key of nutrientKeys)
    if (
      food.nutrients[key] != null &&
      !number(food.nutrients[key], 0, nutrientLimit(key, food.nutrientBasis))
    )
      fail();
  if (
    food.local &&
    (!number(food.defaultGrams, 0.1, 20000) ||
      !Array.isArray(food.portions) ||
      !food.portions.length)
  )
    fail();
  if (
    food.allergens != null &&
    (!Array.isArray(food.allergens) || food.allergens.some((value) => typeof value !== 'string'))
  )
    fail();
  if (
    ['suggestionEligible', 'allergenInfoConfirmed'].some(
      (key) => food[key] != null && typeof food[key] !== 'boolean',
    )
  )
    fail();
  if (
    food.source?.url &&
    (typeof food.source.url !== 'string' || !food.source.url.startsWith('https://'))
  )
    fail();
  if (food.source?.name != null && typeof food.source.name !== 'string') fail();
  if (
    food.aliases != null &&
    (!Array.isArray(food.aliases) || food.aliases.some((alias) => typeof alias !== 'string'))
  )
    fail();
  if (food.portionNote != null && typeof food.portionNote !== 'string') fail();
  if (
    food.tags != null &&
    (!Array.isArray(food.tags) || food.tags.some((tag) => typeof tag !== 'string'))
  )
    fail();
  if (
    food.portions != null &&
    (!Array.isArray(food.portions) ||
      food.portions.some((p) => typeof p.label !== 'string' || !number(p.grams, 0.1, 50000)))
  )
    fail();
}
export function validateJournal(value) {
  inspect(value);
  if (value?.muscleSettings != null) validateMuscleSettings(value.muscleSettings);
  if (
    !value ||
    value.schemaVersion !== 1 ||
    !number(value.revision, 0, Number.MAX_SAFE_INTEGER) ||
    !value.checkins ||
    Array.isArray(value.checkins) ||
    typeof value.checkins !== 'object'
  )
    fail();
  for (const key of collections)
    if (!Array.isArray(value[key]) || value[key].length > 50000) fail();
  for (const key of collections.slice(0, 6)) uniqueIds(value[key]);
  if (value.customExercises != null) {
    if (!Array.isArray(value.customExercises) || value.customExercises.length > 1000) fail();
    uniqueIds(value.customExercises);
    for (const exercise of value.customExercises) {
      validateExercise(exercise);
      if (Object.hasOwn(exerciseById, exercise.id)) fail();
    }
  }
  if (value.profile !== null) {
    const p = value.profile;
    if (
      !p ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      p.name.length > 80 ||
      !Number.isInteger(p.trainingDays) ||
      p.trainingDays < 1 ||
      p.trainingDays > 7 ||
      !Array.isArray(p.weekdays) ||
      p.weekdays.length !== p.trainingDays ||
      new Set(p.weekdays).size !== p.weekdays.length ||
      p.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      !Array.isArray(p.allergies) ||
      p.allergies.some(
        (a) =>
          ![
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
          ].includes(a),
      )
    )
      fail();
    if (
      !['estimate', 'manual', 'off'].includes(p.nutritionMode) ||
      !['', 'male', 'female'].includes(p.sex) ||
      !['light', 'moderate', 'high'].includes(p.activityLevel) ||
      !['maintenance', 'gentle-deficit'].includes(p.energyApproach) ||
      typeof p.vegetarian !== 'boolean' ||
      typeof p.clinicianTargets !== 'boolean'
    )
      fail();
    if (
      !number(p.cardioGoalMinutes, 0, 600) ||
      !number(p.cardioSessionMinutes, 5, 120) ||
      (p.waterGoalMl != null && !number(p.waterGoalMl, 250, 6000))
    )
      fail();
    if (
      p.manualTargets != null &&
      (typeof p.manualTargets !== 'object' ||
        ['calories', 'protein', 'carbs', 'fat'].some(
          (key) =>
            p.manualTargets[key] != null &&
            !number(p.manualTargets[key], 0, key === 'calories' ? 10000 : 1000),
        ))
    )
      fail();
    if (p.age != null && !number(p.age, 18, 100)) fail();
    if (p.dailyProteinTarget != null && !number(p.dailyProteinTarget, 1, 400)) fail();
    if (
      p.proteinTargetSource != null &&
      !['manual', 'weight-estimate'].includes(p.proteinTargetSource)
    )
      fail();
    if (p.proteinEstimateWeightKg != null && !number(p.proteinEstimateWeightKg, 35, 200)) fail();
    if (p.weightKg != null && !number(p.weightKg, 20, 400)) fail();
    if (p.heightCm != null && !number(p.heightCm, 100, 250)) fail();
    if (p.baselines && Object.values(p.baselines).some((load) => !number(load, 0, 1000))) fail();
  }
  if (value.sessions.filter((item) => item.status === 'active').length > 1) fail();
  if (value.workoutTemplates != null) {
    if (!Array.isArray(value.workoutTemplates) || value.workoutTemplates.length > 500) fail();
    uniqueIds(value.workoutTemplates);
    for (const template of value.workoutTemplates) {
      if (
        typeof template.name !== 'string' ||
        !template.name.trim() ||
        template.name.length > 100 ||
        !['gym', 'home'].includes(template.location) ||
        !Array.isArray(template.exerciseChoices) ||
        !template.exerciseChoices.length ||
        template.exerciseChoices.length > 30 ||
        new Set(template.exerciseChoices.map((item) => item.exerciseId)).size !==
          template.exerciseChoices.length
      )
        fail();
      for (const choice of template.exerciseChoices)
        if (
          !getExercise(value, choice.exerciseId) ||
          !Number.isInteger(choice.sets) ||
          !number(choice.sets, 1, 20) ||
          !Number.isInteger(choice.reps) ||
          !number(choice.reps, 1, 100) ||
          !number(choice.weightKg, 0, 1000) ||
          !validLoadInput(choice)
        )
          fail();
    }
  }
  if (value.weeklySchedule != null) {
    if (!Array.isArray(value.weeklySchedule) || value.weeklySchedule.length > 70) fail();
    uniqueIds(value.weeklySchedule);
    for (const slot of value.weeklySchedule)
      if (
        !Number.isInteger(slot.weekday) ||
        !number(slot.weekday, 0, 6) ||
        typeof slot.name !== 'string' ||
        !slot.name.trim() ||
        slot.name.length > 100 ||
        (slot.templateId != null &&
          !value.workoutTemplates?.some((template) => template.id === slot.templateId))
      )
        fail();
  }
  for (const session of value.sessions) {
    if (
      session.pendingStopAt != null &&
      (session.status !== 'active' ||
        typeof session.pendingStopAt !== 'string' ||
        Number.isNaN(Date.parse(session.pendingStopAt)))
    )
      fail();
    if (session.location != null && !['gym', 'home'].includes(session.location)) fail();
    if (
      !validDate(session.date) ||
      !['active', 'completed'].includes(session.status) ||
      !Array.isArray(session.exercises) ||
      (session.status === 'completed' && session.exercises.length < 1) ||
      session.exercises.length > 30 ||
      (session.kind === 'custom'
        ? session.programDays !== null || session.templateIndex !== null
        : !Number.isInteger(session.programDays) ||
          !Object.hasOwn(programs, session.programDays) ||
          !Number.isInteger(session.templateIndex) ||
          session.templateIndex < 0 ||
          session.templateIndex >= programs[session.programDays].length)
    )
      fail();
    uniqueIds(session.exercises);
    if (
      typeof session.name !== 'string' ||
      typeof session.notes !== 'string' ||
      typeof session.startedAt !== 'string' ||
      Number.isNaN(Date.parse(session.startedAt)) ||
      (session.status === 'completed' &&
        (typeof session.completedAt !== 'string' || Number.isNaN(Date.parse(session.completedAt))))
    )
      fail();
    for (const entry of session.exercises) {
      if (
        !getExercise(value, entry.exerciseId) ||
        !Array.isArray(entry.sets) ||
        entry.sets.length > 30 ||
        !entry.plan ||
        !number(entry.plan.restSeconds, 0, 900)
      )
        fail();
      uniqueIds(entry.sets);
      if (
        entry.plan.targetReps != null &&
        (!Number.isInteger(entry.plan.targetReps) || !number(entry.plan.targetReps, 1, 100))
      )
        fail();
      if (
        entry.plan.sets != null &&
        (!Number.isInteger(entry.plan.sets) || !number(entry.plan.sets, 1, 20))
      )
        fail();
      if (
        (entry.plan.reason != null && typeof entry.plan.reason !== 'string') ||
        (entry.plan.kind != null && typeof entry.plan.kind !== 'string') ||
        (entry.plan.weightKg != null && !number(entry.plan.weightKg, 0, 1000)) ||
        (entry.plan.reps != null &&
          (!Array.isArray(entry.plan.reps) ||
            entry.plan.reps.length !== 2 ||
            entry.plan.reps.some((rep) => !Number.isInteger(rep) || !number(rep, 1, 100))))
      )
        fail();
      if (session.focus != null && typeof session.focus !== 'string') fail();
      if (typeof entry.pain !== 'boolean' || typeof entry.skipped !== 'boolean') fail();
      if (entry.displayUnit != null && !['kg', 'lb'].includes(entry.displayUnit)) fail();
      for (const set of entry.sets) {
        if (!validLoadInput(set)) fail();
        if (
          typeof set.completed !== 'boolean' ||
          (set.weightKg != null && !number(set.weightKg, 0, 1000)) ||
          (set.reps != null && (!Number.isInteger(set.reps) || !number(set.reps, 1, 100))) ||
          (set.rir != null && (!Number.isInteger(set.rir) || !number(set.rir, 0, 5)))
        )
          fail();
        if (set.completed && (set.weightKg == null || set.reps == null)) fail();
        if (
          typeof set.warmup !== 'boolean' ||
          !Number.isInteger(set.number) ||
          !number(set.number, 1, 30)
        )
          fail();
      }
    }
  }
  for (const entry of value.meals) {
    if (
      entry.photoId != null &&
      (typeof entry.photoId !== 'string' ||
        !value.mealPhotos?.some((photo) => photo.id === entry.photoId) ||
        entry.photoConfirmed !== true)
    )
      fail();
    if (
      !validDate(entry.date) ||
      !validFoodAmount(entry) ||
      !['Breakfast', 'Lunch', 'Dinner', 'Snacks'].includes(entry.meal)
    )
      fail();
    validFood(entry.food);
  }
  for (const food of value.customFoods) validFood(food);
  if (value.mealPhotos != null) {
    if (!Array.isArray(value.mealPhotos) || value.mealPhotos.length > MAX_PHOTOS) fail();
    uniqueIds(value.mealPhotos);
    value.mealPhotos.forEach(validateMealPhoto);
  }
  for (const entry of value.cardio)
    if (
      !validDate(entry.date) ||
      !number(entry.minutes, 1, 600) ||
      !['moderate', 'vigorous'].includes(entry.intensity) ||
      typeof entry.activity !== 'string'
    )
      fail();
  for (const entry of value.water)
    if (!validDate(entry.date) || !number(entry.ml, 1, 10000)) fail();
  for (const entry of value.measurements)
    if (
      !validDate(entry.date) ||
      (entry.weightKg != null && !number(entry.weightKg, 20, 400)) ||
      (entry.waistCm != null && !number(entry.waistCm, 30, 250))
    )
      fail();
  for (const [date, entry] of Object.entries(value.checkins)) {
    if (
      !validDate(date) ||
      !entry ||
      !number(entry.energy, 1, 5) ||
      !number(entry.soreness, 1, 5) ||
      !number(entry.sleepHours, 0, 24) ||
      typeof entry.pain !== 'boolean'
    )
      fail();
  }
  if (
    value.fullDays.some((day) => !validDate(day)) ||
    value.favorites.some((id) => typeof id !== 'string') ||
    (value.restUntil != null && !number(value.restUntil, 0, 9999999999999))
  )
    fail();
  return value;
}

export async function openJournal(mode = 'personal') {
  const db = await openDB(`personal-fitness-${mode}`, 1, {
    upgrade(database) {
      database.createObjectStore('journal');
    },
  });
  return {
    async read() {
      return { ...emptyJournal(), ...(await db.get('journal', 'current')) };
    },
    async change(mutate) {
      const tx = db.transaction('journal', 'readwrite');
      const state = { ...emptyJournal(), ...(await tx.store.get('current')) };
      try {
        mutate(state);
        validateJournal(state);
        state.revision++;
        state.updatedAt = new Date().toISOString();
        await tx.store.put(state, 'current');
        await tx.done;
        return state;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* already completed */
        }
        await tx.done.catch(() => {});
        throw error;
      }
    },
    async replace(value) {
      validateJournal(value);
      const state = { ...emptyJournal(), ...structuredClone(value) };
      const tx = db.transaction('journal', 'readwrite');
      try {
        const previous = await tx.store.get('current');
        state.revision = (previous?.revision || 0) + 1;
        state.updatedAt = new Date().toISOString();
        await tx.store.put(state, 'current');
        await tx.done;
        return state;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* already completed */
        }
        await tx.done.catch(() => {});
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}
