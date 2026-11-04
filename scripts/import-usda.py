"""Rebuild the starter catalog from the official USDA SR Legacy JSON download.

Usage: python scripts/import-usda.py path/to/FoodData_Central_sr_legacy_food_json_2018-04.json
The source download and all intermediate files belong in .local/, never in Git.
"""
import json
import pathlib
import sys

SELECTION = {
    171477: ('Chicken breast, roasted', False),
    173424: ('Egg, hard-boiled', True),
    168878: ('White rice, cooked', True),
    173944: ('Banana, raw', True),
    169705: ('Oats, dry', True),
    170894: ('Greek yogurt, plain, nonfat', True),
    170903: ('Greek yogurt, plain, lowfat', True),
    172467: ('Tempeh, cooked', True),
    172475: ('Firm tofu, calcium-set, raw', True),
    169967: ('Broccoli, boiled, no salt', True),
    170872: ('Milk, 1%, fortified', True),
    171986: ('Tuna in water, no salt, drained', False),
    172421: ('Lentils, boiled, no salt', True),
    172470: ('Peanut butter, smooth, no salt', True),
    171413: ('Olive oil', True),
    172688: ('Whole-wheat bread', True),
    168462: ('Spinach, raw', True),
    167793: ('Fuji apple, with skin', True),
    171793: ('Beef, 90% lean, patty, pan-broiled', False),
    173757: ('Chickpeas, boiled, no salt', True),
}
NUTRIENTS = {'calories': 1008, 'protein': 1003, 'carbs': 1005, 'fat': 1004,
             'fiber': 1079, 'sodium': 1093, 'calcium': 1087, 'iron': 1089,
             'potassium': 1092, 'vitaminD': 1114, 'vitaminB12': 1178, 'vitaminC': 1162}
data = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
lookup = {food['fdcId']: food for food in data['SRLegacyFoods']}
catalog = []
for fdc_id, (name, vegetarian) in SELECTION.items():
    food = lookup[fdc_id]
    nutrients = {item['nutrient']['id']: item.get('amount') for item in food['foodNutrients']}
    portions = [{'label': '100 g', 'grams': 100}]
    for item in food.get('foodPortions', []):
        if item.get('gramWeight', 0) > 0:
            label = item.get('modifier') or item.get('portionDescription') or item.get('measureUnit', {}).get('name')
            if label and label != 'undetermined':
                portions.append({'label': f"{item.get('amount', 1)} {label}", 'grams': item['gramWeight']})
    catalog.append({'id': f'usda-{fdc_id}', 'name': name, 'sourceDescription': food['description'],
                    'source': {'name': 'USDA SR Legacy', 'fdcId': fdc_id, 'year': 2018,
                               'url': f'https://fdc.nal.usda.gov/food-details/{fdc_id}/nutrients'},
                    'nutrients': {key: nutrients.get(nid) for key, nid in NUTRIENTS.items()},
                    'portions': portions[:7], 'tags': ['vegetarian'] if vegetarian else [],
                    'allergens': [], 'allergenInfoConfirmed': False, 'suggestionEligible': True})
target = pathlib.Path(__file__).resolve().parents[1] / 'src/data/foods.json'
target.write_text(json.dumps(catalog, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(catalog)} foods to {target}')
