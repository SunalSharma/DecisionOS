import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimulateRequest, SimulateResponse } from "../types/domain";

const RISK_SCORE = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

interface ResultCardProps {
  data: SimulateResponse;
  scenario: SimulateRequest;
}

export default function ResultCard({ data, scenario }: ResultCardProps) {
  const failed = data.constraint_check.status === "FAIL";
  const { result } = data;
  const budgetHeadroom = scenario.resources.budget - result.cost;
  const deadlineBuffer = scenario.constraints.deadline_min - result.response_time_min;

  const chartRows = [
    { metric: "Response time (min)", value: result.response_time_min },
    { metric: "Cost ($k)", value: Math.round(result.cost) / 1000 },
    { metric: "Coverage %", value: result.coverage_pct },
    { metric: "Risk (1–3)", value: RISK_SCORE[result.risk] },
  ];

  return (
    <article
      className={`panel-surface overflow-hidden rounded-2xl border shadow-2xl shadow-slate-950/30 ${
        failed
          ? "border-rose-500/60"
          : "border-teal-400/35"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${
          failed ? "bg-rose-950/50" : "bg-teal-400/8"
        }`}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Decision outcome</p>
          <h3 className="mt-1 text-xl font-semibold text-white">
            {failed ? "Plan needs attention" : "Plan is deployable"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone={failed ? "fail" : "pass"}>{data.constraint_check.status}</Badge>
          <Badge tone={riskTone(result.risk)}>{`Risk ${result.risk}`}</Badge>
          <Badge tone="neutral">{`Score ${data.score_breakdown.score}`}</Badge>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Response time" value={`${result.response_time_min} min`} />
          <Stat label="Deployment cost" value={`$${result.cost.toLocaleString()}`} />
          <Stat label="Coverage" value={`${result.coverage_pct}%`} />
          <Stat label="Utilization" value={`${result.resource_utilization_pct}%`} />
          <Stat label="Demand covered" value={String(result.demand_covered)} />
          <Stat label="Scenario" value={data.scenario_id} mono />
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <ConstraintMeter label="Deadline buffer" value={`${deadlineBuffer >= 0 ? "+" : ""}${deadlineBuffer.toFixed(1)} min`} detail={`Target: ${scenario.constraints.deadline_min} min`} tone={deadlineBuffer >= 0 ? "teal" : "rose"} />
          <ConstraintMeter label="Budget headroom" value={`${budgetHeadroom >= 0 ? "+" : "−"}$${Math.abs(budgetHeadroom).toLocaleString()}`} detail={`Limit: $${scenario.resources.budget.toLocaleString()}`} tone={budgetHeadroom >= 0 ? "teal" : "rose"} />
        </div>

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
          <p className="rounded-xl border border-teal-400/20 bg-teal-400/8 px-3.5 py-3 text-sm leading-5 text-teal-100">
            Hard constraints hold. This configuration is ready for a decision review—use the score and trade-offs to determine whether to promote it.
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

function ConstraintMeter({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "teal" | "rose" }) {
  const cls = tone === "teal" ? "border-teal-400/20 bg-teal-400/5 text-teal-200" : "border-rose-400/20 bg-rose-400/5 text-rose-200";
  return <div className={`rounded-xl border px-3.5 py-3 ${cls}`}><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 text-base font-semibold">{value}</p><p className="mt-1 text-xs opacity-70">{detail}</p></div>;
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
