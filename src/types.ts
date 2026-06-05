export type PlainSetting = Record<string, unknown>;

export type SettingId =
  | "workbench.colorCustomizations"
  | "editor.tokenColorCustomizations"
  | "editor.semanticTokenColorCustomizations";

export interface SettingDescriptor {
  section: string;
  key: string;
}

export interface ConfigurationInspection {
  defaultValue?: unknown;
  globalValue?: unknown;
  workspaceValue?: unknown;
  workspaceFolderValue?: unknown;
}

export interface ConfigurationLike {
  get<T = unknown>(key: string): T;
  inspect(key: string): ConfigurationInspection | undefined;
  update?(key: string, value: unknown, target: unknown): Thenable<void> | Promise<void>;
}

export interface VscodeSettingsApi {
  ConfigurationTarget?: {
    Global?: unknown;
    Workspace?: unknown;
    WorkspaceFolder?: unknown;
  };
  workspace: {
    getConfiguration(section: string): ConfigurationLike;
  };
}

export interface VscodeThemeProbeApi extends VscodeSettingsApi {
  version?: string;
  env?: {
    appName?: string;
    appHost?: string;
    uiKind?: unknown;
  };
  UIKind?: Record<string, unknown>;
  ColorThemeKind?: Record<string, unknown>;
  window?: {
    activeColorTheme?: {
      kind?: unknown;
    };
  };
  workspace: VscodeSettingsApi["workspace"] & {
    fs?: {
      readFile(uri: unknown): PromiseLike<Uint8Array>;
    };
  };
  Uri?: {
    joinPath(base: unknown, ...pathSegments: string[]): unknown;
  };
  extensions?: {
    all?: readonly VscodeExtensionLike[];
  };
}

export interface ThemeContribution {
  id?: string;
  label?: string;
  uiTheme?: string;
  path?: string;
}

export interface ExtensionPackageJson {
  name?: string;
  displayName?: string;
  publisher?: string;
  version?: string;
  contributes?: {
    themes?: ThemeContribution[];
  };
}

export interface VscodeExtensionLike {
  id?: string;
  isActive?: boolean;
  extensionKind?: unknown;
  extensionUri?: {
    toString(): string;
  };
  packageJSON?: ExtensionPackageJson;
}

export interface ExtensionSummary {
  id?: string;
  name?: string;
  displayName?: string;
  publisher?: string;
  version?: string;
  isActive?: boolean;
  extensionUri?: string;
  extensionKind?: unknown;
}

export interface ThemeContributionSummary {
  id?: string;
  label?: string;
  uiTheme?: string;
  path?: string;
}

export interface TokenColorRule {
  scope?: string | string[];
  settings?: {
    foreground?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ThemeDefinition {
  name?: string;
  type?: string;
  include?: string;
  semanticHighlighting?: boolean;
  colors?: Record<string, string>;
  tokenColors?: TokenColorRule[] | Record<string, unknown>;
  semanticTokenColors?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThemeDefinitionSummary {
  name?: string;
  type?: string;
  semanticHighlighting?: boolean;
  rawKeys: string[];
  colorCount: number;
  tokenColorCount: number;
  semanticTokenColorCount: number;
}

export type ThemeDefinitionLoadResult =
  | { status: "missing-path" }
  | { status: "include-cycle"; filePath: string }
  | { status: "unsupported-file-type"; filePath: string; reason: string }
  | { status: "read-or-parse-error"; filePath: string; error: string }
  | {
      status: "loaded";
      filePath: string;
      definition: ThemeDefinition;
      definitionSummary: ThemeDefinitionSummary | undefined;
      include?: ThemeDefinitionLoadResult;
      resolvedDefinition: ThemeDefinition;
      resolvedDefinitionSummary: ThemeDefinitionSummary | undefined;
    };

export interface InstalledThemeEntry {
  extension: ExtensionSummary;
  theme: ThemeContributionSummary;
  themeDefinition?: ThemeDefinitionLoadResult;
}

export interface ThemeTextReader {
  (extension: VscodeExtensionLike, themePath: string): Promise<string>;
}

export interface ThemeProbeOptions {
  includeThemeDefinitions?: boolean;
  readThemeTextFile?: ThemeTextReader;
}

export interface ThemeProbe {
  generatedAt: string;
  host: {
    appName?: string;
    appHost?: string;
    uiKind?: unknown;
    vscodeVersion?: string;
  };
  currentTheme: {
    configuredName?: string;
    activeKind?: unknown;
    settings: Record<string, { effectiveValue: unknown; inspect: unknown }>;
    matchedInstalledThemes: InstalledThemeEntry[];
  };
  installedThemes: InstalledThemeEntry[];
}

export type ThemeSignalName =
  | "background"
  | "foreground"
  | "comment"
  | "string"
  | "keyword"
  | "error"
  | "warning"
  | "diffAdded"
  | "diffDeleted";

export interface ThemeSignal {
  value: string;
  source?: string;
}

export type ThemeSignals = Partial<Record<ThemeSignalName, ThemeSignal>>;
export type SignalValues = Record<ThemeSignalName, string>;
export type SignalContrast = Partial<Record<Exclude<ThemeSignalName, "background">, { ratio: number }>>;

export interface ThemeRisk {
  type: string;
  signal?: ThemeSignalName;
  signals?: ThemeSignalName[];
  contrastRatio?: number;
  threshold?: number;
  colorDistance?: number;
  message?: string;
}

export interface ThemeSignalReport {
  generatedAt: string;
  theme: {
    configuredName?: string;
    activeKind?: unknown;
    id?: string;
    label?: string;
    extensionId?: string;
    definitionStatus: string;
  };
  signals: ThemeSignals;
  contrast: SignalContrast;
  risks: ThemeRisk[];
}

export interface PatchRecipe {
  id: string;
  description: string;
  settings: Record<SettingId, PlainSetting>;
}

export type PatchableSettings = Record<SettingId, PlainSetting>;

export interface SettingsUpdate {
  section: string;
  key: string;
  value: PlainSetting;
}

export interface RollbackSnapshot {
  createdAt: string;
  recipeId: string;
  settings: PatchableSettings;
}

export interface PatchPlan {
  recipeId: string;
  nextSettings: PatchableSettings;
  rollbackSnapshot: RollbackSnapshot;
  settingsUpdates: SettingsUpdate[];
}

export interface RollbackPlan {
  recipeId: string;
  createdAt: string;
  settingsUpdates: SettingsUpdate[];
}

export interface PreviewPane {
  title: string;
  signals: SignalValues;
}

export interface PreviewModel {
  themeName: string;
  before: PreviewPane;
  after: PreviewPane;
  risks: ThemeRisk[];
}
