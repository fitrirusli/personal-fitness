import { expect, test } from '@playwright/test';

const demo = async (page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore fictional demo' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan today, Alex.' })).toBeVisible();
};
const navigate = (page, name) =>
  page.locator('.sidebar').getByRole('link', { name, exact: true }).click();
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T04:00:00Z'));
});
test('new personal journal works without measurements and stays separate from demo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Test User');
  await expect(page.getByLabel('Age (years)')).not.toBeVisible();
  await page.getByLabel('Training days per week').selectOption('5');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan today, Test User.' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Choose today’s exercises', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Enough protein today?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your plan today, Test User.' })).toBeVisible();
  await expect(page.getByRole('button', { name: '5 days / week · Edit plan' })).toBeVisible();
  await navigate(page, 'Profile');
  await page.getByRole('button', { name: 'Open fictional demo' }).click();
  await expect(page.locator('.demo-banner')).toBeVisible();
  await page.locator('.demo-banner').getByRole('button').click();
  await expect(page.locator('.sidebar-user')).toContainText('Test User');
  await expect(page.locator('.demo-banner')).toHaveCount(0);
});
test('workout autosaves set and rest timer across reload, then completes into history', async ({
  page,
}) => {
  await demo(page);
  await navigate(page, 'Train');
  await page.locator('summary').filter({ hasText: 'Optional example workout' }).first().click();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const card = page.locator('.guided-workout');
  await card.getByRole('spinbutton', { name: 'Weight (kg)', exact: true }).fill('70');
  await card.getByRole('spinbutton', { name: 'Reps', exact: true }).fill('10');
  await card.getByRole('button', { name: '2+ more', exact: true }).click();
  await card.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toContainText('70 kg × 10');
  await expect(card.getByRole('spinbutton', { name: 'Weight (kg)' })).toHaveValue('70');
  await expect(card.getByRole('spinbutton', { name: 'Reps', exact: true })).toHaveValue('10');
  await page.reload();
  await expect(card.getByRole('button', { name: 'Save set 2', exact: true })).toBeVisible();
  await expect(page.locator('.rest-timer')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss rest timer' }).click();
  await page.getByRole('button', { name: 'All exercises & tools' }).click();
  await expect(
    page.locator('.exercise-card').first().getByRole('button', { name: 'Undo set 1' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(page.locator('.active-bar')).toHaveCount(0);
  await page.locator('.history-list').getByRole('button').first().click();
  await expect(page.getByRole('dialog')).toContainText('70 kg × 10 (2 RIR)');
});
test('custom food keeps missing nutrients unknown, recipe uses cooked yield, diary persists offline', async ({
  page,
  context,
}) => {
  await demo(page);
  await navigate(page, 'Food');
  await page.getByRole('button', { name: 'Log food', exact: true }).click();
  await page.getByRole('button', { name: 'Custom meal', exact: true }).click();
  await page.getByLabel('Food name', { exact: true }).fill('Test label yogurt');
  await page.getByText('More nutrition options').click();
  await page.getByLabel('My label lists values per 100 g').check();
  await page.getByLabel('Energy (kcal)', { exact: true }).fill('100');
  await page.getByLabel('Protein (g)', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Save custom meal' }).click();
  await page.getByText('Use grams instead').click();
  await page.getByLabel('Portions in grams', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Add to diary', exact: true }).click();
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Test label yogurt' }),
  ).toContainText('Test label yogurt');
  await page.locator('summary').filter({ hasText: 'Micronutrients & data coverage' }).click();
  await expect(page.locator('.nutrient-row').filter({ hasText: 'Iron' })).toContainText(
    '6 of 8 foods',
  );
  await page.getByRole('button', { name: 'Log food', exact: true }).click();
  await page.getByRole('button', { name: 'Build a recipe', exact: true }).click();
  await page.getByLabel('Recipe name').fill('Test cooked recipe');
  await page.getByLabel('Ingredient', { exact: true }).selectOption({ label: 'Test label yogurt' });
  await page.getByLabel('Grams', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Final cooked weight of the entire recipe (g)').fill('400');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await expect(page.locator('.food-calculation')).toContainText('50');
  await expect(page.locator('.food-calculation')).toContainText('5.0 g protein');
  await page.getByRole('button', { name: 'Add to diary', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Test cooked recipe' }),
  ).toContainText('Test cooked recipe');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Test cooked recipe' }),
  ).toContainText('Test cooked recipe');
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Test label yogurt' }),
  ).toContainText('Test label yogurt');
  await expect(page.locator('.local-status')).toContainText('Offline');
});
test('encrypted backup downloads and restores, with explicit replacement', async ({ page }) => {
  await demo(page);
  await navigate(page, 'Profile');
  await page.getByRole('button', { name: 'Export encrypted backup' }).click();
  await page.getByLabel('Backup password', { exact: true }).fill('a-strong-test-password');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create encrypted backup' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await page.getByLabel('Backup password', { exact: true }).fill('wrong');
  await page.getByLabel('Encrypted backup file').setInputFiles(path);
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE');
  await page.getByRole('button', { name: 'Restore and replace' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  await page.getByLabel('Backup password', { exact: true }).fill('a-strong-test-password');
  await page.getByRole('button', { name: 'Restore and replace' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Backup restored');
});
test('mobile navigation and primary pages fit a small Android viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await demo(page);
  for (const name of ['Train', 'Food', 'Progress', 'Profile', 'Today']) {
    await page.locator('.bottom-nav').getByRole('link', { name, exact: true }).click();
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: '.local/mobile-verified.png', fullPage: true });
});
