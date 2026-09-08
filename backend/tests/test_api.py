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
    def test_generated_outcomes_report_persistence_on_the_outcome(self):
        response = self.client.post(
            "/api/scenarios/generate",
            json={"base_scenario": self.payload, "count": 2, "strategy": None},
        )

        self.assertEqual(response.status_code, 200)
        for outcome in response.json()["outcomes"]:
            self.assertTrue(outcome["persisted"])

    @patch(
        "backend.app.api.scenarios.SupabaseRepository",
        FailingRepository,
    )
    def test_a_failed_save_is_reported_as_false_not_omitted(self):
        response = self.client.post(
            "/api/scenarios/generate",
            json={"base_scenario": self.payload, "count": 2, "strategy": None},
        )

        self.assertEqual(response.status_code, 200)
        for outcome in response.json()["outcomes"]:
            # False is a real answer - it was attempted and it did not save.
            self.assertIn("persisted", outcome)
            self.assertFalse(outcome["persisted"])

    def test_compare_outcomes_omit_persistence_rather_than_guessing(self):
        response = self.client.post(
            "/api/compare",
            json={"scenarios": [self.payload]},
        )

        self.assertEqual(response.status_code, 200)
        for outcome in response.json()["outcomes"]:
            # /api/compare never touches the repository, so it has nothing to
            # report and must not imply the run was or was not saved.
            self.assertNotIn("persisted", outcome)

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


class PersistenceFlagTests(unittest.TestCase):
    """set_persisted() must work against the real engine model, not just the
    development fixture in engine_adapter. It previously raised TypeError on a
    real ScenarioOutcome because the dataclass had no `persisted` field."""

    def setUp(self):
        from backend.app.api.schemas import ScenarioInput
        from backend.app.api.services import build_scenario

        self.scenario = build_scenario(
            ScenarioInput(
                name="Baseline",
                resources={"teams": 2, "vehicles": 1, "budget": 1000},
                constraints={"deadline_min": 60},
                priorities={"speed": 0.5, "cost": 0.3, "coverage": 0.2},
            )
        )

    def test_set_persisted_stamps_the_real_engine_outcome(self):
        from backend.app.api.services import run_pipeline, set_persisted

        outcome = run_pipeline(self.scenario)
        self.assertIsNone(outcome.persisted)

        for value in (True, False):
            self.assertIs(set_persisted(outcome, value).persisted, value)

    def test_run_pipeline_applies_a_persistence_flag_when_given_one(self):
        from backend.app.api.services import run_pipeline

        self.assertIsNone(run_pipeline(self.scenario).persisted)
        self.assertIs(run_pipeline(self.scenario, persisted=True).persisted, True)
        self.assertIs(run_pipeline(self.scenario, persisted=False).persisted, False)

    def test_an_explicit_argument_overrides_the_flag_on_the_outcome(self):
        from backend.app.api.services import run_pipeline, serialize_outcome, set_persisted

        outcome = set_persisted(run_pipeline(self.scenario), False)
        self.assertTrue(serialize_outcome(outcome, persisted=True)["persisted"])

    def test_an_unstamped_outcome_serializes_without_the_key(self):
        from backend.app.api.services import run_pipeline, serialize_outcome

        self.assertNotIn("persisted", serialize_outcome(run_pipeline(self.scenario)))
