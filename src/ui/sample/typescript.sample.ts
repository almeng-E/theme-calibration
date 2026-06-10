import type { ThemeColorHexMap } from "../../types/signal.types";
import type { ViewerSampleDto } from "../../types/editorViewer.types";
import { createSample, createLine, createRegion } from "./sampleUtils";

export function createTypeScriptSample(signals: ThemeColorHexMap): ViewerSampleDto {
  return createSample("ts-sample", "TypeScript (Syntax)", "syntax", signals, [
    createLine("ts-line-1", [
      createRegion("ts-sample", "ts-keyword-function", "Keyword", "function", "keyword", signals.keyword),
      createRegion("ts-sample", "ts-func", "Foreground", " calibrateTheme(signal) {", "foreground", signals.foreground)
    ]),
    createLine("ts-line-2", [
      createRegion("ts-sample", "ts-comment", "Comment", "  // keep the theme, improve the signal", "comment", signals.comment)
    ]),
    createLine("ts-line-3", [
      createRegion("ts-sample", "ts-keyword-const", "Keyword", "  const", "keyword", signals.keyword),
      createRegion("ts-sample", "ts-var", "Foreground", " message = ", "foreground", signals.foreground),
      createRegion("ts-sample", "ts-str", "String", "\"visibility matters\"", "string", signals.string),
      createRegion("ts-sample", "ts-semi", "Foreground", ";", "foreground", signals.foreground)
    ]),
    createLine("ts-line-4", [
      createRegion("ts-sample", "ts-close", "Foreground", "}", "foreground", signals.foreground)
    ])
  ]);
}
