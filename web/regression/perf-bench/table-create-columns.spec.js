/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Create-mode per-tab spec: Columns tab.
//
// Stress: open Create Table, fill Name, switch to Columns, add
// many ADD_ROWs. Canary-only validation (column cells are
// react-select widgets, Save can't enable without proper cell
// values which need widget wiring).

import { test } from '@playwright/test';
import {
  bootTableCreateDialog, verifyWalkerCleanWithoutSave,
  fillByLabel, getTabPanel,
} from './table-dialog-helpers';

const NUM_COLUMNS = parseInt(process.env.AUDIT_COL_COUNT, 10) || 60;

test.setTimeout(300_000);

test(`Create Table > Columns — add ${NUM_COLUMNS} columns (walker stress)`, async ({ page }) => {
  // Boot on General so we can fill Name first (Save needs a name
  // in Create mode; even though we won't reach Save here, having
  // the name set doesn't hurt).
  const ctx = await bootTableCreateDialog(page, 'General');
  await fillByLabel(page, 'Name', 'audit_smoke_create_cols');

  // Switch to Columns and stress the DataGridView.
  await page.getByRole('tab', { name: 'Columns', exact: true }).click();
  await page.waitForTimeout(500);

  const panel = getTabPanel(page, 'columns');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  const addRow = panel.locator('[data-test="add-row"]').first();
  await addRow.waitFor({ state: 'visible', timeout: 15_000 });

  for (let i = 0; i < NUM_COLUMNS; i++) {
     
    await addRow.click({ force: true });
    if (i % 10 === 9) {
       
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(1_500);

  await verifyWalkerCleanWithoutSave(page, ctx);
});
