import type { EditorViewerModel } from "../types/editorViewer.types";
import { escapeHtml } from "./htmlUtils";
import { renderTopBar } from "./components/topBar";
import { renderSliderArea } from "./components/sliderArea";
import { renderCandidatePanel } from "./components/candidatePanel";

export function renderEditorViewerHtml(model: EditorViewerModel, nonce?: string): string {
  const initialCandidatesJson = JSON.stringify(model.initialCandidates || []);
  const nonceAttr = nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
  const cspMeta = nonce
    ? `\n  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeHtml(nonce)}';">`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">${cspMeta}
  <title>Current Theme Editor Viewer</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #111318);
      --panel-bg: var(--vscode-sideBar-background, #1b1f27);
      --border: var(--vscode-widget-border, var(--vscode-editorGroup-border, #343b48));
      --text: var(--vscode-editor-foreground, #f2f4f8);
      --muted: var(--vscode-descriptionForeground, #9aa4b2);
      --primary: var(--vscode-button-background, #2f81f7);
      --btn-bg: var(--vscode-button-secondaryBackground, #273142);
      --btn-hover: var(--vscode-button-secondaryHoverBackground, #314056);
      --btn-border: var(--vscode-button-border, #4a5568);
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    body.is-dragging {
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* Top Bar Layout */
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
    .region:focus {
      outline: 1px solid var(--vscode-focusBorder, #ffffff);
      outline-offset: 1px;
    }
    
    /* Candidate Panel Styles */
    .solution-status { margin: 0 0 12px; color: var(--muted); }
    .candidate { border-top: 1px solid var(--border); padding: 12px 0; }
    .candidate:first-child { border-top: 0; padding-top: 0; }
    .candidate-title { margin: 0 0 6px; font-weight: 600; }
    .candidate-meta { margin: 0 0 6px; color: var(--muted); font-size: 12px; }
    .candidate-actions { margin-top: 10px; display: flex; gap: 8px; }
    .candidate-btn {
      border: 1px solid var(--btn-border); border-radius: 6px; background: var(--btn-bg); color: var(--text); padding: 4px 10px; font: inherit; cursor: pointer; display: flex; align-items: center; gap: 4px;
    }
    .candidate-btn:hover { background: var(--btn-hover); }
    .candidate-btn.reject:hover { background: var(--vscode-errorForeground, #5c2020); color: var(--vscode-editor-background); border-color: transparent; }
    .candidate-color { display: inline-block; width: 12px; height: 12px; border: 1px solid var(--border); vertical-align: -2px; margin-right: 6px; }
  </style>
</head>
<body>
  <div class="app-container" style="display: flex; flex-direction: column; height: 100vh;">
    ${renderTopBar(model.samples)}
    
    <main class="main-area">
      ${renderSliderArea(model.samples, model.afterSamples || model.samples)}
      ${renderCandidatePanel()}
    </main>
  </div>

  <script${nonceAttr}>
    (function () {
      var vscode = acquireVsCodeApi();
      
      // 1. Tab Logic
      var tabButtons = document.querySelectorAll('.tab-button');
      tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var targetId = this.getAttribute('data-tab');
          
          // Update active tab
          tabButtons.forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
          
          // Update visible samples in both A and B layers
          var samples = document.querySelectorAll('.sample');
          samples.forEach(function(sample) {
            if (sample.getAttribute('data-sample-id') === targetId) {
              sample.style.display = '';
            } else {
              sample.style.display = 'none';
            }
          });
          
          // Recalculate slider height matching by forcing a reflow if needed
          updateSliderWrapperHeight();
        });
      });

      // 2. Slider Logic
      var container = document.getElementById("slider-container");
      var wrapper = document.querySelector(".slider-wrapper");
      var layerB = document.getElementById("layer-b");
      var handle = document.getElementById("slider-handle");
      var isDragging = false;
      
      function updateSliderWrapperHeight() {
        // Because layer A and B are absolute, wrapper needs an explicit height
        // to enable scrolling on the container.
        // We find the currently visible sample's height.
        var visibleA = document.querySelector('#layer-a .sample:not([style*="display: none"])');
        if (visibleA) {
          wrapper.style.minHeight = visibleA.scrollHeight + 48 + 'px'; // + padding
        }
      }
      // Run once on load
      setTimeout(updateSliderWrapperHeight, 0);

      handle.addEventListener("mousedown", function(e) {
        isDragging = true;
        document.body.classList.add("is-dragging");
        e.preventDefault();
      });
      window.addEventListener("mouseup", function() {
        isDragging = false;
        document.body.classList.remove("is-dragging");
      });
      window.addEventListener("mousemove", function(e) {
        if (!isDragging) return;
        var rect = container.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        layerB.style.clipPath = "polygon(" + percent + "% 0, 100% 0, 100% 100%, " + percent + "% 100%)";
        handle.style.left = percent + "%";
      });

      // 3. Cherry-pick Click Logic
      document.addEventListener("click", function (event) {
        var target = event.target;
        while (target && target !== document.body) {
          if (target.classList && target.classList.contains("region")) {
            var intentData = target.getAttribute("data-intent");
            if (intentData) {
              try {
                vscode.postMessage({
                  type: "regionClick",
                  intent: JSON.parse(intentData)
                });
              } catch (e) {}
            }
            return;
          }
          target = target.parentElement;
        }
      });

      // 4. Candidate Panel Rendering
      var renderedCandidateIds = {};
      window.addEventListener("message", function (event) {
        var message = event.data;
        if (!message || message.type !== "solutionResult") return;
        renderSolutionResult(message.solution);
      });

      function renderSolutionResult(solution) {
        var status = document.querySelector("[data-solution-status]");
        var list = document.querySelector("[data-solution-candidates]");
        if (!status || !list || !solution) return;

        if (solution.status === "candidates") {
          var candidates = Array.isArray(solution.candidates) ? solution.candidates : [];
          var addedCount = 0;
          candidates.forEach(function (candidate) {
            if (!renderedCandidateIds[candidate.id]) {
              renderedCandidateIds[candidate.id] = true;
              list.appendChild(renderCandidate(candidate));
              addedCount++;
            }
          });
          status.textContent = "Found " + candidates.length + " candidate(s) for " + solution.intent.signal + ". " + 
                               (addedCount > 0 ? "Added " + addedCount + " new." : "");
          return;
        }
        if (solution.status === "noMatchingRisk") {
          status.textContent = "No obvious risk found for " + solution.intent.signal + " with the current rules.";
          return;
        }
        status.textContent = "A related risk was found, but no conservative candidate is available yet.";
      }

      function renderCandidate(candidate) {
        var item = document.createElement("article");
        item.className = "candidate";

        var title = document.createElement("p");
        title.className = "candidate-title";
        title.textContent = candidate.settingKey;

        var reason = document.createElement("p");
        reason.className = "candidate-meta";
        reason.textContent = candidate.reason;

        var color = document.createElement("span");
        color.className = "candidate-color";
        color.style.background = candidate.suggestedColor;

        var suggested = document.createElement("p");
        suggested.className = "candidate-meta";
        suggested.appendChild(color);
        suggested.appendChild(document.createTextNode(candidate.suggestedColor));

        var actions = document.createElement("div");
        actions.className = "candidate-actions";

        var acceptBtn = document.createElement("button");
        acceptBtn.type = "button";
        acceptBtn.className = "candidate-btn";
        acceptBtn.innerHTML = "✓ Accept";
        acceptBtn.addEventListener("click", function () {
          vscode.postMessage({ type: "applyCandidatePatch", candidateId: candidate.id });
        });

        var rejectBtn = document.createElement("button");
        rejectBtn.type = "button";
        rejectBtn.className = "candidate-btn reject";
        rejectBtn.innerHTML = "✗ Reject";
        rejectBtn.addEventListener("click", function () {
          item.remove();
        });

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);
        
        item.appendChild(title);
        item.appendChild(reason);
        item.appendChild(suggested);
        item.appendChild(actions);
        return item;
      }

      // Initial Render
      var initialCandidates = ${initialCandidatesJson};
      if (initialCandidates && initialCandidates.length > 0) {
        renderSolutionResult({
          status: "candidates",
          candidates: initialCandidates,
          intent: { signal: "Full Diagnosis" }
        });
      }
    })();
  </script>
</body>
</html>`;
}
