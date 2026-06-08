import type { CandidateMappingRule } from "../types/rule.types";

export type CandidateRulesLoader = () => Promise<CandidateMappingRule[]>;

export function createCandidateRulesProvider(loadRules: CandidateRulesLoader): CandidateRulesLoader {
  let candidateRulesPromise: Promise<CandidateMappingRule[]> | undefined;

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
