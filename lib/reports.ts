import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import matter from "gray-matter";
import { cache } from "react";
import { renderMarkdown, type TocItem } from "./markdown";

export const REPORTS_DIR = path.join(process.cwd(), "reports");

export type ReportKind = "markdown" | "html";

export interface ReportMeta {
  slug: string;
  kind: ReportKind;
  title: string;
  summary: string;
  date: string; // ISO
  tags: string[];
  project: string | null;
  status: string | null;
  /** path relative to reports/, posix separators */
  file: string;
  /** directory relative to reports/ that relative links resolve against */
  baseDir: string;
  readingMinutes: number;
}

export interface Report extends ReportMeta {
  html: string;
  toc: TocItem[];
  /** for html reports: public URL of the file */
  src?: string;
}

const INDEX_NAMES = new Set(["index", "report", "readme"]);
const IGNORED = (name: string) => name.startsWith(".") || name.startsWith("_");

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const toPosix = (p: string) => p.split(path.sep).join("/");

/** reports/foo/index.md -> foo ; reports/a/b.md -> a/b */
export function slugForFile(rel: string): string {
  const posix = toPosix(rel);
  const ext = path.posix.extname(posix);
  const noExt = posix.slice(0, -ext.length);
  const base = path.posix.basename(noExt);
  const dir = path.posix.dirname(noExt);
  if (INDEX_NAMES.has(base.toLowerCase())) return dir === "." ? "" : dir;
  return noExt;
}

let gitDates: Map<string, string> | null = null;
function gitDateFor(rel: string): string | null {
  if (!gitDates) {
    gitDates = new Map();
    try {
      const log = execSync(
        "git log --format=__C__%cI --name-only --no-renames -- reports",
        { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }
      );
      let current = "";
      for (const line of log.split("\n")) {
        if (line.startsWith("__C__")) current = line.slice(5);
        else if (line.trim() && !gitDates.has(line.trim())) {
          // newest commit comes first; first time we see a file = latest change
          gitDates.set(line.trim().replace(/^reports\//, ""), current);
        }
      }
    } catch {
      /* not a git checkout */
    }
  }
  return gitDates.get(rel) ?? null;
}

function toIso(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function asTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function stripMd(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`|~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstParagraph(body: string): string {
  const blocks = body.split(/\n\s*\n/);
  for (const b of blocks) {
    const t = b.trim();
    if (!t || /^(#|```|\||!\[|<|\$\$|---|- |\* |\d+\. |>)/.test(t)) continue;
    const s = stripMd(t);
    if (s.length > 20) return s.length > 240 ? s.slice(0, 237) + "…" : s;
  }
  return "";
}

interface Parsed {
  meta: ReportMeta;
  body: string; // markdown body (without frontmatter / leading H1), or "" for html
}

function parseFile(abs: string): Parsed | null {
  const rel = toPosix(path.relative(REPORTS_DIR, abs));
  const ext = path.extname(abs).toLowerCase();
  const slug = slugForFile(rel);
  if (!slug) return null;
  const fileDate = gitDateFor(rel) ?? fs.statSync(abs).mtime.toISOString();
  const baseDir = path.posix.dirname(rel) === "." ? "" : path.posix.dirname(rel);
  const segments = slug.split("/");
  const folderProject = segments.length > 1 ? segments[0] : null;

  if (ext === ".md" || ext === ".markdown" || ext === ".mdx") {
    const raw = fs.readFileSync(abs, "utf8");
    const { data, content } = matter(raw);
    let body = content;
    let title = typeof data.title === "string" ? data.title : "";
    const h1 = body.match(/^\s*#\s+(.+?)\s*#*\s*$/m);
    if (h1 && body.trimStart().startsWith("#") && !body.trimStart().startsWith("##")) {
      if (!title) title = h1[1];
      if (h1[1].trim() === title.trim()) body = body.replace(h1[0], "");
    }
    if (!title) title = path.posix.basename(slug).replace(/[-_]+/g, " ");
    const words = stripMd(body).split(" ").length;
    return {
      body,
      meta: {
        slug,
        kind: "markdown",
        title,
        summary: String(data.summary ?? data.description ?? "") || firstParagraph(body),
        date: toIso(data.date) ?? fileDate,
        tags: asTags(data.tags),
        project: data.project ? String(data.project) : folderProject,
        status: data.status ? String(data.status) : null,
        file: rel,
        baseDir,
        readingMinutes: Math.max(1, Math.round(words / 220)),
      },
    };
  }

  if (ext === ".html" || ext === ".htm") {
    const raw = fs.readFileSync(abs, "utf8");
    const t = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const desc = raw.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
    const text = stripMd(raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " "));
    return {
      body: "",
      meta: {
        slug,
        kind: "html",
        title: t || path.posix.basename(slug).replace(/[-_]+/g, " "),
        summary: desc || (text.length > 240 ? text.slice(0, 237) + "…" : text),
        date: fileDate,
        tags: [],
        project: folderProject,
        status: null,
        file: rel,
        baseDir,
        readingMinutes: Math.max(1, Math.round(text.split(" ").length / 220)),
      },
    };
  }
  return null;
}

const loadAll = cache((): Parsed[] => {
  const files = walk(REPORTS_DIR);
  const md = files.filter((f) => /\.(md|markdown|mdx)$/i.test(f));
  const html = files.filter((f) => /\.html?$/i.test(f));

  const bySlug = new Map<string, Parsed>();
  // directories "owned" by an index-style markdown report; html inside them is an asset
  const ownedDirs: string[] = [];
  for (const f of md) {
    const p = parseFile(f);
    if (!p) continue;
    bySlug.set(p.meta.slug, p);
    const base = path.basename(f, path.extname(f)).toLowerCase();
    if (INDEX_NAMES.has(base)) ownedDirs.push(path.dirname(f) + path.sep);
  }
  for (const f of html) {
    if (ownedDirs.some((d) => f.startsWith(d))) continue;
    const p = parseFile(f);
    if (!p || bySlug.has(p.meta.slug)) continue;
    bySlug.set(p.meta.slug, p);
  }
  return [...bySlug.values()].sort((a, b) => b.meta.date.localeCompare(a.meta.date));
});

export function getAllReports(): ReportMeta[] {
  return loadAll().map((p) => p.meta);
}

export const getReport = cache(async (slug: string): Promise<Report | null> => {
  const p = loadAll().find((r) => r.meta.slug === slug);
  if (!p) return null;
  if (p.meta.kind === "html") {
    return { ...p.meta, html: "", toc: [], src: "/files/" + encodeURI(p.meta.file) };
  }
  const { html, toc } = await renderMarkdown(p.body, {
    baseDir: p.meta.baseDir,
    resolveReportLink: (relFile) => {
      const s = slugForFile(relFile);
      return loadAll().some((r) => r.meta.slug === s) ? "/r/" + s : null;
    },
  });
  return { ...p.meta, html, toc };
});
