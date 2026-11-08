import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllReports, getReport } from "@/lib/reports";
import { formatDate } from "@/lib/format";
import ReportEnhancer from "@/components/ReportEnhancer";
import Toc from "@/components/Toc";

type Props = { params: Promise<{ slug: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllReports().map((r) => ({ slug: r.slug.split("/") }));
}

const slugOf = (s: string[]) => s.map(decodeURIComponent).join("/");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getReport(slugOf((await params).slug));
  return r ? { title: r.title, description: r.summary } : {};
}

export default async function ReportPage({ params }: Props) {
  const slug = slugOf((await params).slug);
  const report = await getReport(slug);
  if (!report) notFound();

  const all = getAllReports();
  const i = all.findIndex((r) => r.slug === slug);
  const newer = all[i - 1];
  const older = all[i + 1];

  return (
    <article className={report.kind === "html" ? "container wide" : "container"}>
      <Link href="/" className="back">← All reports</Link>
      <header className="report-head">
        {(report.project || report.status) && (
          <div className="eyebrow">
            {report.project && <span>{report.project}</span>}
            {report.status && <span className={`status status-${report.status.toLowerCase()}`}>{report.status}</span>}
          </div>
        )}
        <h1>{report.title}</h1>
        <div className="meta">
          <time dateTime={report.date}>{formatDate(report.date, { dateStyle: "long", timeStyle: "short" })}</time>
          {report.kind === "markdown" && <span>· {report.readingMinutes} min read</span>}
        </div>
        {report.tags.length > 0 && (
          <div className="tags">{report.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
        )}
      </header>

      {report.kind === "html" ? (
        <div className="html-report">
          <a className="open-full" href={report.src} target="_blank" rel="noreferrer">Open full screen ↗</a>
          <iframe src={report.src} title={report.title} />
        </div>
      ) : (
        <>
          {report.toc.length > 2 && <Toc items={report.toc} />}
          <div className="prose" dangerouslySetInnerHTML={{ __html: report.html }} />
          <ReportEnhancer />
          <div className="source">
            <a href={"/files/" + encodeURI(report.file)}>View source markdown</a>
          </div>
        </>
      )}

      <nav className="pager">
        {older ? <Link href={`/r/${older.slug}`}><small>← Older</small>{older.title}</Link> : <span />}
        {newer ? <Link href={`/r/${newer.slug}`} className="right"><small>Newer →</small>{newer.title}</Link> : <span />}
      </nav>
    </article>
  );
}
