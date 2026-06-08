import type { ColorHexMap, ColorSignalRole } from "../../types/signal.types";
import type {
  CalibrationIntent,
  EditorViewerLine,
  EditorViewerRegion,
  EditorViewerSample,
  EditorViewerSampleKind
} from "../../types/editorViewer.types";

export function createSample(
  id: string,
  title: string,
  kind: EditorViewerSampleKind,
  signals: ColorHexMap,
  lines: EditorViewerLine[]
): EditorViewerSample {
  return {
    id,
    title,
    kind,
    background: signals.background,
    foreground: signals.foreground,
    lines
  };
}

export function createLine(id: string, regions: EditorViewerRegion[]): EditorViewerLine {
  return { id, regions };
}

export function createRegion(
  sampleId: string,
  id: string,
  label: string,
  text: string,
  signal: ColorSignalRole,
  color: string,
  backgroundColor?: string
): EditorViewerRegion {
  const intent: CalibrationIntent = {
    source: "viewerClick",
    signal,
    sampleId,
    targetId: id,
    severity: "unspecified",
    message: `${label} visibility needs review.`
  };

  return {
    id,
    label,
    signal,
    text,
    color,
    ...(backgroundColor ? { backgroundColor } : {}),
    intent
  };
}
