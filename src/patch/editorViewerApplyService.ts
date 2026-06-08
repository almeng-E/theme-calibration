import { createCandidatePatchApplyPlan } from "./patchService";
import type { CandidatePatchApplyPlan, CandidatePatchApplyPlanInput } from "./patchService";
import type { IntentSolution } from "../types/editorViewer.types";
import type { ThemeAnalysisReport } from "../types/signal.types";
import type { PatchCandidate } from "../types/patch.types";

export interface EditorViewerCandidateApplyPlanInput
  extends Omit<CandidatePatchApplyPlanInput, "candidates" | "selectedCandidateIds"> {
  candidate: PatchCandidate;
  currentReport?: ThemeAnalysisReport;
}

export type EditorViewerCandidateApplyPlanResult =
  | {
    status: "staleReport";
  }
  | ({
    status: "ready";
    selectedCandidate: CandidatePatchApplyPlan["selectedCandidates"][number];
  } & Pick<CandidatePatchApplyPlan, "patchPlan">);

export function createEditorViewerCandidateApplyPlan(
  input: EditorViewerCandidateApplyPlanInput
): EditorViewerCandidateApplyPlanResult {

  if (input.currentReport && isEditorViewerReportStale(input.report, input.currentReport)) {
    return {
      status: "staleReport"
    };
  }

  const applyPlan = createCandidatePatchApplyPlan({
    report: input.report,
    candidates: [input.candidate],
    selectedCandidateIds: [input.candidate.id],
    existingSettings: input.existingSettings,
    now: input.now
  });

  return {
    status: "ready",
    selectedCandidate: input.candidate,
    patchPlan: applyPlan.patchPlan
  };
}

function isEditorViewerReportStale(viewerReport: ThemeAnalysisReport, currentReport: ThemeAnalysisReport): boolean {
  return createReportStaleFingerprint(viewerReport) !== createReportStaleFingerprint(currentReport);
}

function createReportStaleFingerprint(report: ThemeAnalysisReport): string {
  return JSON.stringify({
    theme: {
      configuredName: report.theme.configuredName,
      activeKind: report.theme.activeKind,
      id: report.theme.id,
      label: report.theme.label,
      extensionId: report.theme.extensionId,
      definitionStatus: report.theme.definitionStatus
    },
    signals: report.signals,
    risks: report.risks
  });
}
