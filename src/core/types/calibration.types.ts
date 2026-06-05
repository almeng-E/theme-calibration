import type { ColorSignalRole } from "./signal.types";

export type CalibrationIntentSource = "viewerClick" | "diagnosis" | "manual";
export type CalibrationIntentSeverity = "unspecified" | "low" | "medium" | "high";

export interface CalibrationIntent {
  source: CalibrationIntentSource;
  signal: ColorSignalRole;
  targetId: string;
  sampleId?: string;
  message?: string;
  severity: CalibrationIntentSeverity;
}

export interface CalibrationIntentInput {
  source?: CalibrationIntentSource;
  signal: ColorSignalRole;
  targetId: string;
  sampleId?: string;
  message?: string;
  severity?: CalibrationIntentSeverity;
}
