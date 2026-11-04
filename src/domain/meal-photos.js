import { uid } from './dates';
import { validFoodAmount } from './nutrition';
export const MAX_PHOTO_BYTES = 90 * 1024;
export const MAX_PHOTOS = 100;
export function validateMealPhoto(photo) {
  if (
    !photo ||
    typeof photo.id !== 'string' ||
    !photo.id ||
    photo.id.length > 120 ||
    photo.mime !== 'image/jpeg' ||
    !Number.isInteger(photo.width) ||
    photo.width < 1 ||
    photo.width > 960 ||
    !Number.isInteger(photo.height) ||
    photo.height < 1 ||
    photo.height > 960 ||
    !Array.isArray(photo.chunks) ||
    !photo.chunks.length ||
    photo.chunks.length > 8 ||
    photo.chunks.some(
      (chunk) =>
        typeof chunk !== 'string' ||
        !chunk.length ||
        chunk.length > 16384 ||
        !/^[A-Za-z0-9+/=]+$/.test(chunk),
    )
  )
    throw new Error('This meal photo is not a supported local JPEG.');
  const encoded = photo.chunks.join('');
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new Error('Invalid meal photo encoding.');
  const bytes = atob(encoded);
  if (
    bytes.length > MAX_PHOTO_BYTES ||
    bytes.charCodeAt(0) !== 255 ||
    bytes.charCodeAt(1) !== 216 ||
    bytes.charCodeAt(2) !== 255
  )
    throw new Error('Meal photos must be small JPEG images.');
  return photo;
}
export const mealPhotoSrc = (photo) =>
  photo ? `data:image/jpeg;base64,${photo.chunks.join('')}` : '';
export function photoRecord(encoded, width, height) {
  return validateMealPhoto({
    id: uid(),
    mime: 'image/jpeg',
    width,
    height,
    chunks: encoded.match(/.{1,16384}/g) || [],
  });
}
export function logPhotoMeal(state, { photo, date, meal, items }) {
  validateMealPhoto(photo);
  if (
    !items.length ||
    items.length > 20 ||
    items.some((item) => !item.food || !validFoodAmount(item))
  )
    throw new Error('Confirm the foods and amounts in this photo.');
  state.mealPhotos ||= [];
  if (state.mealPhotos.length >= MAX_PHOTOS)
    throw new Error(
      'The local photo limit is 100. Remove an old photo before adding another. Food-only logging remains available.',
    );
  state.mealPhotos.push(photo);
  for (const item of items)
    state.meals.push({
      id: uid(),
      date,
      meal,
      ...(item.portions == null ? { grams: item.grams } : { portions: item.portions }),
      food: structuredClone(item.food),
      photoId: photo.id,
      photoConfirmed: true,
      loggedAt: new Date().toISOString(),
    });
  state.fullDays = state.fullDays.filter((day) => day !== date);
}
export function removeMealRecord(state, id) {
  state.meals = state.meals.filter((entry) => entry.id !== id);
  const used = new Set(state.meals.map((entry) => entry.photoId).filter(Boolean));
  state.mealPhotos = (state.mealPhotos || []).filter((photo) => used.has(photo.id));
}
