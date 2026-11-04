import { expect, test } from '@playwright/test';

async function setup(page) {
  await page.clock.setFixedTime(new Date('2026-11-02T08:00:00+08:00'));
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Review Test');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
}
async function complete(page, name) {
  await page.getByRole('button', { name: 'Finish session', exact: true }).click();
  await page.getByLabel('Workout name for history and next time').fill(name);
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.active-bar')).toHaveCount(0);
}

test('start before choosing, reorder/remove exercises, enter pounds, remember actual work, and start another session today', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Start workout timer', exact: true }).click();
  await expect(page.getByRole('timer', { name: 'Workout elapsed time' })).toContainText('00:00:00');
  await page.getByRole('button', { name: 'Add exercises', exact: true }).click();
  for (const name of ['Lat pulldown', 'Barbell bench press', 'Cable triceps pushdown']) {
    await page.getByRole('textbox', { name: 'Search exercises' }).fill(name);
    await page.locator('.exercise-library').getByRole('button').first().click();
  }
  await page.getByRole('button', { name: 'Add 3 to workout', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.exercise-order-details summary').click();
  await page.getByRole('button', { name: 'Move Barbell bench press earlier', exact: true }).click();
  await page
    .getByRole('button', { name: 'Remove Cable triceps pushdown from workout', exact: true })
    .click();
  await expect(page.locator('.workout-editor-row').first()).toContainText('Barbell bench press');
  await page.getByLabel('Weight unit', { exact: true }).selectOption('lb');
  await page.getByLabel('Weight (lb)', { exact: true }).fill('100');
  await expect(page.locator('.converted-load')).toContainText('45.36 kg');
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toContainText('100 lb (45.36 kg)');
  await expect(
    page.getByRole('button', { name: 'Remove Barbell bench press from workout', exact: true }),
  ).toBeDisabled();
  await page.clock.setFixedTime(new Date('2026-11-02T08:02:00+08:00'));
  await complete(page, 'Morning upper');
  await page.locator('.history-list').getByRole('button').first().click();
  await expect(page.getByRole('dialog')).toContainText('00:02:00');
  await expect(page.getByRole('dialog')).not.toContainText('Lat pulldown');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page
    .locator('.workout-library')
    .getByRole('button', { name: 'Use workout', exact: true })
    .click();
  await expect(page.locator('.builder-selected')).toContainText('Barbell bench press');
  await expect(page.getByLabel('Weight for Barbell bench press (lb)')).toHaveValue('100');
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toBeVisible();
  await complete(page, 'Evening upper');
  await expect(page.locator('.history-list').getByRole('button')).toHaveCount(2);
  await page.locator('.sidebar').getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.locator('.today-choice')).toContainText('2 sessions completed today');
  await expect(page.locator('.week-copy')).toContainText('1 / 3');
  await page.reload();
  await expect(page.locator('.today-choice')).toContainText('2 sessions completed today');
});

test('two personal training days can be upper/lower with an extra workout slot on the same day', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: /days \/ week · Edit plan/ }).click();
  await page.getByLabel('Training days per week').selectOption('2');
  for (const [index, name, day] of [
    [1, 'Upper · morning', '1'],
    [2, 'Lower body', '4'],
    [3, 'Evening mobility', '1'],
  ]) {
    await page.getByRole('button', { name: 'Add planned workout', exact: true }).click();
    await page.getByLabel(`Workout ${index} name`, { exact: true }).fill(name);
    await page.getByLabel(`Workout ${index} day`, { exact: true }).selectOption(day);
  }
  await page.getByRole('button', { name: 'Use this plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.workout-library')).toContainText('Upper · morning');
  await expect(page.locator('.workout-library')).toContainText('Evening mobility');
  await page.reload();
  await page.getByRole('button', { name: /2 days \/ week · Edit plan/ }).click();
  await expect(page.getByLabel('Workout 2 name', { exact: true })).toHaveValue('Lower body');
});

test('a photo meal stays local, confirms real food references, persists offline, and can lose only the photo', async ({
  page,
  context,
}) => {
  await setup(page);
  await page.locator('.sidebar').getByRole('link', { name: 'Food', exact: true }).click();
  await page.getByRole('button', { name: 'Photo meal', exact: true }).click();
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const draw = canvas.getContext('2d');
    draw.fillStyle = '#d4b173';
    draw.fillRect(0, 0, 200, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Meal photo file', { exact: true }).setInputFiles({
    name: 'fictional-photo-fixture.png',
    mimeType: 'image/png',
    buffer: Buffer.from(encoded, 'base64'),
  });
  await expect(page.locator('.meal-photo-preview')).toBeVisible();
  await page.getByLabel('Find foods in your photo').fill('Nasi putih + ayam goreng');
  await page.locator('.photo-food-results').getByRole('button').first().click();
  await expect(page.getByLabel('Portions for photo food 1', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Confirm foods & save meal', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.protein-card')).toContainText('23.7');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: /View meal photo for Nasi putih/ }).click();
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Remove photo, keep food records', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.photo-thumb')).toHaveCount(0);
  await expect(page.locator('.meal-entries')).toContainText('Nasi putih + ayam goreng');
});
