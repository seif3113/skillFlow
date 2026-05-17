# from models.db_schemes import Project, DataChunk
from controllers.BaseController import BaseController
from stores.llm.LLMEnums import DocumentTypeEnum
from typing import List
import json
from langchain_core.documents import Document
from controllers.document_loader import load_chunks
import logging

logger = logging.getLogger("uvicorn.error")

class NLPController(BaseController):

    def __init__(self, vectordb_client, generation_client, embedding_client,template_parser, embedding_helper):

        super().__init__()
    
        self.vectordb_client = vectordb_client
        self.generation_client = generation_client
        self.embedding_client = embedding_client
        self.template_parser = template_parser
        self.embedding_helper = embedding_helper

    def create_collection(self):
        return f"Graduation_Project_Collection".strip()

    def get_collection_name(self):
        return f"Graduation_Project_Collection".strip()
    
    def reset_vector_db_collection(self,collection_name):
        return self.vectordb_client.delete_collection(collection_name=collection_name)
    
    def get_vector_db_collection_info(self,collection_name):
        collection_info = self.vectordb_client.get_collection_info(collection_name=collection_name)

        return json.loads(
            json.dumps(collection_info, default=lambda x: x.__dict__)
        )
    
    def index_into_vector_db(self, chunks: List[Document], chunks_ids: List[int], do_reset: bool = False):

        # step1: get collection name
        collection_name = self.get_collection_name()
       
        # step2: manage items
        texts = [ c.page_content for c in chunks ]
        print(texts[0:1])
        metadata = [ c.metadata for c in  chunks]
        print(metadata[0:1])
        print("....")
        response = self.embedding_helper.encode_text(text="test embedding", collection="all-MiniLM-L6-v2")
        print(f"Warm-up embedding response: {response} and length: {len(response)}")
        vectors = []
        logger.info(f"Starting to embed {len(texts)} chunks. This may take a while...")
        
        for i, text in enumerate(texts):
            # Print progress every 100 chunks
            if i % 100 == 0 and i > 0:
                logger.info(f"Embedded {i}/{len(texts)} chunks...")
                
            vector = self.embedding_helper.encode_text(text=text, collection="all-MiniLM-L6-v2")
            vectors.append(vector)
            
        logger.info("Finished embedding all chunks! Now inserting into vector DB...")

        # step3: create collection if not exists
        _ = self.vectordb_client.create_collection(
            collection_name=collection_name,
            embedding_size=self.embedding_helper.embedding_size,
            do_reset=do_reset,
        )

        # step4: insert into vector db
        _ = self.vectordb_client.insert_many(
            collection_name=collection_name,
            texts=texts,
            metadata=metadata,
            vectors=vectors,
            record_ids=None, # Utilizing QdrantDBProvider's new UUID fallback instead of sequential ints
        )

        return True

    def search_vector_db_collection(self, text: str, limit: int = 10):

        # step1: get collection name
        collection_name = self.get_collection_name()

        # step2: get text embedding vector
        vector = self.embedding_helper.encode_text(text=text, collection="all-MiniLM-L6-v2")

        # print(f"Search query embedding vector: {vector} and length: {len(vector)}")
        if not vector or len(vector) == 0:
            return False

        # step3: do semantic search
        results = self.vectordb_client.search_by_vector(
            collection_name=collection_name,
            vector=vector,
            limit=limit
        )

        if not results:
            return False

        return results
    
### version 2.0 with RAG and category definition ###
    def define_answer_category_definition(self, category_prompt: str):

        system_prompt = self.template_parser.get("category_definition", "system_prompt")
        print(f"System prompt for category definition: {system_prompt[:20]}")

        category_definition_prompt = self.template_parser.get("category_definition", "category_definition_prompt", {
            "category_name": category_prompt
        })
        # print(f"Category definition prompt: {category_definition_prompt}")


        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]
        print(f"Chat history after adding system prompt: {chat_history[:20]}")

        full_prompt = "\n\n".join([system_prompt, category_definition_prompt])
        # print(f"Full prompt for category definition:\n{full_prompt[:200]}")

        answer = self.generation_client.generate_text(
            prompt=full_prompt,
            chat_history=chat_history
        )

        print(f"Generated category definition answer: {answer[:20]}")

        return answer

    def answer_rag_question(self, query: str, limit: int = 10):
        
        answer, full_prompt, chat_history,results  = None, None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query,
            limit=limit,
        )

        # print(f"Retrieved {len(retrieved_documents) } documents.")

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history
        
        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")
        # print(f"System prompt: {system_prompt}")

        documents_prompts = "\n".join([
            self.template_parser.get("rag", "document_prompt", {
                    "doc_num": idx + 1,
                    # Correctly accessing 'text' from the payload based on your search results
                    "chunk_text": doc.payload.get("text", "") if hasattr(doc, "payload") 
                    else getattr(doc, "text", str(doc)),
            })
            for idx, doc in enumerate(retrieved_documents)
        ])
        # print(f"Documents prompts: {documents_prompts}")
        # FIX: Pass the 'query' variable here to satisfy the template parser
        footer_prompt = self.template_parser.get("rag", "footer_prompt", {
            "query": query
        })
        # print(f"Footer prompt: {footer_prompt}")

        # step3: Construct Generation Client Prompts
        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]
        # print(f"Chat history after adding system prompt: {chat_history}")

        full_prompt = "\n\n".join([documents_prompts, footer_prompt])
        # print(f"Full prompt for generation:\n{full_prompt}")

        # step4: Retrieve the Answer
        answer = self.generation_client.generate_text(
            prompt=full_prompt,
            chat_history=chat_history
        )

        return answer, full_prompt, chat_history    
    















    
    # def answer_rag_question(self, query: str, limit: int = 10):
        
    #     answer, full_prompt, chat_history = None, None, None

    #     # step1: retrieve related documents
    #     retrieved_documents = self.search_vector_db_collection(
    #         text=query,
    #         limit=limit,
    #     )

    #     if not retrieved_documents or len(retrieved_documents) == 0:
    #         return answer, full_prompt, chat_history
        
    #     # step2: Construct LLM prompt
    #     system_prompt = self.template_parser.get("rag", "system_prompt")

    #     documents_prompts = "\n".join([
    #         self.template_parser.get("rag", "document_prompt", {
    #                 "doc_num": idx + 1,
    #                 # Fallback cleanly if result is ScoredPoint (Qdrant) vs custom dict/object
    #                 "chunk_text": getattr(doc, "payload", {}).get("text", "") if hasattr(doc, "payload") 
    #                 else getattr(doc, "text", str(doc)),
    #         })
    #         for idx, doc in enumerate(retrieved_documents)
    #     ])

    #     footer_prompt = self.template_parser.get("rag", "footer_prompt")

    #     # step3: Construct Generation Client Prompts
    #     chat_history = [
    #         self.generation_client.construct_prompt(
    #             prompt=system_prompt,
    #             role=self.generation_client.enums.SYSTEM.value,
    #         )
    #     ]

    #     full_prompt = "\n\n".join([ documents_prompts,  footer_prompt])

    #     # step4: Retrieve the Answer
    #     answer = self.generation_client.generate_text(
    #         prompt=full_prompt,
    #         chat_history=chat_history
    #     )

    #     return answer, full_prompt, chat_history

