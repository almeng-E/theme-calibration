import * as vscode from "vscode";
import { COMMAND_IDS, OUTPUT_CHANNEL_NAME, ROLLBACK_STATE_KEY } from "./constants";
import { createPreviewModel, renderPreviewHtml } from "./previewWebview";
import {
  POC_PATCH_RECIPE,
  applySettingsUpdates,
  createPatchPlan,
  createRollbackPlan,
  createThemeScopedPatchRecipe,
  readPatchableSettings
} from "./themePatch";
import { collectThemeProbe } from "./themeProbe";
import { createThemeSignalReport } from "./themeReport";
import type { RollbackSnapshot } from "./types";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  const printProbeCommand = vscode.commands.registerCommand(COMMAND_IDS.printThemeProbe, async () => {
    output.show(true);
    output.appendLine(`[${new Date().toISOString()}] Theme probe started.`);

    try {
      const probe = await collectThemeProbe(vscode, {
        includeThemeDefinitions: true
      });
      const serialized = JSON.stringify(probe, null, 2);

      output.appendLine(serialized);
      console.log("[Color Calibration Theme Probe]", probe);

      vscode.window.showInformationMessage(
        `Theme probe printed: current theme "${probe.currentTheme.configuredName || "unknown"}", installed themes ${probe.installedThemes.length}.`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      output.appendLine(`Theme probe failed: ${message}`);
      console.error("[Color Calibration Theme Probe] Failed", error);
      vscode.window.showErrorMessage(`Theme probe failed: ${message}`);
    }
  });

  const printSignalReportCommand = vscode.commands.registerCommand(COMMAND_IDS.printThemeSignalReport, async () => {
    output.show(true);
    output.appendLine(`[${new Date().toISOString()}] Theme signal report started.`);

    try {
      const probe = await collectThemeProbe(vscode, {
        includeThemeDefinitions: true
      });
      const report = createThemeSignalReport(probe);
      const serialized = JSON.stringify(report, null, 2);

      output.appendLine(serialized);
      console.log("[Color Calibration Theme Signal Report]", report);

      vscode.window.showInformationMessage(
        `Theme signal report printed: ${report.theme.configuredName || "unknown"}, risks ${report.risks.length}.`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      output.appendLine(`Theme signal report failed: ${message}`);
      console.error("[Color Calibration Theme Signal Report] Failed", error);
      vscode.window.showErrorMessage(`Theme signal report failed: ${message}`);
    }
  });

  const openBeforeAfterPreviewCommand = vscode.commands.registerCommand(COMMAND_IDS.openBeforeAfterPreview, async () => {
    output.show(true);
    output.appendLine(`[${new Date().toISOString()}] Before/after preview started.`);

    try {
      const probe = await collectThemeProbe(vscode, {
        includeThemeDefinitions: true
      });
      const report = createThemeSignalReport(probe);
      const previewModel = createPreviewModel(report, POC_PATCH_RECIPE);
      const panel = vscode.window.createWebviewPanel(
        "colorCalibrationBeforeAfterPreview",
        "Color Calibration Preview",
        vscode.ViewColumn.Beside,
        {
          enableScripts: false,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = renderPreviewHtml(previewModel);

      output.appendLine(JSON.stringify({
        themeName: previewModel.themeName,
        risks: previewModel.risks.length,
        before: previewModel.before.signals,
        after: previewModel.after.signals
      }, null, 2));
      console.log("[Color Calibration Before/After Preview]", previewModel);

      vscode.window.showInformationMessage(
        `Before/after preview opened for ${previewModel.themeName}.`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      output.appendLine(`Before/after preview failed: ${message}`);
      console.error("[Color Calibration Before/After Preview] Failed", error);
      vscode.window.showErrorMessage(`Before/after preview failed: ${message}`);
    }
  });

  const applyPatchCommand = vscode.commands.registerCommand(COMMAND_IDS.applyHardcodedPatch, async () => {
    output.show(true);
    output.appendLine(`[${new Date().toISOString()}] Hardcoded patch apply started.`);

    try {
      const target = vscode.ConfigurationTarget.Global;
      const currentThemeName = vscode.workspace.getConfiguration("workbench").get<string | undefined>("colorTheme");
      const patchRecipe = createThemeScopedPatchRecipe(currentThemeName, POC_PATCH_RECIPE);
      const existingSettings = readPatchableSettings(vscode, target);
      const patchPlan = createPatchPlan(existingSettings, patchRecipe);

      await context.globalState.update(ROLLBACK_STATE_KEY, patchPlan.rollbackSnapshot);
      await applySettingsUpdates(vscode, patchPlan.settingsUpdates, target);

      output.appendLine(JSON.stringify({
        appliedRecipe: patchPlan.recipeId,
        target: "Global",
        currentThemeName,
        rollbackStateKey: ROLLBACK_STATE_KEY,
        settingsUpdates: patchPlan.settingsUpdates,
        rollbackSnapshot: patchPlan.rollbackSnapshot
      }, null, 2));
      console.log("[Color Calibration Theme Probe] Hardcoded patch applied", patchPlan);

      vscode.window.showInformationMessage(
        `Hardcoded theme patch applied. Rollback snapshot saved for ${patchPlan.recipeId}.`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      output.appendLine(`Hardcoded patch apply failed: ${message}`);
      console.error("[Color Calibration Theme Probe] Hardcoded patch apply failed", error);
      vscode.window.showErrorMessage(`Hardcoded patch apply failed: ${message}`);
    }
  });

  const rollbackPatchCommand = vscode.commands.registerCommand(COMMAND_IDS.rollbackHardcodedPatch, async () => {
    output.show(true);
    output.appendLine(`[${new Date().toISOString()}] Hardcoded patch rollback started.`);

    try {
      const rollbackSnapshot = context.globalState.get<RollbackSnapshot>(ROLLBACK_STATE_KEY);

      if (!rollbackSnapshot) {
        output.appendLine("No rollback snapshot found.");
        vscode.window.showWarningMessage("No hardcoded patch rollback snapshot found.");
        return;
      }

      const rollbackPlan = createRollbackPlan(rollbackSnapshot);

      await applySettingsUpdates(vscode, rollbackPlan.settingsUpdates, vscode.ConfigurationTarget.Global);
      await context.globalState.update(ROLLBACK_STATE_KEY, undefined);

      output.appendLine(JSON.stringify({
        restoredRecipe: rollbackPlan.recipeId,
        restoredFrom: rollbackPlan.createdAt,
        settingsUpdates: rollbackPlan.settingsUpdates
      }, null, 2));
      console.log("[Color Calibration Theme Probe] Hardcoded patch rolled back", rollbackPlan);

      vscode.window.showInformationMessage(
        `Hardcoded theme patch rolled back for ${rollbackPlan.recipeId}.`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      output.appendLine(`Hardcoded patch rollback failed: ${message}`);
      console.error("[Color Calibration Theme Probe] Hardcoded patch rollback failed", error);
      vscode.window.showErrorMessage(`Hardcoded patch rollback failed: ${message}`);
    }
  });

  context.subscriptions.push(
    output,
    printProbeCommand,
    printSignalReportCommand,
    openBeforeAfterPreviewCommand,
    applyPatchCommand,
    rollbackPatchCommand
  );
}

export function deactivate(): void {}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
