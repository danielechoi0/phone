# How to publish a report to this site

This repo is a website (deployed on Vercel) that displays research reports on a phone.
**Any file committed under `reports/` and pushed to the deployed branch shows up on the site automatically** (~1 minute after the push).

## Quick recipe

1. Create a folder: `reports/<project>/<YYYY-MM-DD>-<short-slug>/`
2. Write the report to `index.md` in that folder (format below).
3. Put figures and data files (`.png`, `.svg`, `.csv`, `.html`, `.pdf`…) in the same folder and reference them with **relative paths**, e.g. `![Figure 1. Caption](fig1.png)`.
4. `git add reports && git commit -m "report: <title>" && git push`

## Front matter (put it at the top of `index.md`)

```yaml
---
title: "Effect of X on Y"            # required
date: 2026-11-08T14:30:00-05:00      # recommended (ISO 8601). Sorts the list; newest first.
summary: "One or two sentences shown on the report card in the list."
project: "protein-folding"           # groups/filter chip. Defaults to the first folder name.
tags: [scRNA-seq, pilot]
status: draft                        # draft | in-progress | final (shown as a badge)
---
```

Don't repeat the title as a `# H1`; the page header already shows it. Start the body with `##` sections.

## What renders (write for a phone screen)

- **GitHub-flavored Markdown**: tables (sortable, scroll sideways), task lists, footnotes, strikethrough.
- **Math**: `$inline$` and `$$display$$` (KaTeX).
- **Callouts**: start a blockquote with a type:
  ```md
  > [!SUMMARY] TL;DR
  > The key result in one line.
  ```
  Types: `SUMMARY`/`TLDR`, `NOTE`, `TIP`, `FINDING`/`RESULT`, `IMPORTANT`, `WARNING`/`CAVEAT`/`LIMITATION`, `CAUTION`/`DANGER`.
- **Interactive charts**: a fenced block with language `chart` holding a Chart.js config as JSON.
  Colors are set for you. Optional top-level `"title"` and `"caption"`.
  ````md
  ```chart
  { "type": "bar", "title": "Accuracy by model", "caption": "Figure 2. ...",
    "data": { "labels": ["A","B"], "datasets": [{ "label": "acc", "data": [0.81, 0.87] }] } }
  ```
  ````
  Types: `line`, `bar`, `scatter` (data as `[{"x":..,"y":..}]`), `pie`, `doughnut`, `radar`, `bubble`.
  Use `"options": {"indexAxis": "y"}` for horizontal bars when labels are long.
- **Diagrams**: fenced ```` ```mermaid ```` blocks (flowchart, sequence, gantt…).
- **CSV tables**: fenced ```` ```csv ```` blocks become sortable tables.
- **Images**: standalone images become figures; the alt text is the caption. Tap to zoom. Prefer PNG/SVG at least 1200px wide.
- **Collapsible sections**: `<details><summary>Raw output</summary> ... </details>` for long logs and appendices.
- **Links** to other `.md` reports in the repo go to that report's page. Links to other files (CSV, PDF) open the raw file.
- **Standalone HTML reports**: a self-contained `.html` file (e.g. `reports/<project>/<slug>/index.html` with no `index.md` next to it) is shown full-width in a frame. Its `<title>` becomes the report title.

## Style tips for reading on a phone

- Open with a `> [!SUMMARY]` callout of 2–4 lines with the main conclusion.
- Keep tables to about 6 columns or fewer; put wide tables in a CSV file and link to it.
- Prefer `chart` blocks over static plots for simple series; they stay sharp and readable in dark mode.
- Put methods, raw output and long code in `<details>` blocks at the end.

Files or folders whose names start with `_` or `.` are ignored.
