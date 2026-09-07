import type { Recommendation } from "../types/domain";

interface RecommendationPanelProps {
  recommendation: Recommendation;
}

export default function RecommendationPanel({ recommendation }: RecommendationPanelProps) {
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
        <p className="mt-4 text-xs text-amber-200/80">
          recommended_scenario_id: {recommendation.recommended_scenario_id ?? "null"}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-emerald-600/70 bg-emerald-950/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
        Recommendation
      </p>
      <h3 className="mt-1 text-xl font-bold text-emerald-100">Feasible allocation selected</h3>
      <p className="mt-2 font-mono text-xs text-emerald-200/80">
        {recommendation.recommended_scenario_id}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-50">
        {recommendation.reasoning.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
