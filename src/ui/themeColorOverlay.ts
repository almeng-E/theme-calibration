/**
 * Signal 오버레이 유틸리티.
 *
 * 채택된 candidate들의 suggestedColor를 base signal 맵 위에 직접 덮어쓴다.
 * 초기 오픈(extension.ts)과 라이브 accept/reject(afterLayer.ts)가
 * 동일한 단일 헬퍼를 사용하도록 한다.
 */

import type { ThemeColorHexMap } from "../types/signal.types";
import type { CandidateDto } from "../types/patch.types";

/**
 * PURE: base 맵의 복사본을 만들고, 각 candidate의 signals 역할마다
 * suggestedColor로 덮어쓴 NEW 맵을 반환한다.
 *
 * 에디터 무관(editor-agnostic), I/O 없음, VS Code 타입 없음.
 * base는 변경하지 않는다(불변).
 */
export function overlayCandidateColors(
  base: ThemeColorHexMap,
  candidates: readonly CandidateDto[]
): ThemeColorHexMap {
  const result: ThemeColorHexMap = { ...base };

  for (const candidate of candidates) {
    for (const role of candidate.signals) {
      result[role] = candidate.suggestedColor;
    }
  }

  return result;
}
