import type {
  ColorSignalMap,
  ColorSignalRole,
  SignalContrastMap,
  VisibilityRisk
} from "./types/signal.types";
import { calculateContrastRatio, calculateColorDistance } from "./colorUtils";

export interface VisibilityAnalysisResult {
  contrast: SignalContrastMap;
  risks: VisibilityRisk[];
}

export interface VisibilityAnalysisOptions {
  textContrastThreshold?: number;
  similarSignalDistanceThreshold?: number;
  textSignals?: readonly ColorSignalRole[];
  similarSignalPairs?: readonly (readonly [ColorSignalRole, ColorSignalRole])[];
}

const DEFAULT_TEXT_SIGNAL_NAMES: readonly ColorSignalRole[] = [
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning"
];

const DEFAULT_SIMILAR_SIGNAL_PAIRS: readonly (readonly [ColorSignalRole, ColorSignalRole])[] = [
  ["comment", "string"],
  ["string", "diffDeleted"],
  ["error", "diffDeleted"],
  ["warning", "keyword"],
  ["diffAdded", "string"]
];

export function analyzeVisibility(
  signals: ColorSignalMap,
  options: VisibilityAnalysisOptions = {}
): VisibilityAnalysisResult {
  const contrast = calculateSignalContrasts(signals);
  const risks = createVisibilityRisks(signals, contrast, options);

  return { contrast, risks };
}

export function calculateSignalContrasts(signals: ColorSignalMap): SignalContrastMap {
  const background = signals.background?.value;
  const contrast: SignalContrastMap = {};

  if (!background) {
    return contrast;
  }

  for (const signalName of Object.keys(signals) as ColorSignalRole[]) {
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
  signals: ColorSignalMap,
  contrast: SignalContrastMap,
  options: VisibilityAnalysisOptions = {}
): VisibilityRisk[] {
  const risks: VisibilityRisk[] = [];
  const textContrastThreshold = options.textContrastThreshold ?? 4.5;
  const similarSignalDistanceThreshold = options.similarSignalDistanceThreshold ?? 35;
  const textSignals = options.textSignals ?? DEFAULT_TEXT_SIGNAL_NAMES;
  const similarSignalPairs = options.similarSignalPairs ?? DEFAULT_SIMILAR_SIGNAL_PAIRS;

  for (const signalName of textSignals) {
    const item = contrast[signalName as Exclude<ColorSignalRole, "background">];
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
