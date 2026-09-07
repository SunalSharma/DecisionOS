import type {
  CompareRequest,
  CompareResponse,
  GenerateRequest,
  GenerateResponse,
  RecommendRequest,
  RecommendResponse,
  ScenarioSummary,
  SimulateRequest,
  SimulateResponse,
} from "../types/domain";
import {
  mockCompare,
  mockGenerate,
  mockRecommend,
  mockSimulate,
  MOCK_SCENARIO_LIST,
} from "./mocks";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Mocked until the FastAPI service is wired. Set VITE_USE_MOCKS=false to hit the real backend. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

async function delay(ms = 350): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${path} failed (${response.status}): ${body || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function simulate(body: SimulateRequest): Promise<SimulateResponse> {
  if (USE_MOCKS) {
    await delay();
    return mockSimulate(body);
  }
  return requestJson<SimulateResponse>("/api/simulate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function generateScenarios(body: GenerateRequest): Promise<GenerateResponse> {
  if (USE_MOCKS) {
    await delay();
    return mockGenerate(body);
  }
  return requestJson<GenerateResponse>("/api/scenarios/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  if (USE_MOCKS) {
    await delay(150);
    return MOCK_SCENARIO_LIST;
  }
  return requestJson<ScenarioSummary[]>("/api/scenarios");
}

export async function compare(body: CompareRequest): Promise<CompareResponse> {
  if (USE_MOCKS) {
    await delay();
    return mockCompare(body);
  }
  return requestJson<CompareResponse>("/api/compare", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function recommend(body: RecommendRequest): Promise<RecommendResponse> {
  if (USE_MOCKS) {
    await delay();
    return mockRecommend(body);
  }
  return requestJson<RecommendResponse>("/api/recommend", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
