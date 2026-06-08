import { createCandidatePatchApplyPlan } from "./patchService";
import type { CandidatePatchApplyPlan, CandidatePatchApplyPlanInput } from "./patchService";
import type { IntentSolution } from "../types/editorViewer.types";
import type { ThemeAnalysisReport } from "../types/signal.types";

export interface EditorViewerCandidateApplyPlanInput
  extends Omit<CandidatePatchApplyPlanInput, "candidates" | "selectedCandidateIds"> {
  latestSolution?: IntentSolution;
  candidateId: string;
  currentReport?: ThemeAnalysisReport;
}

export type EditorViewerCandidateApplyPlanResult =
  | {
    status: "noActiveSolution";
  }
  | {
    status: "invalidCandidateId";
  }
  | {
    status: "staleReport";
  }
  | {
    status: "candidateUnavailable";
  }
  | ({
    status: "ready";
    selectedCandidate: CandidatePatchApplyPlan["selectedCandidates"][number];
  } & Pick<CandidatePatchApplyPlan, "patchPlan">);

export function createEditorViewerCandidateApplyPlan(
  input: EditorViewerCandidateApplyPlanInput
): EditorViewerCandidateApplyPlanResult {
  const activeSolution = input.latestSolution?.status === "candidates" ? input.latestSolution : undefined;

  if (!activeSolution) {
    return {
      status: "noActiveSolution"
    };
  }

  const candidateId = input.candidateId.trim();
  if (!candidateId) {
    return {
      status: "invalidCandidateId"
    };
  }

  if (input.currentReport && isEditorViewerReportStale(input.report, input.currentReport)) {
    return {
      status: "staleReport"
    };
  }

  const selectedCandidate = activeSolution.candidates.find((candidate) => candidate.id === candidateId);
  if (!selectedCandidate) {
    return {
      status: "candidateUnavailable"
    };
  }

  const applyPlan = createCandidatePatchApplyPlan({
    report: input.report,
    candidates: activeSolution.candidates,
    selectedCandidateIds: [selectedCandidate.id],
    existingSettings: input.existingSettings,
    now: input.now
  });

  return {
    status: "ready",
    selectedCandidate,
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
