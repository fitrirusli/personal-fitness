import { Capacitor } from '@capacitor/core';
import { MAX_PHOTO_BYTES, photoRecord } from '../domain/meal-photos';

export async function prepareMealPhoto(blob) {
  if (
    blob.size > 10 * 1024 * 1024 ||
    (blob.type &&
      !['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'].includes(blob.type))
  )
    throw new Error('Choose a JPEG, PNG, or WebP photo up to 10 MB.');
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth > 12000 ||
      image.naturalHeight > 12000
    )
      throw new Error('Choose a smaller image.');
    const canvas = document.createElement('canvas');
    let scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encoded = canvas
        .toDataURL('image/jpeg', Math.max(0.35, 0.78 - attempt * 0.06))
        .split(',')[1];
      if (atob(encoded).length <= MAX_PHOTO_BYTES)
        return photoRecord(encoded, canvas.width, canvas.height);
      scale *= 0.84;
    }
    throw new Error(
      'This photo could not be reduced to the local storage limit. Try a smaller photo.',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function nativeMealPhoto(source) {
  if (!Capacitor.isNativePlatform()) throw new Error('Choose a photo with the file picker.');
  const { Camera, MediaTypeSelection } = await import('@capacitor/camera');
  const result =
    source === 'camera'
      ? await Camera.takePhoto({
          quality: 80,
          targetWidth: 960,
          targetHeight: 960,
          saveToGallery: false,
          includeMetadata: false,
        })
      : (
          await Camera.chooseFromGallery({
            mediaType: MediaTypeSelection.Photo,
            allowMultipleSelection: false,
            includeMetadata: false,
          })
        ).results[0];
  return readNativePhoto(result);
}

async function readNativePhoto(result) {
  if (!result?.webPath) throw new Error('No photo was selected.');
  const response = await fetch(result.webPath);
  if (!response.ok) throw new Error('The selected photo could not be read.');
  return prepareMealPhoto(await response.blob());
}

let restored = null;
export function acceptRestoredMealPhoto(event) {
  if (
    event.pluginId !== 'Camera' ||
    event.success !== true ||
    !['takePhoto', 'chooseFromGallery'].includes(event.methodName)
  )
    return false;
  const result = event.data?.results?.[0] || event.data;
  if (!result?.webPath) return false;
  restored = readNativePhoto(result).then(
    (photo) => ({ photo }),
    (error) => ({ error }),
  );
  return true;
}
export const hasRestoredMealPhoto = () => restored !== null;
export async function takeRestoredMealPhoto() {
  const pending = restored;
  restored = null;
  if (!pending) return null;
  const result = await pending;
  if (result.error) throw result.error;
  return result.photo;
}
