import { TextDecoder } from "node:util";
import { COLOR_CUSTOMIZATION_SETTINGS } from "./constants";
import type {
  ConfigurationLike,
  ExtensionSummary,
  InstalledThemeEntry,
  ThemeContribution,
  ThemeContributionSummary,
  ThemeDefinition,
  ThemeDefinitionLoadResult,
  ThemeDefinitionSummary,
  ThemeProbe,
  ThemeProbeOptions,
  ThemeTextReader,
  TokenColorRule,
  VscodeExtensionLike,
  VscodeThemeProbeApi
} from "./types";

export async function collectThemeProbe(
  vscode: VscodeThemeProbeApi,
  options: ThemeProbeOptions = {}
): Promise<ThemeProbe> {
  const workbenchConfig = vscode.workspace.getConfiguration("workbench");
  const currentThemeName = workbenchConfig.get<string | undefined>("colorTheme");
  const readThemeTextFile = options.readThemeTextFile || createVscodeThemeTextReader(vscode);

  const installedThemes = await collectInstalledThemes(vscode.extensions?.all || [], {
    includeThemeDefinitions: options.includeThemeDefinitions !== false,
    readThemeTextFile
  });

  return {
    generatedAt: new Date().toISOString(),
    host: {
      appName: vscode.env?.appName,
      appHost: vscode.env?.appHost,
      uiKind: getUiKindName(vscode, vscode.env?.uiKind),
      vscodeVersion: vscode.version
    },
    currentTheme: {
      configuredName: currentThemeName,
      activeKind: getThemeKindName(vscode, vscode.window?.activeColorTheme?.kind),
      settings: collectRelevantSettings(vscode),
      matchedInstalledThemes: installedThemes.filter((entry) =>
        themeMatchesConfiguredName(entry.theme, currentThemeName)
      )
    },
    installedThemes
  };
}

export async function collectInstalledThemes(
  extensions: readonly VscodeExtensionLike[] | undefined,
  options: ThemeProbeOptions = {}
): Promise<InstalledThemeEntry[]> {
  const includeThemeDefinitions = options.includeThemeDefinitions !== false;
  const readThemeTextFile = options.readThemeTextFile;
  const entries: InstalledThemeEntry[] = [];

  for (const extension of extensions || []) {
    const themes = getContributedThemes(extension);

    for (const theme of themes) {
      const entry: InstalledThemeEntry = {
        extension: summarizeExtension(extension),
        theme: summarizeThemeContribution(theme)
      };

      if (includeThemeDefinitions && readThemeTextFile) {
        entry.themeDefinition = await loadThemeDefinition(extension, theme, readThemeTextFile);
      }

      entries.push(entry);
    }
  }

  return entries.sort((left, right) => {
    const leftLabel = left.theme.label || left.theme.id || "";
    const rightLabel = right.theme.label || right.theme.id || "";
    return leftLabel.localeCompare(rightLabel);
  });
}

export async function loadThemeDefinition(
  extension: VscodeExtensionLike,
  theme: ThemeContribution,
  readThemeTextFile: ThemeTextReader,
  seen = new Set<string>()
): Promise<ThemeDefinitionLoadResult> {
  if (!theme || !theme.path) {
    return { status: "missing-path" };
  }

  const filePath = normalizeThemePath(theme.path).join("/");
  const seenKey = `${extension.id || summarizeExtension(extension).id}:${filePath}`;

  if (seen.has(seenKey)) {
    return { status: "include-cycle", filePath };
  }

  if (!isJsonThemePath(filePath)) {
    return {
      status: "unsupported-file-type",
      filePath,
      reason: "Only JSON/JSONC theme files are parsed in this PoC."
    };
  }

  try {
    const text = await readThemeTextFile(extension, filePath);
    const definition = parseJsonc(text);
    const include = definition.include
      ? await loadThemeDefinition(
          extension,
          { path: resolveRelativeThemePath(filePath, definition.include) },
          readThemeTextFile,
          new Set([...seen, seenKey])
        )
      : undefined;
    const includedDefinition = include?.status === "loaded" ? include.resolvedDefinition : undefined;
    const resolvedDefinition = includedDefinition
      ? mergeThemeDefinitions(includedDefinition, definition)
      : definition;

    return {
      status: "loaded",
      filePath,
      definition,
      definitionSummary: summarizeThemeDefinition(definition),
      include,
      resolvedDefinition,
      resolvedDefinitionSummary: summarizeThemeDefinition(resolvedDefinition)
    };
  } catch (error) {
    return {
      status: "read-or-parse-error",
      filePath,
      error: getErrorMessage(error)
    };
  }
}

export function collectRelevantSettings(
  vscode: VscodeThemeProbeApi
): Record<string, { effectiveValue: unknown; inspect: unknown }> {
  const settings: Record<string, { effectiveValue: unknown; inspect: unknown }> = {};

  for (const setting of COLOR_CUSTOMIZATION_SETTINGS) {
    const config = vscode.workspace.getConfiguration(setting.section);
    settings[`${setting.section}.${setting.key}`] = inspectSetting(config, setting.key);
  }

  return settings;
}

export function inspectSetting(config: ConfigurationLike, key: string): { effectiveValue: unknown; inspect: unknown } {
  return {
    effectiveValue: safeCall(() => config.get(key)),
    inspect: safeCall(() => config.inspect(key))
  };
}

export function createVscodeThemeTextReader(vscode: VscodeThemeProbeApi): ThemeTextReader {
  return async (extension, themePath) => {
    if (!vscode.Uri || !vscode.workspace.fs || !extension.extensionUri) {
      throw new Error("VS Code file system APIs are unavailable.");
    }

    const segments = normalizeThemePath(themePath);
    const uri = vscode.Uri.joinPath(extension.extensionUri, ...segments);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder("utf-8").decode(bytes);
  };
}

export function parseJsonc(text: string): ThemeDefinition {
  return JSON.parse(stripTrailingCommas(stripJsonComments(text))) as ThemeDefinition;
}

export function stripJsonComments(text: string): string {
  let output = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      } else if (char === "\n" || char === "\r") {
        output += char;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

export function stripTrailingCommas(text: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (/\s/.test(text[lookahead] || "")) {
        lookahead += 1;
      }
      if (text[lookahead] === "}" || text[lookahead] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}

function getContributedThemes(extension: VscodeExtensionLike): ThemeContribution[] {
  const themes = extension.packageJSON?.contributes?.themes;
  return Array.isArray(themes) ? themes : [];
}

function summarizeExtension(extension: VscodeExtensionLike): ExtensionSummary {
  const packageJson = extension.packageJSON || {};

  return {
    id: extension.id,
    name: packageJson.name,
    displayName: packageJson.displayName,
    publisher: packageJson.publisher,
    version: packageJson.version,
    isActive: extension.isActive,
    extensionUri: extension.extensionUri?.toString(),
    extensionKind: extension.extensionKind
  };
}

function summarizeThemeContribution(theme: ThemeContribution): ThemeContributionSummary {
  return {
    id: theme.id,
    label: theme.label,
    uiTheme: theme.uiTheme,
    path: theme.path
  };
}

function summarizeThemeDefinition(definition: ThemeDefinition | undefined): ThemeDefinitionSummary | undefined {
  if (!definition || typeof definition !== "object") {
    return undefined;
  }

  return {
    name: definition.name,
    type: definition.type,
    semanticHighlighting: definition.semanticHighlighting,
    rawKeys: Object.keys(definition),
    colorCount: countObjectKeys(definition.colors),
    tokenColorCount: Array.isArray(definition.tokenColors)
      ? definition.tokenColors.length
      : countObjectKeys(definition.tokenColors),
    semanticTokenColorCount: countObjectKeys(definition.semanticTokenColors)
  };
}

function mergeThemeDefinitions(base: ThemeDefinition, override: ThemeDefinition): ThemeDefinition {
  return {
    ...base,
    ...override,
    colors: {
      ...(base.colors || {}),
      ...(override.colors || {})
    },
    tokenColors: [
      ...toTokenColorArray(base.tokenColors),
      ...toTokenColorArray(override.tokenColors)
    ],
    semanticTokenColors: {
      ...(isPlainObject(base.semanticTokenColors) ? base.semanticTokenColors : {}),
      ...(isPlainObject(override.semanticTokenColors) ? override.semanticTokenColors : {})
    }
  };
}

export function resolveRelativeThemePath(themePath: string, includePath: string): string {
  if (!themePath || !includePath) {
    return includePath;
  }

  if (includePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(includePath)) {
    return includePath;
  }

  const parent = normalizeThemePath(themePath).slice(0, -1);
  const includeSegments = normalizeThemePath(includePath);
  const resolved: string[] = [];

  for (const segment of [...parent, ...includeSegments]) {
    if (segment === "..") {
      resolved.pop();
    } else {
      resolved.push(segment);
    }
  }

  return resolved.join("/");
}

function normalizeThemePath(themePath: string): string[] {
  return String(themePath || "")
    .split(/[\\/]+/)
    .filter((segment) => segment && segment !== ".");
}

function isJsonThemePath(themePath: string): boolean {
  return /\.jsonc?$/i.test(themePath || "");
}

export function themeMatchesConfiguredName(
  theme: Pick<ThemeContributionSummary, "id" | "label">,
  configuredName: string | undefined
): boolean {
  if (!configuredName) {
    return false;
  }

  return [theme.id, theme.label]
    .filter(Boolean)
    .some((candidate) => candidate?.toLowerCase() === configuredName.toLowerCase());
}

function getThemeKindName(vscode: VscodeThemeProbeApi, kind: unknown): unknown {
  if (kind === undefined || !vscode.ColorThemeKind) {
    return kind;
  }

  const match = Object.entries(vscode.ColorThemeKind).find(([, value]) => value === kind);
  return match ? match[0] : kind;
}

function getUiKindName(vscode: VscodeThemeProbeApi, kind: unknown): unknown {
  if (kind === undefined || !vscode.UIKind) {
    return kind;
  }

  const match = Object.entries(vscode.UIKind).find(([, value]) => value === kind);
  return match ? match[0] : kind;
}

function countObjectKeys(value: unknown): number {
  return isPlainObject(value) ? Object.keys(value).length : 0;
}

function toTokenColorArray(value: ThemeDefinition["tokenColors"]): TokenColorRule[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined ? [] : [value as TokenColorRule];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeCall(fn: () => unknown): unknown {
  try {
    return fn();
  } catch (error) {
    return {
      error: getErrorMessage(error)
    };
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
