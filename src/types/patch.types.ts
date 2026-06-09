// ============================================================
// 패치(Patch) & 프리뷰(Preview)
// ============================================================

import type { ThemeColorRole } from "./signal.types";

export type SettingDictionary = Record<string, unknown>;

export type TargetSettingId =
  | "workbench.colorCustomizations"
  | "editor.tokenColorCustomizations"
  | "editor.semanticTokenColorCustomizations";

export interface PatchRecipeDto {
  id: string;
  description: string;
  settings: Record<TargetSettingId, SettingDictionary>;
}

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

export type ConfigurationSnapshot = Record<TargetSettingId, SettingDictionary>;

export interface ConfigurationUpdate {
  section: string;
  key: string;
  value: SettingDictionary;
}

export interface RollbackSnapshotDto {
  createdAt: string;
  recipeId: string;
  settings: ConfigurationSnapshot;
}

export interface PatchPlanDto {
  recipeId: string;
  nextSettings: ConfigurationSnapshot;
  rollbackSnapshot: RollbackSnapshotDto;
  settingsUpdates: ConfigurationUpdate[];
}

export interface RollbackPlanDto {
  recipeId: string;
  createdAt: string;
  settingsUpdates: ConfigurationUpdate[];
}
