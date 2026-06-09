// ============================================================
// VS Code / Editor-shaped theme types (port type home)
// ============================================================

export interface VscodeThemeRegistration {
  id?: string;
  label?: string;
  uiTheme?: string;
  path?: string;
}

export interface VscodeExtensionMetadata {
  id?: string;
  name?: string;
  displayName?: string;
  publisher?: string;
  version?: string;
  isActive?: boolean;
  extensionUri?: string;
  extensionKind?: unknown;
}

export interface VscodeThemeRegistrationSummary {
  id?: string;
  label?: string;
  uiTheme?: string;
  path?: string;
}

export interface VscodeTokenColorRule {
  scope?: string | string[];
  settings?: {
    foreground?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface VscodeThemeFile {
  name?: string;
  type?: string;
  include?: string;
  semanticHighlighting?: boolean;
  colors?: Record<string, string>;
  tokenColors?: VscodeTokenColorRule[] | Record<string, unknown>;
  semanticTokenColors?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VscodeThemeFileSummary {
  name?: string;
  type?: string;
  semanticHighlighting?: boolean;
  rawKeys: string[];
  colorCount: number;
  tokenColorCount: number;
  semanticTokenColorCount: number;
}

export type VscodeThemeLoadResult =
  | { status: "missing-path" }
  | { status: "include-cycle"; filePath: string }
  | { status: "unsupported-file-type"; filePath: string; reason: string }
  | { status: "read-or-parse-error"; filePath: string; error: string }
  | {
      status: "loaded";
      filePath: string;
      definition: VscodeThemeFile;
      definitionSummary: VscodeThemeFileSummary | undefined;
      include?: VscodeThemeLoadResult;
      resolvedDefinition: VscodeThemeFile;
      resolvedDefinitionSummary: VscodeThemeFileSummary | undefined;
    };

export interface VscodeInstalledTheme {
  extension: VscodeExtensionMetadata;
  theme: VscodeThemeRegistrationSummary;
  themeDefinition?: VscodeThemeLoadResult;
}

export interface VscodeThemeEnvironment {
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
    matchedInstalledThemes: VscodeInstalledTheme[];
  };
  installedThemes: VscodeInstalledTheme[];
}
