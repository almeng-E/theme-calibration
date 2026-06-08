import { SETTING_IDS } from "../constants";
import type { TargetSettingId } from "../types/patch.types";
import type { CandidateMappingRule, CandidateRuleParseResult, CandidateRuleType } from "../types/rule.types";
import type { ColorSignalRole } from "../types/signal.types";
import { parseHexColor } from "../utils/colorUtils";
import { isPlainObject } from "../utils/objectUtils";

const VALID_RULE_TYPES = new Set<CandidateRuleType>(["lowContrast", "similarSignal"]);
const VALID_SIGNALS = new Set<ColorSignalRole>([
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
const VALID_SETTING_IDS = new Set<TargetSettingId>([
  SETTING_IDS.workbenchColorCustomizations,
  SETTING_IDS.editorTokenColorCustomizations,
  SETTING_IDS.editorSemanticTokenColorCustomizations
]);

export function parseCandidateRuleBundle(raw: unknown): CandidateRuleParseResult {
  if (!isPlainObject(raw)) {
    return {
      status: "invalid",
      errors: ["candidate rule bundle must be an object."],
      rules: []
    };
  }

  const errors: string[] = [];

  if (raw.version !== 1) {
    errors.push("version must be 1.");
  }

  if (!Array.isArray(raw.candidateMappings)) {
    errors.push("candidateMappings must be an array.");
    return {
      status: "invalid",
      errors,
      rules: []
    };
  }

  const rules = raw.candidateMappings
    .map((entry, index) => parseCandidateMapping(entry, index, errors))
    .filter((rule): rule is CandidateMappingRule => rule !== undefined);

  if (errors.length > 0) {
    return {
      status: "invalid",
      errors,
      rules: []
    };
  }

  return {
    status: "valid",
    bundle: {
      version: 1,
      candidateMappings: rules
    },
    rules
  };
}

function parseCandidateMapping(
  raw: unknown,
  index: number,
  errors: string[]
): CandidateMappingRule | undefined {
  const path = `candidateMappings[${index}]`;

  if (!isPlainObject(raw)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }

  const type = parseRuleType(raw.type, `${path}.type`, errors);
  const signals = parseSignals(raw.signals, `${path}.signals`, errors);
  const settingId = parseSettingId(raw.settingId, `${path}.settingId`, errors);
  const settingKey = parseSettingKey(raw.settingKey, `${path}.settingKey`, errors);
  const suggestedColor = parseSuggestedColor(raw.suggestedColor, `${path}.suggestedColor`, errors);
  const confidence = parseConfidence(raw.confidence, `${path}.confidence`, errors);

  if (!type || !signals || !settingId || !settingKey || !suggestedColor || confidence === undefined) {
    return undefined;
  }

  return {
    type,
    signals,
    settingId,
    settingKey,
    suggestedColor,
    confidence
  };
}

function parseRuleType(raw: unknown, path: string, errors: string[]): CandidateRuleType | undefined {
  if (typeof raw !== "string" || !VALID_RULE_TYPES.has(raw as CandidateRuleType)) {
    errors.push(`${path} must be lowContrast or similarSignal.`);
    return undefined;
  }

  return raw as CandidateRuleType;
}

function parseSignals(raw: unknown, path: string, errors: string[]): ColorSignalRole[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push(`${path} must be a non-empty array.`);
    return undefined;
  }

  const signals: ColorSignalRole[] = [];

  raw.forEach((entry, index) => {
    if (typeof entry !== "string" || !VALID_SIGNALS.has(entry as ColorSignalRole)) {
      errors.push(`${path}[${index}] must be a known signal role.`);
      return;
    }

    signals.push(entry as ColorSignalRole);
  });

  return signals.length === raw.length ? signals : undefined;
}

function parseSettingId(raw: unknown, path: string, errors: string[]): TargetSettingId | undefined {
  if (typeof raw !== "string" || !VALID_SETTING_IDS.has(raw as TargetSettingId)) {
    errors.push(`${path} must be a supported setting id.`);
    return undefined;
  }

  return raw as TargetSettingId;
}

function parseSettingKey(raw: unknown, path: string, errors: string[]): string | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
    return undefined;
  }

  return raw;
}

function parseSuggestedColor(raw: unknown, path: string, errors: string[]): string | undefined {
  if (typeof raw !== "string") {
    errors.push(`${path} must be a hex color string.`);
    return undefined;
  }

  try {
    parseHexColor(raw);
    return raw;
  } catch {
    errors.push(`${path} must be a hex color string.`);
    return undefined;
  }
}

function parseConfidence(raw: unknown, path: string, errors: string[]): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1) {
    errors.push(`${path} must be a number between 0 and 1.`);
    return undefined;
  }

  return raw;
}
