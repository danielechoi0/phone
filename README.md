# Research Reports

A phone-friendly website for reading research reports pushed to this repo, for example reports written by Claude on your computer.

```
Claude (on your computer) → writes reports/<project>/<date>-<slug>/index.md → git push
                                                     ↓
                                  Vercel rebuilds automatically (~1 min)
                                                     ↓
                                     Read it on your phone 📱
```

## Features
- Card list with the newest reports first, search, and project/tag filters
- A clean reading view built for mobile, with dark mode, a table of contents and reading time
- Tables you can sort and scroll sideways; GitHub-style callouts
- Interactive charts (```` ```chart ```` Chart.js JSON), mermaid diagrams, KaTeX math, CSV blocks
- Figures with captions and tap-to-zoom; relative links to images and data files work
- Self-contained `.html` reports shown full screen
- Can be added to the home screen (web app manifest)

## Setup (one time)
1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repo. The defaults work (Framework: Next.js).
2. Under Settings → Git, set the **Production Branch** to the branch reports are pushed to.
3. On your phone, open the site and choose **Share → Add to Home Screen**.

Every push now redeploys the site.

## Telling Claude how to publish
`CLAUDE.md` and `REPORTING.md` hold the instructions. If Claude works in a different folder on your computer, give it something like:

> When you finish a report, publish it by following `REPORTING.md` in `~/path/to/phone`: write it to `reports/<project>/<YYYY-MM-DD>-<slug>/index.md` with front matter, copy figures next to it, then commit and push.

## Local development
```bash
npm install
npm run dev                      # http://localhost:3000
npm run new-report -- "Title" myproject   # scaffold a report
```
