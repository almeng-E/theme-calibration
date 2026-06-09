// ============================================================
// 신호(Signal) 분석 & 위험(Risk) 리포트
// ============================================================

export type ThemeColorRole =
  | "background"
  | "foreground"
  | "comment"
  | "string"
  | "keyword"
  | "error"
  | "warning"
  | "diffAdded"
  | "diffDeleted";

export interface ThemeColorValue {
  value: string;
  source?: string;
}

export type ThemeColorsDto = Partial<Record<ThemeColorRole, ThemeColorValue>>;
export type ThemeColorHexMap = Record<ThemeColorRole, string>;
export type ContrastMapDto = Partial<Record<Exclude<ThemeColorRole, "background">, { ratio: number }>>;

export interface RiskDto {
  type: string;
  signal?: ThemeColorRole;
  signals?: ThemeColorRole[];
  contrastRatio?: number;
  threshold?: number;
  colorDistance?: number;
  message?: string;
}

export interface ThemeReportDto {
  generatedAt: string;
  theme: {
    configuredName?: string;
    activeKind?: unknown;
    id?: string;
    label?: string;
    extensionId?: string;
    definitionStatus: string;
  };
  signals: ThemeColorsDto;
  contrast: ContrastMapDto;
  risks: RiskDto[];
}
