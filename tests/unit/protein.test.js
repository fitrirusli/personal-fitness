import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { proteinProgress, proteinTarget } from '../../src/domain/nutrition';
import { dayKey } from '../../src/domain/dates';
describe('protein without a calorie setup', () => {
  it('uses an explicit protein-only target even if other targets are off', () => {
    const profile = { ...demoJournal().profile, nutritionMode: 'off', dailyProteinTarget: 140 };
    expect(proteinTarget(profile)).toBe(140);
  });
  it('reports the logged gap, and reaches the target from known protein only', () => {
    const state = demoJournal();
    state.profile.dailyProteinTarget = 100;
    const date = dayKey();
    state.meals = [
      { date, grams: 100, food: { nutrients: { protein: 70 } } },
      { date, grams: 100, food: { nutrients: { protein: null } } },
    ];
    expect(proteinProgress(state, date)).toMatchObject({
      status: 'below',
      remaining: 30,
      missing: 1,
    });
    state.meals[0].food.nutrients.protein = 105;
    expect(proteinProgress(state, date)).toMatchObject({
      status: 'reached',
      remaining: 0,
      missing: 1,
    });
  });
  it('does not mark untracked or entirely unknown protein as adequate', () => {
    const state = demoJournal();
    state.profile.dailyProteinTarget = 100;
    state.meals = [];
    expect(proteinProgress(state, dayKey()).status).toBe('empty');
    state.profile.nutritionMode = 'off';
    delete state.profile.dailyProteinTarget;
    expect(proteinProgress(state, dayKey()).status).toBe('unset');
  });
});
