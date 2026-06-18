from abc import ABC, abstractmethod
from typing import List

class VectorDBInterface(ABC):

    @abstractmethod
    def connect(self):
        pass

    @abstractmethod
    def disconnect(self):
        pass

    @abstractmethod
    def is_collection_existed(self, collection_name: str) -> bool:
        pass

    @abstractmethod
    def list_all_collections(self) -> List:
        pass

    @abstractmethod
    def get_collection_info(self, collection_name: str) -> dict:
        pass

    @abstractmethod
    def delete_collection(self, collection_name: str):
        pass

    @abstractmethod
    def create_collection(self, collection_name: str, 
                                embedding_size: int,
                                do_reset: bool = False):
        pass

    @abstractmethod
    def insert_one(self, collection_name: str, text: str, vector: list,
                         metadata: dict = None, 
                         record_id: str = None):
        pass

    @abstractmethod
    def insert_many(self, collection_name: str, texts: list, 
                          vectors: list, metadata: list = None, 
                          record_ids: list = None, batch_size: int = 50):
        pass

    @abstractmethod
    def search_by_vector(self, collection_name: str, vector: list, limit: int):
        pass

    @abstractmethod
    def search_batch_by_vectors(self, collection_name: str, vectors: List[list], limit: int):
        pass













# from abc import ABC, abstractmethod
# from typing import List, Optional, Union
# from models.schemes import RetrievedDocument

# class VectorDBInterface(ABC):

#     @abstractmethod
#     async def connect(self):
#         """Establish connection to the database."""
#         pass

#     @abstractmethod
#     async def disconnect(self):
#         """Close the database connection."""
#         pass

#     @abstractmethod
#     async def is_collection_existed(self, collection_name: str) -> bool:
#         pass

#     @abstractmethod
#     async def list_all_collections(self) -> List[str]:
#         pass

#     @abstractmethod
#     async def get_collection_info(self, collection_name: str) -> dict:
#         pass

#     @abstractmethod
#     async def delete_collection(self, collection_name: str):
#         pass

#     @abstractmethod
#     async def create_collection(self, collection_name: str, 
#                                 embedding_size: int,
#                                 do_reset: bool = False):
#         pass

#     @abstractmethod
#     async def insert_one(self, collection_name: str, text: str, vector: list,
#                          metadata: Optional[dict] = None, 
#                          record_id: Optional[Union[str, int]] = None) -> bool:
#         pass

#     @abstractmethod
#     async def insert_many(self, collection_name: str, texts: List[str], 
#                           vectors: List[list], metadata: Optional[List[dict]] = None, 
#                           record_ids: Optional[List[Union[str, int]]] = None, 
#                           batch_size: int = 50) -> bool:
#         pass

#     @abstractmethod
#     async def search_by_vector(self, collection_name: str, vector: list, 
#                                limit: int = 5) -> List[RetrievedDocument]:
#         """Perform semantic search and return standardized documents."""
#         pass