import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { visit, SKIP } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import type { Root, Element, ElementContent, Parent } from "hast";

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

interface Options {
  baseDir: string;
  resolveReportLink: (relFile: string) => string | null;
}

const isExternal = (u: string) => /^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(u);

function el(tagName: string, properties: Record<string, unknown>, children: ElementContent[] = []): Element {
  return { type: "element", tagName, properties: properties as Element["properties"], children };
}
const text = (value: string) => ({ type: "text" as const, value });

function codeLang(node: Element): string | null {
  const cls = node.properties?.className;
  const list = Array.isArray(cls) ? cls.map(String) : [];
  const l = list.find((c) => c.startsWith("language-"));
  return l ? l.slice(9).toLowerCase() : null;
}

/* ---------- CSV ---------- */
function parseCsv(src: string, delim?: string): string[][] {
  const d = delim ?? (src.split("\n")[0].includes("\t") ? "\t" : ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

function csvTable(src: string): Element {
  const [head = [], ...body] = parseCsv(src.trim());
  return el("div", { className: ["table-wrap"] }, [
    el("table", { className: ["data-table", "sortable"] }, [
      el("thead", {}, [el("tr", {}, head.map((h) => el("th", {}, [text(h)])))]),
      el("tbody", {}, body.map((r) => el("tr", {}, r.map((c) => el("td", {}, [text(c)]))))),
    ]),
  ]);
}

/** ```chart / ```mermaid / ```csv fenced blocks -> special elements. */
function rehypeSpecialBlocks() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent: Parent | undefined) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children.find((c): c is Element => c.type === "element" && c.tagName === "code");
      if (!code) return;
      const lang = codeLang(code);
      const src = toString(code);
      let replacement: Element | null = null;
      if (lang === "chart" || lang === "chartjs") {
        replacement = el("figure", { className: ["chart"] }, [
          el("div", { className: ["chart-canvas"] }, [el("canvas", {})]),
          el("script", { type: "application/json", className: ["chart-spec"] }, [text(src)]),
        ]);
      } else if (lang === "mermaid") {
        replacement = el("div", { className: ["mermaid-block"] }, [el("pre", { className: ["mermaid-src"] }, [text(src)])]);
      } else if (lang === "csv" || lang === "tsv") {
        replacement = csvTable(src);
      }
      if (replacement) {
        parent.children[index] = replacement;
        return SKIP;
      }
    });
  };
}

/** GitHub-style callouts: > [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION] / custom */
function rehypeCallouts() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "blockquote") return;
      const p = node.children.find((c): c is Element => c.type === "element" && c.tagName === "p");
      const first = p?.children[0];
      if (!p || !first || first.type !== "text") return;
      const m = first.value.match(/^\s*\[!([a-zA-Z]+)\]([^\n]*)\n?/);
      if (!m) return;
      const kind = m[1].toLowerCase();
      const title = m[2].trim() || kind[0].toUpperCase() + kind.slice(1);
      first.value = first.value.slice(m[0].length);
      if (!first.value && p.children[1]?.type === "element" && (p.children[1] as Element).tagName === "br") p.children.splice(1, 1);
      node.tagName = "aside";
      node.properties = { className: ["callout", `callout-${kind}`] };
      node.children.unshift(el("div", { className: ["callout-title"] }, [text(title)]));
    });
  };
}

/** Rewrite relative image/link URLs to the copied files under /files, and .md links to report pages. */
function rehypeRewriteUrls(opts: Options) {
  const resolve = (u: string) => path.posix.normalize(path.posix.join(opts.baseDir, decodeURI(u)));
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      for (const attr of ["src", "href", "poster", "data"] as const) {
        const v = node.properties?.[attr];
        if (typeof v !== "string" || !v || isExternal(v)) continue;
        const [p, hash = ""] = v.split("#");
        const rel = resolve(p);
        if (attr === "href" && /\.(md|markdown|mdx|html?)$/i.test(p)) {
          const page = opts.resolveReportLink(rel);
          if (page) { node.properties[attr] = page + (hash ? "#" + hash : ""); continue; }
        }
        node.properties[attr] = "/files/" + encodeURI(rel) + (hash ? "#" + hash : "");
      }
      if (node.tagName === "img") {
        node.properties.loading = "lazy";
        node.properties.decoding = "async";
      }
      if (node.tagName === "a" && typeof node.properties.href === "string" && /^https?:/.test(node.properties.href)) {
        node.properties.target = "_blank";
        node.properties.rel = ["noopener", "noreferrer"];
      }
    });
  };
}

/** Wrap tables for horizontal scroll; standalone images become figures with captions. */
function rehypeLayout() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (node.tagName === "table" && !(parent as Element).properties?.className?.toString().includes("table-wrap")) {
        const cls = node.properties.className;
        node.properties.className = [...(Array.isArray(cls) ? cls : []), "sortable"];
        parent.children[index] = el("div", { className: ["table-wrap"] }, [node]);
        return SKIP;
      }
      if (node.tagName === "p") {
        const kids = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
        if (kids.length === 1 && kids[0].type === "element" && kids[0].tagName === "img") {
          const img = kids[0];
          const alt = String(img.properties.alt ?? "");
          const caption = String(img.properties.title ?? "") || alt;
          parent.children[index] = el("figure", { className: ["img-figure"] }, [
            img,
            ...(caption ? [el("figcaption", {}, [text(caption)])] : []),
          ]);
          return SKIP;
        }
      }
    });
  };
}

function rehypeToc(toc: TocItem[]) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const m = node.tagName.match(/^h([23])$/);
      if (m && node.properties.id) toc.push({ id: String(node.properties.id), text: toString(node), depth: Number(m[1]) });
    });
  };
}

export async function renderMarkdown(md: string, opts: Options): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSpecialBlocks)
    .use(rehypeCallouts)
    .use(rehypeRewriteUrls, opts)
    .use(rehypeLayout)
    .use(rehypeSlug)
    .use(rehypeToc(toc))
    .use(rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["heading-link"] } })
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypeHighlight, { detect: false, ignoreMissing: true } as never)
    .use(rehypeStringify)
    .process(md);
  return { html: String(file), toc };
}
