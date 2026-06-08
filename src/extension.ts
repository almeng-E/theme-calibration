import * as vscode from "vscode";
import * as crypto from "crypto";
import { normalizeReportSignals } from "./adapter/vscodeDefaults";
import type { ColorHexMap } from "./types/signal.types";
import { CANDIDATE_ROLLBACK_STATE_KEY, COMMAND_IDS, OUTPUT_CHANNEL_NAME } from "./constants";
import { createIntentSolutionNotification } from "./ui/notificationFormatter";
import { createEditorViewerModel } from "./ui/editorViewModel";
import { renderEditorViewerHtml } from "./ui/editorViewHtml";
import { renderSamplesHtml } from "./ui/components/sliderArea";
import { createPatchCandidates, createPatchRecipeFromCandidates } from "./diagnose/diagnosticEngine";
import { createIntentSolution } from "./diagnose/intentSolution";
import { createPreviewModel, renderPreviewHtml, extractPatchSignals } from "./ui/previewHtml";
import {
  buildPatchPlan,
  buildRollbackPlan,
  wrapRecipeForTheme,
  createCandidatePatchApplyPlan
} from "./patch/patchService";
import { createEditorViewerCandidateApplyPlan } from "./patch/editorViewerApplyService";
import {
  collectThemeSnapshot,
  readCurrentPatchableSettings,
  writeSettingsToVscode
} from "./adapter/vscodeConfigAdapter";
import { createCandidateRulesProvider } from "./adapter/candidateRuleProvider";
import {
  createDefaultCandidateRuleUri,
  loadCandidateRulesFromUri
} from "./adapter/candidateRuleAdapter";
import { createThemeSignalReport } from "./diagnose/diagnosticService";
import { getErrorMessage } from "./utils/objectUtils";
import { applyPatchPlanWithRollback } from "./patch/patchApplicationService";
import type { PatchCandidate, RollbackSnapshot } from "./types/patch.types";
import type { CandidateMappingRule } from "./types/rule.types";
import type { IntentSolution } from "./types/editorViewer.types";

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
    registerCommand(output, COMMAND_IDS.printThemeProbe, "Theme probe", handlePrintProbe),
    registerCommand(output, COMMAND_IDS.printThemeSignalReport, "Theme signal report", handlePrintSignalReport),
    registerCommand(output, COMMAND_IDS.printPatchCandidates, "Patch candidate generation", (out) =>
      handlePrintPatchCandidates(out, getCandidateRules)
    ),
    registerCommand(output, COMMAND_IDS.openCandidatePreview, "Candidate preview", (out) =>
      handleOpenCandidatePreview(out, getCandidateRules)
    ),
    registerCommand(output, COMMAND_IDS.openEditorViewer, "Editor viewer", (out) =>
      handleOpenEditorViewer(out, context, getCandidateRules)
    ),
    registerCommand(output, COMMAND_IDS.applyCandidatePatch, "Candidate patch apply", (out) =>
      handleApplyCandidatePatch(out, context, getCandidateRules)
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

type CandidateRulesProvider = () => Promise<CandidateMappingRule[]>;

async function handlePrintProbe(output: vscode.OutputChannel): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });

  output.appendLine(JSON.stringify(probe, null, 2));
  console.log("[Color Calibration] Theme probe", probe);
  vscode.window.showInformationMessage(
    `Theme probe printed: current theme "${probe.currentTheme.configuredName || "unknown"}", installed themes ${probe.installedThemes.length}.`
  );
}

async function handlePrintSignalReport(output: vscode.OutputChannel): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);

  output.appendLine(JSON.stringify(report, null, 2));
  console.log("[Color Calibration] Theme signal report", report);
  vscode.window.showInformationMessage(
    `Theme signal report printed: ${report.theme.configuredName || "unknown"}, risks ${report.risks.length}.`
  );
}

async function handlePrintPatchCandidates(
  output: vscode.OutputChannel,
  getCandidateRules: CandidateRulesProvider
): Promise<void> {
  const candidateRules = await getCandidateRules();
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report, candidateRules);
  const recipe = createPatchRecipeFromCandidates(candidates, report.theme.configuredName);

  output.appendLine(JSON.stringify({ theme: report.theme, candidates, recipe }, null, 2));
  console.log("[Color Calibration] Patch candidates", { report, candidates, recipe });
  vscode.window.showInformationMessage(
    `Patch candidates printed: ${report.theme.configuredName || "unknown"}, candidates ${candidates.length}.`
  );
}



async function handleOpenCandidatePreview(
  output: vscode.OutputChannel,
  getCandidateRules: CandidateRulesProvider
): Promise<void> {
  const candidateRules = await getCandidateRules();
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report, candidateRules);

  if (candidates.length === 0) {
    output.appendLine("Candidate preview skipped: no-candidates.");
    vscode.window.showWarningMessage("No patch candidates were generated for the current theme.");
    return;
  }

  const selectedItem = await vscode.window.showQuickPick(
    candidates.map(toCandidateQuickPickItem),
    {
      canPickMany: false,
      title: "Color Calibration: Open Candidate Preview",
      placeHolder: "Select one candidate to preview."
    }
  );

  if (!selectedItem) {
    output.appendLine("Candidate preview cancelled.");
    return;
  }

  const patchRecipe = createPatchRecipeFromCandidates([selectedItem.candidate], report.theme.configuredName);
  const previewModel = createPreviewModel(report, patchRecipe, {
    candidates,
    selectedCandidateId: selectedItem.candidate.id
  });

  openPreviewPanel("colorCalibrationCandidatePreview", "Color Calibration Candidate Preview", previewModel);

  output.appendLine(JSON.stringify({
    themeName: previewModel.themeName,
    selectedCandidateId: selectedItem.candidate.id,
    candidateCount: candidates.length,
    after: previewModel.after.signals
  }, null, 2));
  console.log("[Color Calibration] Candidate preview", previewModel);
  vscode.window.showInformationMessage(
    `Candidate preview opened for ${previewModel.themeName}: ${selectedItem.candidate.settingKey}.`
  );
}

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
  const patchRecipe = createPatchRecipeFromCandidates(initialCandidates, report.theme.configuredName);
  
  const baseSignals = normalizeReportSignals(report.signals);
  const afterSignalsMap = {
    ...baseSignals,
    ...extractPatchSignals(patchRecipe)
  } as ColorHexMap;

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



async function handleApplyCandidatePatch(
  output: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  getCandidateRules: CandidateRulesProvider
): Promise<void> {
  const candidateRules = await getCandidateRules();
  const target = vscode.ConfigurationTarget.Global;
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report, candidateRules);

  if (candidates.length === 0) {
    output.appendLine("Candidate patch apply skipped: no-candidates.");
    vscode.window.showWarningMessage("No patch candidates were generated for the current theme.");
    return;
  }

  const selectedItems = await vscode.window.showQuickPick(
    candidates.map(toCandidateQuickPickItem),
    {
      canPickMany: true,
      title: "Color Calibration: Apply Candidate Patch",
      placeHolder: "Select one or more candidates to apply to the current theme."
    }
  );

  if (!selectedItems || selectedItems.length === 0) {
    output.appendLine("Candidate patch apply cancelled.");
    return;
  }

  const existingSettings = readCurrentPatchableSettings(vscode, target);
  const applyPlan = createCandidatePatchApplyPlan({
    report,
    candidates,
    selectedCandidateIds: selectedItems.map((item) => item.candidate.id),
    existingSettings
  });

  await applyPatchPlanWithRollback({
    patchPlan: applyPlan.patchPlan,
    saveRollback: (snapshot) => context.globalState.update(CANDIDATE_ROLLBACK_STATE_KEY, snapshot),
    writeSettings: (updates) => writeSettingsToVscode(vscode, updates, target)
  });

  output.appendLine(JSON.stringify({
    themeName: report.theme.configuredName,
    selectedCandidateIds: applyPlan.selectedCandidates.map((candidate) => candidate.id),
    settingsUpdates: applyPlan.patchPlan.settingsUpdates,
    rollbackStateKey: CANDIDATE_ROLLBACK_STATE_KEY
  }, null, 2));
  console.log("[Color Calibration] Candidate patch applied", applyPlan);
  vscode.window.showInformationMessage(`Applied ${applyPlan.selectedCandidates.length} candidate patch(es).`);
}



async function handleRollbackCandidatePatch(output: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<void> {
  const rollbackSnapshot = context.globalState.get<RollbackSnapshot>(CANDIDATE_ROLLBACK_STATE_KEY);

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

interface CandidateQuickPickItem extends vscode.QuickPickItem {
  candidate: PatchCandidate;
}

function toCandidateQuickPickItem(candidate: PatchCandidate): CandidateQuickPickItem {
  return {
    label: candidate.settingKey,
    description: `${candidate.scope} | ${candidate.riskType} | confidence ${candidate.confidence.toFixed(2)}`,
    detail: candidate.reason,
    candidate
  };
}

function openPreviewPanel(
  viewType: string,
  title: string,
  previewModel: ReturnType<typeof createPreviewModel>
): void {
  openHtmlPanel(viewType, title, renderPreviewHtml(previewModel));
}

function openHtmlPanel(viewType: string, title: string, html: string): void {
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
}

function openEditorViewerPanel(
  viewType: string,
  title: string,
  html: string,
  output: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  report: ReturnType<typeof createThemeSignalReport>,
  candidateRules: CandidateMappingRule[],
  initialCandidates: PatchCandidate[]
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
  let latestSolution: ReturnType<typeof createIntentSolution> | undefined;
  // 초기에는 추천된 모든 후보가 B레이어에 적용되어 있다고 가정합니다.
  const activeCandidates: PatchCandidate[] = [...initialCandidates];
  const baseSignals = normalizeReportSignals(report.signals);

  panel.webview.onDidReceiveMessage(async (message) => {
    try {
      if (message?.type === "regionClick") {
        const intent = message.intent;
        const solution = createIntentSolution(report, intent, candidateRules);
        latestSolution = solution;
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

        let candidate = activeCandidates.find((c) => c.id === candidateId);
        let isNewToActive = false;

        if (!candidate) {
          candidate = initialCandidates.find((c) => c.id === candidateId);
          
          if (!candidate && latestSolution) {
            const candidates = Array.isArray(latestSolution.candidates) ? latestSolution.candidates : [];
            candidate = candidates.find((c) => c.id === candidateId);
          }

          if (candidate) {
            activeCandidates.push(candidate);
            isNewToActive = true;
          }
        }

        if (isNewToActive) {
          // Recalculate afterSignals based on accumulated candidates
          const afterSignals = { ...baseSignals };
          for (const c of activeCandidates) {
            for (const sig of c.signals) {
              afterSignals[sig] = c.suggestedColor;
            }
          }

          // Create a new model just to extract the afterSamples
          const newModel = createEditorViewerModel(report, afterSignals);
          const newLayerBHtml = renderSamplesHtml(newModel.afterSamples || []);

          // Send updated B layer HTML to Webview
          await panel.webview.postMessage({
            type: "updateAfterHtml",
            html: newLayerBHtml
          });
        }

        const target = vscode.ConfigurationTarget.Global;
        if (!candidate) return; // 찾지 못한 경우 안전하게 종료

        const currentProbe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
        const currentReport = createThemeSignalReport(currentProbe);

        // candidate가 반드시 존재하므로 직접 전달합니다.
        const applyResult = createEditorViewerCandidateApplyPlan({
          report,
          currentReport,
          candidate: candidate, // 찾은 candidate를 직접 주입
          existingSettings: readCurrentPatchableSettings(vscode, target)
        });

        if (applyResult.status === "staleReport") {
          return; 
        }

        await applyPatchPlanWithRollback({
          patchPlan: applyResult.patchPlan,
          saveRollback: (snapshot) => context.globalState.update(CANDIDATE_ROLLBACK_STATE_KEY, snapshot),
          writeSettings: (updates) => writeSettingsToVscode(vscode, updates, target)
        });

        console.log("[Color Calibration] Candidate patch applied from webview", applyResult);
        vscode.window.showInformationMessage("Applied 1 candidate patch(es).");
      }

      if (message?.type === "rejectCandidatePatch") {
        const candidateId = typeof message.candidateId === "string" ? message.candidateId : "";
        if (!candidateId) return;

        const idx = activeCandidates.findIndex((c) => c.id === candidateId);
        if (idx !== -1) {
          activeCandidates.splice(idx, 1);

          // Recalculate afterSignals based on remaining candidates
          const afterSignals = { ...baseSignals };
          for (const c of activeCandidates) {
            for (const sig of c.signals) {
              afterSignals[sig] = c.suggestedColor;
            }
          }

          // Update B layer HTML
          const newModel = createEditorViewerModel(report, afterSignals);
          const newLayerBHtml = renderSamplesHtml(newModel.afterSamples || []);

          await panel.webview.postMessage({
            type: "updateAfterHtml",
            html: newLayerBHtml
          });
        }
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      output.appendLine(`[Editor Viewer Message] invalid payload: ${errorMessage}`);
      vscode.window.showWarningMessage(`Invalid editor viewer payload: ${errorMessage}`);
    }
  });
}
