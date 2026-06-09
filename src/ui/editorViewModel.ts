import type {
  ThemeColorHexMap,
  ThemeColorRole,
  ThemeReportDto
} from "../types/signal.types";
import type {
  IntentDto,
  ViewerLineDto,
  ViewerModelDto,
  ViewerRegionDto,
  ViewerSampleDto,
  ViewerSampleKind
} from "../types/editorViewer.types";
import { SIGNAL_DEFAULTS, normalizeReportSignals } from "../adapter/vscodeDefaults";
import {
  createPythonSample,
  createTypeScriptSample,
  createHtmlSample,
  createDiagnosticSample,
  createDiffSample
} from "./sample";



import type { CandidateDto } from "../types/patch.types";

export function createEditorViewerModel(
  report: Partial<ThemeReportDto> | undefined,
  afterSignalsMap?: ThemeColorHexMap,
  initialCandidates?: CandidateDto[]
): ViewerModelDto {
  const signals = normalizeReportSignals(report?.signals);
  const afterSignals = afterSignalsMap || signals;

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
    ],
    afterSamples: [
      createPythonSample(afterSignals),
      createTypeScriptSample(afterSignals),
      createHtmlSample(afterSignals),
      createDiagnosticSample(afterSignals),
      createDiffSample(afterSignals)
    ],
    initialCandidates
  };
}

export function findEditorViewerRegion(
  model: ViewerModelDto,
  regionId: string
): ViewerRegionDto | undefined {
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

