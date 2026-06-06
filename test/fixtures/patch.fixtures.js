const SAMPLE_PATCH_RECIPE = {
  id: "sample-hardcoded-contrast-v1",
  description: "Sample conservative contrast patch for tests.",
  settings: {
    "workbench.colorCustomizations": {
      "editorError.foreground": "#ff6b6b",
      "editorWarning.foreground": "#ffd166",
      "editorGutter.addedBackground": "#4cc38a",
      "editorGutter.deletedBackground": "#ff6b6b",
      "diffEditor.insertedTextBackground": "#4cc38a26",
      "diffEditor.removedTextBackground": "#ff6b6b26"
    },
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  }
};

module.exports = { SAMPLE_PATCH_RECIPE };
