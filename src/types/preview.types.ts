import type { ThemeColorHexMap, RiskDto } from "./signal.types";
import type { CandidateDto } from "./patch.types";

export interface PreviewPaneDto {
  title: string;
  signals: ThemeColorHexMap;
}

export interface PreviewModelDto {
  themeName: string;
  before: PreviewPaneDto;
  after: PreviewPaneDto;
  risks: RiskDto[];
  candidates?: CandidateDto[];
  selectedCandidateId?: string;
}
