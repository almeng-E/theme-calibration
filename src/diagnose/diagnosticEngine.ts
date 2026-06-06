import { SETTING_IDS } from "../constants";
import type {
  PatchCandidate,
  CandidateSettingChange,
  PatchRecipe,
  SettingDictionary,
  TargetSettingId
} from "../types/patch.types";
import type {
  ColorSignalRole,
  ThemeAnalysisReport,
  VisibilityRisk
} from "../types/signal.types";
import { isPlainObject, createEmptySettingsSnapshot } from "../utils/objectUtils";

// ============================================================
// 1. Constants & Mappings
// ============================================================

export interface CandidateMappingRule {
  type: "lowContrast" | "similarSignal";
  signals: ColorSignalRole[];
  settingId: TargetSettingId;
  settingKey: string;
  suggestedColor: string;
  confidence: number;
}

// ============================================================
// 2. Main Generation APIs
// ============================================================

export function createPatchCandidates(
  report: Pick<ThemeAnalysisReport, "signals" | "risks">,
  rules: CandidateMappingRule[] = [] // Default to empty, engine does not know the colors
): PatchCandidate[] {
  const candidates: PatchCandidate[] = [];

  for (const risk of report.risks) {
    const candidate = createPatchCandidate(report, risk, rules);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

export function createPatchRecipeFromCandidates(
  candidates: readonly PatchCandidate[],
  themeName?: string
): PatchRecipe {
  const settings = createEmptySettingsSnapshot();

  for (const candidate of candidates) {
    const target = getSettingTarget(settings[candidate.settingId], themeName);
    target[candidate.settingKey] = candidate.suggestedColor;
  }

  return {
    id: `patch-candidates-${slugify(themeName || "global")}`,
    description: "Conservative patch recipe generated from theme signal risks.",
    settings
  };
}

// ============================================================
// 3. Candidate Generation Helpers
// ============================================================

function createPatchCandidate(
  report: Pick<ThemeAnalysisReport, "signals" | "risks">,
  risk: VisibilityRisk,
  rules: CandidateMappingRule[]
): PatchCandidate | undefined {
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
  report: Pick<ThemeAnalysisReport, "signals" | "risks">,
  risk: VisibilityRisk,
  signals: ColorSignalRole[],
  rule: CandidateMappingRule
): PatchCandidate {
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

function hasSameSignals(left: readonly ColorSignalRole[], right: readonly ColorSignalRole[]): boolean {
  return left.length === right.length && right.every((signal) => left.includes(signal));
}

function getCurrentSignals(
  report: Pick<ThemeAnalysisReport, "signals" | "risks">,
  signals: ColorSignalRole[]
): PatchCandidate["currentSignals"] {
  const currentSignals: PatchCandidate["currentSignals"] = {};

  for (const signal of signals) {
    const value = report.signals[signal]?.value;
    if (value) {
      currentSignals[signal] = value;
    }
  }

  return currentSignals;
}

function createFallbackReason(risk: VisibilityRisk, signals: ColorSignalRole[]): string {
  if (risk.type === "lowContrast") {
    return `${signals[0]} has low contrast against the editor background.`;
  }

  return `${signals.join(" and ")} are visually close.`;
}

// ============================================================
// 4. Recipe Generation Helpers
// ============================================================

function getSettingTarget(setting: SettingDictionary, themeName: string | undefined): SettingDictionary {
  if (!themeName) {
    return setting;
  }

  const themeKey = `[${themeName}]`;
  if (!isPlainObject(setting[themeKey])) {
    setting[themeKey] = {};
  }

  return setting[themeKey] as SettingDictionary;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "global";
}
