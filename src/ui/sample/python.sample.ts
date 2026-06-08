import type { ColorHexMap } from "../../types/signal.types";
import type { EditorViewerSample } from "../../types/editorViewer.types";
import { createSample, createLine, createRegion } from "./sampleUtils";

export function createPythonSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("python-sample", "Python (Syntax)", "syntax", signals, [
    createLine("py-line-1", [
      createRegion("python-sample", "py-def", "Keyword", "def", "keyword", signals.keyword),
      createRegion("python-sample", "py-func", "Foreground", " calculate_visibility(color):", "foreground", signals.foreground)
    ]),
    createLine("py-line-2", [
      createRegion("python-sample", "py-comment", "Comment", "    # evaluate contrast ratio", "comment", signals.comment)
    ]),
    createLine("py-line-3", [
      createRegion("python-sample", "py-if", "Keyword", "    if", "keyword", signals.keyword),
      createRegion("python-sample", "py-cond", "Foreground", " color is None:", "foreground", signals.foreground)
    ]),
    createLine("py-line-4", [
      createRegion("python-sample", "py-return", "Keyword", "        return", "keyword", signals.keyword),
      createRegion("python-sample", "py-str", "String", " \"invalid\"", "string", signals.string)
    ])
  ]);
}
