"use strict";

const { TextDecoder } = require("node:util");

const COLOR_CUSTOMIZATION_SETTINGS = [
  { section: "workbench", key: "colorTheme" },
  { section: "workbench", key: "iconTheme" },
  { section: "workbench", key: "productIconTheme" },
  { section: "workbench", key: "colorCustomizations" },
  { section: "editor", key: "tokenColorCustomizations" },
  { section: "editor", key: "semanticTokenColorCustomizations" }
];

async function collectThemeProbe(vscode, options = {}) {
  const getConfig = (section) => vscode.workspace.getConfiguration(section);
  const workbenchConfig = getConfig("workbench");
  const currentThemeName = workbenchConfig.get("colorTheme");
  const readThemeTextFile =
    options.readThemeTextFile || createVscodeThemeTextReader(vscode);

  const installedThemes = await collectInstalledThemes(vscode.extensions.all, {
    includeThemeDefinitions: options.includeThemeDefinitions !== false,
    readThemeTextFile
  });

  return {
    generatedAt: new Date().toISOString(),
    host: {
      appName: vscode.env && vscode.env.appName,
      appHost: vscode.env && vscode.env.appHost,
      uiKind: getUiKindName(vscode, vscode.env && vscode.env.uiKind),
      vscodeVersion: vscode.version
    },
    currentTheme: {
      configuredName: currentThemeName,
      activeKind: getThemeKindName(vscode, vscode.window && vscode.window.activeColorTheme && vscode.window.activeColorTheme.kind),
      settings: collectRelevantSettings(vscode),
      matchedInstalledThemes: installedThemes.filter((entry) =>
        themeMatchesConfiguredName(entry.theme, currentThemeName)
      )
    },
    installedThemes
  };
}

async function collectInstalledThemes(extensions, options = {}) {
  const includeThemeDefinitions = options.includeThemeDefinitions !== false;
  const readThemeTextFile = options.readThemeTextFile;
  const entries = [];

  for (const extension of extensions || []) {
    const themes = getContributedThemes(extension);

    for (const theme of themes) {
      const entry = {
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

async function loadThemeDefinition(extension, theme, readThemeTextFile, seen = new Set()) {
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
    const include = definition && definition.include
      ? await loadThemeDefinition(
          extension,
          { path: resolveRelativeThemePath(filePath, definition.include) },
          readThemeTextFile,
          new Set([...seen, seenKey])
        )
      : undefined;
    const includedDefinition = include && include.status === "loaded" ? include.resolvedDefinition : undefined;
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
      error: error && error.message ? error.message : String(error)
    };
  }
}

function collectRelevantSettings(vscode) {
  const settings = {};

  for (const setting of COLOR_CUSTOMIZATION_SETTINGS) {
    const config = vscode.workspace.getConfiguration(setting.section);
    settings[`${setting.section}.${setting.key}`] = inspectSetting(config, setting.key);
  }

  return settings;
}

function inspectSetting(config, key) {
  return {
    effectiveValue: safeCall(() => config.get(key)),
    inspect: safeCall(() => config.inspect(key))
  };
}

function createVscodeThemeTextReader(vscode) {
  return async (extension, themePath) => {
    const segments = normalizeThemePath(themePath);
    const uri = vscode.Uri.joinPath(extension.extensionUri, ...segments);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder("utf-8").decode(bytes);
  };
}

function parseJsonc(text) {
  return JSON.parse(stripTrailingCommas(stripJsonComments(text)));
}

function stripJsonComments(text) {
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

function stripTrailingCommas(text) {
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

function getContributedThemes(extension) {
  const themes = extension && extension.packageJSON && extension.packageJSON.contributes && extension.packageJSON.contributes.themes;
  return Array.isArray(themes) ? themes : [];
}

function summarizeExtension(extension) {
  const packageJson = extension.packageJSON || {};

  return {
    id: extension.id,
    name: packageJson.name,
    displayName: packageJson.displayName,
    publisher: packageJson.publisher,
    version: packageJson.version,
    isActive: extension.isActive,
    extensionUri: extension.extensionUri && extension.extensionUri.toString(),
    extensionKind: extension.extensionKind
  };
}

function summarizeThemeContribution(theme) {
  return {
    id: theme.id,
    label: theme.label,
    uiTheme: theme.uiTheme,
    path: theme.path
  };
}

function summarizeThemeDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    return undefined;
  }

  return {
    name: definition.name,
    type: definition.type,
    semanticHighlighting: definition.semanticHighlighting,
    rawKeys: Object.keys(definition),
    colorCount: countObjectKeys(definition.colors),
    tokenColorCount: Array.isArray(definition.tokenColors) ? definition.tokenColors.length : countObjectKeys(definition.tokenColors),
    semanticTokenColorCount: countObjectKeys(definition.semanticTokenColors)
  };
}

function mergeThemeDefinitions(base, override) {
  return {
    ...base,
    ...override,
    colors: {
      ...(base.colors || {}),
      ...(override.colors || {})
    },
    tokenColors: [
      ...toArray(base.tokenColors),
      ...toArray(override.tokenColors)
    ],
    semanticTokenColors: {
      ...(isPlainObject(base.semanticTokenColors) ? base.semanticTokenColors : {}),
      ...(isPlainObject(override.semanticTokenColors) ? override.semanticTokenColors : {})
    }
  };
}

function resolveRelativeThemePath(themePath, includePath) {
  if (!themePath || !includePath) {
    return includePath;
  }

  if (includePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(includePath)) {
    return includePath;
  }

  const parent = normalizeThemePath(themePath).slice(0, -1);
  const includeSegments = normalizeThemePath(includePath);
  const resolved = [];

  for (const segment of [...parent, ...includeSegments]) {
    if (segment === "..") {
      resolved.pop();
    } else {
      resolved.push(segment);
    }
  }

  return resolved.join("/");
}

function normalizeThemePath(themePath) {
  return String(themePath || "")
    .split(/[\\/]+/)
    .filter((segment) => segment && segment !== ".");
}

function isJsonThemePath(themePath) {
  return /\.jsonc?$/i.test(themePath || "");
}

function themeMatchesConfiguredName(theme, configuredName) {
  if (!configuredName) {
    return false;
  }

  return [theme.id, theme.label]
    .filter(Boolean)
    .some((candidate) => candidate.toLowerCase() === String(configuredName).toLowerCase());
}

function getThemeKindName(vscode, kind) {
  if (kind === undefined || !vscode.ColorThemeKind) {
    return kind;
  }

  const entries = Object.entries(vscode.ColorThemeKind);
  const match = entries.find(([, value]) => value === kind);
  return match ? match[0] : kind;
}

function getUiKindName(vscode, kind) {
  if (kind === undefined || !vscode.UIKind) {
    return kind;
  }

  const entries = Object.entries(vscode.UIKind);
  const match = entries.find(([, value]) => value === kind);
  return match ? match[0] : kind;
}

function countObjectKeys(value) {
  return isPlainObject(value) ? Object.keys(value).length : 0;
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined ? [] : [value];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeCall(fn) {
  try {
    return fn();
  } catch (error) {
    return {
      error: error && error.message ? error.message : String(error)
    };
  }
}

module.exports = {
  collectThemeProbe,
  collectInstalledThemes,
  createVscodeThemeTextReader,
  inspectSetting,
  loadThemeDefinition,
  parseJsonc,
  resolveRelativeThemePath,
  stripJsonComments,
  stripTrailingCommas,
  themeMatchesConfiguredName
};
