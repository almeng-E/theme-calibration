import { createPatchCandidates } from "./diagnosticEngine";
import type { CandidateRuleDto } from "../types/rule.types";
import type { ThemeReportDto, RiskDto } from "../types/signal.types";
import type { IntentDto, IntentSolutionDto } from "../types/editorViewer.types";

export function createIntentSolution(
  report: Pick<ThemeReportDto, "signals" | "risks">,
  intent: IntentDto,
  rules: CandidateRuleDto[]
): IntentSolutionDto {
  const risks = report.risks.filter((risk) => matchesIntentRisk(risk, intent));

  if (risks.length === 0) {
    return {
      intent,
      status: "noMatchingRisk",
      risks: [],
      candidates: []
    };
  }

  const candidates = createPatchCandidates(
    {
      signals: report.signals,
      risks
    },
    rules
  );

  if (candidates.length === 0) {
    return {
      intent,
      status: "noCandidate",
      risks,
      candidates: []
    };
  }

  return {
    intent,
    status: "candidates",
    risks,
    candidates
  };
}

function matchesIntentRisk(risk: RiskDto, intent: IntentDto): boolean {
  if (risk.type === "lowContrast") {
    return risk.signal === intent.signal;
  }

  if (risk.type === "similarSignal") {
    return Array.isArray(risk.signals) && risk.signals.includes(intent.signal);
  }

  return false;
}
