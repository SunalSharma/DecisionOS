import type { JoinedOutcome } from "../lib/joinCompare";
import type { CompareResponse } from "../types/domain";

interface ComparisonTableProps {
  rows: JoinedOutcome[];
  recommendation: CompareResponse["recommendation"];
}

export default function ComparisonTable({ rows, recommendation }: ComparisonTableProps) {
  const sorted = [...rows].sort((a, b) => (a.rank?.rank ?? 99) - (b.rank?.rank ?? 99));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-3">Rank</th>
            <th className="px-3 py-3">Scenario</th>
            <th className="px-3 py-3">Score</th>
            <th className="px-3 py-3">Constraints</th>
            <th className="px-3 py-3">Response</th>
            <th className="px-3 py-3">Cost</th>
            <th className="px-3 py-3">Coverage</th>
            <th className="px-3 py-3">Risk</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const highlight = row.recommended && recommendation.feasible;
            const fail = row.outcome.constraint_check.status === "FAIL";
            return (
              <tr
                key={row.scenario_id}
                className={`border-t border-slate-800 ${
                  highlight
                    ? "bg-amber-500/15 ring-1 ring-inset ring-amber-400/70"
                    : fail
                      ? "bg-rose-950/20"
                      : ""
                }`}
              >
                <td className="px-3 py-3 font-semibold text-slate-100">{row.rank?.rank ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-100">
                    {row.outcome.scenario.name ?? "Unnamed"}
                    {highlight ? (
                      <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-950">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">{row.scenario_id}</div>
                </td>
                <td className="px-3 py-3">{row.rank?.score ?? row.outcome.score_breakdown.score}</td>
                <td className="px-3 py-3">
                  <span className={fail ? "font-semibold text-rose-300" : "text-emerald-300"}>
                    {row.outcome.constraint_check.status}
                  </span>
                </td>
                <td className="px-3 py-3">{row.outcome.result.response_time_min} min</td>
                <td className="px-3 py-3">{row.outcome.result.cost.toLocaleString()}</td>
                <td className="px-3 py-3">{row.outcome.result.coverage_pct}%</td>
                <td className="px-3 py-3">{row.outcome.result.risk}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
