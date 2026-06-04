/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Per-tab integration spec: Table > Properties > Security tab.
//
// Security covers two collections — `relacl` (Privileges grid) +
// `seclabels` (Security Labels grid). Both are
// SchemaChild-wrapped DataGridViews. seclabels is the path that
// SubscriptionSchema crashed on earlier (audit-skip pattern); the
// real-browser flow stresses it differently than synthetic.

import { test } from '@playwright/test';
import {
  bootTableEditDialog, verifyWalkerCleanWithoutSave, getTabPanel,
} from './table-dialog-helpers';

test('Table > Properties > Security — add privilege + security label', async ({ page }) => {
  // Walker-correctness check via ADD_ROW on each Security
  // collection. Privileges + Security Labels cells use typeaheads
  // (grantee role select, label provider select) that need
  // widget-level wiring to fill — out of scope for this spec.
  const ctx = await bootTableEditDialog(page, 'Security');

  // The Privileges and Security labels collections are stacked
  // sections of the same tab. Each has its own ADD_ROW button.
  // Scope to the Security tabpanel (testid='security_group') so
  // we don't pick up hidden add-row buttons from other tabs.
  const panel = getTabPanel(page, 'security_group');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  const addRows = panel.locator('[data-test="add-row"]');
  const count = await addRows.count();

  // ADD_ROW once to each grid in succession.
  for (let i = 0; i < count; i++) {
     
    await addRows.nth(i).click({ force: true });
     
    await page.waitForTimeout(300);
  }

  // ADD_ROW on either Privileges or Security labels dirties the
  // form; that's enough to enable Save. We skip cell-level typing
  // (most cells in these grids are typeahead selects that would
  // need extensive selector wiring to populate).

  await verifyWalkerCleanWithoutSave(page, ctx);
});
