/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Cross-tab integration spec: General → SQL preview.
//
// The SQL preview tab regenerates a stitched-together SQL string
// from every tab's current sessData (via schema.getSQL()). It's
// the cleanest observer for cross-tab data flow:
//   1. User mutates a field on tab A.
//   2. Walker fires, sessData updates, isDirty=true.
//   3. User switches to SQL tab.
//   4. SQL preview re-renders with the changes from tab A.
//
// This spec exercises the General → SQL path: edit the Name in
// General, switch to SQL, verify the generated SQL contains the
// new name. Catches walker bugs that single-tab specs can't:
// stale sessData reads in getSQL, missing tab-switch re-validation,
// dispatches getting lost across tab boundaries.

import { test, expect } from '@playwright/test';
import {
  bootTableEditDialog, verifyWalkerCleanWithoutSave, readSqlPreview,
} from './table-dialog-helpers';

test('Table > Properties — Name change in General reflects in SQL preview', async ({ page }) => {
  const ctx = await bootTableEditDialog(page, 'General');

  // Pick a sentinel suffix that's unlikely to appear in any
  // existing system table name. Strict substring match below.
  const sentinel = '_audit_crosstab_x123';
  const name = page.getByRole('textbox', { name: 'Name', exact: true }).first();
  await name.click();
  await name.press('End');
  await name.type(sentinel);
  // Beat for the debounced sessData update to settle.
  await page.waitForTimeout(500);

  // Switch to SQL tab and read the regenerated preview.
  const sql = await readSqlPreview(page);

  // The SQL should contain a RENAME TO clause with the new name.
  // pgAdmin's getSQL() emits ALTER TABLE ... RENAME TO ... when
  // the Name field is dirty in edit mode.
  expect(sql).toContain(sentinel);
  expect(sql.toUpperCase()).toContain('RENAME TO');

  // And the walker stayed clean across the General→SQL switch.
  await verifyWalkerCleanWithoutSave(page, ctx);
});
