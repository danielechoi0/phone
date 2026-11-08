import type { TocItem } from "@/lib/markdown";

export default function Toc({ items }: { items: TocItem[] }) {
  return (
    <details className="toc">
      <summary>Contents <span className="toc-count">{items.length}</span></summary>
      <ol>
        {items.map((t) => (
          <li key={t.id} className={`toc-d${t.depth}`}>
            <a href={`#${t.id}`}>{t.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}
