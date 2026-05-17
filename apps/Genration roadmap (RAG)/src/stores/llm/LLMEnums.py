# add enums for Gemini and Document Type for version 3

from enum import Enum

class LLMEnums(Enum):
    OLLAMA = "OLLAMA"
    OPENAI = "OPENAI"
    GEMINI = "GEMINI"

class OpenAIEnums(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"

class GeminiEnums(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"    

class DocumentTypeEnum(Enum):
    DOCUMENT = "document"
    QUERY = "query"