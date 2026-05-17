from pydantic import BaseModel
from typing import Optional, Dict, Any

class RetrievedDocument(BaseModel):
    text: str
    score: float
    # metadata is useful for showing "Source: doc_1.pdf" in your UI
    metadata: Optional[Dict[str, Any]] = None

class PushRequest(BaseModel):
    do_reset: Optional[int] = 0

class SearchRequest(BaseModel):
    text: str
    limit: Optional[int] = 5

    
class CategoryRequest(BaseModel):
    category_name: str
    