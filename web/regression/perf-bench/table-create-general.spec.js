/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Create-mode per-tab spec: General tab.
//
// Open Create Table dialog, fill the required Name, click Save.
// Mock intercepts POST /browser/table/obj/... and returns success
// — no real CREATE TABLE happens. Asserts mock fired + canary
// stayed clean.

import { test } from '@playwright/test';
import {
  bootTableCreateDialog, clickSaveAndExpectMockHit, fillByLabel,
} from './table-dialog-helpers';

test('Create Table > General — fill Name + Save', async ({ page }) => {
  const ctx = await bootTableCreateDialog(page, 'General');

  // Create mode: Name is REQUIRED for Save to enable.
  await fillByLabel(page, 'Name', 'audit_smoke_create_t');

  // Comment is optional but exercises the multiline path too.
  const comment = page.getByRole('textbox', { name: 'Comment' }).first();
  if (await comment.count()) {
    await comment.click();
    await comment.fill('Create-mode integration test (mocked save)');
  }

  await clickSaveAndExpectMockHit(page, ctx);
});
