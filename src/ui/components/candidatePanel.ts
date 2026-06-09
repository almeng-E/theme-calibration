export function renderCandidatePanel(): string {
  return `
    <aside class="m2-solution-panel" data-solution-panel>
      <p class="solution-status" data-solution-status>Click a highlighted editor region to inspect improvement candidates.</p>
      <div class="candidate-list" data-solution-candidates></div>
      <div class="solution-save-bar">
        <p class="save-status" data-save-status></p>
        <button type="button" id="save-button" class="save-button" data-save-button>Save Changes</button>
      </div>
    </aside>
  `;
}
