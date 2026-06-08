import type {
  ColorHexMap,
  ColorSignalRole,
  ThemeAnalysisReport
} from "../types/signal.types";
import type {
  CalibrationIntent,
  EditorViewerLine,
  EditorViewerModel,
  EditorViewerRegion,
  EditorViewerSample,
  EditorViewerSampleKind
} from "../types/editorViewer.types";
import { SIGNAL_DEFAULTS, normalizeReportSignals } from "../adapter/vscodeDefaults";
import {
  createPythonSample,
  createTypeScriptSample,
  createHtmlSample,
  createDiagnosticSample,
  createDiffSample
} from "./sample";



export function createEditorViewerModel(
  report: Partial<ThemeAnalysisReport> | undefined
): EditorViewerModel {
  const signals = normalizeReportSignals(report?.signals);

  return {
    themeName: report?.theme?.configuredName || "Unknown Theme",
    signals,
    risks: Array.isArray(report?.risks) ? report.risks : [],
    samples: [
      createPythonSample(signals),
      createTypeScriptSample(signals),
      createHtmlSample(signals),
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

