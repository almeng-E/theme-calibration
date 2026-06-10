import type { ThemeReportDto } from "../types/signal.types";

// ============================================================
// Single source of truth for "is the viewer report stale?"
//
// When a viewer (editor preview / save session) is opened it captures
// a snapshot of the ThemeReportDto. By the time the user applies a
// change the live theme/signals may have changed underneath them. This
// module computes a stable fingerprint of the report and compares two
// reports for equivalence.
//
// PURE: no VS Code API, no I/O. Reused by candidateSaveSession.ts so the
// staleness contract lives in ONE place.
// ============================================================

export function createReportStaleFingerprint(report: ThemeReportDto): string {
  return JSON.stringify({
    theme: {
      configuredName: report.theme.configuredName,
      activeKind: report.theme.activeKind,
      id: report.theme.id,
      label: report.theme.label,
      extensionId: report.theme.extensionId,
      definitionStatus: report.theme.definitionStatus
    },
    signals: report.signals,
    risks: report.risks
  });
}

export function isReportStale(
  viewerReport: ThemeReportDto,
  currentReport: ThemeReportDto
): boolean {
  return createReportStaleFingerprint(viewerReport) !== createReportStaleFingerprint(currentReport);
}
