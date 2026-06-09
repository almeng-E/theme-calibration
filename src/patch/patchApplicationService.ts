import type { PatchPlanDto, RollbackSnapshotDto, ConfigurationUpdate } from "../types/patch.types";

export interface ApplyPatchPlanWithRollbackInput {
  patchPlan: Pick<PatchPlanDto, "rollbackSnapshot" | "settingsUpdates">;
  saveRollback: (snapshot: RollbackSnapshotDto) => PromiseLike<void>;
  writeSettings: (updates: ConfigurationUpdate[]) => PromiseLike<void>;
}

export async function applyPatchPlanWithRollback(
  input: ApplyPatchPlanWithRollbackInput
): Promise<void> {
  await input.saveRollback(input.patchPlan.rollbackSnapshot);
  await input.writeSettings(input.patchPlan.settingsUpdates);
}
