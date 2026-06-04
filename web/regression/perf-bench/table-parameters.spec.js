/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Per-tab integration spec: Table > Properties > Parameters tab.
//
// THIS IS THE SPOT WHERE THE ORIGINAL WALKER BUG SURFACED. The
// Parameters tab embeds VacuumSettingsSchema which contains two
// fixedRows-async collections (vacuum_table + vacuum_toast).
// Their promises resolve in the same microtask tick → React
// batches two setUnpreparedData dispatches → pre-fix walker
// pruned the row that "lost" its primary slot.
//
// This spec exercises the exact production code path that
// produced the bug. If anything regresses the
// __pendingChangedPaths accumulator, this test catches it.

import { test } from '@playwright/test';
import { bootTableEditDialog, clickSaveAndExpectMockHit } from './table-dialog-helpers';

test('Table > Properties > Parameters — exercise vacuum_table/vacuum_toast fixedRows', async ({ page }) => {
  // Start on General so we can dirty the form via the Name field.
  // Parameters tab's autovacuum_custom switch is `disabled: !inCatalog`
  // for regular user tables (only editable for catalog objects),
  // so we can't toggle it. The walker stress is the tab SWITCH
  // itself: switching to Parameters mounts VacuumSettingsSchema,
  // which fires two fixedRows promises (vacuum_table + vacuum_toast)
  // resolving in the same microtask tick — the exact React-batched
  // shape that originally produced the divergence.
  const ctx = await bootTableEditDialog(page, 'General');

  // Dirty the form so Save enables.
  const name = page.getByRole('textbox', { name: 'Name', exact: true }).first();
  await name.click();
  await name.press('End');
  await name.type('_x');

  // Switch to Parameters — this is where the original bug fired.
  // We wait a tick for fixedRows to resolve and validate to run
  // against the populated collections.
  await page.getByRole('tab', { name: 'Parameters', exact: true }).click();
  await page.waitForTimeout(2_000);

  // Switch back to General — tab switching itself triggers
  // validate against a new visible field subset; the walker has
  // to keep the parameters tab's options fresh.
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await page.waitForTimeout(300);

  await clickSaveAndExpectMockHit(page, ctx);
});
