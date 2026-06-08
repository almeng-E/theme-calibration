import type { PatchExecutionPlan, RollbackSnapshot, ConfigurationUpdate } from "../types/patch.types";

export interface ApplyPatchPlanWithRollbackInput {
  patchPlan: Pick<PatchExecutionPlan, "rollbackSnapshot" | "settingsUpdates">;
  saveRollback: (snapshot: RollbackSnapshot) => PromiseLike<void>;
  writeSettings: (updates: ConfigurationUpdate[]) => PromiseLike<void>;
}

export async function applyPatchPlanWithRollback(
  input: ApplyPatchPlanWithRollbackInput
): Promise<void> {
  await input.saveRollback(input.patchPlan.rollbackSnapshot);
  await input.writeSettings(input.patchPlan.settingsUpdates);
}
