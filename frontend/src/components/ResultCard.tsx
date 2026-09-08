import {
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  PolarAngleAxis,
  PolarGrid,
} from "recharts";
import type { SimulateRequest, SimulateResponse } from "../types/domain";
import { formatINR } from "../lib/currency";

interface ResultCardProps {
  data: SimulateResponse;
  scenario: SimulateRequest;
}

export default function ResultCard({ data, scenario }: ResultCardProps) {
  const failed = data.constraint_check.status === "FAIL";
  const { result } = data;
  const budgetHeadroom = scenario.resources.budget - result.cost;
  const deadlineBuffer = scenario.constraints.deadline_min - result.response_time_min;

  const pulseRows = [
    { metric: "Response", value: scoreResponse(result.response_time_min, scenario.constraints.deadline_min) },
    { metric: "Cost control", value: scoreCost(result.cost, scenario.resources.budget) },
    { metric: "Coverage", value: result.coverage_pct },
    { metric: "Asset balance", value: Math.max(20, 100 - Math.abs(result.resource_utilization_pct - 82) * 2.2) },
    { metric: "Resilience", value: { LOW: 94, MEDIUM: 62, HIGH: 28 }[result.risk] },
  ];

  return (
    <article
      className={`result-reveal panel-surface overflow-hidden rounded-2xl border shadow-2xl shadow-slate-950/30 ${
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
          <Stat label="Deployment cost" value={formatINR(result.cost)} />
          <Stat label="Coverage" value={`${result.coverage_pct}%`} />
          <Stat label="Utilization" value={`${result.resource_utilization_pct}%`} />
          <Stat label="Demand covered" value={String(result.demand_covered)} />
          <Stat label="Scenario" value={data.scenario_id} mono />
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <ConstraintMeter label="Deadline buffer" value={`${deadlineBuffer >= 0 ? "+" : ""}${deadlineBuffer.toFixed(1)} min`} detail={`Target: ${scenario.constraints.deadline_min} min`} tone={deadlineBuffer >= 0 ? "teal" : "rose"} />
          <ConstraintMeter label="Budget headroom" value={`${budgetHeadroom >= 0 ? "+" : "−"}${formatINR(Math.abs(budgetHeadroom))}`} detail={`Limit: ${formatINR(scenario.resources.budget)}`} tone={budgetHeadroom >= 0 ? "teal" : "rose"} />
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

        <section className="mission-pulse relative overflow-hidden rounded-2xl border border-teal-400/20 p-4">
          <div className="pulse-scan" aria-hidden="true" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-300">Mission pulse</p>
              <h4 className="mt-1 text-base font-semibold text-white">Operational health signature</h4>
            </div>
            <span className={`pulse-score ${failed ? "text-rose-300" : "text-teal-300"}`}>{Math.round(data.score_breakdown.score)}<small>/100</small></span>
          </div>
          <div className="relative z-10 mt-1 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={pulseRows} outerRadius="69%">
                <PolarGrid stroke="rgba(94,234,212,.27)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#b8c8db", fontSize: 12, fontWeight: 600 }} />
                <Radar
                  name="Operational health"
                  dataKey="value"
                  stroke={failed ? "#fb7185" : "#2dd4bf"}
                  fill={failed ? "#fb7185" : "#2dd4bf"}
                  fillOpacity={0.31}
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
                <Tooltip
                  contentStyle={{ background: "#081421", border: "1px solid rgba(45,212,191,.55)", borderRadius: "12px", color: "#e2e8f0" }}
                  formatter={(value) => [`${Math.round(Number(value))}/100`, "Signal strength"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="relative z-10 grid grid-cols-5 gap-1 border-t border-teal-400/15 pt-3">
            {pulseRows.map((signal) => (
              <div key={signal.metric} className="text-center">
                <p className="text-[10px] text-slate-500">{signal.metric}</p>
                <p className={`mt-1 text-sm font-bold ${failed ? "text-rose-200" : "text-teal-200"}`}>{Math.round(signal.value)}</p>
              </div>
            ))}
          </div>
        </section>

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
  return <span className={`outcome-badge rounded border px-2 py-1 font-medium ${cls}`}>{children}</span>;
}

function scoreResponse(response: number, deadline: number) {
  return Math.max(5, Math.min(100, 100 - Math.max(0, response - deadline) * 8 - (response / deadline) * 18));
}

function scoreCost(cost: number, budget: number) {
  return Math.max(5, Math.min(100, 100 - Math.max(0, cost - budget) / Math.max(budget, 1) * 100 - (cost / budget) * 36));
}

function riskTone(risk: "LOW" | "MEDIUM" | "HIGH"): "risk-low" | "risk-med" | "risk-high" {
  if (risk === "LOW") return "risk-low";
  if (risk === "MEDIUM") return "risk-med";
  return "risk-high";
}
