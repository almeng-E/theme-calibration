import type { ColorHexMap, VisibilityRisk } from "./signal.types";
import type { PatchCandidate } from "./patch.types";

export interface PreviewPane {
  title: string;
  signals: ColorHexMap;
}

export interface PreviewModel {
  themeName: string;
  before: PreviewPane;
  after: PreviewPane;
  risks: VisibilityRisk[];
  candidates?: PatchCandidate[];
  selectedCandidateId?: string;
}
