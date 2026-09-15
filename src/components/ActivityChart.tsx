import type { DailyActivityPoint } from "@/types/analytics";

interface ActivityChartProps {
  data: DailyActivityPoint[];
  /** Which series to render. Defaults to "trades". */
  series?: "trades" | "activeUsers" | "listings";
  label?: string;
}

const SERIES_COLORS: Record<string, string> = {
  trades: "#0ea5e9",
  activeUsers: "#8b5cf6",
  listings: "#10b981",
};

const SERIES_LABELS: Record<string, string> = {
  trades: "Trades",
  activeUsers: "Active users",
  listings: "Listings viewed",
};

const CHART_HEIGHT = 120;
const BAR_WIDTH = 28;
const BAR_GAP = 8;

/**
 * Lightweight SVG bar chart — no external charting library required.
 * Renders the selected series from the daily activity data.
 */
export function ActivityChart({
  data,
  series = "trades",
  label,
}: ActivityChartProps) {
  const values = data.map((d) => d[series] as number);
  const max = Math.max(...values, 1); // prevent division by zero

  const svgWidth = data.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const color = SERIES_COLORS[series];
  const seriesLabel = label ?? SERIES_LABELS[series];

  return (
    <div className="rounded-2xl border border-brand-muted/20 bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-brand-muted">
        {seriesLabel} · last {data.length} days
      </p>

      {values.every((v) => v === 0) ? (
        <div className="flex h-[120px] items-center justify-center rounded-xl bg-slate-50 text-sm text-brand-muted">
          No activity yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            width={svgWidth}
            height={CHART_HEIGHT + 24}
            aria-label={`${seriesLabel} bar chart`}
            role="img"
          >
            {values.map((val, i) => {
              const barH = Math.max((val / max) * CHART_HEIGHT, val > 0 ? 4 : 0);
              const x = i * (BAR_WIDTH + BAR_GAP);
              const y = CHART_HEIGHT - barH;
              const dateLabel = data[i].date.slice(5); // MM-DD

              return (
                <g key={data[i].date}>
                  <rect
                    x={x}
                    y={y}
                    width={BAR_WIDTH}
                    height={barH}
                    rx={5}
                    fill={color}
                    fillOpacity={0.85}
                  >
                    <title>
                      {data[i].date}: {val}
                    </title>
                  </rect>
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT + 16}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#94a3b8"
                  >
                    {dateLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
