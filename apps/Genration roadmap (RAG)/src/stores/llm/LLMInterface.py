from abc import ABC, abstractmethod
from typing import List, Union, Optional

class LLMInterface(ABC):

    @abstractmethod
    def set_generation_model(self, model_id: str):
        """Define which model to use for chat (e.g., 'qwen3.5:latest')"""
        pass

    @abstractmethod
    def set_embedding_model(self, model_id: str, embedding_size: int):
        """Define which model to use for vectors (e.g., 'mxbai-embed-large')"""
        pass

    @abstractmethod
    def process_text(self, text: str) -> str:
        """Clean or truncate text before sending it to the local model"""
        pass

    @abstractmethod
    def generate_text(self, 
                      prompt: str, 
                      chat_history: list = None, 
                      max_output_tokens: Optional[int] = None,
                      temperature: Optional[float] = None) -> Optional[str]:
        """Generate a response using the Ollama /api/chat endpoint"""
        pass

    def generate_text_stream(self,
                             prompt: str,
                             chat_history: list = None,
                             max_output_tokens: Optional[int] = None,
                             temperature: Optional[float] = None):
        """Stream generated text chunks. Providers may implement this for streaming routes."""
        raise NotImplementedError("Streaming is not supported by this provider.")

    @abstractmethod
    def embed_text(self, text: Union[str, List[str]], document_type: Optional[str] = None) -> Optional[List[List[float]]]:
        """Convert text into vectors using the Ollama /api/embeddings endpoint"""
        pass

    @abstractmethod
    def construct_prompt(self, prompt: str, role: str) -> dict:
        """Format a single message into the {'role': '...', 'content': '...'} dictionary"""
        pass
