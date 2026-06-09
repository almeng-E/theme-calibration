import type { ViewerSampleDto, ViewerLineDto, ViewerRegionDto } from "../../types/editorViewer.types";
import { escapeHtml, cssColor } from "../htmlUtils";

export function renderSliderArea(samplesA: ViewerSampleDto[], samplesB: ViewerSampleDto[]): string {
  const contentA = renderSamplesHtml(samplesA);
  const contentB = renderSamplesHtml(samplesB);

  return `
    <section class="m1-editor-container" id="slider-container">
      <div class="slider-wrapper">
        <div class="slider-layer slider-layer-a" id="layer-a">
          <div class="editor-content">${contentA}</div>
        </div>
        <div class="slider-layer slider-layer-b" id="layer-b">
          <div class="editor-content">${contentB}</div>
        </div>
        <div class="slider-handle" id="slider-handle"></div>
      </div>
    </section>
  `;
}

export function renderSamplesHtml(samples: ViewerSampleDto[]): string {
  return samples.map((s, i) => renderSample(s, i === 0)).join("");
}

function renderSample(sample: ViewerSampleDto, isFirst: boolean): string {
  // Hide all samples except the first one initially
  const displayStyle = isFirst ? "" : "display: none;";
  return `<article class="sample" data-sample-id="${escapeHtml(sample.id)}" style="${displayStyle}">
    <pre class="editor" style="background:${cssColor(sample.background)}; color:${cssColor(sample.foreground)};">${sample.lines.map(renderLine).join("")}</pre>
  </article>`;
}

function renderLine(line: ViewerLineDto): string {
  return `<span class="line">${line.regions.map(renderRegion).join("")}</span>`;
}

function renderRegion(region: ViewerRegionDto): string {
  const backgroundStyle = region.backgroundColor ? ` background:${cssColor(region.backgroundColor)};` : "";
  const intent = escapeHtml(JSON.stringify(region.intent));

  return `<button class="region" type="button" data-region-id="${escapeHtml(region.id)}" data-signal="${escapeHtml(region.signal)}" data-intent="${intent}" style="color:${cssColor(region.color)};${backgroundStyle}">${escapeHtml(region.text)}</button>`;
}
