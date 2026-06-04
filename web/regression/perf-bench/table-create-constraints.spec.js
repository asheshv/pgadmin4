/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Create-mode per-tab spec: Constraints tab.
//
// Iterate sub-tabs (Primary Key / Foreign Key / Check / Unique),
// ADD_ROW in each. Canary-only validation.

import { test } from '@playwright/test';
import {
  bootTableCreateDialog, verifyWalkerCleanWithoutSave,
  fillByLabel, getTabPanel,
} from './table-dialog-helpers';

const SUB_TABS = ['Primary Key', 'Foreign Key', 'Check', 'Unique'];

test('Create Table > Constraints — add one row to each sub-tab', async ({ page }) => {
  const ctx = await bootTableCreateDialog(page, 'General');
  await fillByLabel(page, 'Name', 'audit_smoke_create_constraints');

  await page.getByRole('tab', { name: 'Constraints', exact: true }).click();
  await page.waitForTimeout(500);
  const tab = getTabPanel(page, 'constraints');
  await tab.waitFor({ state: 'visible', timeout: 15_000 });

  for (const sub of SUB_TABS) {
    const subTab = page.getByRole('tab', { name: sub, exact: true });
    if (!(await subTab.count())) continue;
     
    await subTab.click();
     
    await page.waitForTimeout(300);

    const addRow = tab.locator('[data-test="add-row"]:visible').first();
    if (!(await addRow.count())) continue;
     
    await addRow.click({ force: true });
     
    await page.waitForTimeout(300);
  }

  await verifyWalkerCleanWithoutSave(page, ctx);
});
