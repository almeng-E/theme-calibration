# 향후 구현 메모: 동적 색상 제안 알고리즘

## 현재 상태 (v0.0.1 기준)

`patchGenerator.ts`의 `LOW_CONTRAST_MAPPINGS`와 `SIMILAR_SIGNAL_MAPPINGS`은 **정적 매핑 테이블**로 구현되어 있다.

```typescript
const LOW_CONTRAST_MAPPINGS = {
  comment: { suggestedColor: "#8fb8ff", confidence: 0.8 },
  string:  { suggestedColor: "#b7f2a1", confidence: 0.8 },
  // ...
};
```

현재 사용자의 배경색이 무엇이든 동일한 색상을 제안한다.

## 한계

1. **밝은 테마(light theme)에서 역효과**: `#8fb8ff` 같은 색상이 밝은 배경에서 오히려 contrast가 낮아질 수 있다.
2. **배경색과의 실제 contrast 미반영**: 제안 색상이 실제로 WCAG 기준을 충족하는지 검증하지 않는다.
3. **사용자 선호 반영 불가**: 모든 사용자에게 동일한 색상을 제안한다.

## 향후 구현 방향

### 1. 배경색 기반 contrast ratio 역산
현재 배경색을 입력으로 받아, 목표 contrast ratio(예: WCAG AA 4.5:1)를 달성하는 색상을 계산한다.

### 2. 색상 공간 탐색
- 기존 색상의 hue를 유지하면서 lightness만 조절하는 방식 (HSL 기반)
- 사용자의 기존 팔레트와 조화를 유지하면서 가시성을 개선

### 3. 다중 candidate 생성
- "보수적 조정" (현재 색에서 최소한만 이동)
- "고대비 조정" (확실한 가시성 확보)
- "팔레트 조화 조정" (다른 signal과의 거리도 고려)

## 관련 파일
- `src/core/patchGenerator.ts` — `LOW_CONTRAST_MAPPINGS`, `SIMILAR_SIGNAL_MAPPINGS`
- `src/core/colorUtils.ts` — `calculateContrastRatio`, `calculateColorDistance`
