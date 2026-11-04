import { validateJournal } from './journal';
import { Capacitor } from '@capacitor/core';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const base64 = (buffer) => {
  let out = '';
  for (const byte of new Uint8Array(buffer)) out += String.fromCharCode(byte);
  return btoa(out);
};
const unbase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
async function keyFor(password, salt, usage) {
  const raw = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}
export async function encodeBackup(state, password) {
  validateJournal(state);
  if (!password || password.length < 10)
    throw new Error('Use a backup password with at least 10 characters. Keep it somewhere safe.');
  const plain = encoder.encode(JSON.stringify(state));
  if (plain.byteLength > 14 * 1024 * 1024)
    throw new Error(
      'This journal is too large for a restorable backup. Remove older meal photos while keeping their food records, then export again.',
    );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(password, salt, 'encrypt');
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return JSON.stringify({
    format: 'personal-fitness-encrypted',
    version: 1,
    iterations: 210000,
    salt: base64(salt),
    iv: base64(iv),
    data: base64(data),
  });
}
export async function decodeBackup(text, password) {
  if (typeof text !== 'string' || text.length > 20 * 1024 * 1024)
    throw new Error('Choose a backup smaller than 20 MB.');
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    envelope.format !== 'personal-fitness-encrypted' ||
    envelope.version !== 1 ||
    envelope.iterations !== 210000
  )
    throw new Error('Choose an encrypted Personal Fitness backup.');
  try {
    const salt = unbase64(envelope.salt);
    const iv = unbase64(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const key = await keyFor(password, salt, 'decrypt');
    const bytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      unbase64(envelope.data),
    );
    return validateJournal(JSON.parse(decoder.decode(bytes)));
  } catch {
    throw new Error(
      'The password is incorrect or the backup is damaged. Your current records were kept.',
    );
  }
}
export async function saveBackup(text, filename) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const result = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    try {
      await Share.share({ title: 'Personal Fitness encrypted backup', url: result.uri });
    } finally {
      await Filesystem.deleteFile({ path: filename, directory: Directory.Cache });
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
