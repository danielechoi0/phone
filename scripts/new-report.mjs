// Usage: npm run new-report -- "My report title" [project]
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const title = process.argv[2] || "Untitled report";
const project = process.argv[3];
const date = new Date().toISOString().slice(0, 10);
const slug = `${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
const dir = path.join("reports", ...(project ? [project] : []), slug);
if (existsSync(dir)) throw new Error(`${dir} already exists`);
mkdirSync(dir, { recursive: true });
writeFileSync(
  path.join(dir, "index.md"),
  `---
title: ${JSON.stringify(title)}
date: ${new Date().toISOString()}
summary: ""
tags: []${project ? `\nproject: ${JSON.stringify(project)}` : ""}
status: draft
---

## Summary

`
);
console.log(`Created ${dir}/index.md`);
