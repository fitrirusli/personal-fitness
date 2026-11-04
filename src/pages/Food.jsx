import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Leaf,
  Plus,
  Search,
  Star,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { useJournal } from '../lib/store';
import { foodCatalog as catalog, foodCategories, searchFood } from '../data/local-foods';
import {
  makeRecipe,
  micronutrientTargets,
  nutrientKeys,
  nutrientLimit,
  validFoodAmount,
  nutrientMeta,
  nutrientTotals,
  validateFood,
} from '../domain/nutrition';
import { dayKey, dateLabel, shiftDay, uid } from '../domain/dates';
import {
  Button,
  Card,
  Empty,
  Field,
  FormError,
  Heading,
  Meter,
  Modal,
  SaveButton,
  Tag,
  useTask,
} from '../components/ui';
import { MacroSummary } from './Today';
import ProteinCard from '../components/ProteinCard';
import PhotoMeal from '../components/PhotoMeal';
import FoodAmount from '../components/FoodAmount';
import { mealPhotoSrc, removeMealRecord } from '../domain/meal-photos';
import { hasRestoredMealPhoto } from '../lib/meal-camera';

const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
function FoodPicker({ date, meal, onClose }) {
  const { state, change } = useJournal();
  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('local');
  const [category, setCategory] = useState('All local food');
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState({ portions: 1 });
  const [group, setGroup] = useState(meal);
  const [custom, setCustom] = useState({ name: '', nutrients: {} });
  const [per100Grams, setPer100Grams] = useState(false);
  const [recipe, setRecipe] = useState({ name: '', yieldGrams: '', ingredients: [] });
  const [ingredientId, setIngredientId] = useState('');
  const [ingredientGrams, setIngredientGrams] = useState(100);
  const task = useTask();
  const all = [...catalog, ...state.customFoods];
  const selection = { food: selected, ...amount };
  const validSelection = selected && validFoodAmount(selection);
  const preview = nutrientTotals(validSelection ? [selection] : []);
  const filtered = useMemo(
    () =>
      all
        .filter(
          (food) =>
            searchFood(food, query) &&
            (query.trim() ||
              scope === 'all' ||
              food.local ||
              state.customFoods.some((item) => item.id === food.id)) &&
            (query.trim() || category === 'All local food' || food.category === category),
        )
        .sort(
          (a, b) => Number(state.favorites.includes(b.id)) - Number(state.favorites.includes(a.id)),
        ),
    [query, scope, category, state.customFoods, state.favorites],
  );
  const customNutrientField = (key) => (
    <Field label={`${nutrientMeta[key].label} (${nutrientMeta[key].unit})`} key={key}>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max={nutrientLimit(key, per100Grams ? undefined : 'portion')}
        required={per100Grams && key === 'calories'}
        step="any"
        value={custom.nutrients[key] ?? ''}
        onChange={(event) =>
          setCustom({ ...custom, nutrients: { ...custom.nutrients, [key]: event.target.value } })
        }
      />
    </Field>
  );
  const saveCustom = (event) => {
    event.preventDefault();
    task.run(async () => {
      const food = {
        id: uid(),
        name: custom.name.trim(),
        ...(per100Grams ? {} : { nutrientBasis: 'portion' }),
        nutrients: validateFood({
          ...custom,
          nutrientBasis: per100Grams ? undefined : 'portion',
        }),
        source: { name: 'Your label or manual entry' },
        tags: [],
        suggestionEligible: false,
        allergenInfoConfirmed: false,
      };
      await change((draft) => {
        draft.customFoods.push(food);
      });
      setSelected(food);
      setAmount({ portions: 1 });
      setTab('search');
    });
  };
  const saveRecipe = (event) => {
    event.preventDefault();
    task.run(async () => {
      const result = makeRecipe(recipe.name, recipe.ingredients, Number(recipe.yieldGrams));
      const food = {
        id: uid(),
        name: recipe.name.trim(),
        ...result,
        source: { name: 'Your recipe · calculated from ingredients' },
        portions: [{ label: '100 g', grams: 100 }],
        tags: [],
        suggestionEligible: false,
        allergenInfoConfirmed: false,
      };
      await change((draft) => {
        draft.customFoods.push(food);
      });
      setSelected(food);
      setAmount({ portions: 1 });
      setTab('search');
    });
  };
  const log = (event) => {
    event.preventDefault();
    task.run(async () => {
      if (!validSelection) throw new Error('Enter a valid food amount.');
      await change((draft) => {
        draft.meals.push({
          id: uid(),
          date,
          meal: group,
          ...amount,
          food: structuredClone(selected),
          loggedAt: new Date().toISOString(),
        });
        draft.fullDays = draft.fullDays.filter((d) => d !== date);
      });
      onClose();
    });
  };
  return (
    <Modal title={`Add food · ${dateLabel(date)}`} onClose={onClose} wide>
      <div className="tab-bar">
        {[
          ['search', 'Food library'],
          ['custom', 'Custom meal'],
          ['recipe', 'Build a recipe'],
        ].map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => {
              setTab(key);
              task.setError('');
            }}
          >
            {title}
          </button>
        ))}
      </div>
      {tab === 'search' && (
        <div className="food-picker">
          <div>
            <div className="search-field">
              <Search size={18} />
              <input
                aria-label="Search food"
                placeholder="Nasi, ayam, roti, teh…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="food-scope">
              <button
                className={scope === 'local' ? 'active' : ''}
                onClick={() => {
                  setScope('local');
                  setCategory('All local food');
                }}
              >
                Malaysian food
              </button>
              <button
                className={scope === 'all' ? 'active' : ''}
                onClick={() => {
                  setScope('all');
                  setCategory('All local food');
                }}
              >
                All foods & ingredients
              </button>
            </div>
            {scope === 'local' && !query.trim() && (
              <div className="food-categories">
                {foodCategories.map((name) => (
                  <button
                    key={name}
                    className={category === name ? 'active' : ''}
                    onClick={() => setCategory(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <p className="fine-print">
              Local reference foods and familiar portions. Recipes and serving sizes vary.
            </p>
            <div className="food-results">
              {filtered.map((food) => {
                const serving = nutrientTotals([{ food, portions: 1 }]);
                return (
                  <div
                    className={`food-result ${selected?.id === food.id ? 'selected' : ''}`}
                    key={food.id}
                  >
                    <button
                      onClick={() => {
                        setSelected(food);
                        setAmount({ portions: 1 });
                      }}
                    >
                      <strong>{food.name}</strong>
                      <small>
                        {serving.calories.amount == null
                          ? 'Energy unknown'
                          : `${Math.round(serving.calories.amount)} kcal`}{' '}
                        ·{' '}
                        {serving.protein.amount == null
                          ? 'Protein unknown'
                          : `${serving.protein.amount.toFixed(1)} g protein`}{' '}
                        · per portion
                      </small>
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`${state.favorites.includes(food.id) ? 'Unfavorite' : 'Favorite'} ${food.name}`}
                      onClick={() =>
                        task.run(() =>
                          change((draft) => {
                            draft.favorites = draft.favorites.includes(food.id)
                              ? draft.favorites.filter((id) => id !== food.id)
                              : [...draft.favorites, food.id];
                          }),
                        )
                      }
                    >
                      <Star
                        size={17}
                        fill={state.favorites.includes(food.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                );
              })}
              {!filtered.length && (
                <Empty icon={Search} title="No matching food">
                  Create a custom meal with the nutrition values you know.
                </Empty>
              )}
            </div>
          </div>
          <div className="selected-food">
            {selected ? (
              <form onSubmit={log} className="stack">
                <span className="icon-tile sage">
                  <Leaf size={25} />
                </span>
                <h3>{selected.name}</h3>
                <FoodAmount food={selected} amount={amount} onChange={setAmount} />
                <details className="optional-section">
                  <summary>Food source & portion notes</summary>
                  <p className="fine-print">
                    {selected.source?.name}.{' '}
                    {selected.portionNote || 'Values are estimates for the listed preparation.'}{' '}
                    Check ingredients and allergens yourself.
                  </p>
                  {selected.source?.url && (
                    <a
                      href={selected.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-btn"
                    >
                      View source ↗
                    </a>
                  )}
                </details>
                <Field label="Meal">
                  <select value={group} onChange={(e) => setGroup(e.target.value)}>
                    {meals.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </Field>
                <div className="food-calculation">
                  <strong>
                    {preview.calories.amount == null
                      ? 'Energy unknown'
                      : `${Math.round(preview.calories.amount)} kcal`}
                  </strong>
                  <span>
                    {preview.protein.amount == null
                      ? 'Protein unknown'
                      : `${preview.protein.amount.toFixed(1)} g protein`}
                  </span>
                </div>
                <SaveButton busy={task.busy} disabled={!validSelection || task.busy}>
                  Add to diary
                </SaveButton>
              </form>
            ) : (
              <Empty icon={Utensils} title="Choose a food">
                Choose what you ate, then enter how many portions.
              </Empty>
            )}
          </div>
        </div>
      )}
      {tab === 'custom' && (
        <form className="stack" onSubmit={saveCustom}>
          <p className="muted">
            {per100Grams ? (
              <>
                Enter nutrition <strong>per 100 g</strong>. Energy is required for this mode.
              </>
            ) : (
              <>
                Enter the nutrition you know for <strong>one portion</strong>. Protein or calories
                alone is enough.
              </>
            )}{' '}
            Blank values stay unknown.
          </p>
          <Field label="Food name">
            <input
              required
              maxLength="160"
              value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
              placeholder="e.g. My chicken rice bowl"
            />
          </Field>
          <div className="form-grid three">
            {['protein', 'calories'].map((key) => customNutrientField(key))}
          </div>
          <details className="optional-section">
            <summary>More nutrition options</summary>
            <label className="row">
              <input
                type="checkbox"
                checked={per100Grams}
                onChange={(event) => setPer100Grams(event.target.checked)}
              />
              My label lists values per 100 g
            </label>
            <div className="form-grid three">
              {nutrientKeys
                .filter((key) => key !== 'protein' && key !== 'calories')
                .map(customNutrientField)}
            </div>
          </details>
          <SaveButton busy={task.busy}>Save custom meal</SaveButton>
        </form>
      )}
      {tab === 'recipe' && (
        <form className="stack" onSubmit={saveRecipe}>
          <p className="muted">
            Weigh ingredients in the preparation listed in the library. Then weigh the{' '}
            <strong>finished cooked recipe</strong> so water gained or lost is reflected in each
            portion.
          </p>
          <Field label="Recipe name">
            <input
              required
              maxLength="160"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
              placeholder="e.g. My chicken rice bowl"
            />
          </Field>
          <div className="ingredient-form">
            <Field label="Ingredient">
              <select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
                <option value="">Choose a food…</option>
                {all
                  .filter((food) => food.nutrientBasis !== 'portion')
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Grams">
              <input
                type="number"
                min="0.1"
                max="20000"
                step="0.1"
                value={ingredientGrams}
                onChange={(e) => setIngredientGrams(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const food = all.find((f) => f.id === ingredientId);
                if (
                  !food ||
                  !Number.isFinite(Number(ingredientGrams)) ||
                  Number(ingredientGrams) <= 0
                ) {
                  task.setError('Choose an ingredient and enter its weight.');
                  return;
                }
                setRecipe({
                  ...recipe,
                  ingredients: [
                    ...recipe.ingredients,
                    { food: structuredClone(food), grams: Number(ingredientGrams) },
                  ],
                });
                task.setError('');
              }}
            >
              Add
            </Button>
          </div>
          {recipe.ingredients.map((item, i) => (
            <div className="row ingredient" key={i}>
              <span>
                {item.grams} g · {item.food.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ingredient ${i + 1}`}
                className="icon-btn"
                onClick={() =>
                  setRecipe({
                    ...recipe,
                    ingredients: recipe.ingredients.filter((_, index) => index !== i),
                  })
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <Field label="Final cooked weight of the entire recipe (g)">
            <input
              type="number"
              min="1"
              max="50000"
              required
              value={recipe.yieldGrams}
              onChange={(e) => setRecipe({ ...recipe, yieldGrams: e.target.value })}
            />
          </Field>
          <p className="fine-print">
            A nutrient stays unknown if any ingredient lacks that value. Recipes use ingredients
            with weight-based nutrition data.
          </p>
          <SaveButton busy={task.busy}>Save recipe</SaveButton>
        </form>
      )}
      <FormError error={task.error} />
    </Modal>
  );
}

export default function Food() {
  const { state, change } = useJournal();
  const [date, setDate] = useState(dayKey());
  const [meal, setMeal] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  useEffect(() => {
    const review = () => {
      if (hasRestoredMealPhoto()) setPhotoModal(true);
    };
    review();
    window.addEventListener('pf-camera-restored', review);
    return () => window.removeEventListener('pf-camera-restored', review);
  }, []);
  const task = useTask();
  const entries = state.meals.filter((entry) => entry.date === date);
  const totals = nutrientTotals(entries);
  const refs = micronutrientTargets(state.profile);
  const full = state.fullDays.includes(date);
  const previous = state.meals.filter((entry) => entry.date === shiftDay(date, -1));
  return (
    <>
      <Heading eyebrow="FUEL YOUR TRAINING" title="A little more aware. Every meal.">
        <Button variant="secondary" onClick={() => setPhotoModal(true)}>
          Photo meal
        </Button>
        <Button onClick={() => setMeal('Snacks')}>
          <Plus size={17} />
          Log food
        </Button>
      </Heading>
      <div className="diary-toolbar">
        <div className="date-nav">
          <button
            className="icon-btn"
            aria-label="Previous day"
            onClick={() => setDate(shiftDay(date, -1))}
          >
            <ChevronLeft size={20} />
          </button>
          <label>
            <span>{date === dayKey() ? 'Today' : dateLabel(date, { weekday: 'short' })}</span>
            <input
              type="date"
              aria-label="Diary date"
              max={dayKey()}
              value={date}
              onChange={(e) => {
                if (e.target.value && e.target.value <= dayKey()) setDate(e.target.value);
              }}
            />
          </label>
          <button
            className="icon-btn"
            aria-label="Next day"
            disabled={date >= dayKey()}
            onClick={() => setDate(shiftDay(date, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <Button
          variant="ghost"
          disabled={!previous.length || task.busy}
          onClick={() => setConfirm(true)}
        >
          <Copy size={16} />
          Copy previous day
        </Button>
      </div>
      <ProteinCard date={date} onLogFood={() => setMeal('Snacks')} />
      <Card className="fuel-card">
        <details className="optional-section">
          <summary>
            Energy, carbs & fats <span>Optional detail</span>
          </summary>
          <MacroSummary entries={entries} />
          <p className="fine-print">
            Totals reflect logged food only. Nutrients without data remain unknown. Energy and macro
            targets are starting points, not exact requirements.
          </p>
        </details>
      </Card>
      <div className="food-layout">
        <div className="stack">
          {meals.map((name) => {
            const group = entries.filter((e) => e.meal === name);
            const total = nutrientTotals(group);
            return (
              <Card key={name} className="meal-card">
                <div className="section-head">
                  <div>
                    <h3>{name}</h3>
                    <small>
                      {total.calories.amount == null
                        ? 'Nothing logged'
                        : `${Math.round(total.calories.amount)} kcal known`}
                    </small>
                  </div>
                  <button
                    className="icon-btn add-food"
                    aria-label={`Add to ${name}`}
                    onClick={() => setMeal(name)}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {group.length ? (
                  <div className="meal-entries">
                    {group.map((entry) => (
                      <div key={entry.id}>
                        {entry.photoId ? (
                          <button
                            className="photo-thumb"
                            aria-label={`View meal photo for ${entry.food.name}`}
                            onClick={() =>
                              setViewPhoto(
                                state.mealPhotos.find((photo) => photo.id === entry.photoId),
                              )
                            }
                          >
                            <img
                              src={mealPhotoSrc(
                                state.mealPhotos.find((photo) => photo.id === entry.photoId),
                              )}
                              alt="Recorded meal"
                            />
                          </button>
                        ) : (
                          <span className="food-initial">{entry.food.name.charAt(0)}</span>
                        )}
                        <div>
                          <strong>{entry.food.name}</strong>
                          <small>
                            {entry.portions == null
                              ? `${entry.grams} g`
                              : `${entry.portions}× portion`}{' '}
                            · {entry.food.source?.name || 'Your food'}
                          </small>
                        </div>
                        <span className="entry-energy">
                          {entry.food.nutrients.calories == null
                            ? '—'
                            : Math.round(nutrientTotals([entry]).calories.amount)}
                          <small>kcal</small>
                        </span>
                        <button
                          className="icon-btn muted"
                          aria-label={`Remove ${entry.food.name}`}
                          disabled={task.busy}
                          onClick={() =>
                            task.run(() =>
                              change((draft) => {
                                removeMealRecord(draft, entry.id);
                                draft.fullDays = draft.fullDays.filter((d) => d !== date);
                              }),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button className="meal-empty" onClick={() => setMeal(name)}>
                    + Add what you ate
                  </button>
                )}
              </Card>
            );
          })}
          <Card>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={full}
                disabled={task.busy || !entries.length}
                onChange={(e) => {
                  const checked = e.target.checked;
                  task.run(() =>
                    change((draft) => {
                      draft.fullDays = draft.fullDays.filter((d) => d !== date);
                      if (checked) draft.fullDays.push(date);
                    }),
                  );
                }}
              />
              <strong>I have logged my full day of food.</strong>
            </label>
            <p className="fine-print">
              This is your own completeness check. The app cannot infer missing meals, oils, drinks,
              or portion sizes.
            </p>
          </Card>
          <FormError error={task.error} />
        </div>
        <div className="stack">
          <Card className="nutrient-card">
            <details className="optional-section">
              <summary>
                Micronutrients & data coverage <span>View when you need the detail</span>
              </summary>
              <div className="section-head">
                <h3>Beyond the macros</h3>
                <Leaf size={21} />
              </div>
              <p className="muted">
                Known amounts from your logged food. A low logged total does not diagnose a
                deficiency.
              </p>
              {Object.entries(nutrientMeta)
                .filter(([key]) => !['calories', 'protein', 'carbs', 'fat'].includes(key))
                .map(([key, meta]) => {
                  const value = totals[key];
                  return (
                    <div className="nutrient-row" key={key}>
                      <div className="row">
                        <strong>{meta.label}</strong>
                        <span>
                          {value.amount == null
                            ? 'Unknown'
                            : `${value.complete ? '' : '≥ '}${value.amount.toLocaleString()} ${meta.unit}`}
                        </span>
                      </div>
                      {refs[key] && (
                        <>
                          <Meter value={value.amount} max={refs[key]} />
                          <small>
                            {meta.upper ? 'General upper limit' : 'Adult reference'}: {refs[key]}{' '}
                            {meta.unit}{' '}
                            {full && value.complete
                              ? '· complete logged coverage'
                              : '· partial diary'}
                          </small>
                        </>
                      )}
                      <small>
                        {value.total
                          ? `${value.known} of ${value.total} foods have this nutrient`
                          : 'No food entries'}
                      </small>
                    </div>
                  );
                })}
              <p className="fine-print">
                References shown only for the supported adult age/sex range (19–50). Requirements
                vary; supplements, pregnancy, health conditions, and clinical advice need individual
                review.
              </p>
              <a
                className="text-btn"
                href="https://ods.od.nih.gov/HealthInformation/nutrientrecommendations/"
                target="_blank"
                rel="noreferrer"
              >
                About nutrient references ↗
              </a>
            </details>
          </Card>
          <Card className="sage-card">
            <h3>Local food, your way.</h3>
            <p>
              Cooking at home? Save a recipe by weighing the ingredients and final cooked dish.
              Eating out? Use a reliable source or mark unavailable nutrients as unknown.
            </p>
            <Button variant="secondary" onClick={() => setMeal('Snacks')}>
              Open food library
              <Plus size={16} />
            </Button>
          </Card>
        </div>
      </div>
      {meal && <FoodPicker date={date} meal={meal} onClose={() => setMeal(null)} />}{' '}
      {photoModal && <PhotoMeal date={date} onClose={() => setPhotoModal(false)} />}
      {viewPhoto && (
        <Modal title="Recorded meal photo" onClose={() => setViewPhoto(null)}>
          <div className="stack">
            <img
              className="meal-photo-preview"
              src={mealPhotoSrc(viewPhoto)}
              alt="Your recorded meal"
            />
            <p className="fine-print">
              Foods and portions were confirmed manually. This picture was not used to measure
              nutrients.
            </p>
            <Button
              variant="secondary"
              disabled={task.busy}
              onClick={() =>
                task.run(async () => {
                  await change((draft) => {
                    draft.mealPhotos = draft.mealPhotos.filter(
                      (photo) => photo.id !== viewPhoto.id,
                    );
                    for (const entry of draft.meals)
                      if (entry.photoId === viewPhoto.id) {
                        delete entry.photoId;
                        delete entry.photoConfirmed;
                      }
                  });
                  setViewPhoto(null);
                })
              }
            >
              Remove photo, keep food records
            </Button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="Copy previous day?" onClose={() => setConfirm(false)}>
          <div className="stack">
            <p>
              Add {previous.length} entries from {dateLabel(shiftDay(date, -1))} to this day?
              Current entries are kept. Adjust or remove any portions you did not eat.
            </p>
            <FormError error={task.error} />
            <Button
              disabled={task.busy}
              onClick={() =>
                task.run(async () => {
                  await change((draft) => {
                    draft.meals.push(
                      ...previous.map((m) => ({
                        ...structuredClone(m),
                        photoId: undefined,
                        photoConfirmed: undefined,
                        id: uid(),
                        date,
                        loggedAt: new Date().toISOString(),
                      })),
                    );
                    draft.fullDays = draft.fullDays.filter((d) => d !== date);
                  });
                  setConfirm(false);
                })
              }
            >
              Copy {previous.length} food entries
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
