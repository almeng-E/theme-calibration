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

interface CandidateMapping extends CandidateSettingChange {
  confidence: number;
}

const LOW_CONTRAST_MAPPINGS: Partial<Record<ColorSignalRole, CandidateMapping>> = {
  comment: {
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "comments",
    suggestedColor: "#8fb8ff",
    confidence: 0.8
  },
  string: {
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "strings",
    suggestedColor: "#b7f2a1",
    confidence: 0.8
  },
  keyword: {
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "keywords",
    suggestedColor: "#d7b7ff",
    confidence: 0.8
  },
  foreground: {
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editor.foreground",
    suggestedColor: "#eeeeee",
    confidence: 0.75
  },
  error: {
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorError.foreground",
    suggestedColor: "#ff6b6b",
    confidence: 0.75
  },
  warning: {
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorWarning.foreground",
    suggestedColor: "#ffd166",
    confidence: 0.75
  }
};

const SIMILAR_SIGNAL_MAPPINGS: Array<{
  pair: [ColorSignalRole, ColorSignalRole];
  mapping: CandidateMapping;
}> = [
  {
    pair: ["error", "diffDeleted"],
    mapping: {
      settingId: SETTING_IDS.workbenchColorCustomizations,
      settingKey: "editorGutter.deletedBackground",
      suggestedColor: "#ff6b6b",
      confidence: 0.7
    }
  },
  {
    pair: ["diffAdded", "string"],
    mapping: {
      settingId: SETTING_IDS.workbenchColorCustomizations,
      settingKey: "editorGutter.addedBackground",
      suggestedColor: "#4cc38a",
      confidence: 0.7
    }
  }
];

// ============================================================
// 2. Main Generation APIs
// ============================================================

export function createPatchCandidates(report: Pick<ThemeAnalysisReport, "signals" | "risks">): PatchCandidate[] {
  const candidates: PatchCandidate[] = [];

  for (const risk of report.risks) {
    const candidate = createPatchCandidate(report, risk);
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
  risk: VisibilityRisk
): PatchCandidate | undefined {
  if (risk.type === "lowContrast" && risk.signal) {
    const mapping = LOW_CONTRAST_MAPPINGS[risk.signal];
    if (!mapping) {
      return undefined;
    }

    return buildCandidate(report, risk, [risk.signal], mapping);
  }

  if (risk.type === "similarSignal" && risk.signals?.length) {
    const mapping = findSimilarSignalMapping(risk.signals);
    if (!mapping) {
      return undefined;
    }

    return buildCandidate(report, risk, risk.signals, mapping);
  }

  return undefined;
}

function buildCandidate(
  report: Pick<ThemeAnalysisReport, "signals" | "risks">,
  risk: VisibilityRisk,
  signals: ColorSignalRole[],
  mapping: CandidateMapping
): PatchCandidate {
  return {
    id: [
      risk.type,
      ...signals,
      mapping.settingId,
      mapping.settingKey
    ].join("-"),
    riskType: risk.type,
    signals,
    settingId: mapping.settingId,
    settingKey: mapping.settingKey,
    currentSignals: getCurrentSignals(report, signals),
    suggestedColor: mapping.suggestedColor,
    reason: risk.message || createFallbackReason(risk, signals),
    scope: "theme",
    confidence: mapping.confidence
  };
}

function findSimilarSignalMapping(signals: ColorSignalRole[]): CandidateMapping | undefined {
  return SIMILAR_SIGNAL_MAPPINGS.find(({ pair }) => hasSameSignals(signals, pair))?.mapping;
}

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
