from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    APP_NAME :str
    APP_VERSION  :str    

    SUPABASE_URL :str
    SUPABASE_KEY :str

    GENERATION_CLIENT: str
    EMBEDDING_CLIENT: str

    OLLAMA_GENERATION_MODEL_NAME: str = None
    OLLAMA_EMBEDDING_MODEL_NAME: str = None
    OLLAMA_EMBEDDING_MODEL_SIZE: int = None
    OPENAI_API_KEY : str = None
    OPENAI_API_URL: str = None
    INPUT_DAFAULT_MAX_CHARACTERS: int = None
    GENERATION_DAFAULT_MAX_TOKENS: int = None
    GENERATION_DAFAULT_TEMPERATURE: float = None

    # Gemini configuration for Version 3
    GEMINI_GENERATION_CLIENT : str = None
    GEMINI_GENERATION_MODEL_NAME : str = None
    GEMINI_EMBEDDING_MODEL_NAME : str = None
    GEMINI_EMBEDDING_MODEL_SIZE : int = None
    GEMINI_API_KEY : str = None

    # Cerebras configuration
    CEREBRAS_GENERATION_CLIENT : str = None
    CEREBRAS_GENERATION_MODEL_NAME : str = None
    CEREBRAS_API_KEY : str = None

    # Groq configuration
    GROQ_GENERATION_MODEL_NAME : str = None
    GROQ_API_KEY : str = None

    VECTOR_DB_CLIENT :str
    VECTOR_DB_PATH :str
    VECTOR_DB_DISTANCE_METHOD :str

    QDRANT_URL : str
    QDRANT_API_KEY : str

    # ========================= Template Configs =========================
    PRIMARY_LANG: str = "en"
    DEFAULT_LANG: str = "en"

    EMBEDDING_HELPER_NAME : str 

    class Config:
        env_file = ".env"

def get_settings():
    return Settings()

