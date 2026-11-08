"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReportMeta } from "@/lib/reports";

const DAY = 86_400_000;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmt(iso);
}

export default function ReportList({ reports }: { reports: ReportMeta[] }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const facets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) for (const t of new Set([...(r.project ? [r.project] : []), ...r.tags])) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [reports]);

  const filtered = reports.filter((r) => {
    if (tag && r.project !== tag && !r.tags.includes(tag)) return false;
    if (!q) return true;
    const hay = `${r.title} ${r.summary} ${r.tags.join(" ")} ${r.project ?? ""}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });

  return (
    <>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search reports…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search reports"
        />
        {facets.length > 0 && (
          <div className="chips">
            <button className={!tag ? "chip on" : "chip"} onClick={() => setTag(null)}>All</button>
            {facets.map(([t, n]) => (
              <button key={t} className={tag === t ? "chip on" : "chip"} onClick={() => setTag(tag === t ? null : t)}>
                {t} <span>{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="cards">
        {filtered.map((r) => {
          const fresh = now - new Date(r.date).getTime() < DAY;
          return (
            <li key={r.slug}>
              <Link href={`/r/${r.slug}`} className="card">
                <div className="card-top">
                  {r.project && <span className="card-project">{r.project}</span>}
                  {fresh && <span className="badge-new">New</span>}
                  {r.kind === "html" && <span className="badge-kind">HTML</span>}
                  {r.status && <span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span>}
                  <time className="card-date" dateTime={r.date} suppressHydrationWarning>{relative(r.date)}</time>
                </div>
                <h2>{r.title}</h2>
                {r.summary && <p>{r.summary}</p>}
                {r.tags.length > 0 && (
                  <div className="tags">{r.tags.slice(0, 5).map((t) => <span key={t} className="tag">{t}</span>)}</div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && <div className="empty">No reports match.</div>}
    </>
  );
}
