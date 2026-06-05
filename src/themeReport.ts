import type {
  InstalledThemeEntry,
  ThemeDefinition,
  ThemeProbe,
  ThemeRisk,
  ThemeSignal,
  ThemeSignalName,
  ThemeSignalReport,
  ThemeSignals,
  TokenColorRule
} from "./types";

const TEXT_SIGNAL_NAMES: ThemeSignalName[] = [
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning"
];

const SIMILAR_SIGNAL_PAIRS: Array<[ThemeSignalName, ThemeSignalName]> = [
  ["comment", "string"],
  ["string", "diffDeleted"],
  ["error", "diffDeleted"],
  ["warning", "keyword"],
  ["diffAdded", "string"]
];

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function createThemeSignalReport(probe: Partial<ThemeProbe> | undefined): ThemeSignalReport {
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

function extractSignals(definition: ThemeDefinition): ThemeSignals {
  const colors = definition.colors || {};
  const tokenColors = Array.isArray(definition.tokenColors) ? definition.tokenColors : [];
  const signals: ThemeSignals = {};

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

function calculateSignalContrasts(signals: ThemeSignals): ThemeSignalReport["contrast"] {
  const background = signals.background?.value;
  const contrast: ThemeSignalReport["contrast"] = {};

  if (!background) {
    return contrast;
  }

  for (const signalName of Object.keys(signals) as ThemeSignalName[]) {
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

function createRisks(signals: ThemeSignals, contrast: ThemeSignalReport["contrast"]): ThemeRisk[] {
  const risks: ThemeRisk[] = [];

  for (const signalName of TEXT_SIGNAL_NAMES) {
    const item = contrast[signalName as Exclude<ThemeSignalName, "background">];
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

export function calculateContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const foreground = resolveColorOverBackground(parseHexColor(foregroundHex), parseHexColor(backgroundHex));
  const background = parseHexColor(backgroundHex);
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));

  return roundToTwo((lighter + 0.05) / (darker + 0.05));
}

export function calculateColorDistance(leftHex: string, rightHex: string): number {
  const left = parseHexColor(leftHex);
  const right = parseHexColor(rightHex);
  const distance = Math.sqrt(
    Math.pow(left.r - right.r, 2) +
      Math.pow(left.g - right.g, 2) +
      Math.pow(left.b - right.b, 2)
  );

  return roundToTwo(distance);
}

export function parseHexColor(hex: string): ParsedColor {
  const normalized = hex.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) {
    throw new Error(`Unsupported hex color: ${hex}`);
  }

  const value = match[1] || "";

  if (value.length === 3) {
    return {
      r: parseInt(value[0] + value[0], 16),
      g: parseInt(value[1] + value[1], 16),
      b: parseInt(value[2] + value[2], 16),
      a: 1
    };
  }

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: value.length === 8 ? roundToTwo(parseInt(value.slice(6, 8), 16) / 255) : 1
  };
}

function relativeLuminance(color: ParsedColor): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function resolveColorOverBackground(foreground: ParsedColor, background: ParsedColor): ParsedColor {
  if (foreground.a >= 1) {
    return foreground;
  }

  return {
    r: Math.round(foreground.r * foreground.a + background.r * (1 - foreground.a)),
    g: Math.round(foreground.g * foreground.a + background.g * (1 - foreground.a)),
    b: Math.round(foreground.b * foreground.a + background.b * (1 - foreground.a)),
    a: 1
  };
}

function firstColor(colors: Record<string, string>, keys: string[]): ThemeSignal | undefined {
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
  signalName: ThemeSignalName,
  scopeMatcher: (scope: string) => boolean
): ThemeSignal | undefined {
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

function findLoadedCurrentTheme(probe: Partial<ThemeProbe> | undefined): InstalledThemeEntry | undefined {
  const matches = probe?.currentTheme?.matchedInstalledThemes;
  if (!Array.isArray(matches)) {
    return undefined;
  }

  return matches.find((entry) =>
    entry.themeDefinition?.status === "loaded" && Boolean(entry.themeDefinition.resolvedDefinition)
  );
}

function addSignal(signals: ThemeSignals, name: ThemeSignalName, signal: ThemeSignal | undefined): void {
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

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
