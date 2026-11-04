import { round } from './dates';

export const nutrientMeta = {
  calories: { label: 'Energy', unit: 'kcal' },
  protein: { label: 'Protein', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  sodium: { label: 'Sodium', unit: 'mg', upper: true },
  calcium: { label: 'Calcium', unit: 'mg' },
  iron: { label: 'Iron', unit: 'mg' },
  potassium: { label: 'Potassium', unit: 'mg' },
  vitaminD: { label: 'Vitamin D', unit: 'µg' },
  vitaminB12: { label: 'Vitamin B12', unit: 'µg' },
  vitaminC: { label: 'Vitamin C', unit: 'mg' },
};
export const nutrientKeys = Object.keys(nutrientMeta);

export function proteinTarget(profile) {
  if (Number.isFinite(profile?.dailyProteinTarget) && profile.dailyProteinTarget > 0)
    return profile.dailyProteinTarget;
  return nutritionTargets(profile)?.protein || null;
}

export function proteinProgress(state, date) {
  const entries = state.meals.filter((entry) => entry.date === date);
  const total = nutrientTotals(entries).protein;
  const target = proteinTarget(state.profile);
  const amount = total.amount ?? 0;
  return {
    amount,
    target,
    remaining: target == null ? null : round(Math.max(0, target - amount)),
    known: total.known,
    missing: total.total - total.known,
    status:
      target == null
        ? 'unset'
        : total.known === 0
          ? 'empty'
          : amount >= target
            ? 'reached'
            : 'below',
  };
}

export function nutritionTargets(profile) {
  if (!profile || profile.nutritionMode === 'off') return null;
  if (profile.nutritionMode === 'manual' || profile.clinicianTargets) {
    const target = profile.manualTargets;
    if (
      !target ||
      !['calories', 'protein', 'carbs', 'fat'].every(
        (key) => Number.isFinite(target[key]) && target[key] >= 0,
      ) ||
      target.calories < 1200
    )
      return null;
    return { ...target, source: 'Your manually entered targets', estimated: false };
  }
  const { age, heightCm, weightKg, sex } = profile;
  if (
    ![age, heightCm, weightKg].every(Number.isFinite) ||
    age < 18 ||
    weightKg < 35 ||
    weightKg > 200 ||
    heightCm < 120 ||
    heightCm > 230 ||
    !['male', 'female'].includes(sex)
  )
    return null;
  const bmi = weightKg / (heightCm / 100) ** 2;
  if (bmi < 18.5 || age > 70) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const activity = { light: 1.4, moderate: 1.55, high: 1.7 }[profile.activityLevel] || 1.4;
  const calories =
    Math.round((bmr * activity * (profile.energyApproach === 'gentle-deficit' ? 0.95 : 1)) / 10) *
    10;
  if (calories < 1200) return null;
  const protein = Math.round(weightKg * 1.6);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return {
    calories,
    protein,
    fat,
    carbs,
    source: 'Starting estimate: Mifflin–St Jeor, chosen activity, and 1.6 g/kg protein',
    estimated: true,
  };
}

export function micronutrientTargets(profile) {
  if (
    !profile ||
    profile.nutritionMode === 'off' ||
    !Number.isFinite(profile.age) ||
    profile.age < 19 ||
    profile.age > 50 ||
    !['male', 'female'].includes(profile.sex) ||
    profile.clinicianTargets
  )
    return {};
  return {
    fiber: profile.sex === 'male' ? 38 : 25,
    sodium: 2300,
    calcium: 1000,
    iron: profile.sex === 'male' ? 8 : 18,
    potassium: profile.sex === 'male' ? 3400 : 2600,
    vitaminD: 15,
    vitaminB12: 2.4,
    vitaminC: profile.sex === 'male' ? 90 : 75,
  };
}

export const portionGrams = (food) => food.defaultGrams || food.portions?.[0]?.grams || 100;

export function validFoodAmount(entry) {
  if (entry.portions != null)
    return (
      entry.grams == null &&
      Number.isFinite(entry.portions) &&
      entry.portions >= 0.01 &&
      entry.portions <= 100
    );
  return (
    entry.food?.nutrientBasis !== 'portion' &&
    Number.isFinite(entry.grams) &&
    entry.grams >= 0.1 &&
    entry.grams <= 20000
  );
}

export function nutrientTotals(entries) {
  const multipliers = entries.map(({ food, grams, portions }) =>
    food.nutrientBasis === 'portion' ? portions : (grams ?? portions * portionGrams(food)) / 100,
  );
  return Object.fromEntries(
    nutrientKeys.map((key) => {
      let amount = 0;
      let known = 0;
      for (const [index, entry] of entries.entries()) {
        const value = entry.food.nutrients[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          amount += value * multipliers[index];
          known++;
        }
      }
      return [
        key,
        {
          amount: known ? round(amount, 2) : null,
          known,
          total: entries.length,
          complete: entries.length > 0 && known === entries.length,
        },
      ];
    }),
  );
}

export function nutrientLimit(key, basis) {
  if (key === 'calories') return basis === 'portion' ? 10000 : 1000;
  if (['protein', 'carbs', 'fat', 'fiber'].includes(key)) return basis === 'portion' ? 1000 : 100;
  return 100000;
}

export function validateFood(input) {
  if (!input.name?.trim() || input.name.length > 160)
    throw new Error('Give this food a name of up to 160 characters.');
  const nutrients = {};
  for (const key of nutrientKeys) {
    const value = input.nutrients?.[key];
    nutrients[key] = value === '' || value == null ? null : Number(value);
    if (
      nutrients[key] != null &&
      (!Number.isFinite(nutrients[key]) ||
        nutrients[key] < 0 ||
        nutrients[key] > nutrientLimit(key, input.nutrientBasis))
    )
      throw new Error(`Check the ${nutrientMeta[key].label.toLowerCase()} value.`);
  }
  if (input.nutrientBasis === 'portion') {
    if (nutrientKeys.every((key) => nutrients[key] == null))
      throw new Error('Enter at least one nutrition value for one portion.');
    return nutrients;
  }
  if (nutrients.calories == null)
    throw new Error('Energy per 100 g is required. Leave other unavailable nutrients blank.');
  return nutrients;
}

export function makeRecipe(name, ingredients, yieldGrams) {
  if (!name.trim() || !ingredients.length || !Number.isFinite(yieldGrams) || yieldGrams <= 0)
    throw new Error('Provide a recipe name, ingredients, and the final cooked weight.');
  const totals = nutrientTotals(ingredients);
  const nutrients = Object.fromEntries(
    nutrientKeys.map((key) => [
      key,
      totals[key].complete ? round((totals[key].amount / yieldGrams) * 100, 3) : null,
    ]),
  );
  return {
    nutrients,
    ingredientNames: ingredients.map((entry) => `${entry.grams} g ${entry.food.name}`),
    yieldGrams,
  };
}

export function foodIdeas(profile, foods, totals, favorites = []) {
  const target = { protein: proteinTarget(profile) };
  if (!target.protein || totals.protein.amount == null) return [];
  const remaining = Math.max(0, target.protein - totals.protein.amount);
  if (remaining < 10) return [];
  const allergies = profile.allergies || [];
  return foods
    .filter(
      (food) =>
        food.nutrients.protein >= 10 &&
        food.nutrients.calories > 0 &&
        food.suggestionEligible &&
        (!profile.vegetarian || food.tags?.includes('vegetarian')) &&
        (!allergies.length ||
          (food.allergenInfoConfirmed &&
            !allergies.some((allergen) => food.allergens?.includes(allergen)))),
    )
    .sort(
      (a, b) =>
        Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) ||
        b.nutrients.protein / b.nutrients.calories - a.nutrients.protein / a.nutrients.calories,
    )
    .slice(0, 3)
    .map((food) => {
      const grams =
        Math.round(Math.min(200, Math.max(50, (remaining / food.nutrients.protein) * 100)) / 10) *
        10;
      return {
        food,
        grams,
        protein: round((food.nutrients.protein * grams) / 100),
        calories: Math.round((food.nutrients.calories * grams) / 100),
      };
    });
}
