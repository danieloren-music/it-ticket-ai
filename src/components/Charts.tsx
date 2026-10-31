'use client';

/** Dependency-free charts: daily volume columns and horizontal distribution bars. */
export function DailyBars({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <figure aria-label={label}>
      <div className="flex h-32 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${d.count}`}>
            <div className="w-full rounded-t bg-brand/80 transition group-hover:bg-brand" style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-ink-soft tnum"><span>{data[0]?.date.slice(5)}</span><span>{data[data.length - 1]?.date.slice(5)}</span></figcaption>
    </figure>
  );
}

export function Distribution({ items }: { items: { name: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return null;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name} className="text-sm">
          <div className="mb-1 flex justify-between"><span>{i.name}</span><span className="font-semibold tnum">{i.value}</span></div>
          <div className="h-1.5 rounded-full bg-canvas"><div className="h-full rounded-full bg-brand" style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
