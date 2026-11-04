import { describe, expect, it } from 'vitest';
import foods from '../../src/data/foods.json';
import {
  foodIdeas,
  makeRecipe,
  micronutrientTargets,
  nutrientTotals,
  nutritionTargets,
  validateFood,
} from '../../src/domain/nutrition';
import { demoJournal } from '../../src/data/demo';
describe('food records and nutrition context', () => {
  it('preserves unknown nutrients rather than counting them as zero', () => {
    const totals = nutrientTotals([
      { grams: 100, food: { nutrients: { protein: 10, sodium: 0 } } },
      { grams: 50, food: { nutrients: { protein: null } } },
    ]);
    expect(totals.protein).toEqual({ amount: 10, known: 1, total: 2, complete: false });
    expect(totals.iron.amount).toBeNull();
    expect(totals.sodium.amount).toBe(0);
  });
  it('scales a recipe by final cooked yield and propagates missing values', () => {
    const result = makeRecipe(
      'Test',
      [{ grams: 200, food: { name: 'Ingredient', nutrients: { calories: 100, protein: 20 } } }],
      400,
    );
    expect(result.nutrients.protein).toBe(10);
    expect(result.nutrients.calories).toBe(50);
    expect(result.nutrients.iron).toBeNull();
    expect(() => makeRecipe('Test', [], 0)).toThrow();
  });
  it('requires calories and rejects invalid label values', () => {
    expect(() => validateFood({ name: 'Test', nutrients: {} })).toThrow();
    expect(() =>
      validateFood({ name: 'Test', nutrients: { calories: 200, protein: -5 } }),
    ).toThrow();
    expect(validateFood({ name: 'Test', nutrients: { calories: 200 } }).protein).toBeNull();
  });
  it('does not estimate without supported details or when targets are off', () => {
    expect(nutritionTargets({})).toBeNull();
    expect(nutritionTargets({ ...demoJournal().profile, nutritionMode: 'off' })).toBeNull();
    expect(nutritionTargets({ ...demoJournal().profile, age: 16 })).toBeNull();
    expect(nutritionTargets({ ...demoJournal().profile, weightKg: 40, heightCm: 180 })).toBeNull();
  });
  it('uses optional manual targets and age-specific references', () => {
    const profile = demoJournal().profile;
    expect(nutritionTargets(profile).protein).toBe(120);
    expect(micronutrientTargets({ ...profile, age: 65 })).toEqual({});
    expect(micronutrientTargets({ ...profile, age: undefined })).toEqual({});
    expect(micronutrientTargets({ ...profile, nutritionMode: 'off' })).toEqual({});
    expect(micronutrientTargets({ ...profile, clinicianTargets: true })).toEqual({});
    expect(
      nutritionTargets({
        ...profile,
        nutritionMode: 'manual',
        manualTargets: { calories: 2100, protein: 130, carbs: 240, fat: 68 },
      }).estimated,
    ).toBe(false);
  });
  it('pauses unverified food suggestions for allergies and respects vegetarian settings', () => {
    const profile = demoJournal().profile;
    const totals = nutrientTotals([{ grams: 100, food: foods[0] }]);
    expect(foodIdeas({ ...profile, allergies: ['soy'] }, foods, totals)).toEqual([]);
    expect(
      foodIdeas({ ...profile, vegetarian: true }, foods, totals).every((idea) =>
        idea.food.tags.includes('vegetarian'),
      ),
    ).toBe(true);
  });
  it('includes real source IDs and data for every starter food', () => {
    expect(foods).toHaveLength(20);
    expect(new Set(foods.map((f) => f.id)).size).toBe(20);
    expect(foods.every((f) => f.source.fdcId && Number.isFinite(f.nutrients.calories))).toBe(true);
    expect(foods.find((f) => f.id === 'usda-171477').nutrients.protein).toBeCloseTo(31.02, 1);
  });
});
