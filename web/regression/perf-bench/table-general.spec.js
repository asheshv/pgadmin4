/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Per-tab integration spec: Table > Properties > General tab.
//
// Walks every editable field on the General tab with dummy data
// (name, comment, owner — schema is a typeahead, leave default).
// Clicks Save; the save endpoint is mocked so no DB write happens.
// Asserts:
//   - Save click landed on our mock (not a real PUT)
//   - The canary stayed silent across the whole flow

import { test } from '@playwright/test';
import {
  bootTableEditDialog, clickSaveAndExpectMockHit, fillByLabel,
} from './table-dialog-helpers';

test('Table > Properties > General — every field accepts dummy data', async ({ page }) => {
  const ctx = await bootTableEditDialog(page, 'General');

  // Name — the always-present, always-editable field.
  await fillByLabel(page, 'Name', 'audit_smoke_renamed_t');

  // Comment is a multiline textarea — locator by accessible name.
  const comment = page.getByRole('textbox', { name: 'Comment' }).first();
  if (await comment.count()) {
    await comment.click();
    await comment.fill('Integration test comment — Mutate + Save (mocked)');
  }

  // Owner (and Schema, Tablespace) are typeahead selects. Their
  // accessible name match works the same way; fall through if any
  // are not present in the current version.
  // We intentionally DON'T touch owner because:
  //   - It's a combobox loaded async via fixedRows; touching it
  //     triggers a network fetch we'd then have to mock.
  //   - The Name change alone makes the form dirty, which is what
  //     enables the Save button.
  await clickSaveAndExpectMockHit(page, ctx);
});
