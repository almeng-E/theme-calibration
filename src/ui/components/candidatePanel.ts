export function renderCandidatePanel(): string {
  return `
    <aside class="m2-solution-panel" data-solution-panel>
      <p class="solution-status" data-solution-status>Click a highlighted editor region to inspect improvement candidates.</p>
      <div class="candidate-list" data-solution-candidates></div>
    </aside>
  `;
}
