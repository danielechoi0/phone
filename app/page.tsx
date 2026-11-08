import { getAllReports } from "@/lib/reports";
import ReportList from "@/components/ReportList";

export default function Home() {
  const reports = getAllReports();
  return (
    <div className="container">
      <h1 className="page-title">Reports</h1>
      <p className="page-sub">{reports.length} report{reports.length === 1 ? "" : "s"} · newest first</p>
      {reports.length === 0 ? (
        <div className="empty">
          No reports yet. Push a markdown file to <code>reports/</code> and it will appear here.
        </div>
      ) : (
        <ReportList reports={reports} />
      )}
    </div>
  );
}
