import type { PatchCandidate } from "./patch.types";
import type { ColorHexMap, ColorSignalRole, VisibilityRisk } from "./signal.types";

export type EditorViewerSampleKind = "syntax" | "diagnostic" | "diff";
export type CalibrationIntentSource = "viewerClick";
export type CalibrationIntentSeverity = "unspecified";
export type IntentSolutionStatus = "noMatchingRisk" | "noCandidate" | "candidates";

export interface CalibrationIntent {
  source: CalibrationIntentSource;
  signal: ColorSignalRole;
  sampleId: string;
  targetId: string;
  severity: CalibrationIntentSeverity;
  message: string;
}

export interface IntentSolution {
  intent: CalibrationIntent;
  status: IntentSolutionStatus;
  risks: VisibilityRisk[];
  candidates: PatchCandidate[];
}

export interface EditorViewerRegion {
  id: string;
  label: string;
  signal: ColorSignalRole;
  text: string;
  color: string;
  backgroundColor?: string;
  intent: CalibrationIntent;
}

export interface EditorViewerLine {
  id: string;
  regions: EditorViewerRegion[];
}

export interface EditorViewerSample {
  id: string;
  title: string;
  kind: EditorViewerSampleKind;
  background: string;
  foreground: string;
  lines: EditorViewerLine[];
}

export interface EditorViewerModel {
  themeName: string;
  signals: ColorHexMap;
  risks: VisibilityRisk[];
  samples: EditorViewerSample[];
  afterSamples?: EditorViewerSample[];
  initialCandidates?: PatchCandidate[];
}
