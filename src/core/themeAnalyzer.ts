import type {
  InstalledTheme,
  RawThemeData,
  ThemeEnvironment,
  TokenColorRule
} from "./types/theme.types";
import type {
  ColorSignal,
  ColorSignalMap,
  ColorSignalRole,
  SignalContrastMap,
  ThemeAnalysisReport,
  VisibilityRisk
} from "./types/signal.types";
import { calculateContrastRatio, calculateColorDistance } from "./colorUtils";

const TEXT_SIGNAL_NAMES: ColorSignalRole[] = [
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning"
];

const SIMILAR_SIGNAL_PAIRS: Array<[ColorSignalRole, ColorSignalRole]> = [
  ["comment", "string"],
  ["string", "diffDeleted"],
  ["error", "diffDeleted"],
  ["warning", "keyword"],
  ["diffAdded", "string"]
];

export function createThemeSignalReport(probe: Partial<ThemeEnvironment> | undefined): ThemeAnalysisReport {
  const configuredName = probe?.currentTheme?.configuredName;
  const activeKind = probe?.currentTheme?.activeKind;
  const matchedTheme = findLoadedCurrentTheme(probe);

  if (!matchedTheme || matchedTheme.themeDefinition?.status !== "loaded") {
    return {
      generatedAt: new Date().toISOString(),
      theme: {
        configuredName,
        activeKind,
        definitionStatus: "missing"
      },
      signals: {},
      contrast: {},
      risks: [
        {
          type: "missingThemeDefinition",
          message: "Current theme definition could not be loaded, so no signal report was generated."
        }
      ]
    };
  }

  const definition = matchedTheme.themeDefinition.resolvedDefinition;
  const signals = extractSignals(definition);
  const contrast = calculateSignalContrasts(signals);
  const risks = createRisks(signals, contrast);

  return {
    generatedAt: new Date().toISOString(),
    theme: {
      configuredName,
      activeKind,
      id: matchedTheme.theme.id,
      label: matchedTheme.theme.label,
      extensionId: matchedTheme.extension.id,
      definitionStatus: matchedTheme.themeDefinition.status
    },
    signals,
    contrast,
    risks
  };
}

function extractSignals(definition: RawThemeData): ColorSignalMap {
  const colors = definition.colors || {};
  const tokenColors = Array.isArray(definition.tokenColors) ? definition.tokenColors : [];
  const signals: ColorSignalMap = {};

  addSignal(signals, "background", firstColor(colors, ["editor.background"]));
  addSignal(signals, "foreground", firstColor(colors, ["editor.foreground", "foreground"]));
  addSignal(
    signals,
    "comment",
    findTokenColor(tokenColors, "comment", (scope) => scope === "comment" || scope.startsWith("comment."))
  );
  addSignal(
    signals,
    "string",
    findTokenColor(tokenColors, "string", (scope) => scope === "string" || scope.startsWith("string."))
  );
  addSignal(
    signals,
    "keyword",
    findTokenColor(tokenColors, "keyword", (scope) => scope === "keyword" || scope.startsWith("keyword."))
  );
  addSignal(signals, "error", firstColor(colors, ["editorError.foreground", "errorForeground", "list.errorForeground"]));
  addSignal(
    signals,
    "warning",
    firstColor(colors, ["editorWarning.foreground", "list.warningForeground", "inputValidation.warningBorder"])
  );
  addSignal(
    signals,
    "diffAdded",
    firstColor(colors, ["editorGutter.addedBackground", "minimapGutter.addedBackground", "diffEditor.insertedTextBackground"])
  );
  addSignal(
    signals,
    "diffDeleted",
    firstColor(colors, ["editorGutter.deletedBackground", "minimapGutter.deletedBackground", "diffEditor.removedTextBackground"])
  );

  return signals;
}

function calculateSignalContrasts(signals: ColorSignalMap): SignalContrastMap {
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

function createRisks(signals: ColorSignalMap, contrast: SignalContrastMap): VisibilityRisk[] {
  const risks: VisibilityRisk[] = [];

  for (const signalName of TEXT_SIGNAL_NAMES) {
    const item = contrast[signalName as Exclude<ColorSignalRole, "background">];
    if (item && item.ratio < 4.5) {
      risks.push({
        type: "lowContrast",
        signal: signalName,
        contrastRatio: item.ratio,
        threshold: 4.5,
        message: `${signalName} has low contrast against the editor background.`
      });
    }
  }

  for (const [left, right] of SIMILAR_SIGNAL_PAIRS) {
    if (!signals[left] || !signals[right]) {
      continue;
    }

    const leftSignal = signals[left];
    const rightSignal = signals[right];
    if (!leftSignal || !rightSignal) {
      continue;
    }

    const distance = calculateColorDistance(leftSignal.value, rightSignal.value);
    if (distance <= 35) {
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

function firstColor(colors: Record<string, string>, keys: string[]): ColorSignal | undefined {
  for (const key of keys) {
    if (colors[key]) {
      return {
        value: colors[key],
        source: `colors.${key}`
      };
    }
  }

  return undefined;
}

function findTokenColor(
  tokenColors: TokenColorRule[],
  signalName: ColorSignalRole,
  scopeMatcher: (scope: string) => boolean
): ColorSignal | undefined {
  for (const rule of tokenColors) {
    const foreground = rule.settings?.foreground;
    if (!foreground) {
      continue;
    }

    const scopes = normalizeScopes(rule.scope);
    if (scopes.some(scopeMatcher)) {
      return {
        value: foreground,
        source: `tokenColors.${signalName}`
      };
    }
  }

  return undefined;
}

function findLoadedCurrentTheme(probe: Partial<ThemeEnvironment> | undefined): InstalledTheme | undefined {
  const matches = probe?.currentTheme?.matchedInstalledThemes;
  if (!Array.isArray(matches)) {
    return undefined;
  }

  return matches.find((entry) =>
    entry.themeDefinition?.status === "loaded" && Boolean(entry.themeDefinition.resolvedDefinition)
  );
}

function addSignal(signals: ColorSignalMap, name: ColorSignalRole, signal: ColorSignal | undefined): void {
  if (signal?.value) {
    signals[name] = signal;
  }
}

function normalizeScopes(scope: string | string[] | undefined): string[] {
  if (Array.isArray(scope)) {
    return scope.flatMap(normalizeScopes);
  }

  if (typeof scope !== "string") {
    return [];
  }

  return scope
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
