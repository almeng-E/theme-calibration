import type {
  ThemeColorsDto,
  ThemeReportDto
} from "../types/signal.types";
import { analyzeVisibility } from "../diagnose/visibilityRules";

// ============================================================
// Pure, editor-agnostic theme report assembly
// ============================================================

export interface ThemeReportInput {
  configuredName?: string;
  activeKind?: unknown;
  id?: string;
  label?: string;
  extensionId?: string;
  definitionStatus: string;
  colors?: ThemeColorsDto;
}

export function createThemeReport(input: ThemeReportInput): ThemeReportDto {
  const { configuredName, activeKind, id, label, extensionId, definitionStatus, colors } = input;

  if (!colors) {
    return {
      generatedAt: new Date().toISOString(),
      theme: {
        configuredName,
        activeKind,
        definitionStatus: "missing"
      },
      signals: {},
      contrast: {},
      risks: [
        {
          type: "missingThemeDefinition",
          message: "Current theme definition could not be loaded, so no signal report was generated."
        }
      ]
    };
  }

  const visibility = analyzeVisibility(colors);

  return {
    generatedAt: new Date().toISOString(),
    theme: {
      configuredName,
      activeKind,
      id,
      label,
      extensionId,
      definitionStatus
    },
    signals: colors,
    contrast: visibility.contrast,
    risks: visibility.risks
  };
}
