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
        Improvement Candidates
      </div>
    </header>
  `;
}
