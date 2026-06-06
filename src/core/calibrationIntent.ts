import type { ColorSignalRole } from "./types/signal.types";
import type {
  CalibrationIntent,
  CalibrationIntentInput,
  CalibrationIntentSeverity,
  CalibrationIntentSource
} from "./types/calibration.types";
import { isPlainObject } from "./objectUtils";

const SUPPORTED_SIGNALS = new Set<ColorSignalRole>([
  "background",
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning",
  "diffAdded",
  "diffDeleted"
]);

const SUPPORTED_SOURCES = new Set<CalibrationIntentSource>([
  "viewerClick",
  "diagnosis",
  "manual"
]);

const SUPPORTED_SEVERITIES = new Set<CalibrationIntentSeverity>([
  "unspecified",
  "low",
  "medium",
  "high"
]);

export function createCalibrationIntent(input: CalibrationIntentInput): CalibrationIntent {
  return normalizeCalibrationIntentPayload(input);
}

export function normalizeCalibrationIntentPayload(payload: unknown): CalibrationIntent {
  if (!isPlainObject(payload)) {
    throw new Error("Calibration intent payload must be an object.");
  }

  const signal = normalizeSignal(payload.signal);
  const targetId = normalizeRequiredText(payload.targetId, "targetId");
  const source = normalizeSource(payload.source);
  const severity = normalizeSeverity(payload.severity);
  const sampleId = normalizeOptionalText(payload.sampleId);
  const message = normalizeOptionalText(payload.message);

  return {
    source,
    signal,
    targetId,
    ...(sampleId ? { sampleId } : {}),
    ...(message ? { message } : {}),
    severity
  };
}

function normalizeSignal(value: unknown): ColorSignalRole {
  if (typeof value !== "string" || !SUPPORTED_SIGNALS.has(value as ColorSignalRole)) {
    throw new Error(`Unsupported calibration signal: ${String(value)}`);
  }

  return value as ColorSignalRole;
}

function normalizeSource(value: unknown): CalibrationIntentSource {
  if (value === undefined) {
    return "viewerClick";
  }

  if (typeof value !== "string" || !SUPPORTED_SOURCES.has(value as CalibrationIntentSource)) {
    throw new Error(`Unsupported calibration intent source: ${String(value)}`);
  }

  return value as CalibrationIntentSource;
}

function normalizeSeverity(value: unknown): CalibrationIntentSeverity {
  if (value === undefined) {
    return "unspecified";
  }

  if (typeof value !== "string" || !SUPPORTED_SEVERITIES.has(value as CalibrationIntentSeverity)) {
    throw new Error(`Unsupported calibration intent severity: ${String(value)}`);
  }

  return value as CalibrationIntentSeverity;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new Error(`Calibration intent ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}

