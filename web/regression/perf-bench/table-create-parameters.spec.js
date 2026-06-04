/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Create-mode per-tab spec: Parameters tab.
//
// In Create mode the VacuumSettingsSchema is mounted fresh — its
// fixedRows promises (vacuum_table + vacuum_toast) resolve at the
// same time as the Edit-mode case, exercising the same React-batch
// dispatch pattern that originally produced the divergence.

import { test } from '@playwright/test';
import {
  bootTableCreateDialog, clickSaveAndExpectMockHit, fillByLabel,
} from './table-dialog-helpers';

test('Create Table > Parameters — fixedRows + tab-switch walker stability', async ({ page }) => {
  const ctx = await bootTableCreateDialog(page, 'General');
  await fillByLabel(page, 'Name', 'audit_smoke_create_params');

  // Switch to Parameters — fires the vacuum_table + vacuum_toast
  // fixedRows promises in one microtask tick.
  await page.getByRole('tab', { name: 'Parameters', exact: true }).click();
  await page.waitForTimeout(2_000);

  // Back to General to dirty the form once more and verify the
  // walker re-evaluates correctly post-fixedRows-mount.
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await page.waitForTimeout(300);

  await clickSaveAndExpectMockHit(page, ctx);
});
