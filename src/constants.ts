import type { TargetSettingId } from "./types/patch.types";

export interface SettingDescriptor {
  section: string;
  key: string;
}

export const OUTPUT_CHANNEL_NAME = "Color Calibration Theme Probe";

export const COMMAND_IDS = {
  printThemeProbe: "colorCalibration.printThemeProbe",
  printThemeSignalReport: "colorCalibration.printThemeSignalReport",
  printPatchCandidates: "colorCalibration.printPatchCandidates",
  openBeforeAfterPreview: "colorCalibration.openBeforeAfterPreview",
  openCandidatePreview: "colorCalibration.openCandidatePreview",
  openEditorViewer: "colorCalibration.openEditorViewer",
  applyCandidatePatch: "colorCalibration.applyCandidatePatch",
  rollbackCandidatePatch: "colorCalibration.rollbackCandidatePatch",
  applyHardcodedPatch: "colorCalibration.applyHardcodedPatch",
  rollbackHardcodedPatch: "colorCalibration.rollbackHardcodedPatch"
} as const;

export const ROLLBACK_STATE_KEY = "colorCalibration.pocHardcodedPatch.rollbackSnapshot";
export const CANDIDATE_ROLLBACK_STATE_KEY = "colorCalibration.candidatePatch.rollbackSnapshot";

export const SETTING_IDS = {
  workbenchColorCustomizations: "workbench.colorCustomizations",
  editorTokenColorCustomizations: "editor.tokenColorCustomizations",
  editorSemanticTokenColorCustomizations: "editor.semanticTokenColorCustomizations"
} as const satisfies Record<string, TargetSettingId>;

export const SETTINGS_ORDER = [
  SETTING_IDS.workbenchColorCustomizations,
  SETTING_IDS.editorTokenColorCustomizations,
  SETTING_IDS.editorSemanticTokenColorCustomizations
] as const satisfies readonly TargetSettingId[];

export const COLOR_CUSTOMIZATION_SETTINGS = [
  { section: "workbench", key: "colorTheme" },
  { section: "workbench", key: "iconTheme" },
  { section: "workbench", key: "productIconTheme" },
  { section: "workbench", key: "colorCustomizations" },
  { section: "editor", key: "tokenColorCustomizations" },
  { section: "editor", key: "semanticTokenColorCustomizations" }
] as const satisfies readonly SettingDescriptor[];
