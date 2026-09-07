import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { JoinedOutcome } from "../lib/joinCompare";

interface TradeOffChartProps {
  rows: JoinedOutcome[];
}

export default function TradeOffChart({ rows }: TradeOffChartProps) {
  const data = rows.map((row) => ({
    id: row.scenario_id,
    name: row.outcome.scenario.name ?? row.scenario_id,
    cost: row.trade?.cost ?? row.outcome.result.cost,
    response: row.trade?.response_time_min ?? row.outcome.result.response_time_min,
    score: row.trade?.score ?? row.outcome.score_breakdown.score,
    recommended: row.recommended,
    fail: row.outcome.constraint_check.status === "FAIL",
  }));

  return (
    <div className="h-80 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="mb-2 text-sm font-medium text-slate-200">
        Trade-offs · cost vs. response time (point size = score)
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="cost"
            name="Cost"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{ value: "Cost", position: "insideBottom", offset: -2, fill: "#64748b" }}
          />
          <YAxis
            type="number"
            dataKey="response"
            name="Response"
            unit=" min"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{ value: "Response (min)", angle: -90, position: "insideLeft", fill: "#64748b" }}
          />
          <ZAxis type="number" dataKey="score" range={[60, 260]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }}
            formatter={(value, name) => [value, String(name)]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
          />
          <Scatter
            data={data.filter((d) => d.recommended && !d.fail)}
            fill="#f59e0b"
            name="Recommended"
          />
          <Scatter
            data={data.filter((d) => !d.recommended && !d.fail)}
            fill="#34d399"
            name="Feasible"
          />
          <Scatter
            data={data.filter((d) => d.fail)}
            fill="#fb7185"
            name="Infeasible"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
