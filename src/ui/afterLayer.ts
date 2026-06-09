import type { ColorHexMap, ThemeAnalysisReport } from "../types/signal.types";
import type { PatchCandidate } from "../types/patch.types";
import { normalizeReportSignals } from "../adapter/vscodeDefaults";
import { createEditorViewerModel } from "./editorViewModel";
import { renderSamplesHtml } from "./components/sliderArea";

/**
 * PURE: build the live B-layer (after) preview HTML.
 *
 * Overlays the accepted candidates' suggestedColor onto the report's
 * normalized signals, then renders the layer-B samples HTML. Reuses
 * normalizeReportSignals + createEditorViewerModel + renderSamplesHtml so the
 * preview stays identical to the host's previous inline computation.
 *
 * No I/O, no VS Code API. Given the same inputs it always returns the same HTML.
 */
export function renderAfterLayerHtml(
  report: ThemeAnalysisReport,
  acceptedCandidates: readonly PatchCandidate[]
): string {
  const afterSignals: ColorHexMap = { ...normalizeReportSignals(report.signals) };

  for (const candidate of acceptedCandidates) {
    for (const signal of candidate.signals) {
      afterSignals[signal] = candidate.suggestedColor;
    }
  }

  const model = createEditorViewerModel(report, afterSignals);
  return renderSamplesHtml(model.afterSamples || []);
}
