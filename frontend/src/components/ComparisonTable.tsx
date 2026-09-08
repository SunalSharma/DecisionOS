import type { JoinedOutcome } from "../lib/joinCompare";
import type { CompareResponse } from "../types/domain";
import { formatINR } from "../lib/currency";

interface ComparisonTableProps {
  rows: JoinedOutcome[];
  recommendation: CompareResponse["recommendation"];
}

export default function ComparisonTable({ rows, recommendation }: ComparisonTableProps) {
  const sorted = [...rows].sort((a, b) => (a.rank?.rank ?? 99) - (b.rank?.rank ?? 99));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Generated scenario comparison</caption>
        <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th scope="col" className="px-3 py-3">Rank</th>
            <th scope="col" className="px-3 py-3">Scenario</th>
            <th scope="col" className="px-3 py-3">Score</th>
            <th scope="col" className="px-3 py-3">Constraints</th>
            <th scope="col" className="px-3 py-3">Response</th>
            <th scope="col" className="px-3 py-3">Cost</th>
            <th scope="col" className="px-3 py-3">Coverage</th>
            <th scope="col" className="px-3 py-3">Risk</th>
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
                <td className="px-3 py-3 font-semibold text-slate-100">
                  <span className="inline-flex min-w-7 justify-center rounded-full bg-slate-800 px-2 py-1 text-xs">
                    {row.rank?.rank ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-100">
                    {row.outcome.scenario.name ?? "Unnamed"}
                    {highlight ? (
                      <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-950">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 font-semibold text-slate-100">
                  {(row.rank?.score ?? row.outcome.score_breakdown.score).toFixed(1)}
                </td>
                <td className="px-3 py-3">
                  <span className={fail ? "font-semibold text-rose-300" : "font-semibold text-emerald-300"}>
                    {fail ? "✕ Constraint issue" : "✓ Feasible"}
                  </span>
                </td>
                <td className="px-3 py-3">{row.outcome.result.response_time_min} min</td>
                <td className="px-3 py-3">{formatINR(row.outcome.result.cost)}</td>
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
