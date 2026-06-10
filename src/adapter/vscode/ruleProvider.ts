import type { CandidateRuleDto } from "../../types/rule.types";

export type CandidateRulesLoader = () => Promise<CandidateRuleDto[]>;

export function createCandidateRulesProvider(loadRules: CandidateRulesLoader): CandidateRulesLoader {
  let candidateRulesPromise: Promise<CandidateRuleDto[]> | undefined;

  return () => {
    if (!candidateRulesPromise) {
      candidateRulesPromise = loadRules().catch((error) => {
        candidateRulesPromise = undefined;
        throw error;
      });
    }

    return candidateRulesPromise;
  };
}
