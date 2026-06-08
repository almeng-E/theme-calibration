"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { applyPatchPlanWithRollback } = require("../../out/patch/patchApplicationService");

test("applyPatchPlanWithRollback saves rollback before writing settings", async () => {
  const calls = [];

  await applyPatchPlanWithRollback({
    patchPlan: createPatchPlan(),
    saveRollback: async (snapshot) => {
      calls.push({ type: "saveRollback", snapshot });
    },
    writeSettings: async (updates) => {
      calls.push({ type: "writeSettings", updates });
    }
  });

  assert.deepEqual(
    calls.map((entry) => entry.type),
    ["saveRollback", "writeSettings"]
  );
});

test("applyPatchPlanWithRollback does not write settings when rollback save fails", async () => {
  const calls = [];
  const rollbackError = new Error("rollback save failed");

  await assert.rejects(
    () => applyPatchPlanWithRollback({
      patchPlan: createPatchPlan(),
      saveRollback: async () => {
        calls.push("saveRollback");
        throw rollbackError;
      },
      writeSettings: async () => {
        calls.push("writeSettings");
      }
    }),
    rollbackError
  );

  assert.deepEqual(calls, ["saveRollback"]);
});

test("applyPatchPlanWithRollback preserves saved rollback when settings write fails", async () => {
  const calls = [];
  const writeError = new Error("write failed");

  await assert.rejects(
    () => applyPatchPlanWithRollback({
      patchPlan: createPatchPlan(),
      saveRollback: async () => {
        calls.push("saveRollback");
      },
      writeSettings: async () => {
        calls.push("writeSettings");
        throw writeError;
      }
    }),
    writeError
  );

  assert.deepEqual(calls, ["saveRollback", "writeSettings"]);
});

function createPatchPlan() {
  return {
    recipeId: "patch-candidates-default-dark",
    nextSettings: {},
    rollbackSnapshot: {
      createdAt: "2026-06-08T00:00:00.000Z",
      recipeId: "patch-candidates-default-dark",
      settings: {}
    },
    settingsUpdates: [
      {
        section: "editor",
        key: "tokenColorCustomizations",
        value: {}
      }
    ]
  };
}
