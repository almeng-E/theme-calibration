import type {
  VscodeInstalledTheme,
  VscodeThemeFile,
  VscodeThemeEnvironment,
  VscodeTokenColorRule
} from "./types";
import type {
  ThemeColorValue,
  ThemeColorsDto,
  ThemeColorRole,
  ThemeReportDto
} from "../../types/signal.types";
import { createThemeReport } from "../../diagnose/diagnosticService";
import { isPlainObject } from "../../utils/objectUtils";

// ============================================================
// 1. Main Entry (VS Code probe → ThemeReportDto)
// ============================================================

export function createThemeSignalReport(probe: Partial<VscodeThemeEnvironment> | undefined): ThemeReportDto {
  const configuredName = probe?.currentTheme?.configuredName;
  const activeKind = probe?.currentTheme?.activeKind;
  const matchedTheme = findLoadedCurrentTheme(probe);

  if (!matchedTheme || matchedTheme.themeDefinition?.status !== "loaded") {
    return createThemeReport({
      configuredName,
      activeKind,
      definitionStatus: "missing"
    });
  }

  const definition = matchedTheme.themeDefinition.resolvedDefinition;
  const colorCustomizations = probe?.currentTheme?.settings?.["workbench.colorCustomizations"]?.effectiveValue;
  const tokenCustomizations = probe?.currentTheme?.settings?.["editor.tokenColorCustomizations"]?.effectiveValue;
  const colors = resolveEffectiveThemeColors(definition, colorCustomizations, tokenCustomizations, configuredName);

  return createThemeReport({
    configuredName,
    activeKind,
    id: matchedTheme.theme.id,
    label: matchedTheme.theme.label,
    extensionId: matchedTheme.extension.id,
    definitionStatus: matchedTheme.themeDefinition.status,
    colors
  });
}

// ============================================================
// 2. Core Analysis Steps
// ============================================================

function findLoadedCurrentTheme(probe: Partial<VscodeThemeEnvironment> | undefined): VscodeInstalledTheme | undefined {
  const matches = probe?.currentTheme?.matchedInstalledThemes;
  if (!Array.isArray(matches)) {
    return undefined;
  }

  return matches.find((entry) =>
    entry.themeDefinition?.status === "loaded" && Boolean(entry.themeDefinition.resolvedDefinition)
  );
}

// color-role → VS Code color-key 우선순위 목록의 단일 출처(single source of truth).
// firstColor가 첫 매칭 키를 반환하므로 배열 ORDER가 값/source 모두에 영향을 준다.
// mapVscodeThemeToColors(color-key 신호 도출)와
// relabelColorCustomizationSources(커스터마이징 source 재라벨링)가 함께 사용한다.
const COLOR_ROLE_KEYS: Partial<Record<ThemeColorRole, string[]>> = {
  background: ["editor.background"],
  foreground: ["editor.foreground", "foreground"],
  error: ["editorError.foreground", "errorForeground", "list.errorForeground"],
  warning: ["editorWarning.foreground", "list.warningForeground", "inputValidation.warningBorder"],
  diffAdded: ["editorGutter.addedBackground", "minimapGutter.addedBackground", "diffEditor.insertedTextBackground"],
  diffDeleted: ["editorGutter.deletedBackground", "minimapGutter.deletedBackground", "diffEditor.removedTextBackground"]
};

export function mapVscodeThemeToColors(definition: VscodeThemeFile): ThemeColorsDto {
  const colors = definition.colors || {};
  const tokenColors = Array.isArray(definition.tokenColors) ? definition.tokenColors : [];
  const signals: ThemeColorsDto = {};

  // color-key 기반 신호는 공유 상수에서 도출한다 (background/foreground/error/warning/diffAdded/diffDeleted).
  for (const [role, keys] of Object.entries(COLOR_ROLE_KEYS) as [ThemeColorRole, string[]][]) {
    addSignal(signals, role, firstColor(colors, keys));
  }

  // token-role 신호는 color-key 기반이 아니라 scope 매칭으로 도출한다.
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

  return signals;
}

// ============================================================
// 2b. Effective-color layer (theme file ⊕ user customizations)
// ============================================================

// VS Code의 named token-color 키 → 우리 신호 role 매핑.
// 저장 시 settingKey로 쓰이는 키들과 정확히 일치한다.
const TOKEN_NAMED_KEY_TO_ROLE: Record<string, ThemeColorRole> = {
  comments: "comment",
  strings: "string",
  keywords: "keyword"
};

/**
 * 테마 파일 색상과 사용자 커스터마이징(workbench.colorCustomizations /
 * editor.tokenColorCustomizations)을 병합한 "유효(effective)" 색상 신호를 만든다.
 *
 * - colorCustomizations: VS Code color-id 네임스페이스를 그대로 쓰므로
 *   definition.colors 위에 덮어쓰면 background/foreground/error/... role이 자동 반영된다.
 * - tokenCustomizations: named 키(comments/strings/keywords)만 추출해 token role에 덮어쓴다.
 * - 각 커스터마이징은 global(unscoped) → theme-scoped(`[name]`) 순으로 병합하며 theme-scoped가 우선한다.
 * - 잘못된 형태(undefined / {error} / 문자열 등 plain object 아님)는 "없음"으로 취급해 base로 폴백한다.
 */
export function resolveEffectiveThemeColors(
  definition: VscodeThemeFile,
  colorCustomizations: unknown,
  tokenCustomizations: unknown,
  themeName: string | undefined
): ThemeColorsDto {
  const resolvedColors = resolveThemeScopedCustomizations(colorCustomizations, themeName);
  const resolvedTokens = resolveThemeScopedCustomizations(tokenCustomizations, themeName);

  const mergedColors = { ...(definition.colors || {}), ...stringValuesOnly(resolvedColors) };
  const signals = mapVscodeThemeToColors({ ...definition, colors: mergedColors });

  // colorCustomizations에서 유래한 신호의 source를 디버깅용으로 표시한다.
  relabelColorCustomizationSources(signals, resolvedColors);

  // token named-key 오버레이 (comments/strings/keywords → comment/string/keyword)
  for (const [namedKey, role] of Object.entries(TOKEN_NAMED_KEY_TO_ROLE)) {
    const value = resolvedTokens[namedKey];
    if (typeof value === "string" && value) {
      signals[role] = { value, source: `tokenColorCustomizations.${namedKey}` };
    }
  }

  return signals;
}

/**
 * 커스터마이징 객체에서 (global 키) ⊕ (`[themeName]` 중첩 객체)를 병합한다.
 * `[...]`-bracketed 키와 `textMateRules`는 global 영역에서 제외한다.
 * theme-scoped 항목이 충돌 시 우선한다. plain object가 아니면 {}를 반환한다.
 */
function resolveThemeScopedCustomizations(
  customizations: unknown,
  themeName: string | undefined
): Record<string, unknown> {
  if (!isPlainObject(customizations)) {
    return {};
  }

  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(customizations)) {
    if (key === "textMateRules" || (key.startsWith("[") && key.endsWith("]"))) {
      continue;
    }
    resolved[key] = value;
  }

  if (themeName) {
    const scoped = customizations[`[${themeName}]`];
    if (isPlainObject(scoped)) {
      Object.assign(resolved, scoped);
    }
  }

  return resolved;
}

function stringValuesOnly(record: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

// mergedColors를 통해 반영된 신호 중, 값이 커스터마이징에서 온 것이면 source를 갱신한다.
// 키 목록은 mapVscodeThemeToColors와 동일한 COLOR_ROLE_KEYS 공유 상수를 사용한다.
function relabelColorCustomizationSources(signals: ThemeColorsDto, resolvedColors: Record<string, unknown>): void {
  for (const [role, keys] of Object.entries(COLOR_ROLE_KEYS) as [ThemeColorRole, string[]][]) {
    const signal = signals[role];
    if (!signal) {
      continue;
    }
    for (const key of keys) {
      if (resolvedColors[key] === signal.value) {
        signal.source = `colorCustomizations.${key}`;
        break;
      }
    }
  }
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
  tokenColors: VscodeTokenColorRule[],
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
