import type { VscodePatchPlan, VscodeRollbackSnapshot, VscodeSettingUpdate } from "./types";

export interface ApplyPatchPlanWithRollbackInput {
  patchPlan: Pick<VscodePatchPlan, "rollbackSnapshot" | "settingsUpdates">;
  saveRollback: (snapshot: VscodeRollbackSnapshot) => PromiseLike<void>;
  writeSettings: (updates: VscodeSettingUpdate[]) => PromiseLike<void>;
}

export async function applyPatchPlanWithRollback(
  input: ApplyPatchPlanWithRollbackInput
): Promise<void> {
  await input.saveRollback(input.patchPlan.rollbackSnapshot);
  await input.writeSettings(input.patchPlan.settingsUpdates);
}
