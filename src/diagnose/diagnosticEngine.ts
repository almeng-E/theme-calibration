import type {
  CandidateDto
} from "../types/patch.types";
import type {
  ThemeColorRole,
  ThemeReportDto,
  RiskDto
} from "../types/signal.types";
import type { CandidateRuleDto } from "../types/rule.types";

// ============================================================
// 1. Constants & Mappings
// ============================================================

// ============================================================
// 2. Main Generation APIs
// ============================================================

export function createPatchCandidates(
  report: Pick<ThemeReportDto, "signals" | "risks">,
  rules: CandidateRuleDto[] = [] // Default to empty, engine does not know the colors
): CandidateDto[] {
  const candidates: CandidateDto[] = [];

  for (const risk of report.risks) {
    const candidate = createPatchCandidate(report, risk, rules);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

// ============================================================
// 3. Candidate Generation Helpers
// ============================================================

function createPatchCandidate(
  report: Pick<ThemeReportDto, "signals" | "risks">,
  risk: RiskDto,
  rules: CandidateRuleDto[]
): CandidateDto | undefined {
  if (risk.type === "lowContrast" && risk.signal) {
    const rule = rules.find((r) => r.type === "lowContrast" && r.signals.includes(risk.signal!));
    if (!rule) {
      return undefined;
    }

    return buildCandidate(report, risk, [risk.signal], rule);
  }

  if (risk.type === "similarSignal" && risk.signals?.length) {
    const rule = rules.find((r) => r.type === "similarSignal" && hasSameSignals(r.signals, risk.signals!));
    if (!rule) {
      return undefined;
    }

    return buildCandidate(report, risk, risk.signals, rule);
  }

  return undefined;
}

function buildCandidate(
  report: Pick<ThemeReportDto, "signals" | "risks">,
  risk: RiskDto,
  signals: ThemeColorRole[],
  rule: CandidateRuleDto
): CandidateDto {
  return {
    id: [
      risk.type,
      ...signals,
      rule.settingId,
      rule.settingKey
    ].join("-"),
    riskType: risk.type,
    signals,
    settingId: rule.settingId,
    settingKey: rule.settingKey,
    currentSignals: getCurrentSignals(report, signals),
    suggestedColor: rule.suggestedColor,
    reason: risk.message || createFallbackReason(risk, signals),
    scope: "theme",
    confidence: rule.confidence
  };
}

// Removed findSimilarSignalMapping

function hasSameSignals(left: readonly ThemeColorRole[], right: readonly ThemeColorRole[]): boolean {
  return left.length === right.length && right.every((signal) => left.includes(signal));
}

function getCurrentSignals(
  report: Pick<ThemeReportDto, "signals" | "risks">,
  signals: ThemeColorRole[]
): CandidateDto["currentSignals"] {
  const currentSignals: CandidateDto["currentSignals"] = {};

  for (const signal of signals) {
    const value = report.signals[signal]?.value;
    if (value) {
      currentSignals[signal] = value;
    }
  }

  return currentSignals;
}

function createFallbackReason(risk: RiskDto, signals: ThemeColorRole[]): string {
  if (risk.type === "lowContrast") {
    return `${signals[0]} has low contrast against the editor background.`;
  }

  return `${signals.join(" and ")} are visually close.`;
}
