import { buildPatchPlan } from "./patchEngine";
import { createPatchCandidates, createPatchRecipeFromCandidates } from "./patchGenerator";
import type { ConfigurationSnapshot, PatchCandidate, PatchExecutionPlan } from "./types/patch.types";
import type { ThemeAnalysisReport } from "./types/signal.types";

export interface CandidatePatchApplyPlanInput {
  report: ThemeAnalysisReport;
  selectedCandidateIds: readonly string[];
  existingSettings: ConfigurationSnapshot;
  now?: Date;
}

export interface CandidatePatchApplyPlan {
  candidates: PatchCandidate[];
  selectedCandidates: PatchCandidate[];
  patchPlan: PatchExecutionPlan;
}

export function createCandidatePatchApplyPlan(input: CandidatePatchApplyPlanInput): CandidatePatchApplyPlan {
  const candidates = createPatchCandidates(input.report);

  if (candidates.length === 0) {
    throw new Error("No patch candidates were generated for the current theme.");
  }

  if (input.selectedCandidateIds.length === 0) {
    throw new Error("No patch candidates were selected.");
  }

  const selectedCandidates = input.selectedCandidateIds
    .map((id) => candidates.find((candidate) => candidate.id === id));
  const missingCandidateIds = input.selectedCandidateIds
    .filter((_, index) => !selectedCandidates[index]);

  if (missingCandidateIds.length > 0) {
    throw new Error(`Selected patch candidates were not found: ${missingCandidateIds.join(", ")}`);
  }

  const selectedPatchCandidates = selectedCandidates as PatchCandidate[];
  const recipe = createPatchRecipeFromCandidates(
    selectedPatchCandidates,
    input.report.theme.configuredName
  );

  return {
    candidates,
    selectedCandidates: selectedPatchCandidates,
    patchPlan: buildPatchPlan(input.existingSettings, recipe, input.now)
  };
}
