from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class ResourcesInput(BaseModel):
    teams: int = Field(ge=0)
    vehicles: int = Field(ge=0)
    budget: float = Field(gt=0)


class ConstraintsInput(BaseModel):
    deadline_min: float = Field(gt=0)


class PrioritiesInput(BaseModel):
    speed: float = Field(ge=0, le=1)
    cost: float = Field(ge=0, le=1)
    coverage: float = Field(ge=0, le=1)


class ScenarioInput(BaseModel):
    name: str | None = None
    resources: ResourcesInput
    constraints: ConstraintsInput
    priorities: PrioritiesInput
    incident_type: Literal[
        "emergency_response",
        "delivery_fleet_capacity_planning",
        "earthquake_response",
        "tsunami_evacuation",
        "wildfire_containment",
        "industrial_accident",
    ] = "emergency_response"


class GenerateRequest(BaseModel):
    base_scenario: ScenarioInput
    count: int = Field(ge=1, le=10)
    strategy: str | None = None


class CompareRequest(BaseModel):
    scenario_ids: list[str] | None = None
    scenarios: list[ScenarioInput] | None = None

    @model_validator(mode="after")
    def exactly_one_source(self) -> "CompareRequest":
        if bool(self.scenario_ids) == bool(self.scenarios):
            raise ValueError("provide exactly one of scenario_ids or scenarios")
        return self


def to_jsonable(value: Any) -> Any:
    """Serialize Pydantic models, dataclasses, and engine value objects."""
    if hasattr(value, "model_dump"):
        return {key: to_jsonable(item) for key, item in value.model_dump().items()}
    if hasattr(value, "__dataclass_fields__"):
        return {key: to_jsonable(getattr(value, key)) for key in value.__dataclass_fields__}
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(item) for item in value]
    return value
