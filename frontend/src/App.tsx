import { USE_MOCKS } from "./api/client";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-6 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">DecisionOS · Resonance 1.0</p>
        <h1 className="mt-1 text-xl font-semibold">Emergency Resource Allocation</h1>
        <p className="mt-1 text-sm text-slate-400">
          API {USE_MOCKS ? "mocked (VITE_USE_MOCKS)" : `live · ${import.meta.env.VITE_API_BASE_URL}`}
        </p>
      </header>
      <main className="px-6 py-10 text-slate-400">
        Scenario builder and compare views land in the next commits.
      </main>
    </div>
  );
}
