import { describe, expect, it } from 'vitest';
import { localFoods, searchFood } from '../../src/data/local-foods';
import { nutrientTotals } from '../../src/domain/nutrition';
import { demoJournal } from '../../src/data/demo';
import { validateJournal } from '../../src/lib/journal';
describe('Malaysian food and familiar portions', () => {
  it('keeps source IDs, edible portions and missing nutrient values explicit', () => {
    expect(localFoods).toHaveLength(25);
    expect(new Set(localFoods.map((food) => food.id)).size).toBe(25);
    const rice = localFoods.find((food) => food.id === 'myfcd-101014');
    expect(searchFood(rice, 'NASI')).toBe(true);
    expect(rice.nutrients).toMatchObject({
      calories: 130,
      protein: 2.3,
      vitaminD: null,
      vitaminB12: null,
      fiber: null,
    });
    const state = demoJournal();
    state.customFoods = localFoods;
    expect(validateJournal(state)).toBe(state);
  });
  it('calculates reference plates from the listed components', () => {
    const plate = localFoods.find((food) => food.id === 'plate-nasi-ayam-goreng');
    const totals = nutrientTotals([{ food: plate, grams: plate.defaultGrams }]);
    expect(plate.defaultGrams).toBe(242);
    expect(totals.calories.amount).toBeCloseTo(452.3, 1);
    expect(totals.protein.amount).toBeCloseTo(23.66, 1);
    expect(totals.vitaminD.amount).toBeNull();
  });
  it('scales half portions and keeps energy-only drinks from faking complete macros', () => {
    const tea = localFoods.find((food) => food.id === 'kkm-teh-tarik');
    const totals = nutrientTotals([{ food: tea, grams: tea.defaultGrams / 2 }]);
    expect(totals.calories.amount).toBeCloseTo(51.5, 1);
    expect(totals.protein.amount).toBeNull();
    expect(totals.protein.complete).toBe(false);
  });
});
