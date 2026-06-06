import { SETTING_IDS } from "../../src/constants";
import type { CandidateSettingChange } from "../../src/types/patch.types";
import type { ColorSignalRole } from "../../src/types/signal.types";

export interface CandidateMapping extends CandidateSettingChange {
  confidence: number;
}

export const LOW_CONTRAST_MAPPINGS: Partial<Record<ColorSignalRole, CandidateMapping>> = {
  comment: {
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "comments",
    suggestedColor: "#8fb8ff",
    confidence: 0.8
  },
  string: {
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "strings",
    suggestedColor: "#b7f2a1",
    confidence: 0.8
  },
  keyword: {
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "keywords",
    suggestedColor: "#d7b7ff",
    confidence: 0.8
  },
  foreground: {
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editor.foreground",
    suggestedColor: "#eeeeee",
    confidence: 0.75
  },
  error: {
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorError.foreground",
    suggestedColor: "#ff6b6b",
    confidence: 0.75
  },
  warning: {
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorWarning.foreground",
    suggestedColor: "#ffd166",
    confidence: 0.75
  }
};

export const SIMILAR_SIGNAL_MAPPINGS: Array<{
  pair: [ColorSignalRole, ColorSignalRole];
  mapping: CandidateMapping;
}> = [
  {
    pair: ["error", "diffDeleted"],
    mapping: {
      settingId: SETTING_IDS.workbenchColorCustomizations,
      settingKey: "editorGutter.deletedBackground",
      suggestedColor: "#ff6b6b",
      confidence: 0.7
    }
  },
  {
    pair: ["diffAdded", "string"],
    mapping: {
      settingId: SETTING_IDS.workbenchColorCustomizations,
      settingKey: "editorGutter.addedBackground",
      suggestedColor: "#4cc38a",
      confidence: 0.7
    }
  }
];
