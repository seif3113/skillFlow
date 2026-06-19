from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class RetrievedDocument(BaseModel):
    text: str
    score: float
    metadata: Optional[Dict[str, Any]] = None

class PushRequest(BaseModel):
    do_reset: Optional[int] = 0

class SearchRequest(BaseModel):
    text: Optional[str] = None
    topic: Optional[str] = None
    limit: Optional[int] = 5
    type: Optional[str] = "all"

class CategoryRequest(BaseModel):
    category_name: str

class RoadmapRequest(BaseModel):
    topic: str
    customization_answers: Optional[List[str]] = None

class RoadmapResource(BaseModel):
    title: str
    source: Optional[str] = None
    url: str
    type: str

class RoadmapNode(BaseModel):
    id: int
    title: str
    description: str
    tags: List[str] = Field(default_factory=list)
    resources: List[RoadmapResource] = Field(default_factory=list)

class RoadmapEditRequest(BaseModel):
    prompt: str
    roadmap: List[RoadmapNode]
    
class ChatRequest(BaseModel):
    message: str
    node_name: Optional[str] = None

class QuizRequest(BaseModel):
    node_name: str
    node_description: Optional[str] = ""
    num_questions: Optional[int] = 5

