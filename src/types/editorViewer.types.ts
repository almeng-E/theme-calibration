import type { ColorHexMap, ColorSignalRole, VisibilityRisk } from "./signal.types";

export type EditorViewerSampleKind = "syntax" | "diagnostic" | "diff";

export interface EditorViewerRegion {
  id: string;
  label: string;
  signal: ColorSignalRole;
  text: string;
  color: string;
  backgroundColor?: string;
  intent: any;
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
}
