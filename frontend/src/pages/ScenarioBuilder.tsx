import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FAIL_FIXTURE_REQUEST, PASS_FIXTURE_REQUEST } from "../api/mocks";
import { simulate } from "../api/client";
import { prioritySum, setPriorityValue, type PriorityKey } from "../lib/priorities";
import type { Priorities, SimulateRequest, SimulateResponse } from "../types/domain";

interface ScenarioBuilderProps {
  value: SimulateRequest;
  onChange: (next: SimulateRequest) => void;
  result: SimulateResponse | null;
  onResult: (result: SimulateResponse | null) => void;
  resultSlot: ReactNode;
}

const SLIDERS: { key: PriorityKey; label: string; hint: string }[] = [
  { key: "speed", label: "Speed", hint: "Faster response time" },
  { key: "cost", label: "Cost", hint: "Stay closer to budget" },
  { key: "coverage", label: "Coverage", hint: "Serve more demand" },
];

export default function ScenarioBuilder({
  value,
  onChange,
  result,
  onResult,
  resultSlot,
}: ScenarioBuilderProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sum = useMemo(() => prioritySum(value.priorities), [value.priorities]);

  function patch(partial: Partial<SimulateRequest>) {
    onChange({ ...value, ...partial });
  }

  function patchResources(partial: Partial<SimulateRequest["resources"]>) {
    onChange({ ...value, resources: { ...value.resources, ...partial } });
  }

  function onPriority(key: PriorityKey, raw: number) {
    const priorities: Priorities = setPriorityValue(value.priorities, key, raw);
    onChange({ ...value, priorities });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    onResult(null);
    try {
      const response = await simulate(value);
      onResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Scenario builder</h2>
          <p className="mt-1 text-sm text-slate-400">
            Set allocation and priorities, then simulate a 48-hour emergency deployment.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-emerald-700/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50"
            onClick={() => {
              onChange(PASS_FIXTURE_REQUEST);
              onResult(null);
            }}
          >
            Load PASS example
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-700/60 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/50"
            onClick={() => {
              onChange(FAIL_FIXTURE_REQUEST);
              onResult(null);
            }}
          >
            Load FAIL example
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-slate-300">Scenario name</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
            value={value.name ?? ""}
            onChange={(e) => patch({ name: e.target.value || null })}
            placeholder="e.g. Coastal surge"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Teams"
            min={1}
            max={30}
            value={value.resources.teams}
            onChange={(teams) => patchResources({ teams })}
          />
          <NumberField
            label="Vehicles"
            min={1}
            max={40}
            value={value.resources.vehicles}
            onChange={(vehicles) => patchResources({ vehicles })}
          />
          <NumberField
            label="Budget"
            min={5000}
            max={500000}
            step={1000}
            value={value.resources.budget}
            onChange={(budget) => patchResources({ budget })}
          />
          <NumberField
            label="Deadline (min)"
            min={5}
            max={180}
            value={value.constraints.deadline_min}
            onChange={(deadline_min) =>
              onChange({ ...value, constraints: { deadline_min } })
            }
          />
        </div>

        <fieldset className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <legend className="px-1 text-sm font-medium text-slate-200">Priorities (sum = 1)</legend>
          <p className={`text-xs ${sum === 1 ? "text-emerald-400" : "text-amber-400"}`}>
            Current sum: {sum.toFixed(2)}
          </p>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className="block">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>
                  {slider.label} <span className="text-slate-500">· {slider.hint}</span>
                </span>
                <span className="font-mono text-slate-200">{value.priorities[slider.key].toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.96}
                step={0.01}
                value={value.priorities[slider.key]}
                onChange={(e) => onPriority(slider.key, Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </label>
          ))}
        </fieldset>

        {error ? (
          <p className="rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
        >
          {pending ? "Simulating…" : "Run simulation"}
        </button>
        {result ? (
          <p className="text-xs text-slate-500">
            Last run · {result.scenario_id} · persisted {String(result.persisted)}
          </p>
        ) : null}
      </form>

      <div className="min-w-0">{resultSlot}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-300">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
      />
    </label>
  );
}
