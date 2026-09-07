# DecisionOS

**Decision Simulation & Scenario Intelligence Platform** — built for Resonance 1.0, Problem Statement PS7.

DecisionOS lets a decision-maker configure resources and constraints, simulate the outcome, generate alternative strategies automatically, and get an explainable, ranked recommendation — instead of a static dashboard or a black-box answer. The demo domain is **emergency resource allocation**: given a number of response teams, vehicles, and a budget, how fast can you respond, how much demand can you cover, what does it cost, and which trade-off should you actually pick?

## Why this isn't just a dashboard

Most "decision support" demos either show you data or hand you an unexplained answer. DecisionOS does three things together:

1. **Simulate** — turn a resource allocation into concrete outcomes (response time, cost, coverage, risk) and check it against hard constraints (deadline, budget, minimum coverage).
2. **Generate & compare** — automatically produce distinct alternative scenarios under different strategies (speed-first, cost-first, coverage-first, a deliberately balanced spread, or a stress test), rank them, and surface the trade-offs between them.
3. **Explain** — every result comes with plain-language reasoning for why it passed or failed, and why one option was recommended over another.

## Architecture

```
frontend/   React + Vite + Tailwind + Recharts        →  UI: scenario builder, comparison table, trade-off chart
backend/
  app/      FastAPI + Pydantic                          →  HTTP layer, request validation, Supabase persistence
  engine/   Pure Python, zero framework dependencies     →  simulation, constraints, scoring, generation, ranking
```

The decision engine (`backend/engine/`) is intentionally framework- and database-independent — it's plain dataclasses and functions, so it can be imported and run standalone (`python -m backend.engine...`), unit-tested in isolation, and reused outside of FastAPI entirely. The API layer (`backend/app/`) is a thin adapter: it validates input with Pydantic, calls the engine, persists results to Supabase (non-blocking — a persistence failure never breaks a simulation response), and serializes the result.

### Engine modules

| Module | Responsibility |
|---|---|
| `models.py` | Core data shapes: `Scenario`, `Resources`, `Constraints`, `Priorities`, `SimulationResult`, `ScenarioOutcome` |
| `simulation.py` | Turns a scenario into a `SimulationResult` (response time, cost, coverage, utilization, risk) |
| `constraints.py` | Checks deadline / budget / minimum-coverage constraints, returns named violations |
| `scoring.py` | Weighted composite score from speed / cost / coverage priorities |
| `generation.py` | Generates deterministic, **distinct** scenario variants under a chosen strategy |
| `recommendation.py` | Ranks outcomes (feasible before infeasible, then by score) and picks a recommendation |
| `explanation.py` | Builds the plain-language explanation shown alongside every result |
| `domain_data.py` | Tunable domain constants (demand, capacities, cost rates, coverage floor) |

### API

| Endpoint | Purpose |
|---|---|
| `POST /api/simulate` | Simulate one scenario, return result + constraint check + score + explanation |
| `POST /api/scenarios/generate` | Generate N variants of a base scenario under a strategy, return all outcomes |
| `POST /api/compare` | Compare a set of scenarios (by id or inline), return ranking + trade-offs + recommendation |
| `POST /api/recommend` | Same comparison, just the recommendation |
| `GET /api/scenarios` | List previously persisted scenarios |
| `GET /health` | Liveness check |

Generation strategies: `speed` / `speed_optimized` (maximize response speed), `cost` / `cost_optimized` (minimize spend, enumerates genuinely distinct lower-cost resource pairs rather than flooring at zero), `coverage` (maximize demand covered), `balanced` (spread across all three priorities, scaled to the base scenario's own size so small and large bases both get a meaningfully different set of variants), and `infeasible` (a deliberate stress test that always fails the coverage floor, for exercising the "no safe option" UI state).

## Running it locally

**Backend** (Python 3.11+):
```
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

**Frontend** (Node 18+):
```
cd frontend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
npm run dev
```

By default the frontend runs against **mocked responses** (`VITE_USE_MOCKS=true` in `.env`), so the UI is fully explorable with zero backend setup. Set `VITE_USE_MOCKS=false` to point it at the live FastAPI backend at `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).

CORS origins are configurable via the `ALLOWED_ORIGINS` environment variable (comma-separated), defaulting to `http://localhost:5173` for local development.

## Testing

```
pip install pytest httpx
python -m pytest backend/tests
```

Covers: deterministic simulation, zero-resource edge cases, constraint-violation naming, ranking/recommendation logic, and — specifically — that every generation strategy produces genuinely distinct variants (not repeats) across both small and large base scenarios, and that the `infeasible` strategy reliably fails regardless of budget.

Frontend:
```
cd frontend
npm run build   # runs the TypeScript compiler + Vite build
```

## Team

| Name | Role |
|---|---|
| Sunal | Captain / Tech Lead — architecture, integration, GitHub, deployment, demo |
| Aarya | Frontend — React, UX, charts |
| Namish | Backend — FastAPI, APIs, Pydantic, persistence |
| Nilaksh | Simulation engine — constraints, scoring, optimization, QA |

## Status

Built in stages against Resonance 1.0's 48-hour judging schedule (Round 1: one working vertical slice → Round 4: full build). The current `main` branch has a complete, tested pipeline: real engine, real API, real UI, wired end to end.
