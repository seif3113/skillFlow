# import json
# import logging
# from typing import List, Union, Optional
# import asyncpg
# from ..VectorDBInterface import VectorDBInterface
# from models.schemes import RetrievedDocument

# class PGVectorProvider(VectorDBInterface):
#     def __init__(self, db_url: str, default_vector_size: int = 1024):
#         """
#         db_url: postgresql://user:pass@localhost:5432/dbname
#         """
#         self.db_url = db_url
#         self.default_vector_size = default_vector_size
#         self.pool: Optional[asyncpg.Pool] = None
#         self.logger = logging.getLogger(__name__)

#     async def connect(self):
#         self.pool = await asyncpg.create_pool(self.db_url)
#         self.logger.info("Connected to PostgreSQL (PGVector)")

#     async def disconnect(self):
#         if self.pool:
#             await self.pool.close()
#             self.pool = None

#     async def is_collection_existed(self, collection_name: str) -> bool:
#         # In PGVector, a "collection" is a table
#         query = """
#         SELECT EXISTS (
#             SELECT FROM information_schema.tables 
#             WHERE table_name = $1
#         );
#         """
#         return await self.pool.fetchval(query, collection_name)

#     async def create_collection(self, collection_name: str, 
#                                 embedding_size: int,
#                                 do_reset: bool = False):
#         if do_reset:
#             await self.delete_collection(collection_name)
        
#         size = embedding_size or self.default_vector_size
        
#         # SQL to create the table with a vector column
#         query = f"""
#         CREATE TABLE IF NOT EXISTS {collection_name} (
#             id TEXT PRIMARY KEY,
#             text TEXT NOT NULL,
#             metadata JSONB,
#             embedding vector({size})
#         );
#         """
#         async with self.pool.acquire() as conn:
#             await conn.execute(query)
#             # Create an HNSW index for faster searching
#             await conn.execute(f"CREATE INDEX IF NOT EXISTS {collection_name}_idx ON {collection_name} USING hnsw (embedding vector_cosine_ops);")
#         return True

#     async def insert_one(self, collection_name: str, text: str, vector: list,
#                          metadata: dict = None, 
#                          record_id: str = None):
#         query = f"""
#         INSERT INTO {collection_name} (id, text, metadata, embedding)
#         VALUES ($1, $2, $3, $4)
#         ON CONFLICT (id) DO UPDATE SET text = $2, metadata = $3, embedding = $4;
#         """
#         await self.pool.execute(query, record_id, text, json.dumps(metadata), vector)
#         return True

#     async def insert_many(self, collection_name: str, texts: list, 
#                           vectors: list, metadata: list = None, 
#                           record_ids: list = None, batch_size: int = 50):
#         if not record_ids:
#             import uuid
#             record_ids = [str(uuid.uuid4()) for _ in range(len(texts))]
        
#         # Prepare data for asyncpg copy_records_to_table or executemany
#         data = [
#             (record_ids[i], texts[i], json.dumps(metadata[i] if metadata else {}), vectors[i])
#             for i in range(len(texts))
#         ]
        
#         query = f"INSERT INTO {collection_name} (id, text, metadata, embedding) VALUES ($1, $2, $3, $4)"
#         async with self.pool.acquire() as conn:
#             await conn.executemany(query, data)
#         return True

#     async def search_by_vector(self, collection_name: str, vector: list, limit: int = 5) -> List[RetrievedDocument]:
#         # PGVector uses <=> for cosine distance
#         query = f"""
#         SELECT text, metadata, (1 - (embedding <=> $1)) as score
#         FROM {collection_name}
#         ORDER BY embedding <=> $1
#         LIMIT $2;
#         """
#         rows = await self.pool.fetch(query, vector, limit)
        
#         return [
#             RetrievedDocument(
#                 text=row['text'],
#                 score=row['score'],
#                 metadata=json.loads(row['metadata']) if row['metadata'] else {}
#             ) for row in rows
#         ]

#     async def delete_collection(self, collection_name: str):
#         await self.pool.execute(f"DROP TABLE IF EXISTS {collection_name};")

#     async def list_all_collections(self) -> List[str]:
#         query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
#         rows = await self.pool.fetch(query)
#         return [row['table_name'] for row in rows]

#     async def get_collection_info(self, collection_name: str) -> dict:
#         # Simple count for info
#         count = await self.pool.fetchval(f"SELECT COUNT(*) FROM {collection_name}")
#         return {"count": count}