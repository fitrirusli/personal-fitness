import { foodCatalog as foods } from './local-foods';
import { programs, exerciseById } from './exercises';
import { dayKey, shiftDay, uid } from '../domain/dates';
import { emptyJournal } from '../lib/journal';

export function demoJournal() {
  const state = emptyJournal();
  const today = dayKey();
  state.profile = {
    name: 'Alex',
    age: 28,
    heightCm: 175,
    weightKg: 75,
    sex: 'male',
    trainingDays: 3,
    weekdays: [1, 3, 5],
    activityLevel: 'moderate',
    nutritionMode: 'estimate',
    energyApproach: 'maintenance',
    cardioGoalMinutes: 90,
    cardioSessionMinutes: 20,
    waterGoalMl: 2200,
    allergies: [],
    vegetarian: false,
    clinicianTargets: false,
  };
  const loads = {
    'leg-press': 70,
    'bench-press': 40,
    'cable-row': 35,
    'leg-curl': 25,
    'lateral-raise': 6,
    rdl: 50,
    'shoulder-press': 12,
    pulldown: 35,
    'leg-extension': 30,
    'biceps-curl': 8,
    'goblet-squat': 20,
    'db-press': 16,
    'db-row': 16,
    triceps: 20,
    'knee-raise': 0,
  };
  for (let index = 0; index < 6; index++) {
    const template = programs[3][index % 3];
    const date = shiftDay(today, -14 + index * 2);
    state.sessions.push({
      id: uid(),
      date,
      name: template.name,
      focus: template.focus,
      templateIndex: index % 3,
      programDays: 3,
      status: 'completed',
      startedAt: `${date}T09:00:00+08:00`,
      completedAt: `${date}T10:00:00+08:00`,
      notes: '',
      exercises: template.exerciseIds.map((id) => {
        const exercise = exerciseById[id];
        return {
          id: uid(),
          exerciseId: id,
          plan: { restSeconds: exercise.rest },
          pain: false,
          skipped: false,
          sets: Array.from({ length: exercise.sets }, (_, i) => ({
            id: uid(),
            number: i + 1,
            weightKg: loads[id] || 0,
            reps: index < 3 ? exercise.reps[1] - 1 : exercise.reps[1],
            rir: 2,
            completed: true,
            warmup: false,
          })),
        };
      }),
    });
  }
  const meal = (id, grams, group, date = today) => ({
    id: uid(),
    date,
    meal: group,
    grams,
    food: structuredClone(foods.find((food) => food.id === id)),
    loggedAt: new Date().toISOString(),
  });
  state.meals = [
    meal('myfcd-221023', 95, 'Breakfast'),
    meal('myfcd-221025', 80, 'Breakfast'),
    meal('kkm-teh-tarik', 234, 'Breakfast'),
    meal('myfcd-101014', 152, 'Lunch'),
    meal('myfcd-222012', 90, 'Lunch'),
    meal('local-usda-173424', 50, 'Lunch'),
    meal('local-usda-173944', 100, 'Snacks'),
  ];
  state.checkins[today] = { sleepHours: 7.5, energy: 4, soreness: 2, pain: false };
  state.cardio = [
    {
      id: uid(),
      date: shiftDay(today, -1),
      activity: 'Incline walk',
      minutes: 20,
      intensity: 'moderate',
    },
  ];
  state.water = [{ id: uid(), date: today, ml: 750 }];
  state.measurements = [
    { id: uid(), date: shiftDay(today, -28), weightKg: 76, waistCm: 86 },
    { id: uid(), date: shiftDay(today, -14), weightKg: 75.5, waistCm: 85 },
    { id: uid(), date: today, weightKg: 75, waistCm: 84 },
  ];
  return state;
}
