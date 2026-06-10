// ============================================================
// VS Code API 추상화 — 테스트 mock을 위한 인터페이스
//    VscodeSettingsApis: 설정 읽기/쓰기 전용 (patchEngine, adapter에서 사용)
//    VscodeReadApis: 테마 수집용 확장 (adapter에서 사용)
// ============================================================

export interface VscodeConfigInspection {
  defaultValue?: unknown;
  globalValue?: unknown;
  workspaceValue?: unknown;
  workspaceFolderValue?: unknown;
}

export interface VscodeConfigAccessor {
  get<T = unknown>(key: string): T;
  inspect(key: string): VscodeConfigInspection | undefined;
  update?(key: string, value: unknown, target: unknown): Thenable<void> | Promise<void>;
}

export interface VscodeSettingsApis {
  ConfigurationTarget?: {
    Global?: unknown;
    Workspace?: unknown;
    WorkspaceFolder?: unknown;
  };
  workspace: {
    getConfiguration(section: string): VscodeConfigAccessor;
  };
}

export interface VscodeExtensionManifest {
  name?: string;
  displayName?: string;
  publisher?: string;
  version?: string;
  contributes?: {
    themes?: {
      id?: string;
      label?: string;
      uiTheme?: string;
      path?: string;
    }[];
  };
}

export interface VscodeExtensionInfo {
  id?: string;
  isActive?: boolean;
  extensionKind?: unknown;
  extensionUri?: {
    toString(): string;
  };
  packageJSON?: VscodeExtensionManifest;
}

export interface VscodeReadApis extends VscodeSettingsApis {
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
  workspace: VscodeSettingsApis["workspace"] & {
    fs?: {
      readFile(uri: unknown): PromiseLike<Uint8Array>;
    };
  };
  Uri?: {
    joinPath(base: unknown, ...pathSegments: string[]): unknown;
  };
  extensions?: {
    all?: readonly VscodeExtensionInfo[];
  };
}

export interface ThemeFileReader {
  (extension: VscodeExtensionInfo, themePath: string): Promise<string>;
}

export interface ThemeCollectionOptions {
  includeThemeDefinitions?: boolean;
  readThemeTextFile?: ThemeFileReader;
}
