import { useState, type ReactNode } from "react";
import { USE_MOCKS } from "./api/client";
import { PASS_FIXTURE_REQUEST } from "./api/mocks";
import ScenarioBuilder from "./pages/ScenarioBuilder";
import type { SimulateRequest, SimulateResponse } from "./types/domain";

type View = "builder" | "compare";

export default function App() {
  const [view, setView] = useState<View>("builder");
  const [scenario, setScenario] = useState<SimulateRequest>(PASS_FIXTURE_REQUEST);
  const [simulateResult, setSimulateResult] = useState<SimulateResponse | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
              DecisionOS · Resonance 1.0 · PS7
            </p>
            <h1 className="mt-1 text-xl font-semibold">Emergency Resource Allocation</h1>
            <p className="mt-1 text-sm text-slate-400">
              {USE_MOCKS
                ? "Running against mocked API responses (set VITE_USE_MOCKS=false for FastAPI)."
                : `Live API · ${import.meta.env.VITE_API_BASE_URL}`}
            </p>
          </div>
          <nav className="flex gap-2">
            <NavButton active={view === "builder"} onClick={() => setView("builder")}>
              Scenario builder
            </NavButton>
            <NavButton active={view === "compare"} onClick={() => setView("compare")}>
              Compare variants
            </NavButton>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {view === "builder" ? (
          <ScenarioBuilder
            value={scenario}
            onChange={setScenario}
            result={simulateResult}
            onResult={setSimulateResult}
            resultSlot={
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
                Run a simulation to see response time, cost, coverage, and constraint checks.
              </div>
            }
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
            Variant generation and ranking land next. Base scenario: {scenario.name ?? "unnamed"}.
          </div>
        )}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-amber-500 text-slate-950"
          : "border border-slate-700 text-slate-300 hover:border-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
