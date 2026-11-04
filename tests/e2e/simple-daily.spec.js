import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T04:00:00Z'));
});

test('log two roti canai and reuse a protein-only custom meal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore fictional demo' }).click();
  await page
    .locator('nav')
    .getByRole('link', { name: 'Food', exact: true })
    .filter({ visible: true })
    .click();
  const log = () => page.getByRole('button', { name: 'Log food', exact: true }).click();
  const save = () => page.getByRole('button', { name: 'Add to diary', exact: true }).click();
  await log();
  await page.getByLabel('Search food').fill('roti canai');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Roti canai \(without dhal\)/ })
    .click();
  await expect(page.getByText('1 portion = 1 piece (keping)')).toBeVisible();
  await page.getByRole('button', { name: '2× portion', exact: true }).click();
  await expect(page.locator('.food-calculation')).toContainText('602 kcal');
  await expect(page.locator('.food-calculation')).toContainText('13.3 g protein');
  await save();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await log();
  await page.getByRole('button', { name: 'Custom meal', exact: true }).click();
  await page.getByLabel('Food name').fill('My lunch bowl');
  await page.getByLabel('Protein (g)', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Save custom meal' }).click();
  await page.getByLabel('Portions', { exact: true }).fill('1.5');
  await expect(page.locator('.food-calculation')).toContainText('45.0 g protein');
  await expect(page.locator('.food-calculation')).toContainText('Energy unknown');
  await save();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.meal-entries').filter({ hasText: 'My lunch bowl' })).toContainText(
    '1.5× portion',
  );
  await log();
  await page.getByLabel('Search food').fill('My lunch bowl');
  await page.locator('.food-result').getByRole('button').first().click();
  await expect(page.locator('.food-calculation')).toContainText('30.0 g protein');
});
test('today starts the chosen five-day workout in one tap and finishing offers recovery', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Gym User');
  await page.getByLabel('Training days per week').selectOption('5');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
  await page.getByRole('button', { name: 'Choose today’s exercises', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('bench');
  await page
    .locator('.exercise-library')
    .getByRole('button')
    .filter({ hasText: 'Barbell bench press' })
    .click();
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await expect(page.locator('.guided-workout')).toContainText('Barbell bench press');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await page.getByRole('button', { name: 'Finish session', exact: true }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await page.locator('.sidebar').getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start today’s workout' })).toHaveCount(0);
  await page.getByRole('button', { name: '5 days / week · Edit plan' }).click();
  await page.getByRole('dialog').getByLabel('Training days per week').selectOption('4');
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '4 days / week · Edit plan' })).toBeVisible();
});
test('Malaysian foods log by portion and missing drink macros stay unknown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore fictional demo' }).click();
  await page.locator('.sidebar').getByRole('link', { name: 'Food', exact: true }).click();
  await page.getByRole('button', { name: 'Log food', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Malaysian food', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search food' }).fill('Nasi putih + ayam goreng');
  await page.locator('.food-result').getByRole('button').first().click();
  await page.getByRole('button', { name: '½× portion', exact: true }).click();
  await expect(page.locator('.food-calculation')).toContainText('226');
  await page.getByRole('button', { name: 'Add to diary', exact: true }).click();
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Nasi putih + ayam goreng' }),
  ).toContainText('0.5× portion');
  await page.getByRole('button', { name: 'Log food', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search food' }).fill('teh tarik kurang manis');
  await page.locator('.food-result').getByRole('button').first().click();
  await expect(page.locator('.food-calculation')).toContainText('70');
  await expect(page.locator('.food-calculation')).toContainText('Protein unknown');
  await page.getByRole('button', { name: 'Add to diary', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Teh tarik kurang manis' }),
  ).toContainText('1× portion');
  await page.reload();
  await expect(
    page.locator('.meal-entries').filter({ hasText: 'Teh tarik kurang manis' }),
  ).toContainText('1× portion');
});
