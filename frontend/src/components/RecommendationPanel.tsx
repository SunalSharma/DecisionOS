import { formatINR } from "../lib/currency";
import type { Recommendation, ScenarioOutcome } from "../types/domain";

interface RecommendationPanelProps {
  recommendation: Recommendation;
  outcome: ScenarioOutcome | null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-slate-950/25 px-3 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-200/70">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-emerald-50">{value}</dd>
    </div>
  );
}

export default function RecommendationPanel({ recommendation, outcome }: RecommendationPanelProps) {
  if (!recommendation.feasible) {
    return (
      <section className="rounded-xl border-2 border-amber-500 bg-amber-950/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
          Recommendation
        </p>
        <h3 className="mt-1 text-xl font-bold text-amber-100">No feasible scenario found</h3>
        <p className="mt-2 text-sm text-amber-100/90">
          Every generated variant failed at least one hard constraint. Nothing is recommended for
          deployment.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-50">
          {recommendation.reasoning.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-emerald-600/70 bg-emerald-950/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
        Recommendation
      </p>
      <h3 className="mt-1 text-xl font-bold text-emerald-100">
        {outcome?.scenario.name ?? "Feasible allocation selected"}
      </h3>
      <p className="mt-1 text-sm text-emerald-100/85">Recommended deployment option</p>

      {outcome ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Decision score" value={outcome.score_breakdown.score.toFixed(1)} />
          <Metric label="Response time" value={`${outcome.result.response_time_min} min`} />
          <Metric label="Cost" value={formatINR(outcome.result.cost)} />
          <Metric label="Coverage" value={`${outcome.result.coverage_pct}%`} />
          <Metric label="Risk" value={outcome.result.risk} />
          <Metric label="Status" value="✓ Feasible" />
        </dl>
      ) : null}

      <p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-emerald-300">Why this option</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-50">
        {recommendation.reasoning.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
