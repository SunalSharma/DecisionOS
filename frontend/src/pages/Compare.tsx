import { useMemo, useState, type FormEvent } from "react";
import { compare, generateScenarios } from "../api/client";
import { FAIL_FIXTURE_REQUEST, INFEASIBLE_COMPARE_FIXTURE, PASS_FIXTURE_REQUEST } from "../api/mocks";
import ComparisonTable from "../components/ComparisonTable";
import RecommendationPanel from "../components/RecommendationPanel";
import TradeOffChart from "../components/TradeOffChart";
import { joinCompareOutcomes } from "../lib/joinCompare";
import type { CompareResponse, SimulateRequest } from "../types/domain";

interface ComparePageProps {
  baseScenario: SimulateRequest;
}

export default function ComparePage({ baseScenario }: ComparePageProps) {
  const [count, setCount] = useState(4);
  const [strategy, setStrategy] = useState<string>("balanced");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const rows = useMemo(() => (result ? joinCompareOutcomes(result) : []), [result]);

  async function run(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const generated = await generateScenarios({
        base_scenario: baseScenario,
        count,
        strategy: strategy === "balanced" ? null : strategy,
      });
      const compared = await compare({
        scenarios: generated.outcomes.map((o) => o.scenario),
      });
      setResult(compared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={run}
        className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-[16rem] flex-1">
          <h2 className="text-lg font-semibold text-slate-50">Generate & compare variants</h2>
          <p className="mt-1 text-sm text-slate-400">
            Base: <span className="text-slate-200">{baseScenario.name ?? "unnamed"}</span> ·{" "}
            {baseScenario.resources.teams} teams · {baseScenario.resources.vehicles} vehicles ·
            budget {baseScenario.resources.budget.toLocaleString()} · deadline{" "}
            {baseScenario.constraints.deadline_min} min
          </p>
        </div>
        <label className="text-sm">
          <span className="text-slate-300">Count</span>
          <input
            type="number"
            min={2}
            max={8}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 block w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-300">Strategy</span>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="balanced">balanced (null)</option>
            <option value="speed">speed</option>
            <option value="cost">cost</option>
            <option value="coverage">coverage</option>
            <option value="infeasible">infeasible (mock stress)</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate & rank"}
        </button>
        <button
          type="button"
          className="rounded-md border border-amber-600 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/40"
          onClick={() => setResult(INFEASIBLE_COMPARE_FIXTURE)}
        >
          Show infeasible fixture
        </button>
      </form>

      {error ? (
        <p className="rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <RecommendationPanel recommendation={result.recommendation} />
          <ComparisonTable rows={rows} recommendation={result.recommendation} />
          <TradeOffChart rows={rows} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
          Generate variants from the builder scenario, or load the infeasible fixture to see the
          empty-recommendation state. PASS fixture name: {PASS_FIXTURE_REQUEST.name}. FAIL fixture
          name: {FAIL_FIXTURE_REQUEST.name}.
        </div>
      )}
    </div>
  );
}
