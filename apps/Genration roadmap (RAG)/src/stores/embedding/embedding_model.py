from sentence_transformers import SentenceTransformer
from typing import Literal

class EmbeddingHelper:
    """Helper class for text embedding operations."""
    
    def __init__(self):
        """Initialize the embedding models."""
        self.embedding_size = 384  
        self.model_hugging_6 = SentenceTransformer(model_name_or_path='all-MiniLM-L6-v2', device='cpu')
        self.model_hugging_12 = SentenceTransformer(model_name_or_path='all-MiniLM-L12-v2', device='cpu')
    
    def encode_text(self, text: str, collection: Literal['all-MiniLM-L6-v2', 'all-MiniLM-L12-v2']) -> list:
        """Encode text to a vector embedding using the appropriate model.
        """
        if collection == 'all-MiniLM-L6-v2':
            return self.model_hugging_6.encode(text).tolist()
        else:
            return self.model_hugging_12.encode(text).tolist()