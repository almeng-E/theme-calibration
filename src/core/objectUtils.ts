import type { ConfigurationSnapshot, SettingDictionary } from "./types/patch.types";

/**
 * 값이 순수 객체(plain object)인지 검사하는 타입 가드.
 * null, 배열, 원시값을 제외하고 `{}` 형태의 객체만 true를 반환한다.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * 임의의 값을 깊은 복사(deep clone)하여 SettingDictionary로 반환한다.
 * plain object가 아닌 값이 들어오면 빈 객체 `{}`를 반환한다.
 */
export function clonePlainSetting(value: unknown): SettingDictionary {
  if (!isPlainObject(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as SettingDictionary;
}

/**
 * 테마 파일 경로 문자열을 정규화하여 세그먼트 배열로 분리한다.
 * 역슬래시/슬래시를 통일하고, 빈 세그먼트와 `.`을 제거한다.
 */
export function normalizeThemePath(themePath: string): string[] {
  return String(themePath || "")
    .split(/[\\/]+/)
    .filter((segment) => segment && segment !== ".");
}

/**
 * unknown 타입의 에러를 안전하게 문자열 메시지로 변환한다.
 * Error 인스턴스이면 message를 반환하고, 그 외에는 String()으로 변환한다.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 3가지 VS Code 설정 키에 대해 빈 SettingDictionary를 가진 초기 스냅샷을 생성한다.
 * patchEngine과 patchGenerator에서 공통으로 사용한다.
 */
export function createEmptySettingsSnapshot(): ConfigurationSnapshot {
  return {
    "workbench.colorCustomizations": {},
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };
}
