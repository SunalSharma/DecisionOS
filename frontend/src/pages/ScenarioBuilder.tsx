import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FAIL_FIXTURE_REQUEST, PASS_FIXTURE_REQUEST } from "../api/mocks";
import { simulate } from "../api/client";
import { prioritySum, setPriorityValue, type PriorityKey } from "../lib/priorities";
import type { IncidentType, Priorities, SimulateRequest, SimulateResponse } from "../types/domain";

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

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "emergency_response", label: "Emergency Response" },
  { value: "delivery_fleet_capacity_planning", label: "Delivery Fleet Capacity Planning" },
  { value: "earthquake_response", label: "Earthquake Response" },
  { value: "tsunami_evacuation", label: "Tsunami Evacuation" },
  { value: "wildfire_containment", label: "Wildfire Containment" },
  { value: "industrial_accident", label: "Industrial Accident" },
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
  const requestVersion = useRef(0);
  const sum = useMemo(() => prioritySum(value.priorities), [value.priorities]);

  useEffect(() => {
    const version = ++requestVersion.current;
    if (!isScenarioValid(value)) {
      onResult(null);
      setPending(false);
      return;
    }

    setPending(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await simulate(value);
        if (requestVersion.current === version) {
          setError(null);
          onResult(response);
        }
      } catch (err) {
        if (requestVersion.current === version) {
          setError(err instanceof Error ? err.message : "Simulation failed");
        }
      } finally {
        if (requestVersion.current === version) setPending(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [value, onResult]);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      setError("Some values are out of range — check the highlighted field.");
      event.currentTarget.reportValidity();
      return;
    }
    requestVersion.current += 1;
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,29rem)_1fr]">
      <form
        onSubmit={onSubmit}
        onInvalidCapture={() =>
          setError("Some values are out of range — check the highlighted field.")
        }
        className="panel-surface space-y-5 rounded-2xl border border-slate-700/70 p-5 shadow-2xl shadow-slate-950/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-300">Mission configuration</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">Build a deployable plan</h2>
            <p className="mt-1 text-sm leading-5 text-slate-400">Tune the response posture for the next 48 hours. Results refresh as you adjust.</p>
          </div>
          <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-200">Draft</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="preset-chip rounded-lg border border-teal-500/30 bg-teal-400/10 px-3 py-2 text-xs font-medium text-teal-200 transition hover:bg-teal-400/20"
            onClick={() => {
              onChange(PASS_FIXTURE_REQUEST);
              onResult(null);
            }}
          >
            Balanced preset
          </button>
          <button
            type="button"
            className="preset-chip rounded-lg border border-rose-500/30 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-400/20"
            onClick={() => {
              onChange(FAIL_FIXTURE_REQUEST);
              onResult(null);
            }}
          >
            Stress test
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Scenario label</span>
          <input
            className="mission-name mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10"
            value={value.name ?? ""}
            onChange={(e) => patch({ name: e.target.value || null })}
            placeholder="e.g. Coastal surge"
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Incident type</span>
          <select
            value={value.incident_type ?? "emergency_response"}
            onChange={(e) => patch({ incident_type: e.target.value as IncidentType })}
            className="mission-name mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10"
          >
            {INCIDENT_TYPES.map((incident) => (
              <option key={incident.value} value={incident.value}>{incident.label}</option>
            ))}
          </select>
        </label>

        <div className="resource-grid grid grid-cols-2 gap-3 border-y border-slate-800/80 py-5">
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
            label="Budget (₹)"
            min={5000}
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

        <section className="priority-panel space-y-4 rounded-xl border border-slate-700/70 bg-slate-950/35 p-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-slate-200">Decision priorities</h3>
            <span className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-500">Weighting</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Weight balance</span>
            <span className={`rounded-full px-2 py-1 font-medium ${sum === 1 ? "bg-teal-400/10 text-teal-300" : "bg-amber-400/10 text-amber-300"}`}>Total {sum.toFixed(2)} / 1.00</span>
          </div>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className="priority-row block">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>
                  <i className="priority-dot" />{slider.label} <span className="text-slate-500">· {slider.hint}</span>
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
                className="w-full"
              />
            </label>
          ))}
        </section>

        {error ? (
          <p className="rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="run-action group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60"
        >
          <span className="text-base">{pending ? "◌" : "↗"}</span>{pending ? "Refreshing live model…" : "Run simulation"}
        </button>
        {result ? (
          <p className="text-xs text-slate-500">
            Last run · {result.scenario_id} · {"persisted" in result
              ? result.persisted ? "Saved" : "Not saved"
              : "Save not attempted"}
          </p>
        ) : null}
      </form>

      <div className="min-w-0">{resultSlot}</div>
    </div>
  );
}

function isScenarioValid(value: SimulateRequest) {
  const { teams, vehicles, budget } = value.resources;
  const { deadline_min } = value.constraints;
  return [teams, vehicles, budget, deadline_min].every(Number.isFinite)
    && teams >= 1 && teams <= 30
    && vehicles >= 1 && vehicles <= 40
    && budget >= 5000
    && deadline_min >= 5 && deadline_min <= 180;
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
  max?: number;
  step?: number;
}) {
  const visual = {
    Teams: "◉",
    Vehicles: "↗",
    "Budget (₹)": "₹",
    "Deadline (min)": "◷",
  }[label] ?? "•";

  return (
    <label className="resource-field block text-sm">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        <i className="resource-glyph">{visual}</i>{label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10"
      />
    </label>
  );
}
