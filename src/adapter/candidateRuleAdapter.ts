import { TextDecoder } from "node:util";
import { parseCandidateRuleBundle } from "../parser/candidateRuleParser";
import type { CandidateRuleDto } from "../types/rule.types";

interface VscodeCandidateRuleUriApi {
  Uri: {
    joinPath(base: unknown, ...pathSegments: string[]): unknown;
  };
}

interface VscodeCandidateRuleFileApi {
  workspace: {
    fs: {
      readFile(uri: unknown): PromiseLike<Uint8Array>;
    };
  };
}

export function createDefaultCandidateRuleUri(
  vscodeLike: VscodeCandidateRuleUriApi,
  extensionUri: unknown
): unknown {
  return vscodeLike.Uri.joinPath(extensionUri, "resources", "rules", "default-candidate-rules.json");
}

export async function loadCandidateRulesFromUri(
  vscodeLike: VscodeCandidateRuleFileApi,
  uri: unknown
): Promise<CandidateRuleDto[]> {
  const bytes = await vscodeLike.workspace.fs.readFile(uri);
  const raw = JSON.parse(new TextDecoder("utf-8").decode(bytes));
  const result = parseCandidateRuleBundle(raw);

  if (result.status === "invalid") {
    throw new Error(`Invalid candidate rule bundle: ${result.errors.join("; ")}`);
  }

  return result.rules;
}
