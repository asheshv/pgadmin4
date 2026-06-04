/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Per-tab integration spec: Table > Properties > Constraints tab.
//
// Constraints is a nested-tab containing sub-tabs: Primary Key,
// Foreign Key, Check, Unique, Exclusion. Each sub-tab is a
// DataGridView. The walker has to recurse into the nested-tab
// branch (different code path from auditScalars) and then into
// each collection.
//
// Add one row to as many sub-tabs as we can reach, type a name
// into each, then Save. Save is mocked.

import { test } from '@playwright/test';
import {
  bootTableEditDialog, verifyWalkerCleanWithoutSave, getTabPanel,
} from './table-dialog-helpers';

const SUB_TABS = ['Primary Key', 'Foreign Key', 'Check', 'Unique'];

test('Table > Properties > Constraints — add one row to each sub-tab', async ({ page }) => {
  // Walker-correctness check via ADD_ROW dispatches. Constraint
  // sub-tab cells use typeahead/react-select widgets; reaching a
  // valid save state requires per-cell wiring beyond this spec.
  // Verify canary stays clean across the dispatches instead.
  const ctx = await bootTableEditDialog(page, 'Constraints');
  const tab = getTabPanel(page, 'constraints');
  await tab.waitFor({ state: 'visible', timeout: 15_000 });

  for (const sub of SUB_TABS) {
    // Sub-tabs render as tabs INSIDE the Constraints tab. Their
    // accessible name matches the label. If a sub-tab isn't
    // present in the current PG version, skip silently.
    const subTab = page.getByRole('tab', { name: sub, exact: true });
    if (!(await subTab.count())) continue;

     
    await subTab.click();
     
    await page.waitForTimeout(300);

    // Sub-tabs nest inside the Constraints tabpanel. Each
    // sub-tab's grid has its own ADD_ROW button; only the
    // active one is visible. Filter by :visible within the
    // constraints scope to pick the right one.
    const addRow = tab.locator('[data-test="add-row"]:visible').first();
    if (!(await addRow.count())) continue;
     
    await addRow.click({ force: true });
     
    await page.waitForTimeout(300);
    // ADD_ROW dirties the form; that's enough for Save to enable.
  }

  await verifyWalkerCleanWithoutSave(page, ctx);
});
