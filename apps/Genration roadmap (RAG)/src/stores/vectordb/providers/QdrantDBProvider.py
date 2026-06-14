from qdrant_client import models, QdrantClient
from ..VectorDBInterface import VectorDBInterface
from ..VectorDBEnums import DistanceMethodEnums
import logging
import uuid
from typing import List

class QdrantDBProvider(VectorDBInterface):

    def __init__(self,url: str, api_key: str,  distance_method: str):

        self.client = None
        self.distance_method = None
        self.url = url
        self.api_key = api_key

        if distance_method == DistanceMethodEnums.COSINE.value:
            self.distance_method = models.Distance.COSINE
        elif distance_method == DistanceMethodEnums.DOT.value:
            self.distance_method = models.Distance.DOT

        self.logger = logging.getLogger(__name__)

    def connect(self):
        self.client = QdrantClient(url=self.url, api_key=self.api_key)

    def disconnect(self):
        if self.client is not None:
            self.client.close() 
        self.client = None

    def is_collection_existed(self, collection_name: str) -> bool:
        return self.client.collection_exists(collection_name=collection_name)
    
    def list_all_collections(self) -> List:
        return self.client.get_collections()
    
    def get_collection_info(self, collection_name: str) -> dict:
        return self.client.get_collection(collection_name=collection_name)
    
    def delete_collection(self, collection_name: str):
        if self.is_collection_existed(collection_name):
            return self.client.delete_collection(collection_name=collection_name)
        
    def create_collection(self, collection_name: str, 
                                embedding_size: int,
                                do_reset: bool = False):
        if do_reset:
            _ = self.delete_collection(collection_name=collection_name)
        
        if not self.is_collection_existed(collection_name):
            _ = self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=embedding_size,
                    distance=self.distance_method
                )
            )

            return True
        
        return False
    
    def insert_one(self, collection_name: str, text: str, vector: list,
                         metadata: dict = None, 
                         record_id: str = None):
        
        if not self.is_collection_existed(collection_name):
            self.logger.error(f"Can not insert new record to non-existed collection: {collection_name}")
            return False
        
        try:
            point_id = record_id if record_id is not None else uuid.uuid4().hex
            
            _ = self.client.upsert(
                collection_name=collection_name,
                points=[
                    models.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={
                            "text": text, "metadata": metadata,
                        }
                    )
                ]
            )
        except Exception as e:
            self.logger.error(f"Error while inserting batch: {e}")
            return False

        return True
    
    def insert_many(self, collection_name: str, texts: list, 
                          vectors: list, metadata: list = None, 
                          record_ids: list = None, batch_size: int = 50):
        
        if metadata is None:
            metadata = [None] * len(texts)

        if record_ids is None:
            record_ids = [uuid.uuid4().hex for _ in range(len(texts))]

        for i in range(0, len(texts), batch_size):
            batch_end = i + batch_size

            batch_texts = texts[i:batch_end]
            batch_vectors = vectors[i:batch_end]
            batch_metadata = metadata[i:batch_end]
            batch_ids = record_ids[i:batch_end]

            batch_records = [
                models.PointStruct(
                    id=batch_ids[x],
                    vector=batch_vectors[x],
                    payload={
                        "text": batch_texts[x], "metadata": batch_metadata[x]
                    }
                )

                for x in range(len(batch_texts))
            ]

            try:
                _ = self.client.upsert(
                    collection_name=collection_name,
                    points=batch_records,
                )
            except Exception as e:
                self.logger.error(f"Error while inserting batch: {e}")
                return False

        return True
        

    def search_by_vector(self, collection_name: str, vector: list, limit: int = 5,source : str = None  ):
        if self.client is None:
            self.logger.error("Qdrant client is not connected.")
            return []
        
        query_filter = None

        if source:
            query_filter = models.Filter(
                must=[models.FieldCondition(key="metadata.source", match=models.MatchValue(value=source))]
            )
        try:
            # Using the new query_points API to remove the DeprecationWarning
            result = self.client.query_points(
                collection_name=collection_name,
                query=vector,  
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
            # query_points returns a different object structure, we want the 'points'
            return result.points 
            
        except Exception as e:
            self.logger.error(f"Search failed: {e}")
            return []

    def create_payload_index(self, collection_name: str, field_name: str, field_schema: str):
        """Creates an index on a metadata payload field for faster filtering."""
        if self.client is None:
            self.logger.error("Qdrant client is not connected.")
            return False
            
        try:
            self.client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=field_schema,
            )
            return True
        except Exception as e:
            self.logger.error(f"Failed to create payload index for {field_name}: {e}")
            return False


