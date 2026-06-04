/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Create-mode per-tab spec: Security tab.
//
// ADD_ROW on each Security-tab grid (Privileges + Security labels).
// Same shape as edit-mode security spec.

import { test } from '@playwright/test';
import {
  bootTableCreateDialog, verifyWalkerCleanWithoutSave,
  fillByLabel, getTabPanel,
} from './table-dialog-helpers';

test('Create Table > Security — add privilege + security label', async ({ page }) => {
  const ctx = await bootTableCreateDialog(page, 'General');
  await fillByLabel(page, 'Name', 'audit_smoke_create_security');

  await page.getByRole('tab', { name: 'Security', exact: true }).click();
  await page.waitForTimeout(500);
  const panel = getTabPanel(page, 'security_group');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  const addRows = panel.locator('[data-test="add-row"]');
  const count = await addRows.count();
  for (let i = 0; i < count; i++) {
     
    await addRows.nth(i).click({ force: true });
     
    await page.waitForTimeout(300);
  }

  await verifyWalkerCleanWithoutSave(page, ctx);
});
