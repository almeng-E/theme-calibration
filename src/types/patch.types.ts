// ============================================================
// 패치(Patch) & 프리뷰(Preview)
// ============================================================

import type { ThemeColorRole } from "./signal.types";

export type TargetSettingId =
  | "workbench.colorCustomizations"
  | "editor.tokenColorCustomizations"
  | "editor.semanticTokenColorCustomizations";

export type PatchScope = "global" | "theme";

export interface CandidateChangeDto {
  settingId: TargetSettingId;
  settingKey: string;
  suggestedColor: string;
}

export interface CandidateDto extends CandidateChangeDto {
  id: string;
  riskType: string;
  signals: ThemeColorRole[];
  currentSignals: Partial<Record<ThemeColorRole, string>>;
  reason: string;
  scope: PatchScope;
  confidence: number;
}
