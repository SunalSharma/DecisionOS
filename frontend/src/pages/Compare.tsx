import { useMemo, useState, type FormEvent } from "react";
import { compare, generateScenarios } from "../api/client";
import { FAIL_FIXTURE_REQUEST, INFEASIBLE_COMPARE_FIXTURE, PASS_FIXTURE_REQUEST } from "../api/mocks";
import ComparisonTable from "../components/ComparisonTable";
import RecommendationPanel from "../components/RecommendationPanel";
import TradeOffChart from "../components/TradeOffChart";
import { joinCompareOutcomes } from "../lib/joinCompare";
import { formatINR } from "../lib/currency";
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

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      setError("Some values are out of range — check the highlighted field.");
      event.currentTarget.reportValidity();
      return;
    }
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
        onInvalidCapture={() =>
          setError("Some values are out of range — check the highlighted field.")
        }
        className="panel-surface flex flex-col gap-4 rounded-2xl border border-slate-700/70 p-5 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-[16rem] flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-300">Scenario laboratory</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-50">Generate decision options</h2>
          <p className="mt-1 text-sm text-slate-400">
            Base: <span className="text-slate-200">{baseScenario.name ?? "unnamed"}</span> ·{" "}
            {baseScenario.resources.teams} teams · {baseScenario.resources.vehicles} vehicles ·
            budget {formatINR(baseScenario.resources.budget)} · deadline{" "}
            {baseScenario.constraints.deadline_min} min
          </p>
        </div>
        <label className="text-sm">
          <span className="text-slate-300">Count</span>
          <input
            type="number"
            min={2}
            max={6}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1.5 block w-24 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 outline-none focus:border-teal-400"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-300">Strategy</span>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="mt-1.5 block rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 outline-none focus:border-teal-400"
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
          className="rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate & rank"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-rose-400/30 bg-rose-400/5 px-4 py-2.5 text-sm text-rose-200 hover:bg-rose-400/10"
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
        <div className="panel-surface rounded-2xl border border-dashed border-slate-700/80 p-7 text-sm leading-6 text-slate-400">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">Decision sweep</p>
          <p className="mt-3 max-w-xl">Generate variants from the current plan to rank feasible options across cost, response time, coverage, and risk. The stress test deliberately reveals the no-safe-option state.</p>
          <p className="mt-4 text-xs text-slate-500">Baseline: {PASS_FIXTURE_REQUEST.name} · Stress: {FAIL_FIXTURE_REQUEST.name}</p>
        </div>
      )}
    </div>
  );
}
