"use strict";

const vscode = require("vscode");
const { collectThemeProbe } = require("./themeProbe");

function activate(context) {
  const output = vscode.window.createOutputChannel("Color Calibration Theme Probe");

  const disposable = vscode.commands.registerCommand("colorCalibration.printThemeProbe", async () => {
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
      const message = error && error.message ? error.message : String(error);
      output.appendLine(`Theme probe failed: ${message}`);
      console.error("[Color Calibration Theme Probe] Failed", error);
      vscode.window.showErrorMessage(`Theme probe failed: ${message}`);
    }
  });

  context.subscriptions.push(output, disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
