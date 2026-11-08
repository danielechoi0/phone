# Repo purpose

A Next.js site (deployed on Vercel) that renders research reports from `reports/` so they can be read on a phone.

**If you are here to publish research results, read `REPORTING.md` and follow it exactly.**
Put new reports in `reports/<project>/<YYYY-MM-DD>-<slug>/index.md`, commit, and push. Don't modify the site code to publish a report.

## Site code (only when changing the website itself)
- `lib/reports.ts`: finds reports, reads front matter, works out slugs and dates
- `lib/markdown.ts`: the unified/remark/rehype pipeline (charts, callouts, CSV, URL rewriting)
- `components/ReportEnhancer.tsx`: runs in the browser to draw Chart.js charts and mermaid diagrams, sort tables, zoom images
- `scripts/sync-assets.mjs`: runs before `dev`/`build` and copies `reports/` into `public/files/`
- Check changes with `npm run build`.
