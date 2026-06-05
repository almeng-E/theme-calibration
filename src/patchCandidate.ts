import { SETTING_IDS } from "./constants";
import type {
  PatchCandidate,
  PatchCandidateSettingChange,
  PatchRecipe,
  PlainSetting,
  SettingId,
  ThemeRisk,
  ThemeSignalName,
  ThemeSignalReport
} from "./types";

interface CandidateMapping extends PatchCandidateSettingChange {
  confidence: number;
}

const LOW_CONTRAST_MAPPINGS: Partial<Record<ThemeSignalName, CandidateMapping>> = {
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
  pair: [ThemeSignalName, ThemeSignalName];
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

export function createPatchCandidates(report: Pick<ThemeSignalReport, "signals" | "risks">): PatchCandidate[] {
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
  const settings = createEmptyRecipeSettings();

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

function createPatchCandidate(
  report: Pick<ThemeSignalReport, "signals" | "risks">,
  risk: ThemeRisk
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
  report: Pick<ThemeSignalReport, "signals" | "risks">,
  risk: ThemeRisk,
  signals: ThemeSignalName[],
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

function findSimilarSignalMapping(signals: ThemeSignalName[]): CandidateMapping | undefined {
  return SIMILAR_SIGNAL_MAPPINGS.find(({ pair }) => hasSameSignals(signals, pair))?.mapping;
}

function hasSameSignals(left: readonly ThemeSignalName[], right: readonly ThemeSignalName[]): boolean {
  return left.length === right.length && right.every((signal) => left.includes(signal));
}

function getCurrentSignals(
  report: Pick<ThemeSignalReport, "signals" | "risks">,
  signals: ThemeSignalName[]
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

function createFallbackReason(risk: ThemeRisk, signals: ThemeSignalName[]): string {
  if (risk.type === "lowContrast") {
    return `${signals[0]} has low contrast against the editor background.`;
  }

  return `${signals.join(" and ")} are visually close.`;
}

function createEmptyRecipeSettings(): Record<SettingId, PlainSetting> {
  return {
    [SETTING_IDS.workbenchColorCustomizations]: {},
    [SETTING_IDS.editorTokenColorCustomizations]: {},
    [SETTING_IDS.editorSemanticTokenColorCustomizations]: {}
  };
}

function getSettingTarget(setting: PlainSetting, themeName: string | undefined): PlainSetting {
  if (!themeName) {
    return setting;
  }

  const themeKey = `[${themeName}]`;
  if (!isPlainObject(setting[themeKey])) {
    setting[themeKey] = {};
  }

  return setting[themeKey] as PlainSetting;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "global";
}

function isPlainObject(value: unknown): value is PlainSetting {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
