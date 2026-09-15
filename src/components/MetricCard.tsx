interface MetricCardProps {
  label: string;
  value: number | string;
  description?: string;
  icon: string;
}

export function MetricCard({ label, value, description, icon }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-brand-muted/20 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-muted">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-brand-muted">{description}</p>
          )}
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-xl"
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
    </article>
  );
}
