# Editor Viewer Solution Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editor Viewer에서 사용자가 영역을 클릭하면 생성된 개선 후보를 Webview 내부 solution panel에 표시한다.

**Architecture:** Webview는 클릭 intent를 Extension Host로 보내고, Extension Host는 기존 `createIntentSolution` 결과를 다시 Webview로 postMessage한다. Renderer는 solution result message를 받아 DOM을 업데이트하되, settings apply/rollback은 수행하지 않는다.

**Tech Stack:** TypeScript, VS Code Webview API, Node.js `node:test`, HTML/CSS/vanilla JavaScript renderer string.

---

## File Structure

- Modify: `src/core/editorViewerRenderer.ts`
  - solution panel markup, status area, candidate list rendering script를 추가한다.
- Modify: `test/core/editorViewerRenderer.test.js`
  - renderer HTML에 solution panel과 message listener가 포함되는지 검증한다.
- Modify: `src/extension.ts`
  - `regionClick` 처리 후 `panel.webview.postMessage({ type: "solutionResult", solution })`를 호출한다.
- Modify: `README.md`
  - 클릭 결과가 상태 알림뿐 아니라 Webview panel에도 표시된다는 설명을 추가한다.

---

## Task 1: Renderer Solution Panel

**Files:**
- Modify: `src/core/editorViewerRenderer.ts`
- Modify: `test/core/editorViewerRenderer.test.js`

- [ ] **Step 1: Write failing renderer tests**

Add two tests to `test/core/editorViewerRenderer.test.js`.

```javascript
test("renderEditorViewerHtml includes solution panel placeholders", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /data-solution-panel/);
  assert.match(html, /data-solution-status/);
  assert.match(html, /data-solution-candidates/);
  assert.match(html, /Click a highlighted editor region to inspect improvement candidates./);
});

test("renderEditorViewerHtml listens for solution result messages", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "testnonce");

  assert.match(html, /window\.addEventListener\("message"/);
  assert.match(html, /message\.type !== "solutionResult"/);
  assert.match(html, /renderSolutionResult\(message\.solution\)/);
  assert.match(html, /candidate\.suggestedColor/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL because the solution panel placeholders and message listener do not exist.

- [ ] **Step 3: Implement renderer panel and script**

Modify `src/core/editorViewerRenderer.ts`.

Add a solution panel next to the sample grid:

```html
  <main class="viewer-layout">
    <section class="viewer-grid">${samples}</section>
    <aside class="solution-panel" data-solution-panel>
      <h2>Improvement Candidates</h2>
      <p class="solution-status" data-solution-status>Click a highlighted editor region to inspect improvement candidates.</p>
      <div class="candidate-list" data-solution-candidates></div>
    </aside>
  </main>
```

Add CSS classes:

```css
    .viewer-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
      gap: 16px;
      align-items: start;
    }
    .solution-panel {
      border: 1px solid #343b48;
      border-radius: 6px;
      background: #1b1f27;
      padding: 12px;
    }
    .solution-panel h2 {
      margin: 0 0 8px;
      font-size: 13px;
    }
    .solution-status {
      margin: 0 0 12px;
      color: #9aa4b2;
    }
    .candidate {
      border-top: 1px solid #343b48;
      padding: 10px 0;
    }
    .candidate:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .candidate-title {
      margin: 0 0 4px;
      font-weight: 600;
    }
    .candidate-meta {
      margin: 0 0 6px;
      color: #9aa4b2;
      font-size: 12px;
    }
    .candidate-color {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #ffffff66;
      vertical-align: -2px;
      margin-right: 6px;
    }
    @media (max-width: 760px) {
      .viewer-layout {
        grid-template-columns: 1fr;
      }
    }
```

Add client-side helpers inside the existing script:

```javascript
      window.addEventListener("message", function (event) {
        var message = event.data;
        if (!message || message.type !== "solutionResult") {
          return;
        }

        renderSolutionResult(message.solution);
      });

      function renderSolutionResult(solution) {
        var status = document.querySelector("[data-solution-status]");
        var list = document.querySelector("[data-solution-candidates]");
        if (!status || !list || !solution) {
          return;
        }

        list.textContent = "";
        if (solution.status === "candidates") {
          status.textContent = "Found " + solution.candidates.length + " candidate(s) for " + solution.intent.signal + ".";
          solution.candidates.forEach(function (candidate) {
            list.appendChild(renderCandidate(candidate));
          });
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

        var meta = document.createElement("p");
        meta.className = "candidate-meta";
        meta.textContent = candidate.riskType + " | confidence " + Number(candidate.confidence).toFixed(2);

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

        item.appendChild(title);
        item.appendChild(meta);
        item.appendChild(reason);
        item.appendChild(suggested);
        return item;
      }
```

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 50 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/core/editorViewerRenderer.ts test/core/editorViewerRenderer.test.js
git commit -m ":sparkles: feat: editor viewer solution panel 렌더링 추가"
```

---

## Task 2: Extension Host Result PostMessage

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Update Extension Host message flow**

Modify `openEditorViewerPanel` in `src/extension.ts`. After creating `solution` and `notification`, send the solution back to the Webview:

```typescript
      void panel.webview.postMessage({
        type: "solutionResult",
        solution
      });
```

This line must be inside the successful `regionClick` try block after `createIntentSolutionNotification(solution)`.

- [ ] **Step 2: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 50 tests.

- [ ] **Step 3: Commit**

```powershell
git add src/extension.ts
git commit -m ":sparkles: feat: editor viewer solution 결과 전송"
```

---

## Task 3: README Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update user-facing description**

Update the user command description to say that clicking a sample region shows improvement candidates in the Webview panel and also displays a status notification.

Keep the limitation that candidate-based settings apply/rollback is not connected yet.

- [ ] **Step 2: Preserve UTF-8 BOM**

Save `README.md` as UTF-8 with BOM to avoid Korean character breaking.

- [ ] **Step 3: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 50 tests.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m ":memo: docs: editor viewer solution panel 안내 추가"
```

---

## Review Gates

After each task:

1. Implementation subagent reports DONE with RED/GREEN evidence and commit hash.
2. Spec compliance reviewer checks only whether the task matches this plan.
3. Code quality reviewer checks SRP, security, maintainability, and UI responsibility boundaries.
4. If either reviewer finds issues, the same implementation owner fixes them and the same review gate runs again.
5. Completed subagents are closed immediately after their result is processed.

Final verification:

```powershell
git diff --check
& 'C:\nvm4w\nodejs\npm.cmd' test
git status --short --branch
```
