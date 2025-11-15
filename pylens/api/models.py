from pydantic import BaseModel


class QueryModel(BaseModel):
    query: str
    top_k: int


class Match(BaseModel):
    name: str
    summary: str
    similarity: float
    weekly_downloads: int


class SearchResponse(BaseModel):
    matches: list[Match]
    warning: bool = False
    warning_message: str = None
