import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container">
      <h1 className="page-title">Not found</h1>
      <p className="page-sub">That report doesn&apos;t exist (yet). New pushes take about a minute to deploy.</p>
      <Link href="/" className="back">← All reports</Link>
    </div>
  );
}
