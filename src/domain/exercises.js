import { exerciseById, exercises } from '../data/exercises';
import { muscleGroups } from '../data/muscles';

export const allExercises = (state) => [...exercises, ...(state.customExercises || [])];
export const repLabel = (range) => (range[0] === range[1] ? String(range[0]) : range.join('–'));
export const getExercise = (state, id) =>
  Object.hasOwn(exerciseById, id)
    ? exerciseById[id]
    : state.customExercises?.find((exercise) => exercise.id === id);

export function validateExercise(exercise) {
  if (
    exercise?.primaryMuscles != null &&
    (!Array.isArray(exercise.primaryMuscles) ||
      new Set(exercise.primaryMuscles).size !== exercise.primaryMuscles.length ||
      exercise.primaryMuscles.some((id) => !muscleGroups.some((group) => group.id === id)))
  )
    throw new Error('Choose valid muscle groups for this exercise.');
  if (
    !exercise ||
    typeof exercise.id !== 'string' ||
    !exercise.id.startsWith('custom-') ||
    exercise.id.length > 120 ||
    typeof exercise.name !== 'string' ||
    !exercise.name.trim() ||
    exercise.name.length > 100 ||
    typeof exercise.muscle !== 'string' ||
    exercise.muscle.length > 80 ||
    typeof exercise.pattern !== 'string' ||
    exercise.pattern.length > 60 ||
    typeof exercise.equipment !== 'string' ||
    exercise.equipment.length > 80 ||
    !['external', 'bodyweight', 'assistance'].includes(exercise.loadKind) ||
    typeof exercise.unit !== 'string' ||
    exercise.unit.length > 80 ||
    !Number.isFinite(exercise.increment) ||
    exercise.increment < 0 ||
    exercise.increment > 100 ||
    !Number.isInteger(exercise.sets) ||
    exercise.sets < 1 ||
    exercise.sets > 20 ||
    !Array.isArray(exercise.reps) ||
    exercise.reps.length !== 2 ||
    exercise.reps.some((value) => !Number.isInteger(value) || value < 1 || value > 100) ||
    exercise.reps[0] > exercise.reps[1] ||
    !Number.isInteger(exercise.rest) ||
    exercise.rest < 0 ||
    exercise.rest > 900 ||
    typeof exercise.cue !== 'string' ||
    exercise.cue.length > 1000
  )
    throw new Error('Check this exercise name, units, sets, reps, and rest time.');
  return exercise;
}

export const workoutTypes = [
  {
    id: 'leg',
    label: 'Leg day',
    patterns: ['squat', 'hinge', 'knee-flexion', 'knee-extension', 'calves', 'core'],
  },
  {
    id: 'pull',
    label: 'Pull day',
    patterns: ['horizontal-pull', 'vertical-pull', 'elbow-flexion'],
  },
  {
    id: 'push',
    label: 'Push day',
    patterns: ['horizontal-push', 'vertical-push', 'shoulder-isolation', 'elbow-extension'],
  },
  {
    id: 'upper',
    label: 'Upper body',
    patterns: [
      'horizontal-pull',
      'vertical-pull',
      'elbow-flexion',
      'horizontal-push',
      'vertical-push',
      'shoulder-isolation',
      'elbow-extension',
    ],
  },
  { id: 'full', label: 'My workout', patterns: null },
];
