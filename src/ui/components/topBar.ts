import type { ViewerSampleDto } from "../../types/editorViewer.types";
import { escapeHtml } from "../htmlUtils";

export function renderTopBar(samples: ViewerSampleDto[]): string {
  const tabs = samples
    .map(
      (sample, index) =>
        `<button class="tab-button ${index === 0 ? "active" : ""}" data-tab="${escapeHtml(sample.id)}">
          ${escapeHtml(sample.title)}
        </button>`
    )
    .join("");

  return `
    <header class="top-bar">
      <nav class="t1-tabs">
        ${tabs}
      </nav>
      <div class="t2-title">
        <span class="t2-title-text">Improvement Candidates</span>
        <div class="t2-actions">
          <span class="save-status" data-save-status></span>
          <button type="button" id="save-button" class="save-button" data-save-button>Save Changes</button>
        </div>
      </div>
    </header>
  `;
}
