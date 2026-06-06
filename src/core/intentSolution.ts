import { createPatchCandidates } from "./patchGenerator";
import type { CalibrationIntent } from "./types/calibration.types";
import type { PatchCandidate } from "./types/patch.types";
import type { ThemeAnalysisReport, VisibilityRisk } from "./types/signal.types";

export type IntentSolutionStatus = "candidates" | "noMatchingRisk" | "noCandidate";

export interface IntentSolution {
  intent: CalibrationIntent;
  status: IntentSolutionStatus;
  risks: VisibilityRisk[];
  candidates: PatchCandidate[];
}

export function createIntentSolution(
  report: ThemeAnalysisReport,
  intent: CalibrationIntent
): IntentSolution {
  const risks = report.risks.filter((risk) => isRiskRelatedToSignal(risk, intent.signal));

  if (risks.length === 0) {
    return {
      intent,
      status: "noMatchingRisk",
      risks,
      candidates: []
    };
  }

  const candidates = createPatchCandidates({
    signals: report.signals,
    risks
  });

  return {
    intent,
    status: candidates.length > 0 ? "candidates" : "noCandidate",
    risks,
    candidates
  };
}

function isRiskRelatedToSignal(risk: VisibilityRisk, signal: CalibrationIntent["signal"]): boolean {
  if (risk.type === "lowContrast") {
    return risk.signal === signal;
  }

  if (risk.type === "similarSignal") {
    return risk.signals?.includes(signal) ?? false;
  }

  return false;
}
