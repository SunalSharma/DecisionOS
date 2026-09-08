import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import compare, recommend, scenarios, simulate


class SuccessfulRepository:
    def save_scenario(self, record):
        return True

    def list_scenarios(self):
        return [
            {
                "scenario_id": "saved",
                "name": "Saved",
                "created_at": "2026-01-01",
                "score": 1,
                "constraint_status": True,
            }
        ]


class FailingRepository(SuccessfulRepository):
    def save_scenario(self, record):
        return False


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(simulate.router)
        app.include_router(scenarios.router)
        app.include_router(compare.router)
        app.include_router(recommend.router)

        self.client = TestClient(app)

        self.payload = {
            "name": "Baseline",
            "resources": {
                "teams": 2,
                "vehicles": 1,
                "budget": 1000,
            },
            "constraints": {
                "deadline_min": 60,
            },
            "priorities": {
                "speed": 0.5,
                "cost": 0.3,
                "coverage": 0.2,
            },
        }

    def test_invalid_request_is_422(self):
        payload = {
            **self.payload,
            "resources": {
                "teams": -1,
                "vehicles": 1,
                "budget": 1000,
            },
        }

        response = self.client.post("/api/simulate", json=payload)

        self.assertEqual(response.status_code, 422)

    def test_priorities_that_do_not_sum_to_one_are_422(self):
        payload = {
            **self.payload,
            "priorities": {
                "speed": 0.5,
                "cost": 0.4,
                "coverage": 0.2,
            },
        }

        response = self.client.post("/api/simulate", json=payload)

        self.assertEqual(response.status_code, 422)

    @patch(
        "backend.app.api.simulate.SupabaseRepository",
        SuccessfulRepository,
    )
    def test_simulate_response_shape(self):
        response = self.client.post(
            "/api/simulate",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(
            set(response.json()),
            {
                "scenario_id",
                "result",
                "constraint_check",
                "score_breakdown",
                "explanation",
                "persisted",
            },
        )

        self.assertTrue(response.json()["persisted"])

    @patch(
        "backend.app.api.simulate.SupabaseRepository",
        FailingRepository,
    )
    def test_supabase_failure_is_non_blocking(self):
        response = self.client.post(
            "/api/simulate",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["persisted"])

    @patch(
        "backend.app.api.scenarios.SupabaseRepository",
        SuccessfulRepository,
    )
    def test_generate_response_shape(self):
        response = self.client.post(
            "/api/scenarios/generate",
            json={
                "base_scenario": self.payload,
                "count": 2,
                "strategy": None,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["outcomes"]), 2)
        self.assertTrue(
            all(
                outcome["scenario_id"] == outcome["scenario"]["id"]
                for outcome in response.json()["outcomes"]
            )
        )
        self.assertTrue(
            all(outcome.get("scenario_id") for outcome in response.json()["outcomes"]),
        )

    @patch(
        "backend.app.api.scenarios.SupabaseRepository",
        SuccessfulRepository,
    )
    def test_list_response_shape(self):
        response = self.client.get("/api/scenarios")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()[0]["scenario_id"],
            "saved",
        )

    def test_compare_response_shape(self):
        response = self.client.post(
            "/api/compare",
            json={
                "scenarios": [self.payload],
            },
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(
            set(response.json()),
            {
                "outcomes",
                "ranking",
                "recommendation",
                "trade_offs",
            },
        )
        self.assertTrue(
            all(
                outcome["scenario_id"] == outcome["scenario"]["id"]
                for outcome in response.json()["outcomes"]
            )
        )
        body = response.json()
        self.assertTrue(body["outcomes"][0]["scenario_id"])
        self.assertEqual(
            body["outcomes"][0]["scenario_id"],
            body["ranking"][0]["scenario_id"],
        )

    def test_recommend_response_shape(self):
        response = self.client.post(
            "/api/recommend",
            json={
                "scenarios": [self.payload],
            },
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(
            set(response.json()),
            {
                "feasible",
                "recommended_scenario_id",
                "reasoning",
            },
        )


if __name__ == "__main__":
    unittest.main()
