import { createCandidatePatchApplyPlan } from "./patchService";
import type { CandidatePatchApplyPlan } from "./patchService";
import { isReportStale } from "./reportStaleness";
import type { ConfigurationSnapshot, PatchCandidate } from "../types/patch.types";
import type { ThemeAnalysisReport } from "../types/signal.types";

// ============================================================
// CandidateSaveSession (Phase 2 — batch / deferred-save CORE model)
//
// A stateful, in-memory session object. When the viewer is opened it
// captures a snapshot (report + candidates + existingSettings). The user
// stages Accept/Reject decisions per candidate; a later explicit "Save"
// computes ONE batch apply plan for all accepted candidates.
//
// STRICTLY PURE: no VS Code API, no I/O. It only mutates its own staging
// map and returns plain PLAN objects. The actual config update is done
// later by extension.ts (Phase 3), NOT here.
//
// Staging mutates internal state (accept/reject). computeApplyPlan is PURE
// w.r.t. that state: it never mutates staging, so it can be called
// repeatedly (preview then save) and yields equivalent results.
// ============================================================

/** Per-candidate staged decision. "pending" = no decision yet. */
export type CandidateStageStatus = "pending" | "accepted" | "rejected";

export interface CandidateSaveSessionInput {
  report: ThemeAnalysisReport;
  candidates: readonly PatchCandidate[];
  existingSettings: ConfigurationSnapshot;
}

export interface ComputeApplyPlanInput {
  /**
   * The live report at save time. If supplied AND the captured viewer
   * report is stale relative to it, the plan is refused with "staleReport".
   * Omit to skip the staleness guard (e.g. unit/preview contexts).
   */
  currentReport?: ThemeAnalysisReport;
  now?: Date;
}

/**
 * Result of computeApplyPlan. Three mutually-exclusive states:
 * - "staleReport": viewer snapshot no longer matches the live theme; refuse.
 * - "noStagedCandidates": nothing accepted (fresh / all rejected). This is a
 *   NORMAL UI state, NOT an error — empty staging never throws.
 * - "ready": at least one accepted candidate; batch plan computed with a
 *   single combined rollback snapshot.
 */
export type ComputeApplyPlanResult =
  | { status: "staleReport" }
  | { status: "noStagedCandidates" }
  | {
      status: "ready";
      patchPlan: CandidatePatchApplyPlan["patchPlan"];
      selectedCandidates: CandidatePatchApplyPlan["selectedCandidates"];
    };

export class CandidateSaveSession {
  private readonly report: ThemeAnalysisReport;
  private readonly candidates: readonly PatchCandidate[];
  private readonly existingSettings: ConfigurationSnapshot;
  private readonly candidateIds: ReadonlySet<string>;

  // Staged decisions. Absence = "pending". Order preserved for stable plans.
  private readonly statuses = new Map<string, Exclude<CandidateStageStatus, "pending">>();

  constructor(input: CandidateSaveSessionInput) {
    this.report = input.report;
    this.candidates = input.candidates;
    this.existingSettings = input.existingSettings;
    this.candidateIds = new Set(input.candidates.map((candidate) => candidate.id));
  }

  /** Stage a candidate as accepted. Idempotent; flips a prior reject. */
  accept(candidateId: string): void {
    this.assertKnownCandidate(candidateId, "accept");
    this.statuses.set(candidateId, "accepted");
  }

  /** Stage a candidate as rejected. Idempotent; flips a prior accept. */
  reject(candidateId: string): void {
    this.assertKnownCandidate(candidateId, "reject");
    this.statuses.set(candidateId, "rejected");
  }

  /** The staged status of a candidate ("pending" if no decision yet). */
  getStatus(candidateId: string): CandidateStageStatus {
    this.assertKnownCandidate(candidateId, "getStatus");
    return this.statuses.get(candidateId) ?? "pending";
  }

  /** Accepted candidate ids, in the original candidate ordering. */
  getAcceptedIds(): string[] {
    return this.candidates
      .map((candidate) => candidate.id)
      .filter((id) => this.statuses.get(id) === "accepted");
  }

  /**
   * PURE: compute the batch apply plan. Does NOT mutate staging state.
   * See ComputeApplyPlanResult for the status contract.
   */
  computeApplyPlan(input: ComputeApplyPlanInput = {}): ComputeApplyPlanResult {
    if (input.currentReport && isReportStale(this.report, input.currentReport)) {
      return { status: "staleReport" };
    }

    const acceptedIds = this.getAcceptedIds();
    if (acceptedIds.length === 0) {
      return { status: "noStagedCandidates" };
    }

    const applyPlan = createCandidatePatchApplyPlan({
      report: this.report,
      candidates: this.candidates,
      selectedCandidateIds: acceptedIds,
      existingSettings: this.existingSettings,
      now: input.now
    });

    return {
      status: "ready",
      patchPlan: applyPlan.patchPlan,
      selectedCandidates: applyPlan.selectedCandidates
    };
  }

  private assertKnownCandidate(candidateId: string, operation: string): void {
    if (!this.candidateIds.has(candidateId)) {
      throw new Error(
        `Cannot ${operation}: unknown candidate id "${candidateId}" — it does not belong to this session.`
      );
    }
  }
}
