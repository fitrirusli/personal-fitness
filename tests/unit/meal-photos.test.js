import { describe, expect, it } from 'vitest';
import { demoJournal } from '../../src/data/demo';
import { foodCatalog } from '../../src/data/local-foods';
import {
  logPhotoMeal,
  photoRecord,
  removeMealRecord,
  validateMealPhoto,
} from '../../src/domain/meal-photos';
import { validateJournal } from '../../src/lib/journal';
import { nutrientTotals } from '../../src/domain/nutrition';
import { encodeBackup, decodeBackup } from '../../src/lib/backup';

const photo = () => photoRecord('/9j/2Q==', 1, 1);
describe('local manually confirmed meal photos', () => {
  it('stores one photo for multiple foods and restores it inside the encrypted backup', async () => {
    const state = demoJournal();
    const image = photo();
    logPhotoMeal(state, {
      photo: image,
      date: '2026-11-02',
      meal: 'Lunch',
      items: [
        { food: foodCatalog[0], grams: 100 },
        {
          food: {
            id: 'test-custom-bowl',
            name: 'Test custom bowl',
            nutrientBasis: 'portion',
            nutrients: { protein: 30 },
          },
          portions: 1.5,
        },
      ],
    });
    expect(state.mealPhotos).toHaveLength(1);
    expect(
      state.meals.slice(-2).every((entry) => entry.photoId === image.id && entry.photoConfirmed),
    ).toBe(true);
    expect(validateJournal(state)).toBe(state);
    const restored = await decodeBackup(
      await encodeBackup(state, 'test-photo-password'),
      'test-photo-password',
    );
    expect(restored.mealPhotos[0].chunks.join('')).toBe('/9j/2Q==');
    expect(restored.meals.at(-2).grams).toBe(100);
    const custom = restored.meals.at(-1);
    expect(custom.portions).toBe(1.5);
    expect(nutrientTotals([custom]).protein.amount).toBe(45);
    expect(nutrientTotals([custom]).calories.amount).toBeNull();
  });
  it('keeps a shared photo until its last food record is removed', () => {
    const state = demoJournal();
    const image = photo();
    logPhotoMeal(state, {
      photo: image,
      date: '2026-11-02',
      meal: 'Lunch',
      items: [
        { food: foodCatalog[0], grams: 100 },
        { food: foodCatalog[1], grams: 50 },
      ],
    });
    const entries = state.meals.slice(-2);
    removeMealRecord(state, entries[0].id);
    expect(state.mealPhotos).toHaveLength(1);
    removeMealRecord(state, entries[1].id);
    expect(state.mealPhotos).toHaveLength(0);
  });
  it('rejects unsupported or oversized encoded photos and dangling food references', () => {
    expect(() => validateMealPhoto({ ...photo(), mime: 'image/svg+xml' })).toThrow();
    expect(() => validateMealPhoto({ ...photo(), chunks: ['javascript:alert(1)'] })).toThrow();
    expect(() => validateMealPhoto({ ...photo(), chunks: ['a'.repeat(20000)] })).toThrow();
    const state = demoJournal();
    state.meals[0].photoId = 'absent';
    state.meals[0].photoConfirmed = true;
    expect(() => validateJournal(state)).toThrow();
  });
});
