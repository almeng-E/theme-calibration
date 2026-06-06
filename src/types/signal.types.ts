// ============================================================
// 신호(Signal) 분석 & 위험(Risk) 리포트
// ============================================================

export type ColorSignalRole =
  | "background"
  | "foreground"
  | "comment"
  | "string"
  | "keyword"
  | "error"
  | "warning"
  | "diffAdded"
  | "diffDeleted";

export interface ColorSignal {
  value: string;
  source?: string;
}

export type ColorSignalMap = Partial<Record<ColorSignalRole, ColorSignal>>;
export type ColorHexMap = Record<ColorSignalRole, string>;
export type SignalContrastMap = Partial<Record<Exclude<ColorSignalRole, "background">, { ratio: number }>>;

export interface VisibilityRisk {
  type: string;
  signal?: ColorSignalRole;
  signals?: ColorSignalRole[];
  contrastRatio?: number;
  threshold?: number;
  colorDistance?: number;
  message?: string;
}

export interface ThemeAnalysisReport {
  generatedAt: string;
  theme: {
    configuredName?: string;
    activeKind?: unknown;
    id?: string;
    label?: string;
    extensionId?: string;
    definitionStatus: string;
  };
  signals: ColorSignalMap;
  contrast: SignalContrastMap;
  risks: VisibilityRisk[];
}
