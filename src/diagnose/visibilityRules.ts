import type {
  ThemeColorsDto,
  ThemeColorRole,
  ContrastMapDto,
  RiskDto
} from "../types/signal.types";
import { calculateContrastRatio, calculateColorDistance } from "../utils/colorUtils";

export interface VisibilityAnalysisResult {
  contrast: ContrastMapDto;
  risks: RiskDto[];
}

export interface VisibilityAnalysisOptions {
  textContrastThreshold?: number;
  similarSignalDistanceThreshold?: number;
  textSignals?: readonly ThemeColorRole[];
  similarSignalPairs?: readonly (readonly [ThemeColorRole, ThemeColorRole])[];
}

const DEFAULT_TEXT_SIGNAL_NAMES: readonly ThemeColorRole[] = [
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning"
];

const DEFAULT_SIMILAR_SIGNAL_PAIRS: readonly (readonly [ThemeColorRole, ThemeColorRole])[] = [
  ["comment", "string"],
  ["string", "diffDeleted"],
  ["error", "diffDeleted"],
  ["warning", "keyword"],
  ["diffAdded", "string"]
];

export function analyzeVisibility(
  signals: ThemeColorsDto,
  options: VisibilityAnalysisOptions = {}
): VisibilityAnalysisResult {
  const contrast = calculateSignalContrasts(signals);
  const risks = createVisibilityRisks(signals, contrast, options);

  return { contrast, risks };
}

export function calculateSignalContrasts(signals: ThemeColorsDto): ContrastMapDto {
  const background = signals.background?.value;
  const contrast: ContrastMapDto = {};

  if (!background) {
    return contrast;
  }

  for (const signalName of Object.keys(signals) as ThemeColorRole[]) {
    if (signalName === "background") {
      continue;
    }

    const value = signals[signalName]?.value;
    if (value) {
      contrast[signalName] = {
        ratio: calculateContrastRatio(value, background)
      };
    }
  }

  return contrast;
}

export function createVisibilityRisks(
  signals: ThemeColorsDto,
  contrast: ContrastMapDto,
  options: VisibilityAnalysisOptions = {}
): RiskDto[] {
  const risks: RiskDto[] = [];
  const textContrastThreshold = options.textContrastThreshold ?? 4.5;
  const similarSignalDistanceThreshold = options.similarSignalDistanceThreshold ?? 35;
  const textSignals = options.textSignals ?? DEFAULT_TEXT_SIGNAL_NAMES;
  const similarSignalPairs = options.similarSignalPairs ?? DEFAULT_SIMILAR_SIGNAL_PAIRS;

  for (const signalName of textSignals) {
    const item = contrast[signalName as Exclude<ThemeColorRole, "background">];
    if (item && item.ratio < textContrastThreshold) {
      risks.push({
        type: "lowContrast",
        signal: signalName,
        contrastRatio: item.ratio,
        threshold: textContrastThreshold,
        message: `${signalName} has low contrast against the editor background.`
      });
    }
  }

  for (const [left, right] of similarSignalPairs) {
    const leftSignal = signals[left];
    const rightSignal = signals[right];
    if (!leftSignal || !rightSignal) {
      continue;
    }

    const distance = calculateColorDistance(leftSignal.value, rightSignal.value);
    if (distance <= similarSignalDistanceThreshold) {
      risks.push({
        type: "similarSignal",
        signals: [left, right],
        colorDistance: distance,
        message: `${left} and ${right} are visually close.`
      });
    }
  }

  if (risks.length === 0) {
    risks.push({
      type: "noObviousRisk",
      message: "No obvious signal risk was detected by the current simple rules."
    });
  }

  return risks;
}
