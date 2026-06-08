import type { IntentSolution } from "../types/editorViewer.types";

export type IntentSolutionNotificationLevel = "info" | "warning";

export interface IntentSolutionNotification {
  level: IntentSolutionNotificationLevel;
  message: string;
}

export function createIntentSolutionNotification(solution: IntentSolution): IntentSolutionNotification {
  if (solution.status === "candidates") {
    return {
      level: "info",
      message: `Solution candidates: ${solution.candidates.length} for ${solution.intent.signal}.`
    };
  }

  if (solution.status === "noMatchingRisk") {
    return {
      level: "info",
      message: `No obvious visibility risk found for ${solution.intent.signal} in the current rules.`
    };
  }

  return {
    level: "warning",
    message: `Visibility risk found for ${solution.intent.signal}, but no conservative candidate is available yet.`
  };
}
