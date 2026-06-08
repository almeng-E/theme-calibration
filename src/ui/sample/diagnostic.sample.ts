import type { ColorHexMap } from "../../types/signal.types";
import type { EditorViewerSample } from "../../types/editorViewer.types";
import { createSample, createLine, createRegion } from "./sampleUtils";
import { withAlphaFallback } from "../../ui/htmlUtils";

export function createDiagnosticSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("diagnostic-sample", "Diagnostics", "diagnostic", signals, [
    createLine("diagnostic-line-1", [
      createRegion(
        "diagnostic-sample",
        "diagnostic-warning",
        "Warning",
        "warning: keyword signal may be hard to separate",
        "warning",
        signals.warning,
        withAlphaFallback(signals.warning, "20")
      )
    ]),
    createLine("diagnostic-line-2", [
      createRegion(
        "diagnostic-sample",
        "diagnostic-error",
        "Error",
        "error: deletion and diagnostic colors overlap",
        "error",
        signals.error,
        withAlphaFallback(signals.error, "20")
      )
    ])
  ]);
}
