const { SETTING_IDS } = require("../../out/constants");

const LOW_CONTRAST_MAPPINGS = [
  {
    type: "lowContrast",
    signals: ["comment"],
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "comments",
    suggestedColor: "#8fb8ff",
    confidence: 0.8
  },
  {
    type: "lowContrast",
    signals: ["string"],
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "strings",
    suggestedColor: "#b7f2a1",
    confidence: 0.8
  },
  {
    type: "lowContrast",
    signals: ["keyword"],
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "keywords",
    suggestedColor: "#d7b7ff",
    confidence: 0.8
  },
  {
    type: "lowContrast",
    signals: ["foreground"],
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editor.foreground",
    suggestedColor: "#eeeeee",
    confidence: 0.75
  },
  {
    type: "lowContrast",
    signals: ["error"],
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorError.foreground",
    suggestedColor: "#ff6b6b",
    confidence: 0.75
  },
  {
    type: "lowContrast",
    signals: ["warning"],
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorWarning.foreground",
    suggestedColor: "#ffd166",
    confidence: 0.75
  }
];
const SIMILAR_SIGNAL_MAPPINGS = [
  {
    type: "similarSignal",
    signals: ["error", "diffDeleted"],
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorGutter.deletedBackground",
    suggestedColor: "#ff6b6b",
    confidence: 0.7
  },
  {
    type: "similarSignal",
    signals: ["diffAdded", "string"],
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorGutter.addedBackground",
    suggestedColor: "#4cc38a",
    confidence: 0.7
  }
];

module.exports = {
  LOW_CONTRAST_MAPPINGS,
  SIMILAR_SIGNAL_MAPPINGS
};
