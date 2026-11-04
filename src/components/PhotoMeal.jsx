import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useJournal } from '../lib/store';
import { foodCatalog, searchFood } from '../data/local-foods';
import { logPhotoMeal, mealPhotoSrc } from '../domain/meal-photos';
import { nutrientTotals, validFoodAmount } from '../domain/nutrition';
import FoodAmount from './FoodAmount';
import {
  nativeMealPhoto,
  prepareMealPhoto,
  hasRestoredMealPhoto,
  takeRestoredMealPhoto,
} from '../lib/meal-camera';
import { uid } from '../domain/dates';
import { Button, Field, FormError, Modal, SaveButton, useTask } from './ui';

export default function PhotoMeal({ date, onClose }) {
  const { state, change } = useJournal();
  const [photo, setPhoto] = useState(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [meal, setMeal] = useState('Lunch');
  const file = useRef(null);
  const camera = useRef(null);
  const task = useTask();
  useEffect(() => {
    if (hasRestoredMealPhoto()) task.run(async () => setPhoto(await takeRestoredMealPhoto()));
  }, []);
  const choices = [...foodCatalog, ...state.customFoods]
    .filter((food) => searchFood(food, query))
    .slice(0, 8);
  const amountsValid = items.every(validFoodAmount);
  const totals = nutrientTotals(items.filter(validFoodAmount));
  const select = (source) => {
    if (Capacitor.isNativePlatform()) task.run(async () => setPhoto(await nativeMealPhoto(source)));
    else (source === 'camera' ? camera : file).current.click();
  };
  const read = (event) => {
    const selected = event.target.files?.[0];
    if (selected) task.run(async () => setPhoto(await prepareMealPhoto(selected)));
    event.target.value = '';
  };
  return (
    <Modal title="Photo meal · confirm what you ate" onClose={onClose} wide>
      <form
        className="stack photo-meal"
        onSubmit={(event) => {
          event.preventDefault();
          task.run(async () => {
            await change((draft) => logPhotoMeal(draft, { photo, date, meal, items }));
            onClose();
          });
        }}
      >
        <p className="notice">
          Offline photo diary. Choose the foods and confirm their portions. The image is not
          analysed automatically; nutrient values come from your selected food references, not the
          photograph.
        </p>
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Meal photo file"
          className="visually-hidden"
          onChange={read}
        />
        <input
          ref={camera}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label="Take meal photo file"
          className="visually-hidden"
          onChange={read}
        />
        <div className="actions">
          <Button
            type="button"
            variant="secondary"
            disabled={task.busy}
            onClick={() => select('camera')}
          >
            <Camera size={17} />
            Take photo
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={task.busy}
            onClick={() => select('gallery')}
          >
            <ImagePlus size={17} />
            Choose photo
          </Button>
        </div>
        {photo && (
          <img
            className="meal-photo-preview"
            src={mealPhotoSrc(photo)}
            alt="Meal photo for your manual food and portion review"
          />
        )}
        <Field label="Photo meal category">
          <select value={meal} onChange={(event) => setMeal(event.target.value)}>
            {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Find foods in your photo">
          <input
            value={query}
            placeholder="Nasi putih, ayam, telur…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <div className="photo-food-results">
          {choices.map((food) => (
            <Button
              type="button"
              variant="ghost"
              key={food.id}
              onClick={() => {
                setItems((previous) => [
                  ...previous,
                  {
                    id: uid(),
                    food: structuredClone(food),
                    portions: 1,
                  },
                ]);
                setQuery('');
              }}
            >
              Add {food.name}
            </Button>
          ))}
        </div>
        {items.map((item, index) => (
          <div className="photo-food-item" key={item.id}>
            <div>
              <strong>{item.food.name}</strong>
              <small>{item.food.source?.name || 'Your food reference'}</small>
            </div>
            <FoodAmount
              food={item.food}
              amount={item}
              label={`Portions for photo food ${index + 1}`}
              onChange={(amount) =>
                setItems((previous) =>
                  previous.map((entry) =>
                    entry.id === item.id ? { id: entry.id, food: entry.food, ...amount } : entry,
                  ),
                )
              }
            />
            <button
              className="icon-btn"
              type="button"
              aria-label={`Remove photo food ${index + 1}`}
              onClick={() =>
                setItems((previous) => previous.filter((entry) => entry.id !== item.id))
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        {!!items.length && amountsValid && (
          <p className="notice">
            Known reference subtotal:{' '}
            {totals.calories.amount == null
              ? 'Unknown energy'
              : `${Math.round(totals.calories.amount)} kcal`}{' '}
            ·{' '}
            {totals.protein.amount == null
              ? 'Unknown protein'
              : `${Number(totals.protein.amount.toFixed(1))} g protein`}
            . {totals.protein.known}/{totals.protein.total} items have protein data. Preparation and
            serving size can change these estimates.
          </p>
        )}
        <p className="fine-print">
          Photos stay on this device, are resized to at most 960 px / 90 KB, and are included in
          encrypted backups. No photo is sent to an AI or other service.
        </p>
        <FormError error={task.error} />
        <SaveButton
          busy={task.busy}
          disabled={!photo || !items.length || !amountsValid || task.busy}
        >
          Confirm foods & save meal
        </SaveButton>
      </form>
    </Modal>
  );
}
