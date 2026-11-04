export const muscleGroups = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'calves', label: 'Calves' },
  { id: 'core', label: 'Core' },
];

// Tracking categories, not estimates of muscle activation or effective training dose.
// Secondary assistance is visible but does not satisfy a direct-training day target.
export const exerciseMuscles = {
  'leg-press': { primary: ['quads', 'glutes'], secondary: [] },
  'goblet-squat': { primary: ['quads', 'glutes'], secondary: ['core'] },
  'bench-press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'db-press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'cable-row': { primary: ['back'], secondary: ['biceps'] },
  'db-row': { primary: ['back'], secondary: ['biceps'] },
  pulldown: { primary: ['back'], secondary: ['biceps'] },
  'assisted-pullup': { primary: ['back'], secondary: ['biceps'] },
  rdl: { primary: ['hamstrings', 'glutes'], secondary: [] },
  'db-rdl': { primary: ['hamstrings', 'glutes'], secondary: [] },
  'shoulder-press': { primary: ['shoulders'], secondary: ['triceps'] },
  'leg-curl': { primary: ['hamstrings'], secondary: [] },
  'leg-extension': { primary: ['quads'], secondary: [] },
  'lateral-raise': { primary: ['shoulders'], secondary: [] },
  'biceps-curl': { primary: ['biceps'], secondary: [] },
  triceps: { primary: ['triceps'], secondary: [] },
  'calf-raise': { primary: ['calves'], secondary: [] },
  'knee-raise': { primary: ['core'], secondary: [] },
  'home-pushup': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'home-squat': { primary: ['quads', 'glutes'], secondary: [] },
  'home-bridge': { primary: ['glutes'], secondary: [] },
  'home-heel-dig': { primary: ['hamstrings', 'glutes'], secondary: [] },
  'home-calf': { primary: ['calves'], secondary: [] },
  'home-dead-bug': { primary: ['core'], secondary: [] },
  'band-row': { primary: ['back'], secondary: ['biceps'] },
  'band-curl': { primary: ['biceps'], secondary: [] },
  'band-triceps': { primary: ['triceps'], secondary: [] },
  'band-press': { primary: ['shoulders'], secondary: ['triceps'] },
};

export const homeEquipmentOptions = ['Bodyweight', 'Dumbbell', 'Resistance band'];
