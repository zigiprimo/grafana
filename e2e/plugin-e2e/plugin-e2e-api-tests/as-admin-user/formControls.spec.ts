import { expect, test } from '@grafana/plugin-e2e';

test('Switch with label', async ({ annotationEditPage, page }) => {
  await page.getByLabel('Switch with label').uncheck();
  await expect(page.getByLabel('Switch with label')).not.toBeChecked();
});

test('Radio button group', async ({ annotationEditPage, page }) => {
  const radioButtonGroup = page.getByTestId('test-radio-button-group');
  await radioButtonGroup.getByLabel('val3').click();
  await expect(radioButtonGroup.getByLabel('val3')).toBeChecked();
});

test('Checkbox with label', async ({ annotationEditPage, page }) => {
  // not working because the label element is not connected to the input element
  await page.getByLabel('Checkbox with label').uncheck();
  await expect(page.getByLabel('Checkbox with label')).not.toBeChecked();
});

test('Inline field with checkbox', async ({ annotationEditPage, page }) => {
  await page.getByLabel('Inline field with checkbox').uncheck();
  await expect(page.getByLabel('Inline field with checkbox')).not.toBeChecked();
});

test('Inline field with switch', async ({ annotationEditPage, page }) => {
  // not working - probably because the input is not actually visible, it's the label element that is being clicked
  await page.getByLabel('Inline field with switch').uncheck();
  await expect(page.getByLabel('Inline field with switch')).not.toBeChecked();
});

test('Inline field with input', async ({ annotationEditPage, page }) => {
  await page.getByLabel('Inline field with input').fill('test');
  await expect(page.getByLabel('Inline field with input')).toHaveValue('test');
});

test('Inline field with select', async ({ annotationEditPage, page }) => {
  // not working - id should be placed on the select element, but is placed on the wrapper div
  await page.getByLabel('Inline field with select').click();
});
