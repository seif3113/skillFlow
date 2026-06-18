from fastapi import FastAPI
from routes import base,data,nlp
from helpers.config import get_settings
from stores.llm.templates.template_parser import TemplateParser
from stores.llm.LLMEnums import LLMEnums
from stores.llm.LLMProviderFactory import LLMProviderFactory
from stores.vectordb.VectorDBProviderFactory import VectorDBProviderFactory
from stores.embedding.embedding_model import EmbeddingHelper

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    settings = get_settings()

    llm_provider_factory = LLMProviderFactory(settings)
    vectordb_provider_factory = VectorDBProviderFactory(settings)
    
    # generation client
    generation_provider = settings.GENERATION_CLIENT
    app.generation_client = llm_provider_factory.create(provider=generation_provider)
    
    if generation_provider == LLMEnums.GEMINI.value:
        app.generation_client.set_generation_model(model_id = settings.GEMINI_GENERATION_MODEL_NAME)
    elif generation_provider == LLMEnums.CEREBRAS.value:
        app.generation_client.set_generation_model(model_id = settings.CEREBRAS_GENERATION_MODEL_NAME)
    elif generation_provider == LLMEnums.GROQ.value:
        app.generation_client.set_generation_model(model_id = settings.GROQ_GENERATION_MODEL_NAME)
    elif generation_provider == LLMEnums.OPENAI.value:
        # If OpenAI needs a specific model, it should be set here too. 
        # For now, keeping it consistent with how it was (implicitly using defaults or handled elsewhere)
        pass

    # embedding client
    app.embedding_client = llm_provider_factory.create(provider=settings.EMBEDDING_CLIENT)
    app.embedding_client.set_embedding_model(model_id=settings.OLLAMA_EMBEDDING_MODEL_NAME,
                                             embedding_size=settings.OLLAMA_EMBEDDING_MODEL_SIZE)

    # vector db client
    app.vectordb_client = vectordb_provider_factory.create(provider=settings.VECTOR_DB_CLIENT)
    app.vectordb_client.connect()

    app.template_parser = TemplateParser(
        language=settings.PRIMARY_LANG,
        default_language=settings.DEFAULT_LANG,
    )    

    # embedding helper
    app.embedding_helper = EmbeddingHelper()

@app.on_event("shutdown")    
async def shutdown_event():
    app.vectordb_client.disconnect()



app.include_router(base.base_router)
app.include_router(data.data_router)
app.include_router(nlp.nlp_router)