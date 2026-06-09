import type {
  InstalledTheme,
  RawThemeData,
  ThemeEnvironment,
  TokenColorRule
} from "../types/theme.types";
import type {
  ThemeColorValue,
  ThemeColorsDto,
  ThemeColorRole,
  ThemeReportDto
} from "../types/signal.types";
import { analyzeVisibility } from "../diagnose/visibilityRules";

// ============================================================
// 1. Main Entry
// ============================================================

export function createThemeSignalReport(probe: Partial<ThemeEnvironment> | undefined): ThemeReportDto {
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
  const visibility = analyzeVisibility(signals);

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
    contrast: visibility.contrast,
    risks: visibility.risks
  };
}

// ============================================================
// 2. Core Analysis Steps
// ============================================================

function findLoadedCurrentTheme(probe: Partial<ThemeEnvironment> | undefined): InstalledTheme | undefined {
  const matches = probe?.currentTheme?.matchedInstalledThemes;
  if (!Array.isArray(matches)) {
    return undefined;
  }

  return matches.find((entry) =>
    entry.themeDefinition?.status === "loaded" && Boolean(entry.themeDefinition.resolvedDefinition)
  );
}

function extractSignals(definition: RawThemeData): ThemeColorsDto {
  const colors = definition.colors || {};
  const tokenColors = Array.isArray(definition.tokenColors) ? definition.tokenColors : [];
  const signals: ThemeColorsDto = {};

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

// ============================================================
// 3. Extraction Helpers
// ============================================================

function firstColor(colors: Record<string, string>, keys: string[]): ThemeColorValue | undefined {
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
  signalName: ThemeColorRole,
  scopeMatcher: (scope: string) => boolean
): ThemeColorValue | undefined {
  let matched: ThemeColorValue | undefined;

  for (const rule of tokenColors) {
    const foreground = rule.settings?.foreground;
    if (!foreground) {
      continue;
    }

    const scopes = normalizeScopes(rule.scope);
    if (scopes.some(scopeMatcher)) {
      matched = {
        value: foreground,
        source: `tokenColors.${signalName}`
      };
    }
  }

  return matched;
}

function addSignal(signals: ThemeColorsDto, name: ThemeColorRole, signal: ThemeColorValue | undefined): void {
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
