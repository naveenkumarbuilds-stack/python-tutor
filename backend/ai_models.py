"""Strict request and response contracts for AI features."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)


class ExplainRequest(StrictModel):
    code: StrictStr
    analysis: dict | None = None  # Never trusted: recomputed on the server.
    mode: Literal['beginner', 'intermediate'] = 'beginner'
    language: Literal['English', 'Kannada'] = 'English'
    regenerate: bool = False

    @field_validator('language', mode='before')
    @classmethod
    def english_only(cls, value):
        # Accept old saved Kannada requests, but always use English going forward.
        return 'English' if value in ('English', 'Kannada') else value


class ChatMessage(StrictModel):
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(ExplainRequest):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)


class LineExplanation(StrictModel):
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=8000)


class ExpectedOutput(StrictModel):
    kind: Literal['predicted']
    text: str = Field(max_length=16000)
    caveat: str = Field(min_length=1, max_length=4000)


class Explanation(StrictModel):
    summary: str = Field(min_length=1, max_length=16000)
    objective: str = Field(min_length=1, max_length=8000)
    line_explanations: list[LineExplanation] = Field(max_length=3000)
    functions: list[str] = Field(max_length=1000)
    variables: list[str] = Field(max_length=1000)
    concepts: list[str] = Field(max_length=100)
    complexity: str = Field(min_length=1, max_length=8000)
    expected_output: ExpectedOutput
