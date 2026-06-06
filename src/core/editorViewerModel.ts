import type {
  ColorHexMap,
  ColorSignalRole,
  ThemeAnalysisReport
} from "./types/signal.types";
import type {
  EditorViewerLine,
  EditorViewerModel,
  EditorViewerRegion,
  EditorViewerSample,
  EditorViewerSampleKind
} from "./types/editorViewer.types";
import { SIGNAL_DEFAULTS, normalizeReportSignals } from "./signalDefaults";
import { withAlphaFallback } from "./htmlUtils";



export function createEditorViewerModel(
  report: Partial<ThemeAnalysisReport> | undefined
): EditorViewerModel {
  const signals = normalizeReportSignals(report?.signals);

  return {
    themeName: report?.theme?.configuredName || "Unknown Theme",
    signals,
    risks: Array.isArray(report?.risks) ? report.risks : [],
    samples: [
      createSyntaxSample(signals),
      createDiagnosticSample(signals),
      createDiffSample(signals)
    ]
  };
}

export function findEditorViewerRegion(
  model: EditorViewerModel,
  regionId: string
): EditorViewerRegion | undefined {
  for (const sample of model.samples) {
    for (const line of sample.lines) {
      const region = line.regions.find((item) => item.id === regionId);
      if (region) {
        return region;
      }
    }
  }

  return undefined;
}

function createSyntaxSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("syntax-sample", "Syntax Signals", "syntax", signals, [
    createLine("syntax-line-1", [
      createRegion("syntax-sample", "syntax-keyword", "Keyword", "function", "keyword", signals.keyword),
      createRegion("syntax-sample", "syntax-foreground", "Foreground", " calibrateTheme(signal) {", "foreground", signals.foreground)
    ]),
    createLine("syntax-line-2", [
      createRegion("syntax-sample", "syntax-comment", "Comment", "// keep the theme, improve the signal", "comment", signals.comment)
    ]),
    createLine("syntax-line-3", [
      createRegion("syntax-sample", "syntax-keyword-const", "Keyword", "const", "keyword", signals.keyword),
      createRegion("syntax-sample", "syntax-foreground-message", "Foreground", " message = ", "foreground", signals.foreground),
      createRegion("syntax-sample", "syntax-string", "String", "\"visibility matters\"", "string", signals.string)
    ])
  ]);
}

function createDiagnosticSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("diagnostic-sample", "Diagnostics", "diagnostic", signals, [
    createLine("diagnostic-line-1", [
      createRegion("diagnostic-sample", "diagnostic-warning", "Warning", "warning: keyword signal may be hard to separate", "warning", signals.warning, withAlphaFallback(signals.warning, "20"))
    ]),
    createLine("diagnostic-line-2", [
      createRegion("diagnostic-sample", "diagnostic-error", "Error", "error: deletion and diagnostic colors overlap", "error", signals.error, withAlphaFallback(signals.error, "20"))
    ])
  ]);
}

function createDiffSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("diff-sample", "Diff", "diff", signals, [
    createLine("diff-line-1", [
      createRegion("diff-sample", "diff-added", "Added Diff", "+ added code path is visible", "diffAdded", signals.diffAdded, withAlphaFallback(signals.diffAdded, "22"))
    ]),
    createLine("diff-line-2", [
      createRegion("diff-sample", "diff-deleted", "Deleted Diff", "- deleted code path is visible", "diffDeleted", signals.diffDeleted, withAlphaFallback(signals.diffDeleted, "22"))
    ])
  ]);
}

function createSample(
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

function createLine(id: string, regions: EditorViewerRegion[]): EditorViewerLine {
  return { id, regions };
}

function createRegion(
  sampleId: string,
  id: string,
  label: string,
  text: string,
  signal: ColorSignalRole,
  color: string,
  backgroundColor?: string
): EditorViewerRegion {
  return {
    id,
    label,
    signal,
    text,
    color,
    ...(backgroundColor ? { backgroundColor } : {}),
    intent: {
      source: "viewerClick",
      signal,
      sampleId,
      targetId: id,
      severity: "unspecified",
      message: `${label} visibility needs review.`
    }
  };
}

