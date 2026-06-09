import type { ThemeColorHexMap, ThemeColorRole } from "../../types/signal.types";
import type {
  IntentDto,
  ViewerLineDto,
  ViewerRegionDto,
  ViewerSampleDto,
  ViewerSampleKind
} from "../../types/editorViewer.types";

export function createSample(
  id: string,
  title: string,
  kind: ViewerSampleKind,
  signals: ThemeColorHexMap,
  lines: ViewerLineDto[]
): ViewerSampleDto {
  return {
    id,
    title,
    kind,
    background: signals.background,
    foreground: signals.foreground,
    lines
  };
}

export function createLine(id: string, regions: ViewerRegionDto[]): ViewerLineDto {
  return { id, regions };
}

export function createRegion(
  sampleId: string,
  id: string,
  label: string,
  text: string,
  signal: ThemeColorRole,
  color: string,
  backgroundColor?: string
): ViewerRegionDto {
  const intent: IntentDto = {
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
