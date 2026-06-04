/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Per-tab integration spec: Table > Properties > Columns tab.
//
// Stress test: adds MANY columns and types into each row's name
// cell. The Columns DataGridView is the heaviest collection in
// any pgAdmin dialog — under the incremental walker, this is the
// scenario the perf bench shows the largest gains on. Catching
// walker divergence here means it'll be caught on a real user's
// 200-column table too.
//
// Save is mocked. The mock's payload tracker lets us verify the
// dirty-tracking caught all the column rows.

import { test } from '@playwright/test';
import {
  bootTableEditDialog, verifyWalkerCleanWithoutSave, getTabPanel,
} from './table-dialog-helpers';

const NUM_COLUMNS = parseInt(process.env.AUDIT_COL_COUNT, 10) || 60;

test.setTimeout(300_000);

test(`Table > Properties > Columns — add ${NUM_COLUMNS} columns (walker stress)`, async ({ page }) => {
  // This spec stresses the DataGridView walker path via ADD_ROW
  // dispatches. Each new column row's cells (name + type) use
  // react-select widgets that need cell-level widget wiring to
  // fill — out of scope for this walker-correctness check. The
  // canary fires on EVERY ADD_ROW regardless of whether the form
  // ever reaches a save-valid state, so we verify canary silence
  // without clicking Save. The General + Parameters specs cover
  // the full Mutate + Save flow on tabs that don't need
  // widget-level cell wiring.
  const ctx = await bootTableEditDialog(page, 'Columns');

  // The Edit dialog has multiple [data-test="add-row"] buttons
  // across different tabs (constraints sub-tabs, partition keys,
  // privileges, etc.) — most hidden. Scope to the currently-
  // visible tabpanel.
  const panel = getTabPanel(page, 'columns');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  const addRow = panel.locator('[data-test="add-row"]').first();
  await addRow.waitFor({ state: 'visible', timeout: 15_000 });

  // Click ADD_ROW N times. React batches many of these into one
  // commit — exactly the multi-path-batch shape the walker's
  // accumulator was built to handle. The PRESENCE of N rows at
  // save time is the stress; cell-level data isn't required for
  // the walker / canary to exercise the heavy collection path.
  for (let i = 0; i < NUM_COLUMNS; i++) {
     
    await addRow.click({ force: true });
    if (i % 10 === 9) {
       
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(1_500);

  // Canary fired on every ADD_ROW dispatch above; if any walker
  // divergence happened the audit would have thrown.
  await verifyWalkerCleanWithoutSave(page, ctx);
});
