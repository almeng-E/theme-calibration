/**
 * HTML 렌더링용 공통 유틸리티.
 * editorViewerRenderer, previewRenderer, editorViewerModel 등에서 공유한다.
 */

/**
 * 문자열 내 HTML 특수 문자를 이스케이프한다.
 * XSS 방지를 위해 모든 HTML 렌더링 경로에서 사용한다.
 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * CSS color 값을 안전하게 변환한다.
 * 유효한 hex 패턴(#rgb, #rgba, #rrggbb, #rrggbbaa)만 통과시키고,
 * 그 외에는 fallback(#ffffff)을 반환한다.
 */
export function cssColor(value: string | undefined): string {
  const fallbackColor = "#ffffff";
  const color = value || fallbackColor;

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
    return color;
  }

  return fallbackColor;
}

/**
 * 6자리 hex 색상에 alpha suffix를 추가한다.
 * 이미 8자리이거나 다른 형식이면 그대로 반환한다.
 */
export function withAlphaFallback(hex: string, alpha: string): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return `${hex}${alpha}`;
  }

  return hex;
}
