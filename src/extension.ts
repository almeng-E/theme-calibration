import * as vscode from "vscode";
import * as crypto from "crypto";
import { normalizeReportSignals } from "./ui/themeColorDefaults";
import { CANDIDATE_ROLLBACK_STATE_KEY, COMMAND_IDS, OUTPUT_CHANNEL_NAME } from "./constants";
import { createIntentSolutionNotification } from "./ui/notificationFormatter";
import { createEditorViewerModel } from "./ui/editorViewModel";
import { renderEditorViewerHtml } from "./ui/editorViewHtml";
import { renderAfterLayerHtml } from "./ui/afterLayer";
import { CandidateSaveSession } from "./patch/candidateSaveSession";
import { createPatchCandidates } from "./diagnose/diagnosticEngine";
import { createIntentSolution } from "./diagnose/intentSolution";
import { overlayCandidateColors } from "./ui/themeColorOverlay";
import {
  buildRollbackPlan,
  serializeCandidatePatch
} from "./adapter/vscode/settingsSerializer";
import {
  collectThemeSnapshot,
  readCurrentPatchableSettings,
  writeSettingsToVscode
} from "./adapter/vscode/io";
import { createCandidateRulesProvider } from "./adapter/vscode/ruleProvider";
import {
  createDefaultCandidateRuleUri,
  loadCandidateRulesFromUri
} from "./adapter/vscode/ruleAdapter";
import { createThemeSignalReport } from "./adapter/vscode/themeColorMapper";
import { getErrorMessage } from "./utils/objectUtils";
import { applyPatchPlanWithRollback } from "./adapter/vscode/patchApply";
import type { CandidateDto } from "./types/patch.types";
import type { VscodeRollbackSnapshot } from "./adapter/vscode/types";
import type { CandidateRuleDto } from "./types/rule.types";
import type { IntentSolutionDto } from "./types/editorViewer.types";

// ============================================================
// Extension Lifecycle
// ============================================================

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const defaultCandidateRulesUri = createDefaultCandidateRuleUri(vscode, context.extensionUri);
  const getCandidateRules = createCandidateRulesProvider(() =>
    loadCandidateRulesFromUri(vscode, defaultCandidateRulesUri)
  );

  context.subscriptions.push(
    output,
    registerCommand(output, COMMAND_IDS.openEditorViewer, "Editor viewer", (out) =>
      handleOpenEditorViewer(out, context, getCandidateRules)
    ),
    registerCommand(output, COMMAND_IDS.rollbackCandidatePatch, "Candidate patch rollback", (out) => handleRollbackCandidatePatch(out, context))
  );
}

export function deactivate(): void {}

// ============================================================
// Command Registration (보일러플레이트 제거용 공통 래퍼)
// ============================================================

function registerCommand(
  output: vscode.OutputChannel,
  commandId: string,
  label: string,
  handler: (output: vscode.OutputChannel) => Promise<void>
): vscode.Disposable {
  return vscode.commands.registerCommand(commandId, async () => {
    output.show(true);
    output.appendLine(`[${new Date().toISOString()}] ${label} started.`);

    try {
      await handler(output);
    } catch (error) {
      const message = getErrorMessage(error);
      output.appendLine(`${label} failed: ${message}`);
      console.error(`[Color Calibration] ${label} failed`, error);
      vscode.window.showErrorMessage(`${label} failed: ${message}`);
    }
  });
}

// ============================================================
// Command Handlers
// ============================================================

type CandidateRulesProvider = () => Promise<CandidateRuleDto[]>;

async function handleOpenEditorViewer(
  output: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  getCandidateRules: CandidateRulesProvider
): Promise<void> {
  const candidateRules = await getCandidateRules();
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);

  // Phase 4: Initial Full Diagnosis for B layer
  const initialCandidates = createPatchCandidates(report, candidateRules);
  const baseSignals = normalizeReportSignals(report.signals);
  const afterSignalsMap = overlayCandidateColors(baseSignals, initialCandidates);

  const viewerModel = createEditorViewerModel(report, afterSignalsMap, initialCandidates);
  const nonce = crypto.randomBytes(16).toString("hex");

  openEditorViewerPanel(
    "colorCalibrationEditorViewer",
    "Color Calibration Editor Viewer",
    renderEditorViewerHtml(viewerModel, nonce),
    output,
    context,
    report,
    candidateRules,
    initialCandidates
  );

  output.appendLine(JSON.stringify({
    themeName: viewerModel.themeName,
    samples: viewerModel.samples.length,
    regions: viewerModel.samples.reduce(
      (count, sample) => count + sample.lines.reduce((lineCount, line) => lineCount + line.regions.length, 0),
      0
    )
  }, null, 2));
  console.log("[Color Calibration] Editor viewer", viewerModel);
  vscode.window.showInformationMessage(`Editor viewer opened for ${viewerModel.themeName}.`);
}



async function handleRollbackCandidatePatch(output: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<void> {
  const rollbackSnapshot = context.globalState.get<VscodeRollbackSnapshot>(CANDIDATE_ROLLBACK_STATE_KEY);

  if (!rollbackSnapshot) {
    output.appendLine("No candidate rollback snapshot found.");
    vscode.window.showWarningMessage("No candidate patch rollback snapshot found.");
    return;
  }

  output.appendLine("Restoring candidate patch settings...");
  const rollbackPlan = buildRollbackPlan(rollbackSnapshot);

  await writeSettingsToVscode(vscode, rollbackPlan.settingsUpdates, vscode.ConfigurationTarget.Global);
  await context.globalState.update(CANDIDATE_ROLLBACK_STATE_KEY, undefined);

  output.appendLine(JSON.stringify({
    restoredRecipe: rollbackPlan.recipeId,
    restoredFrom: rollbackPlan.createdAt,
    settingsUpdates: rollbackPlan.settingsUpdates,
    rollbackStateKey: CANDIDATE_ROLLBACK_STATE_KEY
  }, null, 2));
  console.log("[Color Calibration] Candidate patch rolled back", rollbackPlan);
  vscode.window.showInformationMessage(`Candidate theme patch rolled back for ${rollbackPlan.recipeId}.`);
}

// ============================================================
// UI Helpers
// ============================================================

function openEditorViewerPanel(
  viewType: string,
  title: string,
  html: string,
  output: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  report: ReturnType<typeof createThemeSignalReport>,
  candidateRules: CandidateRuleDto[],
  initialCandidates: CandidateDto[]
): void {
  const panel = vscode.window.createWebviewPanel(
    viewType,
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = html;
  const target = vscode.ConfigurationTarget.Global;

  // 배치/지연 저장 세션. Accept/Reject는 이 세션에 스테이징만 하고,
  // 명시적 Save 클릭 시점에만 일괄 적용됩니다 (단일 롤백 스냅샷).
  const session = new CandidateSaveSession({
    report,
    candidates: initialCandidates
  });
  // 초기 추천 후보는 기본적으로 accepted 상태입니다 (인라인 JS 시딩과 동일한 가정).
  for (const candidate of initialCandidates) {
    session.accept(candidate.id);
  }

  // 스테이징 변경 후 라이브 B-레이어 프리뷰를 다시 그려 웹뷰로 전송합니다 (WIRING ONLY).
  async function postAfterLayerPreview(): Promise<void> {
    const html = renderAfterLayerHtml(report, session.getAcceptedCandidates());
    await panel.webview.postMessage({ type: "updateAfterHtml", html });
  }

  panel.webview.onDidReceiveMessage(async (message) => {
    try {
      if (message?.type === "regionClick") {
        const intent = message.intent;
        const solution = createIntentSolution(report, intent, candidateRules);
        // 새로 노출된 후보를 세션에 등록해 Accept/Reject 대상이 되도록 합니다.
        session.registerCandidates(solution.candidates);
        const notification = createIntentSolutionNotification(solution);

        await panel.webview.postMessage({
          type: "solutionResult",
          solution
        });

        output.appendLine(`[Region Click] ${JSON.stringify({ intent, solution }, null, 2)}`);
        console.log("[Color Calibration] Region click solution", solution);

        if (notification.level === "info") {
          vscode.window.showInformationMessage(notification.message);
        } else {
          vscode.window.showWarningMessage(notification.message);
        }
        return;
      }

      if (message?.type === "applyCandidatePatch") {
        const candidateId = typeof message.candidateId === "string" ? message.candidateId : "";
        if (!candidateId) return;

        // STAGE ONLY: 설정 저장 없음. 알 수 없는 id는 방어적으로 무시합니다.
        try {
          session.accept(candidateId);
        } catch {
          return;
        }
        await postAfterLayerPreview();
        return;
      }

      if (message?.type === "rejectCandidatePatch") {
        const candidateId = typeof message.candidateId === "string" ? message.candidateId : "";
        if (!candidateId) return;

        try {
          session.reject(candidateId);
        } catch {
          return;
        }
        await postAfterLayerPreview();
        return;
      }

      if (message?.type === "setCandidateColor") {
        const candidateId = typeof message.candidateId === "string" ? message.candidateId : "";
        const color = typeof message.color === "string" ? message.color : "";
        if (!candidateId || !color) return;

        // STAGE ONLY: setColorOverride auto-accepts + records the override.
        // NO settings write. Unknown id / invalid hex are ignored defensively
        // (the model throws; we swallow like the accept/reject guards).
        try {
          session.setColorOverride(candidateId, color);
        } catch {
          return;
        }
        // postAfterLayerPreview uses getAcceptedCandidates() (override-applied),
        // so the live B-layer reflects the new color immediately.
        await postAfterLayerPreview();
        return;
      }

      if (message?.type === "saveCandidates") {
        // FRESH 설정/리포트를 읽어 일괄 적용 계획을 계산합니다 (WIRING ONLY).
        const freshSettings = readCurrentPatchableSettings(vscode, target);
        const currentProbe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
        const currentReport = createThemeSignalReport(currentProbe);

        const plan = session.computeApplyPlan({ currentReport });

        if (plan.status === "staleReport") {
          await panel.webview.postMessage({ type: "saveResult", ok: false, reason: "stale" });
          vscode.window.showWarningMessage("Theme changed since the viewer opened. Reopen the viewer before saving.");
          return;
        }

        if (plan.status === "noStagedCandidates") {
          await panel.webview.postMessage({ type: "saveResult", ok: false, reason: "empty" });
          vscode.window.showInformationMessage("No accepted changes to save.");
          return;
        }

        // port→core→port: 코어가 산출한 DTO를 어댑터가 VS Code 패치 플랜으로 직렬화.
        const patchPlan = serializeCandidatePatch(
          plan.selectedCandidates,
          plan.themeName,
          freshSettings,
          new Date()
        );

        // CRITICAL (no silent success): 실제 쓰기가 성공한 뒤에만 ok:true를 보냅니다.
        try {
          await applyPatchPlanWithRollback({
            patchPlan,
            saveRollback: (snapshot) => context.globalState.update(CANDIDATE_ROLLBACK_STATE_KEY, snapshot),
            writeSettings: (updates) => writeSettingsToVscode(vscode, updates, target)
          });
        } catch (saveError) {
          const saveMessage = getErrorMessage(saveError);
          await panel.webview.postMessage({ type: "saveResult", ok: false, reason: "error", message: saveMessage });
          vscode.window.showErrorMessage(`Save failed: ${saveMessage}`);
          return;
        }

        const count = plan.selectedCandidates.length;
        await panel.webview.postMessage({ type: "saveResult", ok: true, count });
        console.log("[Color Calibration] Candidate batch saved from webview", plan);
        vscode.window.showInformationMessage(`Saved ${count} candidate patch(es).`);
        return;
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      output.appendLine(`[Editor Viewer Message] invalid payload: ${errorMessage}`);
      vscode.window.showWarningMessage(`Invalid editor viewer payload: ${errorMessage}`);
    }
  });
}
