import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimulateResponse } from "../types/domain";

const RISK_SCORE = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

interface ResultCardProps {
  data: SimulateResponse;
}

export default function ResultCard({ data }: ResultCardProps) {
  const failed = data.constraint_check.status === "FAIL";
  const { result } = data;

  const chartRows = [
    { metric: "Response time (min)", value: result.response_time_min },
    { metric: "Cost ($k)", value: Math.round(result.cost) / 1000 },
    { metric: "Coverage %", value: result.coverage_pct },
    { metric: "Risk (1–3)", value: RISK_SCORE[result.risk] },
  ];

  return (
    <article
      className={`overflow-hidden rounded-xl border shadow-xl shadow-slate-950/40 ${
        failed
          ? "border-rose-600 bg-rose-950/25"
          : "border-emerald-700/70 bg-slate-900/80"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${
          failed ? "bg-rose-950/70" : "bg-emerald-950/50"
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300">Simulation result</p>
          <h3 className="text-lg font-semibold text-white">
            {failed ? "Constraints FAILED" : "Constraints PASS"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone={failed ? "fail" : "pass"}>{data.constraint_check.status}</Badge>
          <Badge tone={riskTone(result.risk)}>Risk {result.risk}</Badge>
          <Badge tone="neutral">Score {data.score_breakdown.score}</Badge>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Response time" value={`${result.response_time_min} min`} />
          <Stat label="Cost" value={result.cost.toLocaleString()} />
          <Stat label="Coverage" value={`${result.coverage_pct}%`} />
          <Stat label="Utilization" value={`${result.resource_utilization_pct}%`} />
          <Stat label="Demand covered" value={String(result.demand_covered)} />
          <Stat label="Scenario" value={data.scenario_id} mono />
        </dl>

        {failed ? (
          <section className="rounded-lg border border-rose-600/80 bg-rose-950/40 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-rose-200">
              Constraint violations
            </h4>
            <p className="mt-1 text-xs text-rose-200/80">
              This allocation is not deployable as-is. Each miss lists the limit vs. actual.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-rose-300/80">
                  <tr>
                    <th className="py-1 pr-3">Constraint</th>
                    <th className="py-1 pr-3">Limit</th>
                    <th className="py-1 pr-3">Actual</th>
                    <th className="py-1">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {data.constraint_check.violations.map((v) => (
                    <tr key={v.name} className="border-t border-rose-800/80 text-rose-50">
                      <td className="py-2 pr-3 font-mono text-xs">{v.name}</td>
                      <td className="py-2 pr-3">{v.limit}</td>
                      <td className="py-2 pr-3 font-semibold">{v.actual}</td>
                      <td className="py-2 text-rose-100">{v.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <p className="rounded-md border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            Deadline and budget hold under this allocation. Review the score breakdown before
            promoting the scenario.
          </p>
        )}

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }}
              />
              <Bar dataKey="value" fill={failed ? "#fb7185" : "#34d399"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <section>
          <h4 className="text-sm font-medium text-slate-200">Explanation</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {data.explanation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-slate-950/50 px-3 py-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-slate-100 ${mono ? "font-mono text-xs break-all" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: string;
  tone: "pass" | "fail" | "risk-low" | "risk-med" | "risk-high" | "neutral";
}) {
  const cls = {
    pass: "bg-emerald-500/20 text-emerald-200 border-emerald-600",
    fail: "bg-rose-500/20 text-rose-100 border-rose-500",
    "risk-low": "bg-sky-500/20 text-sky-100 border-sky-600",
    "risk-med": "bg-amber-500/20 text-amber-100 border-amber-600",
    "risk-high": "bg-rose-500/20 text-rose-100 border-rose-500",
    neutral: "bg-slate-800 text-slate-200 border-slate-600",
  }[tone];
  return <span className={`rounded border px-2 py-1 font-medium ${cls}`}>{children}</span>;
}

function riskTone(risk: "LOW" | "MEDIUM" | "HIGH"): "risk-low" | "risk-med" | "risk-high" {
  if (risk === "LOW") return "risk-low";
  if (risk === "MEDIUM") return "risk-med";
  return "risk-high";
}
