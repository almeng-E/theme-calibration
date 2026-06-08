import type { TargetSettingId } from "./patch.types";
import type { ColorSignalRole } from "./signal.types";

export type CandidateRuleType = "lowContrast" | "similarSignal";

export interface CandidateMappingRule {
  type: CandidateRuleType;
  signals: ColorSignalRole[];
  settingId: TargetSettingId;
  settingKey: string;
  suggestedColor: string;
  confidence: number;
}

export interface CandidateRuleBundle {
  version: 1;
  candidateMappings: CandidateMappingRule[];
}

export type CandidateRuleParseResult =
  | { status: "valid"; bundle: CandidateRuleBundle; rules: CandidateMappingRule[] }
  | { status: "invalid"; errors: string[]; rules: [] };
