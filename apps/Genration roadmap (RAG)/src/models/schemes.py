from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class RetrievedDocument(BaseModel):
    text: str
    score: float
    metadata: Optional[Dict[str, Any]] = None

class PushRequest(BaseModel):
    do_reset: Optional[int] = 0

class SearchRequest(BaseModel):
    text: str
    limit: Optional[int] = 5
    source: Optional[str] = ""

class CategoryRequest(BaseModel):
    category_name: str
    
class ChatRequest(BaseModel):
    message: str
