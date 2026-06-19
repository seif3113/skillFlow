from ..LLMInterface import LLMInterface
from groq import Groq
import logging
from typing import List, Union, Optional

class GroqProvider(LLMInterface):

    def __init__(self, api_key: str,
                       default_input_max_characters: int=30000,
                       default_generation_max_output_tokens: int=4096,
                       default_generation_temperature: float=1.0):

        self.api_key = api_key
        self.default_input_max_characters = default_input_max_characters
        self.default_generation_max_output_tokens = default_generation_max_output_tokens
        self.default_generation_temperature = default_generation_temperature

        self.generation_model_id = None
        self.embedding_model_id = None
        self.embedding_size = None

        # Configure the Groq client
        self.client = Groq(api_key=self.api_key)

        # Groq's chat endpoint is OpenAI-compatible
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
        # Groq primarily focuses on high-speed inference for chat models.
        self.logger.warning("Groq provider typically does not support embeddings; ignoring set_embedding_model.")
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
            self.logger.error("Groq client was not set")
            return None

        if not self.generation_model_id:
            self.logger.error("Generation model for Groq was not set")
            return None

        max_output_tokens = max_output_tokens if max_output_tokens else self.default_generation_max_output_tokens
        temperature = temperature if temperature else self.default_generation_temperature

        # Append the current prompt
        chat_history.append(
            self.construct_prompt(prompt=prompt, role=self.enums.USER.value)
        )

        try:
            # Note: Groq supports streaming, but current interface expects a full string.
            # Setting stream=False to match LLMInterface.
            response = self.client.chat.completions.create(
                model=self.generation_model_id,
                messages=chat_history,
                max_completion_tokens=max_output_tokens,
                temperature=temperature,
                stream=False,
            )

            if not response or not response.choices or not response.choices[0].message:
                self.logger.error("Error while generating text with Groq: Empty response")
                return None

            return response.choices[0].message.content

        except Exception as e:
            self.logger.error(f"Groq API Error: {str(e)}")
            return None

    def generate_text_stream(self, prompt: str, chat_history: list=None, max_output_tokens: int=None,
                             temperature: float = None):
        if chat_history is None:
            chat_history = []

        if not self.client:
            self.logger.error("Groq client was not set")
            return

        if not self.generation_model_id:
            self.logger.error("Generation model for Groq was not set")
            return

        max_output_tokens = max_output_tokens if max_output_tokens else self.default_generation_max_output_tokens
        temperature = temperature if temperature else self.default_generation_temperature

        messages = list(chat_history)
        messages.append(
            self.construct_prompt(prompt=prompt, role=self.enums.USER.value)
        )

        try:
            stream = self.client.chat.completions.create(
                model=self.generation_model_id,
                messages=messages,
                max_completion_tokens=max_output_tokens,
                temperature=temperature,
                stream=True,
            )

            for chunk in stream:
                if not chunk or not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    yield content

        except Exception as e:
            self.logger.error(f"Groq streaming API Error: {str(e)}")
            return

    def embed_text(self, text: Union[str, List[str]], document_type: Optional[str] = None):
        # Groq does not provide an embeddings API.
        self.logger.error("Groq provider does not support text embedding.")
        return None

    def construct_prompt(self, prompt: str, role: str):
        return {
            "role": role,
            "content": self.process_text(prompt)
        }
