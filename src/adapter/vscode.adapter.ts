import { TextDecoder } from "node:util";
import { COLOR_CUSTOMIZATION_SETTINGS } from "../constants";
import type { ThemeEnvironment } from "../core/types/theme.types";
import type { ConfigurationSnapshot, ConfigurationUpdate, SettingDictionary } from "../core/types/patch.types";
import { SETTINGS_ORDER } from "../constants";
import type {
  ThemeCollectionOptions,
  ThemeFileReader,
  VscodeConfigAccessor,
  VscodeReadApis,
  VscodeSettingsApis
} from "./vscode.types";
import { collectInstalledThemes, isMatchingThemeName } from "../core/themeParser";

export async function collectThemeSnapshot(
  vscode: VscodeReadApis,
  options: ThemeCollectionOptions = {}
): Promise<ThemeEnvironment> {
  const workbenchConfig = vscode.workspace.getConfiguration("workbench");
  const currentThemeName = workbenchConfig.get<string | undefined>("colorTheme");
  const readThemeTextFile = options.readThemeTextFile || createThemeFileReader(vscode);

  const installedThemes = await collectInstalledThemes(vscode.extensions?.all || [], {
    includeThemeDefinitions: options.includeThemeDefinitions !== false,
    readThemeTextFile
  });

  return {
    generatedAt: new Date().toISOString(),
    host: {
      appName: vscode.env?.appName,
      appHost: vscode.env?.appHost,
      uiKind: resolveUiKindLabel(vscode, vscode.env?.uiKind),
      vscodeVersion: vscode.version
    },
    currentTheme: {
      configuredName: currentThemeName,
      activeKind: resolveThemeKindLabel(vscode, vscode.window?.activeColorTheme?.kind),
      settings: readCurrentSettings(vscode),
      matchedInstalledThemes: installedThemes.filter((entry) =>
        isMatchingThemeName(entry.theme, currentThemeName)
      )
    },
    installedThemes
  };
}

export function readCurrentSettings(
  vscode: VscodeReadApis
): Record<string, { effectiveValue: unknown; inspect: unknown }> {
  const settings: Record<string, { effectiveValue: unknown; inspect: unknown }> = {};

  for (const setting of COLOR_CUSTOMIZATION_SETTINGS) {
    const config = vscode.workspace.getConfiguration(setting.section);
    settings[`${setting.section}.${setting.key}`] = inspectSettingLevels(config, setting.key);
  }

  return settings;
}

export function inspectSettingLevels(config: VscodeConfigAccessor, key: string): { effectiveValue: unknown; inspect: unknown } {
  return {
    effectiveValue: safeCall(() => config.get(key)),
    inspect: safeCall(() => config.inspect(key))
  };
}

export function createThemeFileReader(vscode: VscodeReadApis): ThemeFileReader {
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

function resolveThemeKindLabel(vscode: VscodeReadApis, kind: unknown): unknown {
  if (kind === undefined || !vscode.ColorThemeKind) {
    return kind;
  }

  const match = Object.entries(vscode.ColorThemeKind).find(([, value]) => value === kind);
  return match ? match[0] : kind;
}

function resolveUiKindLabel(vscode: VscodeReadApis, kind: unknown): unknown {
  if (kind === undefined || !vscode.UIKind) {
    return kind;
  }

  const match = Object.entries(vscode.UIKind).find(([, value]) => value === kind);
  return match ? match[0] : kind;
}

function normalizeThemePath(themePath: string): string[] {
  return String(themePath || "")
    .split(/[\\/]+/)
    .filter((segment) => segment && segment !== ".");
}

function safeCall(fn: () => unknown): unknown {
  try {
    return fn();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function readCurrentPatchableSettings(vscode: VscodeSettingsApis, target: unknown): ConfigurationSnapshot {
  const settings: ConfigurationSnapshot = {
    "workbench.colorCustomizations": {},
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };

  for (const settingId of SETTINGS_ORDER) {
    const [section, ...keyParts] = settingId.split(".");
    const key = keyParts.join(".");
    const config = vscode.workspace.getConfiguration(section);
    const inspected = config.inspect(key) || {};
    settings[settingId] = getInspectedValueForTarget(vscode, inspected, target);
  }

  return settings;
}

export async function writeSettingsToVscode(
  vscode: VscodeSettingsApis,
  settingsUpdates: ConfigurationUpdate[],
  target: unknown
): Promise<void> {
  for (const update of settingsUpdates) {
    const config = vscode.workspace.getConfiguration(update.section);
    if (!config.update) {
      throw new Error(`Configuration update API is unavailable for ${update.section}.${update.key}.`);
    }
    await config.update(update.key, update.value, target);
  }
}

function getInspectedValueForTarget(
  vscode: VscodeSettingsApis,
  inspected: { globalValue?: unknown; workspaceValue?: unknown; workspaceFolderValue?: unknown },
  target: unknown
): SettingDictionary {
  if (vscode.ConfigurationTarget && target === vscode.ConfigurationTarget.Global) {
    return clonePlainSetting(inspected.globalValue);
  }

  if (vscode.ConfigurationTarget && target === vscode.ConfigurationTarget.Workspace) {
    return clonePlainSetting(inspected.workspaceValue);
  }

  if (vscode.ConfigurationTarget && target === vscode.ConfigurationTarget.WorkspaceFolder) {
    return clonePlainSetting(inspected.workspaceFolderValue);
  }

  return clonePlainSetting(inspected.globalValue);
}

function clonePlainSetting(value: unknown): SettingDictionary {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as SettingDictionary;
}
