import type { ThemeColorHexMap } from "../../types/signal.types";
import type { ViewerSampleDto } from "../../types/editorViewer.types";
import { createSample, createLine, createRegion } from "./sampleUtils";

export function createHtmlSample(signals: ThemeColorHexMap): ViewerSampleDto {
  return createSample("html-sample", "HTML (Syntax)", "syntax", signals, [
    createLine("html-line-1", [
      createRegion("html-sample", "html-tag-open", "Foreground", "<", "foreground", signals.foreground),
      createRegion("html-sample", "html-tag-name", "Keyword", "div", "keyword", signals.keyword),
      createRegion("html-sample", "html-attr-name", "Foreground", " class=", "foreground", signals.foreground),
      createRegion("html-sample", "html-attr-value", "String", "\"container\"", "string", signals.string),
      createRegion("html-sample", "html-tag-close", "Foreground", ">", "foreground", signals.foreground)
    ]),
    createLine("html-line-2", [
      createRegion("html-sample", "html-comment", "Comment", "  <!-- main content area -->", "comment", signals.comment)
    ]),
    createLine("html-line-3", [
      createRegion("html-sample", "html-text", "Foreground", "  Hello, Webview!", "foreground", signals.foreground)
    ]),
    createLine("html-line-4", [
      createRegion("html-sample", "html-tag-open-close", "Foreground", "</", "foreground", signals.foreground),
      createRegion("html-sample", "html-tag-name-close", "Keyword", "div", "keyword", signals.keyword),
      createRegion("html-sample", "html-tag-close-close", "Foreground", ">", "foreground", signals.foreground)
    ])
  ]);
}
