import { expect, test } from '@playwright/test';
async function setup(page) {
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Test Lifter');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
}
test('choose any exercises, configure targets, add another movement, and keep the record after reload', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Leg day', exact: true }).click();
  await page
    .locator('.exercise-library')
    .getByRole('button')
    .filter({ hasText: 'Leg press' })
    .click();
  await page.getByLabel('Sets for Leg press', { exact: true }).fill('2');
  await page.getByLabel('Reps for Leg press', { exact: true }).fill('9');
  await page.getByLabel('Weight for Leg press (kg)', { exact: true }).fill('65');
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await expect(page.locator('.guided-workout')).toContainText('2 sets × 9 reps');
  await expect(page.getByLabel('Weight (kg)', { exact: true })).toHaveValue('65');
  await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('9');
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toContainText('65 kg × 9');
  await page.getByRole('button', { name: 'Add exercises', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('pulldown');
  await page
    .locator('.exercise-library')
    .getByRole('button')
    .filter({ hasText: 'Lat pulldown' })
    .click();
  await page.getByRole('button', { name: 'Add selected exercises' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.guide-queue')).toContainText('Lat pulldown');
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.active-bar')).toHaveCount(0);
  await page.reload();
  await page.locator('.history-list').getByRole('button').first().click();
  await expect(page.getByRole('dialog')).toContainText('65 kg × 9');
  await expect(page.getByRole('dialog')).not.toContainText('Lat pulldown');
});
test('a personally named exercise works in logging, history and the progress selector', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Choose today’s exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Create my own exercise' }).click();
  await page.getByLabel('New exercise name').fill('My incline cable press');
  await page.getByRole('button', { name: 'Save exercise & select it' }).click();
  await expect(page.locator('.builder-selected')).toContainText('My incline cable press');
  await page.getByLabel('Weight for My incline cable press (kg)').fill('17.5');
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toContainText('17.5 kg');
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await page.locator('.sidebar').getByRole('link', { name: 'Progress', exact: true }).click();
  await page
    .getByLabel('Movement', { exact: true })
    .selectOption({ label: 'My incline cable press' });
  await expect(page.locator('.performance-table')).toContainText('17.5 × 8');
  await page.reload();
  await page
    .getByLabel('Movement', { exact: true })
    .selectOption({ label: 'My incline cable press' });
  await expect(page.locator('.performance-table')).toContainText('17.5 × 8');
});
test('set only a protein target and see the logged amount, remaining grams and reached status', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Set target', exact: true }).click();
  await page.getByLabel('Daily protein target (g)').fill('20');
  await page.getByRole('button', { name: 'Save protein target' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.protein-card')).toContainText('20 g target');
  await page.locator('.sidebar').getByRole('link', { name: 'Food', exact: true }).click();
  await page.getByRole('button', { name: 'Log food', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search food' }).fill('Nasi putih + ayam goreng');
  await page.locator('.food-result').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Add to diary', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.protein-card')).toContainText('Logged target reached.');
  await page.reload();
  await expect(page.locator('.protein-card')).toContainText('20 g target');
  await page.getByRole('button', { name: 'Edit target', exact: true }).click();
  await page.getByLabel('Daily protein target (g)').fill('100');
  await page.getByRole('button', { name: 'Save protein target' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.protein-card')).toContainText('76.3 g left');
});
