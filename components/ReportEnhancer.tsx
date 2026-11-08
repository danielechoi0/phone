"use client";
import { useEffect } from "react";

const PALETTE = ["#c2603e", "#3f7cac", "#5a9e6f", "#d4a03a", "#8a63b8", "#cf5c8a", "#4aa3a1", "#7d7d7d"];

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function renderCharts(root: HTMLElement) {
  const figs = [...root.querySelectorAll<HTMLElement>("figure.chart:not([data-done])")];
  if (!figs.length) return;
  const { default: Chart } = await import("chart.js/auto");
  Chart.defaults.color = cssVar("--muted");
  Chart.defaults.borderColor = cssVar("--rule");
  Chart.defaults.font.family = cssVar("--sans");
  Chart.defaults.maintainAspectRatio = false;
  for (const fig of figs) {
    fig.dataset.done = "1";
    const specEl = fig.querySelector("script.chart-spec");
    const canvas = fig.querySelector("canvas");
    if (!specEl || !canvas) continue;
    try {
      const spec = JSON.parse(specEl.textContent || "{}");
      const multiColor = ["pie", "doughnut", "polarArea"].includes(spec.type);
      (spec.data?.datasets ?? []).forEach((ds: Record<string, unknown>, i: number) => {
        const c = PALETTE[i % PALETTE.length];
        if (multiColor) {
          ds.backgroundColor ??= (spec.data.labels ?? []).map((_: unknown, j: number) => PALETTE[j % PALETTE.length]);
          ds.borderColor ??= cssVar("--bg");
        } else {
          ds.borderColor ??= c;
          ds.backgroundColor ??= spec.type === "line" || spec.type === "radar" ? c + "33" : c + "cc";
        }
      });
      spec.options ??= {};
      spec.options.responsive = true;
      spec.options.maintainAspectRatio = false;
      if (spec.options.plugins?.title?.text || spec.title) {
        spec.options.plugins ??= {};
        spec.options.plugins.title = { display: true, text: spec.title, ...spec.options.plugins.title };
      }
      if (spec.caption) {
        const cap = document.createElement("figcaption");
        cap.textContent = spec.caption;
        fig.appendChild(cap);
      }
      new Chart(canvas, spec);
    } catch (e) {
      fig.innerHTML = `<pre class="chart-error">Chart error: ${String(e)}</pre>`;
    }
  }
}

async function renderMermaid(root: HTMLElement) {
  const blocks = [...root.querySelectorAll<HTMLElement>(".mermaid-block:not([data-done])")];
  if (!blocks.length) return;
  const { default: mermaid } = await import("mermaid");
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "loose",
    flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false }, gantt: { useMaxWidth: false } });
  let n = 0;
  for (const b of blocks) {
    b.dataset.done = "1";
    const src = b.querySelector(".mermaid-src")?.textContent ?? "";
    try {
      const { svg } = await mermaid.render(`mmd-${Date.now()}-${n++}`, src);
      b.innerHTML = svg;
    } catch (e) {
      b.innerHTML = `<pre class="chart-error">Diagram error: ${String(e)}</pre>`;
    }
  }
}

function makeSortable(root: HTMLElement) {
  root.querySelectorAll<HTMLTableElement>("table.sortable:not([data-done])").forEach((table) => {
    table.dataset.done = "1";
    const tbody = table.tBodies[0];
    if (!tbody || tbody.rows.length < 3) return;
    table.querySelectorAll<HTMLTableCellElement>("thead th").forEach((th, col) => {
      th.classList.add("sort-th");
      let dir = 1;
      th.addEventListener("click", () => {
        const rows = [...tbody.rows];
        const val = (r: HTMLTableRowElement) => r.cells[col]?.textContent?.trim() ?? "";
        const num = (s: string) => parseFloat(s.replace(/[,%$×x]/g, ""));
        rows.sort((a, b) => {
          const [x, y] = [val(a), val(b)];
          const [nx, ny] = [num(x), num(y)];
          return (!isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y)) * dir;
        });
        table.querySelectorAll("th").forEach((h) => h.removeAttribute("data-sort"));
        th.dataset.sort = dir > 0 ? "asc" : "desc";
        dir = -dir;
        rows.forEach((r) => tbody.appendChild(r));
      });
    });
  });
}

function lightbox(root: HTMLElement) {
  if (root.dataset.lightbox) return;
  root.dataset.lightbox = "1";
  root.addEventListener("click", (e) => {
    const img = (e.target as HTMLElement).closest("img");
    if (!img || img.closest("a")) return;
    const overlay = document.createElement("div");
    overlay.className = "lightbox";
    const big = img.cloneNode() as HTMLImageElement;
    overlay.appendChild(big);
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  });
}

function copyButtons(root: HTMLElement) {
  root.querySelectorAll<HTMLPreElement>("pre:not(.mermaid-src):not([data-done])").forEach((pre) => {
    pre.dataset.done = "1";
    if (!pre.querySelector("code")) return;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? "");
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 1200);
    });
    pre.appendChild(btn);
  });
}

export default function ReportEnhancer() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose");
    if (!root) return;
    makeSortable(root);
    copyButtons(root);
    lightbox(root);
    renderCharts(root);
    renderMermaid(root);
  }, []);
  return null;
}
