/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Shared helpers for the per-tab Table-dialog integration specs.
//
// Each spec under table-*.spec.js drives ONE tab of the Edit Table
// Properties dialog with dummy data, clicks Save, and asserts:
//   - Save was intercepted by our mock (so no DB write happened)
//   - No canary divergence fired during the dialog flow
//
// The mock approach lets every spec run independently without a
// pre-seeded table, without DB cleanup, and without race conditions
// between parallel Playwright workers.

import { expect } from '@playwright/test';
import {
  installErrorRecorders, enableAudit, autoDismissUnlockModal,
  expectNoDivergence, ensureServerRegistered,
  navigateToCatalogNodeViaApi, openEditDialogViaApi,
  openCreateDialogViaApi,
} from './audit-helpers';

const PGADMIN_URL =
  process.env.PGADMIN_URL || 'http://127.0.0.1:5050/browser/';

// Install a Playwright route that intercepts any PUT to
// /browser/table/obj/... and returns a synthetic success. The
// success body mirrors what pgAdmin's real save returns so the
// dialog's post-save handlers don't crash on missing fields. The
// mock also tracks invocation count so the spec can assert that
// Save was actually clicked.
//
// Returns { saveHits: number, savePayloads: object[] } that the
// spec can read after clicking Save.
export const mockTableSave = async (page) => {
  const state = { saveHits: 0, savePayloads: [], saveMethods: [] };

  await page.route('**/browser/table/obj/**', async (route) => {
    const req = route.request();
    const method = req.method();
    // Only intercept the SAVE methods (PUT for edit, POST for
    // create). Let GET (properties fetch) and DELETE pass
    // through normally — those are what the dialog needs to
    // initialise.
    if (method !== 'PUT' && method !== 'POST') {
      return route.continue();
    }

    state.saveHits++;
    state.saveMethods.push(method);
    try {
      state.savePayloads.push(JSON.parse(req.postData() || '{}'));
    } catch { state.savePayloads.push(null); }

    // Synthetic success. The shape mirrors pgAdmin's real
    // browser/table/obj PUT response: { node, success, info, data }.
    // Empty `data` is sufficient — the post-save handlers in
    // table.js only read `node`/`success` to refresh the tree.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        node: { id: 'fake', label: 'audit_smoke_table', _type: 'table' },
        success: 1,
        info: 'Mocked save — no DB write.',
        data: {},
      }),
    });
  });

  return state;
};

// Boot pgAdmin, enable the canary's throw-on-divergence flag,
// connect to the seeded server, navigate to Tables, open the FIRST
// table's Edit Properties dialog. Returns { errors, mock } where
// errors is the recorder array and mock is the saveHits tracker.
//
// `page` is the Playwright page fixture; `tabName` is the Edit
// dialog tab the spec wants to start on (e.g. 'General', 'Columns').
// The dialog opens on the General tab by default; this helper
// clicks the requested tab.
export const bootTableEditDialog = async (page, tabName) => {
  const errors = installErrorRecorders(page);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await autoDismissUnlockModal(page);
  await page.goto(PGADMIN_URL, { waitUntil: 'load', timeout: 60_000 });
  await page.locator('.file-entry').first().waitFor({
    state: 'visible', timeout: 30_000,
  });
  await page.waitForTimeout(1_000);
  await enableAudit(page);

  // Mock the save endpoint BEFORE navigating into the dialog —
  // safer because dialog mount may trigger fetches we want to
  // pass through cleanly (we only intercept PUT/POST, not GET).
  const mock = await mockTableSave(page);

  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Tables');
  const opened = await openEditDialogViaApi(page, 'table');
  expect(opened).toBeTruthy();

  // Wait for the Edit dialog to render — the Name input is the
  // most reliable signal across all tabs.
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });

  // Switch to the requested tab.
  if (tabName) {
    const tab = page.getByRole('tab', { name: tabName, exact: true });
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(300);
    }
  }

  return { errors, mock };
};

// Same as bootTableEditDialog but opens the Create Table dialog
// (POST /browser/table/obj/... on save) instead of Edit (PUT).
// Create mode starts with EMPTY sessData — Name is blank, no rows,
// isNew()=true. The mock intercepts both methods so the same
// state shape works.
export const bootTableCreateDialog = async (page, tabName) => {
  const errors = installErrorRecorders(page);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await autoDismissUnlockModal(page);
  await page.goto(PGADMIN_URL, { waitUntil: 'load', timeout: 60_000 });
  await page.locator('.file-entry').first().waitFor({
    state: 'visible', timeout: 30_000,
  });
  await page.waitForTimeout(1_000);
  await enableAudit(page);

  const mock = await mockTableSave(page);

  await ensureServerRegistered(page);
  await navigateToCatalogNodeViaApi(page, 'Tables');
  await openCreateDialogViaApi(page, 'table');

  // Wait for the Create dialog to render.
  await page.getByRole('textbox', { name: 'Name' }).first().waitFor({
    state: 'visible', timeout: 20_000,
  });

  if (tabName) {
    const tab = page.getByRole('tab', { name: tabName, exact: true });
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(300);
    }
  }

  return { errors, mock };
};

// Click Save, wait for the mock to fire, assert the canary stayed
// quiet AND the save was intercepted (not a real DB write). Spec
// callers use this as the final step.
export const clickSaveAndExpectMockHit = async (
  page, { errors, mock }
) => {
  // pgAdmin's Save button in property dialogs is labeled "Save".
  // It's disabled until isDirty=true so the spec must have mutated
  // something for this to work.
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });

  // Capture the hit count BEFORE clicking so we detect the exact
  // dispatch.
  const before = mock.saveHits;
  await saveBtn.click();

  // Poll up to 10s for the mocked PUT to land.
  for (let i = 0; i < 100; i++) {
    if (mock.saveHits > before) break;
     
    await page.waitForTimeout(100);
  }
  expect(mock.saveHits).toBeGreaterThan(before);
  // PUT for Edit, POST for Create. Mock catches both.
  expect(['PUT', 'POST'].some((m) => mock.saveMethods.includes(m))).toBe(true);

  // Walker stayed clean across the whole flow.
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
};

// Edit Table dialogs nest tabpanels — the dialog itself is a
// tabpanel wrapping a tab system whose individual panels are ALSO
// tabpanels. Probing the live DOM: with the Columns tab active,
// TWO tabpanels are :visible — the outer wrapper (no testid, no
// add-row buttons inside) and the inner content panel (testid
// matches the tab's group id, has the add-row buttons we want).
//
// `:visible.first()` picks the outer wrapper and finds zero
// add-rows. Use the testid match to pick the inner content panel
// directly. The caller passes the tab's group id (e.g. 'columns',
// 'constraints', 'parameters', 'security_group').
export const getTabPanel = (page, testid) =>
  page.locator(`[data-test="tabpanel"][data-testid="${testid}"]`);

// Group ids for each Table dialog tab — used as the testid the
// content panel renders with. Stable across PG versions.
export const TABLE_TAB_TESTIDS = {
  General: 'general',
  Definition: 'definition',
  Columns: 'columns',
  Constraints: 'constraints',
  Partition: 'partition',
  Parameters: 'parameters',
  Security: 'security_group',
  Advanced: 'advanced',
  SQL: 'SQL',
};

// Read the SQL tab's regenerated preview text. The dialog stitches
// the SQL together from every tab's current sessData via
// schema.getSQL() — so the SQL panel acts as a great observer for
// cross-tab data flow: change a field in tab A, the SQL preview
// in tab B reflects it.
//
// Uses CodeMirror's `.cm-content` text. Returns the trimmed
// concatenation (CodeMirror's internal newlines preserved as
// spaces; for tests we just look for substring matches).
export const readSqlPreview = async (page) => {
  const sqlTab = page.getByRole('tab', { name: 'SQL', exact: true });
  await sqlTab.first().click();
  // Generation is async (debounced); give it a beat to settle.
  await page.waitForTimeout(1_000);
  const cm = page.locator(`${''
  }[data-test="tabpanel"][data-testid="SQL"] .cm-content`).first();
  await cm.waitFor({ state: 'visible', timeout: 10_000 });
  return (await cm.textContent()) || '';
};

// Type into a text field by its accessible name (label).
export const fillByLabel = async (page, label, value) => {
  const field = page.getByRole('textbox', { name: label, exact: true })
    .first();
  await field.click();
  await field.fill('');
  await field.fill(value);
};

// Softer variant for specs that exercise tabs whose Save button
// requires deep widget wiring (react-select cells, typeaheads,
// dependent fields) to reach a valid form state. The walker still
// fires on every ADD_ROW / SET_VALUE we drive — that's the
// correctness signal. Save may stay disabled because of in-cell
// validation errors on empty rows; the spec doesn't need to clear
// those to verify walker correctness.
export const verifyWalkerCleanWithoutSave = async (page, { errors }) => {
  expect(await page.evaluate(() => window.__INCREMENTAL_AUDIT__)).toBe(true);
  expectNoDivergence(errors);
};
