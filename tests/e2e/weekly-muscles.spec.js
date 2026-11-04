import { expect, test } from '@playwright/test';

async function setup(page) {
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Muscle Test');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
  await expect(page.locator('.weekly-muscles')).toBeVisible();
}
async function targets(page, enabled) {
  await page.getByRole('button', { name: 'Targets & reminders', exact: true }).click();
  for (const group of [
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Quads',
    'Hamstrings',
    'Glutes',
    'Calves',
    'Core',
  ])
    await page
      .getByLabel(`${group} days / week`, { exact: true })
      .selectOption(enabled.includes(group) ? '1' : '0');
  await page.getByRole('button', { name: 'Save weekly targets', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function finish(page) {
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toBeVisible();
  await page.getByRole('button', { name: 'Finish session', exact: true }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.active-bar')).toHaveCount(0);
  await page.locator('.sidebar').getByRole('link', { name: 'Today', exact: true }).click();
}

test('a gym workout updates direct coverage, separates assistance, and keeps targets and evidence after reload', async ({
  page,
}) => {
  await setup(page);
  await targets(page, ['Chest', 'Triceps']);
  await page.getByRole('button', { name: 'Push day', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Barbell bench');
  await page.locator('.exercise-library').getByRole('button').first().click();
  await page.getByLabel('Weight for Barbell bench press (kg)').fill('30');
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await finish(page);
  await expect(
    page.getByRole('button', { name: 'Chest: 1 of 1 direct days', exact: true }),
  ).toContainText('Target reached');
  await expect(
    page.getByRole('button', { name: 'Triceps: 0 of 1 direct days', exact: true }),
  ).toContainText('Also assisted on 1 day');
  await page.reload();
  await page.getByRole('button', { name: 'Chest: 1 of 1 direct days', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Barbell bench press');
  await expect(page.getByRole('dialog')).toContainText('gym · 1 working sets');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Previous muscle week' }).click();
  await expect(
    page.getByRole('button', { name: 'Chest: 0 of 1 direct days', exact: true }),
  ).toBeVisible();
});

test('home suggestions open a configurable workout and recorded home work counts on mobile', async ({
  page,
}) => {
  await setup(page);
  await targets(page, ['Quads', 'Glutes']);
  await page.getByLabel('Suggestion location').selectOption('home');
  const suggestion = page.locator('.muscle-suggestion').filter({ hasText: 'Bodyweight squat' });
  await expect(suggestion).toContainText('Bodyweight');
  await suggestion.getByRole('button', { name: 'Choose exercise' }).click();
  await expect(page.getByLabel('Workout location')).toHaveValue('home');
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await finish(page);
  await expect(page.locator('.muscle-summary')).toContainText('All enabled weekly targets reached');
  await page.getByRole('button', { name: 'Quads: 1 of 1 direct days', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('home · 1 working sets');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator('.weekly-muscles')).toContainText('Android reminders are off');
  await page.getByRole('button', { name: 'Targets & reminders', exact: true }).click();
  await expect(
    page.getByLabel('Remind me when weekly muscle targets are incomplete'),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('cannot notify after the browser closes');
});

test('a mapped personal exercise contributes to weekly coverage', async ({ page }) => {
  await setup(page);
  await targets(page, ['Chest']);
  await page.getByRole('button', { name: 'Choose today’s exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Create my own exercise' }).click();
  await page.getByLabel('New exercise name').fill('My home chest press');
  await page.locator('.new-exercise-panel').getByLabel('Chest', { exact: true }).check();
  await page.getByRole('button', { name: 'Save exercise & select it' }).click();
  await page.getByLabel('Weight for My home chest press (kg)').fill('10');
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await finish(page);
  await expect(page.locator('.muscle-summary')).toContainText('All enabled weekly targets reached');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Chest: 1 of 1 direct days', exact: true }),
  ).toBeVisible();
});
