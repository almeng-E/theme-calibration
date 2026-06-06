import * as vscode from "vscode";
import * as crypto from "crypto";
import { COMMAND_IDS, OUTPUT_CHANNEL_NAME, ROLLBACK_STATE_KEY } from "./constants";
import { createIntentSolutionNotification } from "./adapter/intentSolutionNotification";
import { normalizeCalibrationIntentPayload } from "./core/calibrationIntent";
import { createEditorViewerModel } from "./core/editorViewerModel";
import { renderEditorViewerHtml } from "./core/editorViewerRenderer";
import { createIntentSolution } from "./core/intentSolution";
import { createPatchCandidates, createPatchRecipeFromCandidates } from "./core/patchGenerator";
import { createPreviewModel, renderPreviewHtml } from "./core/previewRenderer";
import {
  POC_PATCH_RECIPE,
  buildPatchPlan,
  buildRollbackPlan,
  wrapRecipeForTheme
} from "./core/patchEngine";
import {
  collectThemeSnapshot,
  readCurrentPatchableSettings,
  writeSettingsToVscode
} from "./adapter/vscode.adapter";
import { createThemeSignalReport } from "./core/themeAnalyzer";
import { getErrorMessage } from "./core/objectUtils";
import type { PatchCandidate, RollbackSnapshot } from "./core/types/patch.types";

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
    registerCommand(output, COMMAND_IDS.openBeforeAfterPreview, "Before/after preview", handleOpenBeforeAfterPreview),
    registerCommand(output, COMMAND_IDS.openCandidatePreview, "Candidate preview", handleOpenCandidatePreview),
    registerCommand(output, COMMAND_IDS.openEditorViewer, "Editor viewer", handleOpenEditorViewer),
    registerCommand(output, COMMAND_IDS.applyHardcodedPatch, "Hardcoded patch apply", (out) => handleApplyPatch(out, context)),
    registerCommand(output, COMMAND_IDS.rollbackHardcodedPatch, "Hardcoded patch rollback", (out) => handleRollbackPatch(out, context))
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

async function handleOpenBeforeAfterPreview(output: vscode.OutputChannel): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const previewModel = createPreviewModel(report, POC_PATCH_RECIPE);

  openPreviewPanel("colorCalibrationBeforeAfterPreview", "Color Calibration Preview", previewModel);

  output.appendLine(JSON.stringify({
    themeName: previewModel.themeName,
    risks: previewModel.risks.length,
    before: previewModel.before.signals,
    after: previewModel.after.signals
  }, null, 2));
  console.log("[Color Calibration] Before/after preview", previewModel);
  vscode.window.showInformationMessage(`Before/after preview opened for ${previewModel.themeName}.`);
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

async function handleApplyPatch(output: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<void> {
  const target = vscode.ConfigurationTarget.Global;
  const currentThemeName = vscode.workspace.getConfiguration("workbench").get<string | undefined>("colorTheme");
  const patchRecipe = wrapRecipeForTheme(currentThemeName, POC_PATCH_RECIPE);
  const existingSettings = readCurrentPatchableSettings(vscode, target);
  const patchPlan = buildPatchPlan(existingSettings, patchRecipe);

  output.appendLine("Applying settings updates...");
  await writeSettingsToVscode(vscode, patchPlan.settingsUpdates, target);
  await context.globalState.update(ROLLBACK_STATE_KEY, patchPlan.rollbackSnapshot);

  output.appendLine(JSON.stringify({
    appliedRecipe: patchPlan.recipeId,
    target: "Global",
    currentThemeName,
    rollbackStateKey: ROLLBACK_STATE_KEY,
    settingsUpdates: patchPlan.settingsUpdates,
    rollbackSnapshot: patchPlan.rollbackSnapshot
  }, null, 2));
  console.log("[Color Calibration] Hardcoded patch applied", patchPlan);
  vscode.window.showInformationMessage(
    `Hardcoded theme patch applied. Rollback snapshot saved for ${patchPlan.recipeId}.`
  );
}

async function handleRollbackPatch(output: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<void> {
  const rollbackSnapshot = context.globalState.get<RollbackSnapshot>(ROLLBACK_STATE_KEY);

  if (!rollbackSnapshot) {
    output.appendLine("No rollback snapshot found.");
    vscode.window.showWarningMessage("No hardcoded patch rollback snapshot found.");
    return;
  }

  output.appendLine("Restoring original settings...");
  const rollbackPlan = buildRollbackPlan(rollbackSnapshot);

  await writeSettingsToVscode(vscode, rollbackPlan.settingsUpdates, vscode.ConfigurationTarget.Global);
  await context.globalState.update(ROLLBACK_STATE_KEY, undefined);

  output.appendLine(JSON.stringify({
    restoredRecipe: rollbackPlan.recipeId,
    restoredFrom: rollbackPlan.createdAt,
    settingsUpdates: rollbackPlan.settingsUpdates
  }, null, 2));
  console.log("[Color Calibration] Hardcoded patch rolled back", rollbackPlan);
  vscode.window.showInformationMessage(`Hardcoded theme patch rolled back for ${rollbackPlan.recipeId}.`);
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
      const intent = normalizeCalibrationIntentPayload(message.intent);
      const solution = createIntentSolution(report, intent);
      const notification = createIntentSolutionNotification(solution);

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
