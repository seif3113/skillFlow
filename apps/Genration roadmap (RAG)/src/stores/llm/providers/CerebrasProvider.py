# Add Cerebras Provider implementation for Version 3

from ..LLMInterface import LLMInterface
from cerebras.cloud.sdk import Cerebras
import logging
from typing import List, Union, Optional

class CerebrasProvider(LLMInterface):

    def __init__(self, api_key: str, api_url: str=None,
                       default_input_max_characters: int=30000,
                       default_generation_max_output_tokens: int=2000,
                       default_generation_temperature: float=0.1):

        self.api_key = api_key
        # api_url isn't used by the Cerebras SDK directly, kept for interface consistency
        self.api_url = api_url

        self.default_input_max_characters = default_input_max_characters
        self.default_generation_max_output_tokens = default_generation_max_output_tokens
        self.default_generation_temperature = default_generation_temperature

        self.generation_model_id = None
        self.embedding_model_id = None
        self.embedding_size = None

        # Configure the Cerebras client
        self.client = Cerebras(api_key=self.api_key)

        # Cerebras' chat endpoint is OpenAI-compatible, so it expects the same
        # "system" / "user" / "assistant" role strings. Reuse OpenAIEnums if it
        # already exists in the project; otherwise fall back to a dummy structure,
        # mirroring how GoogleGeminiProvider handles GeminiEnums.
        try:
            from ..LLMEnums import CerebrasEnums
            self.enums = CerebrasEnums
        except ImportError:
            try:
                from ..LLMEnums import OpenAIEnums
                self.enums = OpenAIEnums
            except ImportError:
                class DummyEnums:
                    class SYSTEM: value = "system"
                    class USER: value = "user"
                    class ASSISTANT: value = "assistant"
                self.enums = DummyEnums

        self.logger = logging.getLogger(__name__)

    def set_generation_model(self, model_id: str):
        self.generation_model_id = model_id

    def set_embedding_model(self, model_id: str, embedding_size: int):
        # Cerebras does not currently expose an embeddings endpoint.
        self.logger.warning("Cerebras provider does not support embeddings; ignoring set_embedding_model.")
        self.embedding_model_id = model_id
        self.embedding_size = embedding_size

    def process_text(self, text: str):
        if text is None:
            return ""
        return text[:self.default_input_max_characters].strip()

    def generate_text(self, prompt: str, chat_history: list=None, max_output_tokens: int=None,
                            temperature: float = None):

        if chat_history is None:
            chat_history = []

        if not self.client:
            self.logger.error("Cerebras client was not set")
            return None

        if not self.generation_model_id:
            self.logger.error("Generation model for Cerebras was not set")
            return None

        max_output_tokens = max_output_tokens if max_output_tokens else self.default_generation_max_output_tokens
        temperature = temperature if temperature else self.default_generation_temperature

        # Append the current prompt
        chat_history.append(
            self.construct_prompt(prompt=prompt, role=self.enums.USER.value)
        )

        # Unlike Gemini, Cerebras' API is OpenAI-compatible, so the
        # {"role": ..., "content": ...} list can be passed straight through —
        # no role remapping or system-instruction extraction needed.
        try:
            response = self.client.chat.completions.create(
                model=self.generation_model_id,
                messages=chat_history,
                max_completion_tokens=max_output_tokens,
                temperature=temperature,
                stream=False,
            )

            if not response or not response.choices or not response.choices[0].message:
                self.logger.error("Error while generating text with Cerebras: Empty response")
                return None

            return response.choices[0].message.content

        except Exception as e:
            self.logger.error(f"Cerebras API Error: {str(e)}")
            return None

    def embed_text(self, text: Union[str, List[str]], document_type: Optional[str] = None):
        # Cerebras does not provide an embeddings API at this time.
        self.logger.error("Cerebras provider does not support text embedding.")
        return None

    def construct_prompt(self, prompt: str, role: str):
        # Keeps the same dictionary structure as OpenAI/Gemini so NLPController doesn't break
        return {
            "role": role,
            "content": self.process_text(prompt)
        }