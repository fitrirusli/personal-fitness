import { workingExerciseChoices } from './routines';

export function removeHistoryExercise(state, sessionId, entryId, { expectedSessionRemoval } = {}) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (session?.status !== 'completed')
    throw new Error('Open a completed workout to correct its history.');
  if (!session.exercises.some((entry) => entry.id === entryId))
    throw new Error('This exercise is no longer in this record. Reopen the workout.');
  const remaining = session.exercises.filter((entry) => entry.id !== entryId);
  const choices = workingExerciseChoices({ ...session, exercises: remaining });
  if (
    typeof expectedSessionRemoval === 'boolean' &&
    expectedSessionRemoval !== (choices.length === 0)
  )
    throw new Error(
      'This workout changed while you were reviewing it. Reopen the record before removing anything.',
    );
  session.exercises = remaining;
  const owned = (state.workoutTemplates || []).filter(
    (template) => template.sourceSessionId === sessionId,
  );
  if (choices.length) {
    for (const template of owned) {
      template.exerciseChoices = structuredClone(choices);
      template.updatedAt = new Date().toISOString();
    }
    return { removedSession: false };
  }
  // A completed session without any actual working sets would create false attendance.
  state.sessions = state.sessions.filter((item) => item.id !== sessionId);
  const removedTemplateIds = new Set(owned.map((template) => template.id));
  state.workoutTemplates = (state.workoutTemplates || []).filter(
    (template) => !removedTemplateIds.has(template.id),
  );
  for (const slot of state.weeklySchedule || [])
    if (removedTemplateIds.has(slot.templateId)) slot.templateId = null;
  for (const other of state.sessions)
    if (removedTemplateIds.has(other.templateId)) delete other.templateId;
  return { removedSession: true };
}
