# Add Gemini Provider implementation for Version 3 

from ..LLMInterface import LLMInterface
import google.generativeai as genai
import logging
from typing import List, Union, Optional 

class GoogleGeminiProvider(LLMInterface):

    def __init__(self, api_key: str, api_url: str=None,
                       default_input_max_characters: int=30000,
                       default_generation_max_output_tokens: int=2000,
                       default_generation_temperature: float=0.1):
        
        self.api_key = api_key
        # api_url is typically not used for standard Gemini, but kept for interface consistency
        self.api_url = api_url 

        self.default_input_max_characters = default_input_max_characters
        self.default_generation_max_output_tokens = default_generation_max_output_tokens
        self.default_generation_temperature = default_generation_temperature

        self.generation_model_id = None
        self.embedding_model_id = None
        self.embedding_size = None

        # Configure Google Gemini
        genai.configure(api_key=self.api_key)
        
        # Fallback enum structure to maintain compatibility if GeminiEnums isn't created yet
        class DummyEnums:
            class SYSTEM: value = "system"
            class USER: value = "user"
            class ASSISTANT: value = "assistant"
            
        try:
            from ..LLMEnums import GeminiEnums
            self.enums = GeminiEnums
        except ImportError:
            self.enums = DummyEnums

        self.logger = logging.getLogger(__name__)

    def set_generation_model(self, model_id: str):
        self.generation_model_id = model_id

    def set_embedding_model(self, model_id: str, embedding_size: int):
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

        if not self.generation_model_id:
            self.logger.error("Generation model for Gemini was not set")
            return None
        
        max_output_tokens = max_output_tokens if max_output_tokens else self.default_generation_max_output_tokens
        temperature = temperature if temperature else self.default_generation_temperature

        # Append the current prompt
        chat_history.append(
            self.construct_prompt(prompt=prompt, role=self.enums.USER.value)
        )
        
        # Gemini handles system prompts differently. We extract it from the chat history.
        system_instruction = None
        formatted_history = []
        
        for msg in chat_history:
            role = msg.get("role")
            content = msg.get("content", "")
            
            if role == self.enums.SYSTEM.value:
                if system_instruction is None:
                    system_instruction = content
                else:
                    system_instruction += "\n" + content
            else:
                # Gemini only accepts "user" or "model" (assistant) roles
                gemini_role = "model" if role == self.enums.ASSISTANT.value else "user"
                formatted_history.append({"role": gemini_role, "parts": [content]})

        try:
            # Initialize the model with the extracted system instruction
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=self.generation_model_id,
                    system_instruction=system_instruction
                )
            else:
                model = genai.GenerativeModel(model_name=self.generation_model_id)

            # Configure generation parameters
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=max_output_tokens,
                temperature=temperature,
            )

            # Generate content
            response = model.generate_content(
                formatted_history,
                generation_config=generation_config
            )

            if not response or not response.text:
                self.logger.error("Error while generating text with Gemini: Empty response")
                return None

            return response.text

        except Exception as e:
            self.logger.error(f"Google Gemini API Error: {str(e)}")
            return None    

    def generate_text_stream(self, prompt: str, chat_history: list=None, max_output_tokens: int=None,
                             temperature: float = None):
        if chat_history is None:
            chat_history = []

        if not self.generation_model_id:
            self.logger.error("Generation model for Gemini was not set")
            return

        max_output_tokens = max_output_tokens if max_output_tokens else self.default_generation_max_output_tokens
        temperature = temperature if temperature else self.default_generation_temperature

        messages = list(chat_history)
        messages.append(
            self.construct_prompt(prompt=prompt, role=self.enums.USER.value)
        )

        system_instruction = None
        formatted_history = []

        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == self.enums.SYSTEM.value:
                if system_instruction is None:
                    system_instruction = content
                else:
                    system_instruction += "\n" + content
            else:
                gemini_role = "model" if role == self.enums.ASSISTANT.value else "user"
                formatted_history.append({"role": gemini_role, "parts": [content]})

        try:
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=self.generation_model_id,
                    system_instruction=system_instruction
                )
            else:
                model = genai.GenerativeModel(model_name=self.generation_model_id)

            generation_config = genai.types.GenerationConfig(
                max_output_tokens=max_output_tokens,
                temperature=temperature,
            )

            stream = model.generate_content(
                formatted_history,
                generation_config=generation_config,
                stream=True,
            )

            for chunk in stream:
                content = getattr(chunk, "text", None)
                if content:
                    yield content

        except Exception as e:
            self.logger.error(f"Google Gemini streaming API Error: {str(e)}")
            return

    def embed_text(self, text: Union[str, List[str]], document_type: Optional[str] = None):
        if not self.embedding_model_id:
            self.logger.error("Embedding model for Gemini was not set")
            return None
        
        try:
            model_name = self.embedding_model_id
            if not model_name.startswith("models/"):
                model_name = f"models/{model_name}"

            task_type = "RETRIEVAL_DOCUMENT" if document_type == "document" else "RETRIEVAL_QUERY"
            
            result = genai.embed_content(
                model=model_name,
                content=text,
                task_type=task_type
            )

            if not result or 'embedding' not in result:
                self.logger.error("Error while embedding text with Gemini")
                return None

            # Gemini returns a single list if `text` is a string, or a list of lists if `text` is a list.
            # To strictly match your interface's return type `List[List[float]]`, we wrap single strings in a list.
            embeddings = result['embedding']
            if isinstance(text, str):
                return [embeddings]
            return embeddings

        except Exception as e:
            self.logger.error(f"Gemini Embedding API Error: {str(e)}")
            return None

    def construct_prompt(self, prompt: str, role: str):
        # Keeps the same dictionary structure as OpenAI so NLPController doesn't break
        return {
            "role": role,
            "content": self.process_text(prompt)
        }
    
    
