/**
 * Signal 기본값 및 정규화 유틸리티.
 * editorViewerModel, previewRenderer 등에서 공유한다.
 */

import type {
  ThemeColorHexMap,
  ThemeColorsDto,
  ThemeColorRole
} from "../types/signal.types";

/**
 * VS Code Dark+ 기준 signal 기본값.
 * theme에서 signal이 누락됐을 때 fallback으로 사용한다.
 */
export const SIGNAL_DEFAULTS: ThemeColorHexMap = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  comment: "#6a9955",
  string: "#ce9178",
  keyword: "#569cd6",
  error: "#f44747",
  warning: "#cca700",
  diffAdded: "#2ea043",
  diffDeleted: "#f44747"
};

/**
 * ThemeColorsDto(분석 리포트의 signal)을 ThemeColorHexMap(순수 hex 문자열)으로 정규화한다.
 * 누락된 signal은 SIGNAL_DEFAULTS에서 채운다.
 */
export function normalizeReportSignals(signals: ThemeColorsDto | undefined): ThemeColorHexMap {
  const normalized = { ...SIGNAL_DEFAULTS };

  for (const name of Object.keys(SIGNAL_DEFAULTS) as ThemeColorRole[]) {
    const signal = signals?.[name];
    if (signal?.value) {
      normalized[name] = signal.value;
    }
  }

  return normalized;
}
