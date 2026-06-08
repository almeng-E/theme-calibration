import type { ColorHexMap } from "../../types/signal.types";
import type { EditorViewerSample } from "../../types/editorViewer.types";
import { createSample, createLine, createRegion } from "./sampleUtils";
import { withAlphaFallback } from "../../ui/htmlUtils";

export function createDiffSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("diff-sample", "Diff", "diff", signals, [
    createLine("diff-line-1", [
      createRegion(
        "diff-sample",
        "diff-added",
        "Added Diff",
        "+ added code path is visible",
        "diffAdded",
        signals.diffAdded,
        withAlphaFallback(signals.diffAdded, "22")
      )
    ]),
    createLine("diff-line-2", [
      createRegion(
        "diff-sample",
        "diff-deleted",
        "Deleted Diff",
        "- deleted code path is visible",
        "diffDeleted",
        signals.diffDeleted,
        withAlphaFallback(signals.diffDeleted, "22")
      )
    ])
  ]);
}
