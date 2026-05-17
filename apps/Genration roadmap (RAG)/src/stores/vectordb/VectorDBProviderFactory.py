from controllers.BaseController import BaseController

from .providers import PgvectorDBProvider, QdrantDBProvider
from .VectorDBEnums import VectorDBEnums
import logging
from controllers.BaseController import BaseController

class VectorDBProviderFactory:

    def __init__(self, config):
        self.config = config
        self.base_controller = BaseController()
    
    def create(self, provider: str):
        if provider == VectorDBEnums.QDRANT.value:
            # db_path = self.base_controller.get_database_path(db_name=self.config.VECTOR_DB_PATH)

            return QdrantDBProvider(
                url=self.config.QDRANT_URL,
                api_key=self.config.QDRANT_API_KEY,
                distance_method=self.config.VECTOR_DB_DISTANCE_METHOD,
            )

        # 2. Handle PGVector
        elif provider == VectorDBEnums.PGVECTOR.value:
            return PgvectorDBProvider(
                # URL: postgresql://postgres:pass@localhost:5432/minirag
                db_url = self.config.POSTGRES_DATABASE_URL,
                default_vector_size = self.config.INPUT_DAFAULT_MAX_CHARACTERS 
            )

        self.logger.error(f"Vector Database Provider '{provider}' not supported.")
        return None