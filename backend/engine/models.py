"""Plain-Python data models for the DecisionOS decision engine."""

from dataclasses import dataclass
from enum import Enum
from typing import Literal


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


@dataclass
class Resources:
    teams: int
    vehicles: int
    budget: float


@dataclass
class Constraints:
    deadline_min: float
    min_coverage_pct: float


@dataclass
class Priorities:
    speed: float
    cost: float
    coverage: float


@dataclass
class Scenario:
    id: str
    name: str | None
    resources: Resources
    constraints: Constraints
    priorities: Priorities


@dataclass
class SimulationResult:
    response_time_min: float
    cost: float
    coverage_pct: float
    resource_utilization_pct: float
    demand_covered: float
    risk: RiskLevel


@dataclass
class ConstraintViolation:
    name: str
    limit: float
    actual: float
    message: str


@dataclass
class ConstraintCheck:
    status: Literal["PASS", "FAIL"]
    violations: list[ConstraintViolation]


@dataclass
class ScoreBreakdown:
    score: float
    components: dict


@dataclass
class ScenarioOutcome:
    scenario: Scenario
    result: SimulationResult
    constraint_check: ConstraintCheck
    score_breakdown: ScoreBreakdown
    explanation: list[str]
    # Whether the API layer managed to persist this outcome. Stays None for
    # standalone engine use - the engine never sets it and never reads it, so
    # `backend/engine/` remains database-independent. None means "persistence
    # was not attempted", which is distinct from False, "it was attempted and
    # it failed".
    persisted: bool | None = None


@dataclass
class RankedOutcome:
    scenario_id: str
    rank: int
    score: float
    constraint_status: Literal["PASS", "FAIL"]


@dataclass
class Recommendation:
    feasible: bool
    recommended_scenario_id: str | None
    reasoning: list[str]


@dataclass
class TradeOffPoint:
    scenario_id: str
    response_time_min: float
    cost: float
    coverage_pct: float
    score: float


@dataclass
class ScenarioComparison:
    outcomes: list[ScenarioOutcome]
    ranking: list[RankedOutcome]
    recommendation: Recommendation
    trade_offs: list[TradeOffPoint]
