import usda from './foods.json';
import { makeRecipe, nutrientKeys } from '../domain/nutrition';

// Small, attributed reference catalog. Rows contain measured composition per 100 g,
// not a promise that a particular restaurant's recipe matches the reference.
const myfcdRows = [
  [
    '212006',
    'Karipap',
    'Currypuff (Karipap)',
    [319, 4.7, 43.2, 14.1, 0.2, 170, 24, 1.3, 164, 0.6],
    40,
    '1 piece (biji)',
    'Breakfast & kuih',
  ],
  [
    '212007',
    'Karipap pusing',
    'Currypuff, twisted (Karipap pusing)',
    [216, 5.2, 11.2, 16.7, 0.7, 286, 37, 1.9, 212, 0],
    59,
    '1 piece (biji)',
    'Breakfast & kuih',
  ],
  [
    '213023',
    'Pisang goreng',
    'Pisang goreng',
    [198, 2, 37.5, 4.4, 0.2, 83, 7, 0.6, 185, 3.2],
    50,
    '1 reference piece',
    'Breakfast & kuih',
  ],
  [
    '101014',
    'Nasi putih',
    'Rice, cooked (Nasi)',
    [130, 2.3, 30, 0.1, 0, 6, 3, 0.2, 6, 0],
    76,
    '1 scoop (senduk)',
    'Rice & noodles',
  ],
  [
    '221019',
    'Nasi lemak (rice preparation)',
    'Rice, coconut milk (Nasi lemak)',
    [169, 4.2, 25.3, 5.7, 0.3, 338, 24, 1.8, 121, 0.4],
    150,
    '1 rice portion',
    'Rice & noodles',
  ],
  [
    '221018',
    'Nasi ayam',
    'Rice, chicken (Nasi ayam)',
    [121, 7, 20, 1.4, 0.1, 305, 10, 0.3, 60, 0.1],
    230,
    '1 plate (pinggan)',
    'Rice & noodles',
  ],
  [
    '221021',
    'Nasi goreng',
    'Rice, fried (Nasi goreng)',
    [193, 4.9, 26.3, 7.6, 0.1, 444, 22, 7.6, 143, 0],
    200,
    '1 plate (pinggan)',
    'Rice & noodles',
  ],
  [
    '221010',
    'Mee goreng',
    'Mee (wheat noodle), fried (Mee goreng)',
    [165, 5.5, 23.9, 5.3, 0.2, 654, 19, 1.3, 46, 1.7],
    170,
    '1 plate (pinggan)',
    'Rice & noodles',
  ],
  [
    '221023',
    'Roti canai (without dhal)',
    '(Roti canai)',
    [317, 7, 47.9, 10.8, 0, 536, 13, 1.5, 152, 0],
    95,
    '1 piece (keping)',
    'Breakfast & kuih',
  ],
  [
    '221024',
    'Roti telur (without dhal)',
    '(Roti telur)',
    [264, 9.2, 34.2, 10, 0, 392, 30, 1.6, 141, 0],
    135,
    '1 piece (keping)',
    'Breakfast & kuih',
  ],
  [
    '221025',
    'Kuah dhal',
    'Yellow dhal gravy, served with roti canai / roti telur',
    [73, 3.1, 9, 2.7, 0.4, 670, 18, 1.2, 25, 0],
    80,
    '½ cup (cawan)',
    'Lauk & sides',
  ],
  [
    '222012',
    'Ayam goreng',
    'Chicken, fried (Ayam goreng)',
    [283, 22.4, 3.6, 19.9, 0, 161, 162, 3.5, 295, 0],
    90,
    '1 piece (ketul), edible part',
    'Lauk & sides',
  ],
  [
    '223011',
    'Ikan kembung goreng',
    'Indian mackerel, fried (Ikan kembong goreng)',
    [274, 31, 5.4, 14.3, 0, 169, 38, 1.5, 508, 0],
    80,
    '1 edible fish portion',
    'Lauk & sides',
  ],
  [
    '223013',
    'Ikan kembung goreng berlada',
    'Indian mackerel, fried in chilli (Ikan kembong goreng berlada)',
    [336, 19.4, 1.2, 28.2, 0, 87, 60, 2.7, 448, 0],
    64,
    '1 edible fish portion',
    'Lauk & sides',
  ],
];
const columns = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sodium',
  'calcium',
  'iron',
  'potassium',
  'vitaminC',
];
const empty = () => Object.fromEntries(nutrientKeys.map((key) => [key, null]));
export const localFoods = myfcdRows.map(
  ([id, name, sourceDescription, values, defaultGrams, portion, category]) => ({
    id: `myfcd-${id}`,
    name,
    sourceDescription,
    local: true,
    category,
    defaultGrams,
    portionNote:
      'Typical portions are estimates. Adjust grams to match your serving; recipes, oil, and edible weight vary.',
    source: {
      name: 'MyFCD · Ministry of Health Malaysia (1997 reference)',
      foodId: id,
      year: 1997,
      url: `https://myfcd.moh.gov.my/myfcd97/index.php/site/detail_product/${id}/0/10/-1/0/0/`,
    },
    nutrients: {
      ...empty(),
      ...Object.fromEntries(columns.map((key, i) => [key, values[i]])),
      fiber: null,
    },
    referenceFibreG: values[4],
    portions: [
      { label: `${portion} · approx. ${defaultGrams} g`, grams: defaultGrams },
      { label: '100 g', grams: 100 },
    ],
    tags: [],
    allergens: [],
    allergenInfoConfirmed: false,
    suggestionEligible: true,
  }),
);

const alias = (id, name, defaultGrams, label, category, aliases) => {
  const source = usda.find((food) => food.id === id);
  return {
    ...structuredClone(source),
    id: `local-${id}`,
    name,
    local: true,
    category,
    aliases,
    defaultGrams,
    portionNote:
      'Generic ingredient reference, not a Malaysian dish analysis. Portion weights are estimates.',
    portions: [
      { label: `${label} · approx. ${defaultGrams} g`, grams: defaultGrams },
      { label: '100 g', grams: 100 },
    ],
  };
};
localFoods.push(
  alias('usda-173424', 'Telur rebus', 50, '1 egg (biji), without shell', 'Lauk & sides', [
    'boiled egg',
  ]),
  alias('usda-172467', 'Tempe (cooked reference)', 80, '1 portion', 'Lauk & sides', ['tempeh']),
  alias('usda-173944', 'Pisang', 100, '1 medium edible portion', 'Fruit & basics', ['banana']),
  alias('usda-171477', 'Dada ayam panggang, without skin', 100, '1 portion', 'Lauk & sides', [
    'chicken breast roasted',
  ]),
);

const bankSource = 'https://jknselangor.moh.gov.my/documents/pdf/2016/info/bank_kalori_makanan.pdf';
// Energy-only references: never infer protein, sugar, or other macros from kcal.
const drinks = [
  [
    'teh-susu',
    'Teh susu',
    200,
    130,
    '1 cup (cawan)',
    'Milk tea reference; sweetness and milk quantities vary.',
  ],
  [
    'teh-tarik',
    'Teh tarik (reference recipe)',
    234,
    103,
    '1 reference cup',
    'Calculated from the source recipe: 200 g plain tea + 5 g evaporated milk (7 kcal) + 29 g condensed milk (96 kcal).',
  ],
  [
    'teh-tarik-less-sweet',
    'Teh tarik kurang manis (reference recipe)',
    224,
    70,
    '1 reference cup',
    'Calculated from the source recipe: 200 g plain tea + 5 g evaporated milk (7 kcal) + 19 g condensed milk (63 kcal).',
  ],
  [
    'sirap-bandung',
    'Sirap bandung',
    250,
    160,
    '1 glass (gelas)',
    'Source reference glass; milk and syrup quantities vary.',
  ],
  [
    'sirap-limau',
    'Sirap limau',
    250,
    90,
    '1 glass (gelas)',
    'Source reference glass; syrup and sugar quantities vary.',
  ],
];
localFoods.push(
  ...drinks.map(([id, name, grams, calories, label, note]) => ({
    id: `kkm-${id}`,
    name,
    local: true,
    category: 'Drinks',
    defaultGrams: grams,
    nutrients: { ...empty(), calories: (calories / grams) * 100 },
    source: { name: 'MOH Malaysia · Bank Kalori Makanan', url: bankSource },
    portions: [
      { label: `${label} · approx. ${grams} g`, grams },
      { label: '100 g', grams: 100 },
    ],
    portionNote: `${note} Energy only; other nutrients are not supplied by this reference.`,
    tags: [],
    allergens: [],
    allergenInfoConfirmed: false,
    suggestionEligible: false,
  })),
);

function combo(id, name, items, category) {
  const ingredients = items.map(([foodId, grams]) => ({
    food: localFoods.find((food) => food.id === foodId),
    grams,
  }));
  const grams = ingredients.reduce((sum, item) => sum + item.grams, 0);
  const recipe = makeRecipe(name, ingredients, grams);
  return {
    id,
    name,
    aliases: id === 'plate-nasi-ayam-goreng' ? ['nasi campur', 'nasi berlauk'] : [],
    local: true,
    category,
    defaultGrams: grams,
    ...recipe,
    source: {
      name: 'Calculated reference plate · MyFCD ingredients',
      url: 'https://myfcd.moh.gov.my/',
    },
    portionNote: `Estimated plate: ${ingredients.map((item) => `${item.grams} g ${item.food.name}`).join(' + ')}. Log extra sauces, vegetables, and drinks separately.`,
    components: ingredients.map((item) => ({ foodId: item.food.id, grams: item.grams })),
    nutrients: recipe.nutrients,
    portions: [
      { label: `1 reference plate · ${grams} g`, grams },
      { label: '100 g', grams: 100 },
    ],
    tags: [],
    allergens: [],
    allergenInfoConfirmed: false,
    suggestionEligible: true,
  };
}
localFoods.push(
  combo(
    'plate-nasi-ayam-goreng',
    'Nasi putih + ayam goreng',
    [
      ['myfcd-101014', 152],
      ['myfcd-222012', 90],
    ],
    'Everyday plates',
  ),
  combo(
    'plate-roti-dhal',
    'Roti canai + kuah dhal',
    [
      ['myfcd-221023', 95],
      ['myfcd-221025', 80],
    ],
    'Everyday plates',
  ),
);

export const foodCategories = [
  'All local food',
  'Everyday plates',
  'Rice & noodles',
  'Lauk & sides',
  'Breakfast & kuih',
  'Drinks',
  'Fruit & basics',
];
export const foodCatalog = [...localFoods]
  .sort((a, b) => foodCategories.indexOf(a.category) - foodCategories.indexOf(b.category))
  .concat(usda);
export const searchFood = (food, query) =>
  `${food.name} ${food.sourceDescription || ''} ${(food.aliases || []).join(' ')}`
    .toLowerCase()
    .includes(query.toLowerCase().trim());
