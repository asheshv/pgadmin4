/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Cross-tab integration spec: walker stability across a multi-
// tab walk that includes the Partitions tab.
//
// The Partitions tab's partition-key column dropdown reads from
// the Columns collection — a real cross-tab dependency. Strict
// dropdown verification requires react-select wiring beyond what
// this spec covers (separate widget-level work). What we CAN
// verify here:
//
//   1. Switching General → Columns → Partitions → SQL doesn't
//      trip the canary across the four tab transitions.
//   2. After the full walk, the SQL preview still reflects the
//      Name mutation from General — proving the walker kept
//      coherent state across the tab boundary that includes
//      Partitions.
//
// (We INTENTIONALLY skip ADD_ROW on Columns — empty columns
// produce validation errors that make getSQL return
// "-- Definition incomplete." and mask the Name change. The
// table-columns.spec.js spec covers ADD_ROW walker correctness
// directly via the canary.)

import { test, expect } from '@playwright/test';
import {
  bootTableEditDialog, verifyWalkerCleanWithoutSave, readSqlPreview,
} from './table-dialog-helpers';

test('Table > Properties — walker stable across General→Columns→Partitions→SQL', async ({ page }) => {
  const ctx = await bootTableEditDialog(page, 'General');

  // Type a unique sentinel into Name. Cross-tab SQL observer
  // verifies this survives all subsequent tab transitions.
  const sentinel = '_audit_crosstab_partitions_y456';
  const name = page.getByRole('textbox', { name: 'Name', exact: true }).first();
  await name.click();
  await name.press('End');
  await name.type(sentinel);
  await page.waitForTimeout(300);

  // Walk through every major tab. Each click fires a render +
  // walker pass against the current sessData; if any switch
  // diverged, the canary throws.
  for (const tabName of ['Columns', 'Partitions', 'Constraints', 'Parameters', 'Security']) {
    const tab = page.getByRole('tab', { name: tabName, exact: true });
    if (!(await tab.count())) continue;
     
    await tab.first().click();
     
    await page.waitForTimeout(400);
  }

  // After the long walk, SQL should still contain the Name from
  // step 1 — proving sessData stayed coherent across every
  // boundary, including the dependency-heavy Partitions tab.
  const sql = await readSqlPreview(page);
  expect(sql).toContain(sentinel);

  await verifyWalkerCleanWithoutSave(page, ctx);
});
