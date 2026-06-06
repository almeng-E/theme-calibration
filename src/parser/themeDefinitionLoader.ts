import type {
  ExtensionMetadata,
  InstalledTheme,
  RawThemeData,
  RawThemeDataSummary,
  ThemeLoadResult,
  ThemeRegistration,
  ThemeRegistrationSummary,
  TokenColorRule
} from "../types/theme.types";
import type {
  ThemeCollectionOptions,
  ThemeFileReader,
  VscodeExtensionInfo
} from "../adapter/vscode.types";
import { isPlainObject, normalizeThemePath, getErrorMessage } from "../utils/objectUtils";

// ============================================================
// 1. Core API (Entry points)
// ============================================================

export async function collectInstalledThemes(
  extensions: readonly VscodeExtensionInfo[] | undefined,
  options: ThemeCollectionOptions = {}
): Promise<InstalledTheme[]> {
  const includeThemeDefinitions = options.includeThemeDefinitions !== false;
  const readThemeTextFile = options.readThemeTextFile;
  const entries: InstalledTheme[] = [];

  for (const extension of extensions || []) {
    const themes = getContributedThemes(extension);

    for (const theme of themes) {
      const entry: InstalledTheme = {
        extension: toExtensionInfo(extension),
        theme: toThemeRegistrationSummary(theme)
      };

      if (includeThemeDefinitions && readThemeTextFile) {
        entry.themeDefinition = await loadThemeFile(extension, theme, readThemeTextFile);
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

export function isMatchingThemeName(
  theme: Pick<ThemeRegistrationSummary, "id" | "label">,
  configuredName: string | undefined
): boolean {
  if (!configuredName) {
    return false;
  }

  return [theme.id, theme.label]
    .filter(Boolean)
    .some((candidate) => candidate?.toLowerCase() === configuredName.toLowerCase());
}

// ============================================================
// 2. Theme File Loading & Resolution
// ============================================================

export async function loadThemeFile(
  extension: VscodeExtensionInfo,
  theme: ThemeRegistration,
  readThemeTextFile: ThemeFileReader,
  seen = new Set<string>()
): Promise<ThemeLoadResult> {
  if (!theme || !theme.path) {
    return { status: "missing-path" };
  }

  const filePath = normalizeThemePath(theme.path).join("/");
  const seenKey = `${extension.id || toExtensionInfo(extension).id}:${filePath}`;

  if (seen.has(seenKey)) {
    return { status: "include-cycle", filePath };
  }

  if (!isJsonThemePath(filePath)) {
    return {
      status: "unsupported-file-type",
      filePath,
      reason: "Only JSON/JSONC theme files are parsed in this extension."
    };
  }

  try {
    const text = await readThemeTextFile(extension, filePath);
    const definition = parseJsonc(text);
    const include = definition.include
      ? await loadThemeFile(
          extension,
          { path: resolveRelativeThemePath(filePath, definition.include) },
          readThemeTextFile,
          new Set([...seen, seenKey])
        )
      : undefined;
    const includedDefinition = include?.status === "loaded" ? include.resolvedDefinition : undefined;
    const resolvedDefinition = includedDefinition
      ? mergeThemeFiles(includedDefinition, definition)
      : definition;

    return {
      status: "loaded",
      filePath,
      definition,
      definitionSummary: toThemeFileSummary(definition),
      include,
      resolvedDefinition,
      resolvedDefinitionSummary: toThemeFileSummary(resolvedDefinition)
    };
  } catch (error) {
    return {
      status: "read-or-parse-error",
      filePath,
      error: getErrorMessage(error)
    };
  }
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

function mergeThemeFiles(base: RawThemeData, override: RawThemeData): RawThemeData {
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

function isJsonThemePath(themePath: string): boolean {
  return /\.jsonc?$/i.test(themePath || "");
}

// ============================================================
// 3. JSONC Parsing
// ============================================================

export function parseJsonc(text: string): RawThemeData {
  return JSON.parse(stripTrailingCommas(stripJsonComments(text))) as RawThemeData;
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

// ============================================================
// 4. Data Extraction & Conversion Helpers
// ============================================================

function getContributedThemes(extension: VscodeExtensionInfo): ThemeRegistration[] {
  const themes = extension.packageJSON?.contributes?.themes;
  return Array.isArray(themes) ? themes : [];
}

function toExtensionInfo(extension: VscodeExtensionInfo): ExtensionMetadata {
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

function toThemeRegistrationSummary(theme: ThemeRegistration): ThemeRegistrationSummary {
  return {
    id: theme.id,
    label: theme.label,
    uiTheme: theme.uiTheme,
    path: theme.path
  };
}

function toThemeFileSummary(definition: RawThemeData | undefined): RawThemeDataSummary | undefined {
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

function countObjectKeys(value: unknown): number {
  return isPlainObject(value) ? Object.keys(value).length : 0;
}

function toTokenColorArray(value: RawThemeData["tokenColors"]): TokenColorRule[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined ? [] : [value as TokenColorRule];
}
