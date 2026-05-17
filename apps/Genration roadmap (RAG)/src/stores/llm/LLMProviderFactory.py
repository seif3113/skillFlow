#Add Gemini Provider implementation for Version 3

from .providers import OpenAIProvider, GoogleGeminiProvider 
from .LLMEnums import LLMEnums
import logging

logger = logging.getLogger(__name__)

class LLMProviderFactory:
    def __init__(self, config):
        self.config = config

    def create(self, provider: str):
        # Ensure the string is clean and uppercase
        provider = provider.upper().strip() if provider else ""

        # OpenAI branch
        if provider == LLMEnums.OPENAI.value:
            return OpenAIProvider(
                api_key = self.config.OPENAI_API_KEY,
                api_url = self.config.OPENAI_API_URL,
                default_input_max_characters=self.config.INPUT_DAFAULT_MAX_CHARACTERS,
                default_generation_max_output_tokens=self.config.GENERATION_DAFAULT_MAX_TOKENS,
                default_generation_temperature=self.config.GENERATION_DAFAULT_TEMPERATURE
            )
            
        # Google Gemini branch
        elif provider == LLMEnums.GEMINI.value:
            # Safely fetch the key (make sure GEMINI_API_KEY is in your .env and config helper!)
            gemini_key = getattr(self.config, 'GEMINI_API_KEY', None)
            
            if not gemini_key:
                logger.warning("GEMINI_API_KEY is missing from your configuration!")

            return GoogleGeminiProvider(
                api_key = gemini_key,
                api_url = None, # Gemini connects directly to Google's API, no custom URL needed
                default_input_max_characters=self.config.INPUT_DAFAULT_MAX_CHARACTERS,
                default_generation_max_output_tokens=self.config.GENERATION_DAFAULT_MAX_TOKENS,
                default_generation_temperature=self.config.GENERATION_DAFAULT_TEMPERATURE
            )
            
        return None