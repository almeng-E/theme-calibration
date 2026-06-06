import * as vscode from "vscode";
import * as crypto from "crypto";
import { CANDIDATE_ROLLBACK_STATE_KEY, COMMAND_IDS, OUTPUT_CHANNEL_NAME, ROLLBACK_STATE_KEY } from "./constants";
import { createIntentSolutionNotification } from "./ui/notificationFormatter";
import { createEditorViewerModel } from "./ui/diagnosticViewModel";
import { renderEditorViewerHtml } from "./ui/diagnosticViewHtml";
import { createPatchCandidates, createPatchRecipeFromCandidates } from "./diagnose/diagnosticEngine";
import { createPreviewModel, renderPreviewHtml } from "./ui/previewHtml";
import {
  buildPatchPlan,
  buildRollbackPlan,
  wrapRecipeForTheme,
  createCandidatePatchApplyPlan
} from "./patch/patchService";
import {
  collectThemeSnapshot,
  readCurrentPatchableSettings,
  writeSettingsToVscode
} from "./adapter/vscodeConfigAdapter";
import { createThemeSignalReport } from "./diagnose/diagnosticService";
import { getErrorMessage } from "./utils/objectUtils";
import type { PatchCandidate, RollbackSnapshot } from "./types/patch.types";

// ============================================================
// Extension Lifecycle
// ============================================================

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  context.subscriptions.push(
    output,
    registerCommand(output, COMMAND_IDS.printThemeProbe, "Theme probe", handlePrintProbe),
    registerCommand(output, COMMAND_IDS.printThemeSignalReport, "Theme signal report", handlePrintSignalReport),
    registerCommand(output, COMMAND_IDS.printPatchCandidates, "Patch candidate generation", handlePrintPatchCandidates),
    registerCommand(output, COMMAND_IDS.openCandidatePreview, "Candidate preview", handleOpenCandidatePreview),
    registerCommand(output, COMMAND_IDS.openEditorViewer, "Editor viewer", handleOpenEditorViewer),
    registerCommand(output, COMMAND_IDS.applyCandidatePatch, "Candidate patch apply", (out) => handleApplyCandidatePatch(out, context)),
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

async function handlePrintPatchCandidates(output: vscode.OutputChannel): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report);
  const recipe = createPatchRecipeFromCandidates(candidates, report.theme.configuredName);

  output.appendLine(JSON.stringify({ theme: report.theme, candidates, recipe }, null, 2));
  console.log("[Color Calibration] Patch candidates", { report, candidates, recipe });
  vscode.window.showInformationMessage(
    `Patch candidates printed: ${report.theme.configuredName || "unknown"}, candidates ${candidates.length}.`
  );
}



async function handleOpenCandidatePreview(output: vscode.OutputChannel): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report);

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

async function handleOpenEditorViewer(output: vscode.OutputChannel): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const viewerModel = createEditorViewerModel(report);
  const nonce = crypto.randomBytes(16).toString("hex");

  openEditorViewerPanel(
    "colorCalibrationEditorViewer",
    "Color Calibration Editor Viewer",
    renderEditorViewerHtml(viewerModel, nonce),
    output,
    report
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



async function handleApplyCandidatePatch(output: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<void> {
  const target = vscode.ConfigurationTarget.Global;
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report);

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
    selectedCandidateIds: selectedItems.map((item) => item.candidate.id),
    existingSettings
  });

  await writeSettingsToVscode(vscode, applyPlan.patchPlan.settingsUpdates, target);
  await context.globalState.update(CANDIDATE_ROLLBACK_STATE_KEY, applyPlan.patchPlan.rollbackSnapshot);

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
  report: ReturnType<typeof createThemeSignalReport>
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

  panel.webview.onDidReceiveMessage((message) => {
    if (message?.type !== "regionClick") {
      return;
    }

    try {
      const intent = message.intent;
      const solution = { status: "candidates", candidates: [], intent };
      const notification = createIntentSolutionNotification(solution);

      void panel.webview.postMessage({
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
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      output.appendLine(`[Region Click] invalid intent: ${errorMessage}`);
      vscode.window.showWarningMessage(`Invalid editor viewer click payload: ${errorMessage}`);
    }
  });
}
