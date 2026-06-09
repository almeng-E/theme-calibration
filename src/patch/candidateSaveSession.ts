import { createCandidatePatchApplyPlan } from "./patchService";
import type { CandidatePatchApplyPlan } from "./patchService";
import { isReportStale } from "./reportStaleness";
import { parseHexColor } from "../utils/colorUtils";
import type { ConfigurationSnapshot, CandidateDto } from "../types/patch.types";
import type { ThemeReportDto } from "../types/signal.types";

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
  report: ThemeReportDto;
  candidates: readonly CandidateDto[];
  existingSettings: ConfigurationSnapshot;
}

export interface ComputeApplyPlanInput {
  /**
   * The live report at save time. If supplied AND the captured viewer
   * report is stale relative to it, the plan is refused with "staleReport".
   * Omit to skip the staleness guard (e.g. unit/preview contexts).
   */
  currentReport?: ThemeReportDto;
  /**
   * Fresh existing settings read at save time. When provided, the batch plan
   * is computed against this snapshot instead of the one captured by the
   * constructor (the live settings may have drifted since the viewer opened).
   * Omit to fall back to the constructor's existingSettings.
   */
  existingSettings?: ConfigurationSnapshot;
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
  private readonly report: ThemeReportDto;
  // Mutable: registerCandidates may append dynamically-surfaced candidates.
  // Insertion order is preserved (existing first, then registered).
  private candidates: CandidateDto[];
  private readonly existingSettings: ConfigurationSnapshot;
  private readonly candidateIds: Set<string>;

  // Staged decisions. Absence = "pending". Order preserved for stable plans.
  private readonly statuses = new Map<string, Exclude<CandidateStageStatus, "pending">>();

  // Phase 4 — per-candidate color overrides (candidateId -> hex).
  // An override replaces a candidate's suggestedColor in the EFFECTIVE view
  // (preview + save). It is stored independently of staging: a reject leaves
  // the override DORMANT (the candidate is simply not accepted), and a later
  // accept re-applies it. The original candidate objects are never mutated.
  private readonly colorOverrides = new Map<string, string>();

  constructor(input: CandidateSaveSessionInput) {
    this.report = input.report;
    this.candidates = [...input.candidates];
    this.existingSettings = input.existingSettings;
    this.candidateIds = new Set(this.candidates.map((candidate) => candidate.id));
  }

  /**
   * Merge dynamically-surfaced candidates into the known set. Dedup by id:
   * if an id already exists, the EXISTING candidate object is kept (the
   * initial/engine version is authoritative) and the duplicate is ignored.
   * New ids are appended in the given order (existing first, then registered).
   * Idempotent; never alters already-staged decisions. PURE: no I/O.
   */
  registerCandidates(candidates: readonly CandidateDto[]): void {
    for (const candidate of candidates) {
      if (this.candidateIds.has(candidate.id)) {
        continue;
      }
      this.candidateIds.add(candidate.id);
      this.candidates.push(candidate);
    }
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

  /**
   * Phase 4: set a per-candidate color override and AUTO-ACCEPT the candidate.
   *
   * Providing a custom color is treated as opting in, so this stages the
   * candidate as "accepted" (the confirmed UX rule). A later reject(id) still
   * lets the user opt out — the override stays stored but DORMANT while
   * rejected, and is re-applied automatically if the candidate is accepted
   * again. The override replaces suggestedColor in the EFFECTIVE candidate
   * view used by BOTH getAcceptedCandidates and computeApplyPlan.
   *
   * Validates the id (throws on unknown, like accept/reject) and the hex
   * (delegates to the pure parseHexColor validator, which throws on invalid).
   */
  setColorOverride(candidateId: string, hex: string): void {
    this.assertKnownCandidate(candidateId, "setColorOverride");
    // Throws "Unsupported hex color: ..." on invalid input.
    parseHexColor(hex);
    this.colorOverrides.set(candidateId, hex);
    // AUTO-ACCEPT: a custom color = opting in.
    this.statuses.set(candidateId, "accepted");
  }

  /** The stored color override for a candidate, or undefined if none. */
  getColorOverride(candidateId: string): string | undefined {
    return this.colorOverrides.get(candidateId);
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
   * PURE: the accepted candidate OBJECTS, in the original candidate ordering.
   * Used by the host to recompute the live B-layer preview without reaching
   * into private staging. Never mutates state.
   */
  getAcceptedCandidates(): CandidateDto[] {
    return this.candidates
      .filter((candidate) => this.statuses.get(candidate.id) === "accepted")
      .map((candidate) => this.toEffectiveCandidate(candidate));
  }

  /**
   * PURE: apply a stored color override (if any) to a candidate, returning a
   * NEW object with suggestedColor replaced. Never mutates the original.
   * This is the SINGLE overlay point reused by getAcceptedCandidates and
   * computeApplyPlan so the preview and the saved patch always agree.
   */
  private toEffectiveCandidate(candidate: CandidateDto): CandidateDto {
    const override = this.colorOverrides.get(candidate.id);
    if (override === undefined) {
      return candidate;
    }
    return { ...candidate, suggestedColor: override };
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
      // EFFECTIVE candidates: color overrides applied via the single overlay,
      // so the saved patch matches the live preview exactly.
      candidates: this.candidates.map((candidate) => this.toEffectiveCandidate(candidate)),
      selectedCandidateIds: acceptedIds,
      existingSettings: input.existingSettings ?? this.existingSettings,
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
