// ============================================================
// 3. Extension / Theme 정보 구조체 및 파싱 결과
// ============================================================

export interface ThemeRegistration {
  id?: string;
  label?: string;
  uiTheme?: string;
  path?: string;
}

export interface ExtensionMetadata {
  id?: string;
  name?: string;
  displayName?: string;
  publisher?: string;
  version?: string;
  isActive?: boolean;
  extensionUri?: string;
  extensionKind?: unknown;
}

export interface ThemeRegistrationSummary {
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

export interface RawThemeData {
  name?: string;
  type?: string;
  include?: string;
  semanticHighlighting?: boolean;
  colors?: Record<string, string>;
  tokenColors?: TokenColorRule[] | Record<string, unknown>;
  semanticTokenColors?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RawThemeDataSummary {
  name?: string;
  type?: string;
  semanticHighlighting?: boolean;
  rawKeys: string[];
  colorCount: number;
  tokenColorCount: number;
  semanticTokenColorCount: number;
}

export type ThemeLoadResult =
  | { status: "missing-path" }
  | { status: "include-cycle"; filePath: string }
  | { status: "unsupported-file-type"; filePath: string; reason: string }
  | { status: "read-or-parse-error"; filePath: string; error: string }
  | {
      status: "loaded";
      filePath: string;
      definition: RawThemeData;
      definitionSummary: RawThemeDataSummary | undefined;
      include?: ThemeLoadResult;
      resolvedDefinition: RawThemeData;
      resolvedDefinitionSummary: RawThemeDataSummary | undefined;
    };

export interface InstalledTheme {
  extension: ExtensionMetadata;
  theme: ThemeRegistrationSummary;
  themeDefinition?: ThemeLoadResult;
}

export interface ThemeEnvironment {
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
    matchedInstalledThemes: InstalledTheme[];
  };
  installedThemes: InstalledTheme[];
}
