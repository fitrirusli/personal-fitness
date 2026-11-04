import { expect, test } from '@playwright/test';
async function setup(page, withSecondExercise = true) {
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Fictional correction test');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
  await page.getByRole('button', { name: 'Choose today’s exercises', exact: true }).click();
  for (const name of withSecondExercise
    ? ['Barbell bench press', 'Dumbbell lateral raise']
    : ['Barbell bench press']) {
    await page.getByRole('textbox', { name: 'Search exercises' }).fill(name);
    await page.locator('.exercise-library').getByRole('button').first().click();
    await page.getByLabel(`Sets for ${name}`, { exact: true }).fill('1');
    await page
      .getByLabel(`Weight for ${name} (kg)`)
      .fill(name === 'Barbell bench press' ? '25' : '5');
  }
  await page.getByRole('button', { name: 'Start my workout', exact: true }).click();
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toContainText('Barbell bench press');
  if (withSecondExercise) {
    await expect(page.locator('.guided-workout h2')).toContainText('Dumbbell lateral raise');
    await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
    await expect(page.locator('.set-saved')).toContainText('Dumbbell lateral raise');
  }
  await page.getByRole('button', { name: 'Finish session', exact: true }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.history-list').getByRole('button').first().click();
}

test('confirm removing a mistakenly recorded bench press, keeping other lifts and fixing next-workout choices', async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole('button', { name: 'Remove Barbell bench press from history', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Remove recorded exercise?');
  await page.getByRole('button', { name: 'Keep exercise', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('25 kg');
  await page
    .getByRole('button', { name: 'Remove Barbell bench press from history', exact: true })
    .click();
  await page.getByRole('button', { name: 'Remove from history', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toContainText('Barbell bench press');
  await expect(page.getByRole('dialog')).toContainText('Dumbbell lateral raise');
  await expect(page.getByRole('dialog')).toContainText('5 kg');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.locator('.history-list').getByRole('button').first().click();
  await expect(page.getByRole('dialog')).not.toContainText('Barbell bench press');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page
    .locator('.workout-library')
    .getByRole('button', { name: 'Use workout', exact: true })
    .click();
  await expect(page.locator('.builder-selected')).not.toContainText('Barbell bench press');
  await expect(page.locator('.builder-selected')).toContainText('Dumbbell lateral raise');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('removing the only working exercise explains and removes the empty workout and its generated routine', async ({
  page,
}) => {
  await setup(page, false);
  await page
    .getByRole('button', { name: 'Remove Barbell bench press from history', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('No other working sets will remain');
  await page.getByRole('button', { name: 'Remove from history', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.history-list')).toHaveCount(0);
  await expect(page.locator('.workout-library')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.history-list')).toHaveCount(0);
});
