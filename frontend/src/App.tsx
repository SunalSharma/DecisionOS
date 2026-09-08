import { useEffect, useState, type ReactNode } from "react";
import { USE_MOCKS } from "./api/client";
import { PASS_FIXTURE_REQUEST } from "./api/mocks";
import ResultCard from "./components/ResultCard";
import ComparePage from "./pages/Compare";
import ScenarioBuilder from "./pages/ScenarioBuilder";
import type { SimulateRequest, SimulateResponse } from "./types/domain";

type View = "builder" | "compare";
type Theme = "dark" | "light";

export default function App() {
  const [view, setView] = useState<View>("builder");
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem("decisionos-theme") === "light" ? "light" : "dark",
  );
  const [scenario, setScenario] = useState<SimulateRequest>(PASS_FIXTURE_REQUEST);
  const [simulateResult, setSimulateResult] = useState<SimulateResponse | null>(null);

  useEffect(() => {
    window.localStorage.setItem("decisionos-theme", theme);
  }, [theme]);

  return (
    <div className={`command-canvas min-h-screen text-slate-100 ${theme === "light" ? "light-mode" : ""}`}>
      <div className="grid-glow pointer-events-none fixed inset-0" />
      <div className="aurora aurora-one pointer-events-none fixed" />
      <div className="aurora aurora-two pointer-events-none fixed" />
      <div className="energy-beam beam-one pointer-events-none fixed" />
      <div className="energy-beam beam-two pointer-events-none fixed" />
      <div className="data-particle particle-one pointer-events-none fixed">+</div>
      <div className="data-particle particle-two pointer-events-none fixed">×</div>
      <div className="data-particle particle-three pointer-events-none fixed">◦</div>
      <header className="command-header relative border-b border-slate-800/80 bg-[#081421]/85 px-5 py-4 backdrop-blur-xl lg:px-8">
        <div className="header-shell mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="header-brand flex items-center gap-3">
            <div className="brand-mark grid h-10 w-10 place-items-center rounded-xl border border-teal-400/30 bg-teal-400/10 text-lg text-teal-300">◈</div>
            <div className="brand-copy">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-teal-300">DecisionOS / command center</p>
              <h1 className="brand-title mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">Emergency allocation intelligence</h1>
              <p className="brand-quote"><span>“</span>AI that turns ‘send more vans’ into a plan you can defend.<span>”</span></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 sm:block">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-teal-300 signal-dot" />
              {USE_MOCKS ? "Training data stream" : "Live decision engine"}
            </div>
            <nav className="flex rounded-xl border border-slate-700/80 bg-slate-900/70 p-1">
              <NavButton active={view === "builder"} onClick={() => setView("builder")}>Plan</NavButton>
              <NavButton active={view === "compare"} onClick={() => setView("compare")}>Explore</NavButton>
            </nav>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className="theme-toggle rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-teal-400/50"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1440px] px-5 py-7 lg:px-8 lg:py-9">
        <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="hero-command">
            <p className="hero-kicker text-xs font-medium uppercase tracking-[.18em] text-slate-500"><span className="kicker-signal" />Operational picture / Sector 07</p>
            <div className="hero-title-wrap">
              <span className="hero-orb orb-left" aria-hidden="true" />
              <span className="hero-orb orb-right" aria-hidden="true" />
              <h2 className="hero-title mt-3 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {view === "builder" ? "Model the next move." : "Compare the trade-offs."}
              </h2>
              <span className="hero-underline" aria-hidden="true" />
            </div>
            <div className="hero-engine-badge"><span>✦</span> Live decision engine</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {view === "builder"
                ? "Build a defensible deployment plan. Every adjustment is evaluated against speed, coverage, cost, and hard operational limits."
                : "Generate alternative plans, surface the best feasible decision, and make the compromise visible before deployment."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[355px]">
            <MiniMetric label="Readiness" value={`${Math.min(99, 55 + scenario.resources.teams * 4)}%`} tone="teal" />
            <MiniMetric label="Assets" value={String(scenario.resources.vehicles)} tone="blue" />
            <MiniMetric label="Target" value={`${scenario.constraints.deadline_min}m`} tone="amber" />
          </div>
        </section>
        {view === "builder" ? (
          <ScenarioBuilder
            value={scenario}
            onChange={setScenario}
            result={simulateResult}
            onResult={setSimulateResult}
            resultSlot={
              simulateResult ? (
                <ResultCard data={simulateResult} scenario={scenario} />
              ) : (
                <div className="decision-canvas panel-surface relative overflow-hidden rounded-2xl border border-slate-700/70 p-7">
                  <div className="absolute -right-10 -top-8 h-40 w-40 rounded-full border border-teal-400/15" />
                  <div className="holo-stage" aria-hidden="true">
                    <div className="holo-orbit orbit-a"><span /></div>
                    <div className="holo-orbit orbit-b"><span /></div>
                    <div className="holo-orbit orbit-c"><span /></div>
                    <div className="holo-radar"><i /><i /><i /><b>◈</b></div>
                    <div className="holo-node node-a" /><div className="holo-node node-b" /><div className="holo-node node-c" />
                    <div className="holo-line line-a" /><div className="holo-line line-b" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">Decision canvas</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Your scenario is ready to model.</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Run the simulation to expose operational performance, constraint headroom, and an explainable recommendation.</p>
                  <div className="decision-steps mt-8 grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3"><b className="block text-lg text-white">01</b>Configure</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3"><b className="block text-lg text-white">02</b>Simulate</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3"><b className="block text-lg text-white">03</b>Decide</div>
                  </div>
                </div>
              )
            }
          />
        ) : (
          <ComparePage baseScenario={scenario} />
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
        active ? "bg-teal-400 text-slate-950 shadow-sm" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "teal" | "blue" | "amber" }) {
  const color = { teal: "text-teal-300", blue: "text-sky-300", amber: "text-amber-300" }[tone];
  return <div className="mini-metric rounded-xl border border-slate-700/70 bg-slate-900/55 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p></div>;
}
