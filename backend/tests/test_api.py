import os
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import compare, recommend, scenarios, simulate
from backend.app.api import engine_adapter
from backend.app.main import app as main_app
from backend.engine.models import ScenarioOutcome


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

    def test_engine_adapter_uses_real_scenario_outcome(self):
        self.assertIs(engine_adapter.ScenarioOutcome, ScenarioOutcome)

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
                "incident_type",
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


class IncidentDomainTests(unittest.TestCase):
    """Round 3 item 3: a scenario can pick its incident domain instead of
    silently running EMERGENCY_RESPONSE_PROFILE for every request."""

    def setUp(self):
        app = FastAPI()
        app.include_router(simulate.router)
        app.include_router(scenarios.router)
        app.include_router(compare.router)

        self.client = TestClient(app)

        self.payload = {
            "name": "Baseline",
            "resources": {
                "teams": 5,
                "vehicles": 5,
                "budget": 200000,
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

    def test_incident_types_are_discoverable(self):
        response = self.client.get("/api/incident-types")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["default"], "emergency_response")
        ids = {entry["id"] for entry in body["incident_types"]}
        self.assertEqual(ids, {"emergency_response", "delivery_fleet_capacity_planning"})
        for entry in body["incident_types"]:
            self.assertEqual(set(entry), {"id", "name", "total_demand", "min_coverage_pct"})

    @patch("backend.app.api.simulate.SupabaseRepository", SuccessfulRepository)
    def test_same_resources_score_differently_across_domains(self):
        emergency = self.client.post(
            "/api/simulate",
            json={**self.payload, "incident_type": "emergency_response"},
        ).json()
        delivery = self.client.post(
            "/api/simulate",
            json={**self.payload, "incident_type": "delivery_fleet_capacity_planning"},
        ).json()

        self.assertNotEqual(
            emergency["result"]["coverage_pct"], delivery["result"]["coverage_pct"]
        )
        self.assertNotEqual(emergency["result"]["cost"], delivery["result"]["cost"])

    @patch("backend.app.api.simulate.SupabaseRepository", SuccessfulRepository)
    def test_omitting_incident_type_matches_emergency_response(self):
        implicit = self.client.post("/api/simulate", json=self.payload).json()
        explicit = self.client.post(
            "/api/simulate",
            json={**self.payload, "incident_type": "emergency_response"},
        ).json()

        for key in ("result", "constraint_check", "score_breakdown", "explanation", "incident_type"):
            self.assertEqual(implicit[key], explicit[key])

    def test_coverage_floor_follows_the_domain(self):
        from backend.app.api.schemas import ScenarioInput
        from backend.app.api.services import build_scenario

        emergency = build_scenario(ScenarioInput(**{**self.payload, "incident_type": "emergency_response"}))
        delivery = build_scenario(
            ScenarioInput(**{**self.payload, "incident_type": "delivery_fleet_capacity_planning"})
        )

        self.assertEqual(emergency.constraints.min_coverage_pct, 60)
        self.assertEqual(delivery.constraints.min_coverage_pct, 70)

    def test_unknown_incident_type_is_422(self):
        response = self.client.post(
            "/api/simulate",
            json={**self.payload, "incident_type": "not_a_real_domain"},
        )

        self.assertEqual(response.status_code, 422)

    @patch("backend.app.api.scenarios.SupabaseRepository", SuccessfulRepository)
    def test_generate_reports_the_domain_and_its_coverage_floor(self):
        response = self.client.post(
            "/api/scenarios/generate",
            json={
                "base_scenario": {**self.payload, "incident_type": "delivery_fleet_capacity_planning"},
                "count": 2,
                "strategy": None,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["incident_type"], "delivery_fleet_capacity_planning")
        for outcome in body["outcomes"]:
            self.assertEqual(outcome["scenario"]["constraints"]["min_coverage_pct"], 70)

    def test_saved_scenario_round_trips_its_domain_with_no_new_top_level_column(self):
        from backend.app.api.schemas import ScenarioInput
        from backend.app.api.services import build_scenario, persistence_record, run_pipeline

        payload = ScenarioInput(**{**self.payload, "incident_type": "delivery_fleet_capacity_planning"})
        scenario = build_scenario(payload)
        outcome = run_pipeline(scenario, incident_type=payload.incident_type)
        record = persistence_record(scenario, outcome, incident_type=payload.incident_type)

        self.assertNotIn("incident_type", record)
        self.assertEqual(record["scenario"]["incident_type"], "delivery_fleet_capacity_planning")

        restored = ScenarioInput.model_validate(record["scenario"])
        self.assertEqual(restored.incident_type, "delivery_fleet_capacity_planning")

    def test_a_record_with_no_incident_type_in_the_blob_loads_as_the_default(self):
        from backend.app.api.schemas import ScenarioInput
        from backend.app.api.services import resolve_incident_type

        stored_scenario = {**self.payload}
        stored_scenario.pop("incident_type", None)

        restored = ScenarioInput.model_validate(stored_scenario)
        self.assertIsNone(restored.incident_type)
        self.assertEqual(resolve_incident_type(restored.incident_type), "emergency_response")


class OptionalApiKeyTests(unittest.TestCase):
    """API_KEY is optional so an unconfigured demo keeps working."""

    payload = {
        "name": "Baseline",
        "resources": {"teams": 2, "vehicles": 1, "budget": 1000},
        "constraints": {"deadline_min": 60},
        "priorities": {"speed": 0.5, "cost": 0.3, "coverage": 0.2},
    }

    def setUp(self):
        self.client = TestClient(main_app)

    @patch.dict(os.environ, {"API_KEY": ""}, clear=True)
    @patch("backend.app.api.scenarios.SupabaseRepository", SuccessfulRepository)
    @patch("backend.app.api.simulate.SupabaseRepository", SuccessfulRepository)
    def test_auth_disabled_when_api_key_is_unset_every_endpoint_allows_no_header(self):
        responses = [
            self.client.post("/api/simulate", json=self.payload),
            self.client.post(
                "/api/scenarios/generate",
                json={"base_scenario": self.payload, "count": 1, "strategy": None},
            ),
            self.client.get("/api/scenarios"),
            self.client.post("/api/compare", json={"scenarios": [self.payload]}),
            self.client.post("/api/recommend", json={"scenarios": [self.payload]}),
            self.client.get("/api/incident-types"),
        ]

        self.assertTrue(all(response.status_code == 200 for response in responses))

    @patch.dict(os.environ, {"API_KEY": "stage-demo-key"}, clear=True)
    def test_configured_api_key_requires_valid_header(self):
        missing = self.client.post("/api/compare", json={"scenarios": [self.payload]})
        wrong = self.client.post(
            "/api/compare",
            json={"scenarios": [self.payload]},
            headers={"X-API-Key": "wrong-key"},
        )
        correct = self.client.post(
            "/api/compare",
            json={"scenarios": [self.payload]},
            headers={"X-API-Key": "stage-demo-key"},
        )

        self.assertEqual(missing.status_code, 401)
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(correct.status_code, 200)
        self.assertEqual(missing.json()["detail"], "Missing or invalid API key.")

    @patch.dict(os.environ, {"API_KEY": "stage-demo-key"}, clear=True)
    def test_health_remains_open_when_auth_is_configured(self):
        self.assertEqual(self.client.get("/health").status_code, 200)

    @patch.dict(os.environ, {"API_KEY": "stage-demo-key"}, clear=True)
    def test_cors_preflight_allows_api_key_header(self):
        response = self.client.options(
            "/api/compare",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "x-api-key",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("x-api-key", response.headers["access-control-allow-headers"].lower())
