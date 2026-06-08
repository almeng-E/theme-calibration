export const viewerCss = `
    /* CSS variables injected via VS Code */
    :root {
      --bg: var(--vscode-editor-background);
      --text: var(--vscode-editor-foreground);
      --border: var(--vscode-widget-border, #444);
      --primary: var(--vscode-button-background, #007acc);
      --muted: var(--vscode-descriptionForeground, #cccccc);
      --panel-bg: var(--vscode-editorWidget-background, #252526);
      --btn-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --btn-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
      --btn-border: var(--vscode-button-border, transparent);
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: var(--vscode-font-family, sans-serif);
      color: var(--text);
      background: var(--bg);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    body.is-dragging {
      user-select: none;
      -webkit-user-select: none;
    }

    /* Top Bar */
    .top-bar {
      display: flex;
      border-bottom: 1px solid var(--border);
      height: 48px;
      flex-shrink: 0;
    }
    .t1-tabs {
      flex: 1;
      display: flex;
      gap: 2px;
      padding: 0 16px;
      align-items: flex-end;
    }
    .tab-button {
      background: transparent;
      border: 1px solid transparent;
      border-bottom: 0;
      color: var(--muted);
      padding: 8px 16px;
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      border-radius: 6px 6px 0 0;
    }
    .tab-button:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-button.active {
      background: var(--panel-bg);
      border-color: var(--border);
      color: var(--text);
      font-weight: 600;
    }
    .t2-title {
      width: 320px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      font-weight: 600;
      font-size: 14px;
      border-left: 1px solid var(--border);
    }

    /* Main Area Layout */
    .main-area {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    
    /* M1: Code & Slider Container */
    .m1-editor-container {
      flex: 1;
      position: relative;
      background: var(--panel-bg);
      overflow-y: auto;
      overflow-x: hidden;
    }
    .slider-wrapper {
      position: relative;
      min-height: 100%; /* Ensure it spans the scroll area */
    }
    .slider-layer {
      position: absolute;
      top: 0;
      bottom: 0; /* Let it stretch */
      left: 0;
      width: 100%;
    }
    .slider-layer-a {
      z-index: 1;
    }
    .slider-layer-b {
      z-index: 2;
      clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
    }
    .editor-content {
      padding: 24px;
    }
    
    /* Slider Handle */
    .slider-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: var(--primary);
      cursor: ew-resize;
      z-index: 10;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
    }
    .slider-handle::after {
      content: "";
      position: absolute;
      top: 50%;
      left: -14px;
      width: 30px;
      height: 30px;
      background: var(--primary);
      border-radius: 50%;
      transform: translateY(-50%);
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    .slider-handle::before {
      content: "◂ ▸";
      position: absolute;
      top: 50%;
      left: -14px;
      width: 30px;
      height: 30px;
      transform: translateY(-50%);
      color: var(--bg);
      font-size: 12px;
      letter-spacing: -1px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 11;
      pointer-events: none;
    }

    /* M2: Solution Panel */
    .m2-solution-panel {
      width: 320px;
      background: var(--bg);
      border-left: 1px solid var(--border);
      padding: 16px;
      overflow-y: auto;
    }
    
    /* Components Inside Content */
    .sample h2 { display: none; } /* Hide old title inside sample since we use tabs */
    .editor {
      margin: 0;
      font-family: var(--vscode-editor-font-family, Consolas, "Courier New", monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      font-weight: var(--vscode-editor-font-weight, normal);
      line-height: var(--vscode-editor-line-height, 1.55);
      white-space: pre-wrap;
    }
    .line {
      display: block;
      min-height: 20px;
    }
    .region {
      border: 0;
      padding: 0;
      background: transparent;
      border-radius: 3px;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .region:focus, .region.active {
      outline: 1px solid var(--vscode-focusBorder, #ffffff);
      outline-offset: 1px;
    }
    
    /* Candidate Panel Styles */
    .solution-status { margin: 0 0 12px; color: var(--muted); }
    .candidate { border-top: 1px solid var(--border); padding: 12px; border-left: 3px solid transparent; transition: all 0.2s; }
    .candidate:first-child { border-top: 0; }
    .candidate-title { margin: 0 0 6px; font-weight: 600; }
    .candidate-meta { margin: 0 0 6px; color: var(--muted); font-size: 12px; }
    .candidate-actions { margin-top: 10px; display: flex; gap: 8px; }
    .candidate-btn {
      border: 1px solid var(--btn-border); border-radius: 6px; background: var(--btn-bg); color: var(--text); padding: 4px 10px; font: inherit; cursor: pointer; display: flex; align-items: center; gap: 4px;
    }
    .candidate-btn:hover { background: var(--btn-hover); }
    .candidate-btn.reject:hover { background: var(--vscode-errorForeground, #5c2020); color: var(--vscode-editor-background); border-color: transparent; }
    .candidate-color { display: inline-block; width: 12px; height: 12px; border: 1px solid var(--border); vertical-align: -2px; margin-right: 6px; }

    /* UI State Styles */
    .candidate {
      cursor: pointer;
    }
    .candidate.active {
      border-left-color: var(--primary);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .candidate-btn.active.accept {
      background: #4cc38a;
      border-color: #4cc38a;
      color: #000;
    }
    .candidate-btn.active.reject {
      background: var(--vscode-errorForeground, #f44747);
      border-color: var(--vscode-errorForeground, #f44747);
      color: #fff;
    }
    .candidate-btn.disabled {
      opacity: 0.3;
    }
    
    /* Optional badge if still used */
    .status-badge {
      display: inline-block;
      margin-left: 8px;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }
    .status-badge.accepted { background: #4cc38a; color: #000; }
    .status-badge.rejected { background: var(--vscode-errorForeground, #f44747); color: #fff; }
`;
