type Point = {
  label: string;
  value: number;
};

function buildPath(points: Point[], width: number, height: number) {
  if (!points.length) return '';
  const max = Math.max(...points.map((point) => point.value), 4);
  const min = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(max - min, 0.01);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function Sparkline({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="text-xs text-muted-foreground">No trend data yet.</p>;
  }

  const width = 260;
  const height = 72;
  const path = buildPath(data, width, height);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="h-20">
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
