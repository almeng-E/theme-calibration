import type { TargetSettingId } from "./patch.types";
import type { ThemeColorRole } from "./signal.types";

export type CandidateRuleType = "lowContrast" | "similarSignal";

export interface CandidateRuleDto {
  type: CandidateRuleType;
  signals: ThemeColorRole[];
  settingId: TargetSettingId;
  settingKey: string;
  suggestedColor: string;
  confidence: number;
}

export interface CandidateRuleBundleDto {
  version: 1;
  candidateMappings: CandidateRuleDto[];
}

export type CandidateRuleParseResult =
  | { status: "valid"; bundle: CandidateRuleBundleDto; rules: CandidateRuleDto[] }
  | { status: "invalid"; errors: string[]; rules: [] };
