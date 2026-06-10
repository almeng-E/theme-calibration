import type { CandidateDto } from "./patch.types";
import type { ThemeColorHexMap, ThemeColorRole, RiskDto } from "./signal.types";

export type ViewerSampleKind = "syntax" | "diagnostic" | "diff";
export type IntentSource = "viewerClick";
export type IntentSeverity = "unspecified";
export type IntentSolutionStatus = "noMatchingRisk" | "noCandidate" | "candidates";

export interface IntentDto {
  source: IntentSource;
  signal: ThemeColorRole;
  sampleId: string;
  targetId: string;
  severity: IntentSeverity;
  message: string;
}

export interface IntentSolutionDto {
  intent: IntentDto;
  status: IntentSolutionStatus;
  risks: RiskDto[];
  candidates: CandidateDto[];
}

export interface ViewerRegionDto {
  id: string;
  label: string;
  signal: ThemeColorRole;
  text: string;
  color: string;
  backgroundColor?: string;
  intent: IntentDto;
}

export interface ViewerLineDto {
  id: string;
  regions: ViewerRegionDto[];
}

export interface ViewerSampleDto {
  id: string;
  title: string;
  kind: ViewerSampleKind;
  background: string;
  foreground: string;
  lines: ViewerLineDto[];
}

export interface ViewerModelDto {
  themeName: string;
  signals: ThemeColorHexMap;
  risks: RiskDto[];
  samples: ViewerSampleDto[];
  afterSamples?: ViewerSampleDto[];
  initialCandidates?: CandidateDto[];
}
