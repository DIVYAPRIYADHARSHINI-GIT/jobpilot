"use client";
// Recharts wrappers with theme-aware colours. Fixed-height containers with a
// debounce on resize keep layout stable (no resize/render loops).
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "./ThemeProvider";

function colors(dark: boolean) {
  return {
    grid: dark ? "#1e293b" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#64748b",
    bar: dark ? "#818cf8" : "#4f46e5",
    tooltip: { background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 12, fontSize: 12, color: dark ? "#e2e8f0" : "#0f172a" },
  };
}

export function WeeklyChart({ data, label }: { data: Array<{ name: string; count: number }>; label: string }) {
  const { dark } = useTheme();
  const c = colors(dark);
  return (
    <div className="h-64" data-testid="weekly-chart">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: dark ? "#1e293b" : "#eef2ff" }} contentStyle={c.tooltip} formatter={(v) => [v, label]} />
          <Bar dataKey="count" fill={c.bar} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const { dark } = useTheme();
  const c = colors(dark);
  const shown = data.filter((d) => d.value > 0);
  return (
    <div className="h-52" data-testid="pipeline-chart">
      <ResponsiveContainer width="100%" height="100%" debounce={150} minWidth={0}>
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke={dark ? "#0f172a" : "#fff"} isAnimationActive={false}>
            {shown.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={c.tooltip} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
