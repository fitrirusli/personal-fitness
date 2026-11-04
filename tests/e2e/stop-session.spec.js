import { expect, test } from '@playwright/test';

async function setup(page) {
  await page.clock.setFixedTime(new Date('2026-11-02T08:00:00+08:00'));
  await page.goto('/');
  await page.getByLabel('Name or nickname').fill('Stop Test');
  await page.getByRole('button', { name: 'Show today’s workout' }).click();
  await page.getByRole('button', { name: 'Start workout timer', exact: true }).click();
}
async function saveWork(page) {
  await page.getByRole('button', { name: 'Add exercises', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Bodyweight squat');
  await page.locator('.exercise-library').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Add 1 to workout', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save set 1', exact: true }).click();
  await expect(page.locator('.set-saved')).toBeVisible();
}

test('an accidental start can stop and discard directly with no saved history', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No sets have been saved');
  await expect(page.getByRole('button', { name: 'Save & finish', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Discard session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.locator('.history-list')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.active-bar')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Start workout timer', exact: true }),
  ).toBeVisible();
});

test('a stopped decision survives reload, continue preserves sets, and discarding saved work asks again', async ({
  page,
}) => {
  await setup(page);
  await saveWork(page);
  await page.clock.setFixedTime(new Date('2026-11-02T08:05:00+08:00'));
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-11-02T08:10:00+08:00'));
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('1 saved sets');
  await expect(page.getByRole('timer', { name: 'Workout elapsed time' })).toContainText('00:05:00');
  await page.getByRole('button', { name: 'Continue workout', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('timer', { name: 'Workout elapsed time' })).toContainText('00:10:00');
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await page.getByRole('button', { name: 'Discard session', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Discard this active session');
  await expect(page.locator('.active-bar')).toBeAttached();
  await page.getByRole('button', { name: 'Discard session', exact: true }).click();
  await expect(page.locator('.active-bar')).toHaveCount(0);
  await expect(page.locator('.history-list')).toHaveCount(0);
});

test('save is an explicit choice after stopping and uses the stop timestamp', async ({ page }) => {
  await setup(page);
  await saveWork(page);
  await page.clock.setFixedTime(new Date('2026-11-02T08:05:00+08:00'));
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Stop this session?');
  await page.clock.setFixedTime(new Date('2026-11-02T08:10:00+08:00'));
  await page.getByRole('button', { name: 'Save & finish', exact: true }).click();
  await page.getByRole('button', { name: 'Complete session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.history-list').getByRole('button').first().click();
  await expect(page.getByRole('dialog')).toContainText('Finished 08:05');
  await expect(page.getByRole('dialog')).toContainText('Duration 00:05:00');
});
