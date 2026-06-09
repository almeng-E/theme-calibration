import type { EditorViewerModel } from "../types/editorViewer.types";
import { escapeHtml } from "./htmlUtils";
import { renderTopBar } from "./components/topBar";
import { renderSliderArea } from "./components/sliderArea";
import { renderCandidatePanel } from "./components/candidatePanel";
import { viewerCss } from "./viewerCss";

export function renderEditorViewerHtml(model: EditorViewerModel, nonce?: string): string {
  const initialCandidatesJson = JSON.stringify(model.initialCandidates || []);
  const nonceAttr = nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
  const cspMeta = nonce
    ? `\n  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeHtml(nonce)}';">`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">${cspMeta}
  <title>Current Theme Editor Viewer</title>
  <style>
    ${viewerCss}
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
      
      // 전역 상태 (Global UI State)
      var UIState = {
        activeTab: 'syntax',
        activeRegionId: null,
        candidateStatus: {} // candidateId -> 'none' | 'accepted' | 'rejected'
      };

      // 상태를 DOM에 반영하는 싱글톤 함수
      function syncUI() {
        // 1. Tab & Sample Visibility
        document.querySelectorAll('.tab-button').forEach(function(btn) {
          if (btn.getAttribute('data-tab') === UIState.activeTab) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        document.querySelectorAll('.sample').forEach(function(sample) {
          if (sample.getAttribute('data-sample-id') === UIState.activeTab) {
            sample.style.display = '';
          } else {
            sample.style.display = 'none';
          }
        });

        // 2. Region & Candidate Active State (Highlight)
        document.querySelectorAll('.region.active, .candidate.active').forEach(function(el) {
          el.classList.remove('active');
        });

        if (UIState.activeRegionId) {
          document.querySelectorAll('.region[data-region-id="' + UIState.activeRegionId + '"]').forEach(function(el) {
            el.classList.add('active');
          });
          document.querySelectorAll('.candidate[data-region-id="' + UIState.activeRegionId + '"]').forEach(function(el) {
            el.classList.add('active');
          });
        }

        // 3. Candidate Accept/Reject Status & Buttons
        document.querySelectorAll('.candidate').forEach(function(card) {
          var cid = card.getAttribute('data-candidate-id');
          var status = UIState.candidateStatus[cid];
          
          var acceptBtn = card.querySelector('.accept-btn');
          var rejectBtn = card.querySelector('.reject-btn');
          
          if (acceptBtn && rejectBtn) {
            acceptBtn.className = "candidate-btn accept-btn accept"; // reset classes
            rejectBtn.className = "candidate-btn reject-btn reject";
            
            if (status === 'accepted') {
              acceptBtn.classList.add('active');
              rejectBtn.classList.add('disabled');
            } else if (status === 'rejected') {
              rejectBtn.classList.add('active');
              acceptBtn.classList.add('disabled');
            }
          }
        });

        updateSliderWrapperHeight();
      }

      // 초기 탭 이벤트 리스너 세팅
      document.querySelectorAll('.tab-button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          UIState.activeTab = this.getAttribute('data-tab');
          syncUI();
        });
      });
      function updateSliderWrapperHeight() {
        var wrapper = document.querySelector(".slider-wrapper");
        if (!wrapper) return;
        // Because layer A and B are absolute, wrapper needs an explicit height
        // to enable scrolling on the container.
        // We find the currently visible sample's height.
        var visibleA = document.querySelector('#layer-a .sample:not([style*="display: none"])');
        if (visibleA) {
          wrapper.style.minHeight = visibleA.scrollHeight + 48 + 'px'; // + padding
        }
      }
      // Slider Logic
      var container = document.getElementById("slider-container");
      var layerB = document.getElementById("layer-b");
      var handle = document.getElementById("slider-handle");
      var isDragging = false;
      
      if (handle && layerB && container) {
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
      }

      // Cherry-pick Click Logic
      document.addEventListener("click", function (event) {
        var target = event.target;
        while (target && target !== document.body) {
          if (target.classList && target.classList.contains("region")) {
            var intentData = target.getAttribute("data-intent");
            var regionId = target.getAttribute("data-region-id");
            if (intentData) {
              try {
                var intent = JSON.parse(intentData);
                UIState.activeRegionId = regionId;
                syncUI();
                
                vscode.postMessage({
                  type: "regionClick",
                  intent: intent
                });
              } catch (e) {}
            }
            return;
          }
          target = target.parentElement;
        }
      });

      // Candidate Panel Messaging
      var renderedCandidateIds = {};
      window.addEventListener("message", function (event) {
        var message = event.data;
        if (!message) return;
        
        if (message.type === "solutionResult") {
          renderSolutionResult(message.solution);
        } else if (message.type === "updateAfterHtml") {
          var layerBContent = document.querySelector("#layer-b .editor-content");
          if (layerBContent) {
            layerBContent.innerHTML = message.html;
            // B 레이어의 DOM이 새로 생성되었으므로 syncUI를 호출해 .active 클래스 등을 복구합니다.
            syncUI();
          }
        } else if (message.type === "saveResult") {
          handleSaveResult(message);
        }
      });

      // Save 버튼 상태 머신 (Save button state machine).
      // Accept/Reject는 스테이징만 하고, 명시적 Save 클릭 시에만 일괄 저장됩니다.
      var saveButton = document.querySelector("[data-save-button]");
      var saveStatus = document.querySelector("[data-save-status]");

      function setSaveStatus(text) {
        if (saveStatus) {
          saveStatus.textContent = text || "";
        }
      }

      function resetSaveButton() {
        if (!saveButton) return;
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
      }

      if (saveButton) {
        saveButton.addEventListener("click", function () {
          saveButton.disabled = true;
          saveButton.textContent = "Saving…";
          setSaveStatus("");
          vscode.postMessage({ type: "saveCandidates" });
        });
      }

      function handleSaveResult(message) {
        if (!saveButton) return;

        if (message.ok === true) {
          // 성공: 성공 라벨을 잠깐 보여준 뒤 버튼을 복구합니다.
          var count = typeof message.count === "number" ? message.count : 0;
          saveButton.disabled = true;
          saveButton.textContent = "✓ Saved";
          setSaveStatus("✓ Saved " + count + " change(s)");
          setTimeout(function () {
            resetSaveButton();
            setSaveStatus("");
          }, 1500);
          return;
        }

        // CRITICAL: 실패 시 절대 성공 상태를 보여주지 않습니다 (no silent success).
        resetSaveButton();
        var reason = message.reason;
        if (reason === "stale") {
          setSaveStatus("Theme changed — reopen the viewer");
        } else if (reason === "empty") {
          setSaveStatus("No accepted changes to save");
        } else if (reason === "error") {
          setSaveStatus("Save failed" + (message.message ? ": " + message.message : ""));
        } else {
          setSaveStatus("Save failed");
        }
      }

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
              list.appendChild(renderCandidate(candidate, solution.intent.targetId));
              addedCount++;
            }
          });
          status.textContent = "Found " + candidates.length + " candidate(s) for " + solution.intent.signal + ". " + 
                               (addedCount > 0 ? "Added " + addedCount + " new." : "");
          syncUI();
          return;
        }
        if (solution.status === "noMatchingRisk" || solution.status === "noCandidate") {
          var msg = solution.status === "noMatchingRisk" 
            ? "No obvious risk found for " + solution.intent.signal + " with the current rules."
            : "A related risk was found, but no conservative candidate is available yet.";
          
          status.textContent = msg;
          
          var emptyId = solution.intent.targetId + "-empty";
          if (solution.intent.targetId && !renderedCandidateIds[emptyId]) {
            renderedCandidateIds[emptyId] = true;
            list.appendChild(renderEmptyCandidate(solution.intent.targetId, "해당 구문에 대한 자동 추천 항목이 없습니다."));
            syncUI();
          }
          return;
        }
      }

      function renderEmptyCandidate(targetRegionId, message) {
        var item = document.createElement("article");
        item.className = "candidate";
        if (targetRegionId) {
          item.setAttribute("data-region-id", targetRegionId);
        }

        var titleWrapper = document.createElement("div");
        var title = document.createElement("span");
        title.className = "candidate-title";
        title.textContent = "알림";
        titleWrapper.appendChild(title);

        var reason = document.createElement("p");
        reason.className = "candidate-meta";
        reason.textContent = message;

        item.appendChild(titleWrapper);
        item.appendChild(reason);
        return item;
      }

      function renderCandidate(candidate, targetRegionId) {
        var item = document.createElement("article");
        item.className = "candidate";
        item.setAttribute("data-candidate-id", candidate.id);
        if (targetRegionId && targetRegionId !== "global") {
          item.setAttribute("data-region-id", targetRegionId);
        } else if (candidate.signals && candidate.signals.length > 0) {
          item.setAttribute("data-signals", candidate.signals.join(","));
        }

        // Card Click Two-Way Sync
        item.addEventListener("click", function(e) {
          if (e.target.tagName.toLowerCase() === 'button') return;
          
          var regionId = item.getAttribute("data-region-id");
          if (!regionId) {
            // fallback: find matching region by signals
            var signalsAttr = item.getAttribute("data-signals");
            if (signalsAttr) {
              var signals = signalsAttr.split(",");
              var regions = document.querySelectorAll('.region[data-intent]');
              for (var i = 0; i < regions.length; i++) {
                try {
                  var intent = JSON.parse(regions[i].getAttribute("data-intent"));
                  if (signals.indexOf(intent.signal) !== -1) {
                    regionId = regions[i].getAttribute("data-region-id");
                    item.setAttribute("data-region-id", regionId); // cache it
                    break;
                  }
                } catch(err) {}
              }
            }
          }
          
          if (regionId) {
            UIState.activeRegionId = regionId;
            syncUI();
          }
        });

        var titleWrapper = document.createElement("div");
        var title = document.createElement("span");
        title.className = "candidate-title";
        title.textContent = candidate.settingKey;
        
        titleWrapper.appendChild(title);

        var reason = document.createElement("p");
        reason.className = "candidate-meta";
        reason.textContent = candidate.reason;

        var color = document.createElement("span");
        color.className = "candidate-color";
        color.style.background = candidate.suggestedColor;

        var suggested = document.createElement("p");
        suggested.className = "candidate-meta";
        suggested.appendChild(color);

        var colorLabel = document.createTextNode(candidate.suggestedColor);
        suggested.appendChild(colorLabel);

        // Phase 4: native color picker. Fine-tuning a color AUTO-ACCEPTS the
        // candidate (custom color = opting in), mirrored optimistically here
        // and authoritatively in the model via setCandidateColor.
        var colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.className = "candidate-color-input";
        colorInput.setAttribute("data-candidate-color", candidate.id);
        colorInput.value = candidate.suggestedColor;
        colorInput.addEventListener("change", function () {
          var nextColor = colorInput.value;
          // mirror the new color into the visible swatch + label
          color.style.background = nextColor;
          colorLabel.textContent = nextColor;
          // optimistic auto-accept so the Accept button reflects the opt-in
          UIState.candidateStatus[candidate.id] = 'accepted';
          syncUI();
          vscode.postMessage({
            type: "setCandidateColor",
            candidateId: candidate.id,
            color: nextColor
          });
        });
        suggested.appendChild(colorInput);

        var actions = document.createElement("div");
        actions.className = "candidate-actions";

        var acceptBtn = document.createElement("button");
        acceptBtn.type = "button";
        acceptBtn.className = "candidate-btn accept-btn accept";
        acceptBtn.innerHTML = "✓ Accept";
        acceptBtn.addEventListener("click", function () {
          UIState.candidateStatus[candidate.id] = 'accepted';
          syncUI();
          vscode.postMessage({ type: "applyCandidatePatch", candidateId: candidate.id });
        });

        var rejectBtn = document.createElement("button");
        rejectBtn.type = "button";
        rejectBtn.className = "candidate-btn reject-btn reject";
        rejectBtn.innerHTML = "✗ Reject";
        rejectBtn.addEventListener("click", function () {
          UIState.candidateStatus[candidate.id] = 'rejected';
          syncUI();
          vscode.postMessage({ type: "rejectCandidatePatch", candidateId: candidate.id });
        });

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);
        
        item.appendChild(titleWrapper);
        item.appendChild(reason);
        item.appendChild(suggested);
        item.appendChild(actions);
        return item;
      }

      // Initial Render
      var initialCandidates = ${initialCandidatesJson};
      if (initialCandidates && initialCandidates.length > 0) {
        initialCandidates.forEach(function(c) {
          UIState.candidateStatus[c.id] = 'accepted';
        });
        renderSolutionResult({
          status: "candidates",
          candidates: initialCandidates,
          intent: { signal: "Full Diagnosis", targetId: "global" }
        });
      }
      
      // Run once on load
      syncUI();
      setTimeout(updateSliderWrapperHeight, 0);
    })();
  </script>
</body>
</html>`;
}
