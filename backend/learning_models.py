"""Schemas for generated learning activities; all content remains AI-predicted."""
from typing import Literal
from pydantic import Field, model_validator
from backend.ai_models import StrictModel, ExpectedOutput

QuestionKind = Literal['mcq', 'output prediction', 'conceptual', 'viva', 'debugging']


class Question(StrictModel):
    kind: QuestionKind
    prompt: str = Field(min_length=1, max_length=4000)
    options: list[str] = Field(min_length=4, max_length=4)
    answer: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1, max_length=8000)

    @model_validator(mode='after')
    def unique_options(self):
        if len(set(self.options)) != 4 or any(not value.strip() for value in self.options):
            raise ValueError('Options must be unique and nonempty')
        return self


class QuizResult(StrictModel):
    questions: list[Question] = Field(min_length=5, max_length=5)

    @model_validator(mode='after')
    def all_kinds(self):
        if {q.kind for q in self.questions} != {'mcq','output prediction','conceptual','viva','debugging'}:
            raise ValueError('Include one question of every kind')
        return self


class Issue(StrictModel):
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    label: Literal['possible logic issue']
    reason: str = Field(min_length=1, max_length=4000)
    suggested_fix: str = Field(min_length=1, max_length=4000)
    corrected_example: str = Field(max_length=12000)


class IssuesResult(StrictModel):
    issues: list[Issue] = Field(max_length=12)
    note: str = Field(min_length=1, max_length=4000)


class PredictionResult(StrictModel):
    deterministic: bool
    dependencies: list[str] = Field(max_length=30)
    expected_output: ExpectedOutput
    explanation: str = Field(min_length=1, max_length=8000)

    @model_validator(mode='after')
    def dependencies_prevent_comparison(self):
        if self.dependencies and self.deterministic:
            raise ValueError('Do not claim deterministic output when external dependencies exist')
        return self


class TraceVariable(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    value: str = Field(max_length=2000)
    type: str = Field(min_length=1, max_length=200)


class TraceFrame(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    line: int = Field(ge=1)


class TraceStep(StrictModel):
    line: int = Field(ge=1)
    variables: list[TraceVariable] = Field(max_length=40)
    call_stack: list[TraceFrame] = Field(max_length=20)
    output: str = Field(max_length=8000)
    explanation: str = Field(min_length=1, max_length=4000)


class TraceResult(StrictModel):
    label: Literal['AI-predicted, not real runtime']
    steps: list[TraceStep] = Field(max_length=80)
    caveat: str = Field(min_length=1, max_length=4000)
    truncated: bool
