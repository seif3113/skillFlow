# from models.db_schemes import Project, DataChunk
from controllers.BaseController import BaseController
from stores.llm.LLMEnums import DocumentTypeEnum
from typing import List
import json
from langchain_core.documents import Document
from controllers.document_loader import load_chunks
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_community.chat_message_histories import ChatMessageHistory
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

        self.chat_history = []
        self.chat_history_edit = []
        self.chat_history_explain = []

    
        try:
            system_prompt = self.template_parser.get("chat", "system_prompt")
        except Exception:
                system_prompt = (
                    "You are an expert AI educational advisor specializing in personalized curriculum design.",
                    "Your objective is to interview the user to collect precise technical requirements before generating a roadmap.",
                    "",
                    "### CRITICAL INSTRUCTIONS:",
                    "1. Read the user's input topic carefully (e.g., 'Machine Learning', 'Web Development').",
                    "2. Generate exactly 1 or 2 highly targeted, interactive Multiple-Choice Questions (MCQs) explicitly customized to that topic.",
                    "3. Do NOT provide any roadmaps, course lists, or introductory prose yet.",
                    "4. Make the choices realistic, technical, and concrete (avoid vague options).",
                    "5. Format the options clearly using letter bullet points (A, B, C, D) so they are easy to read and interact with.",
                    ""
                )

        self.chat_history.append(
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
                )
            )

    def create_collection(self):
        return f"Graduation_Project_Collection_1".strip()

    def get_collection_name(self):
        return f"Graduation_Project_Collection_1".strip()

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

        metadata = []
        for c in chunks:
            chunk_meta = c.metadata.copy() if c.metadata else {}
            
            # 1. Search the chunk's text to find the actual source platform
            extracted_source = "Unknown"
            for line in c.page_content.split('\n'):
                if line.startswith('source:'):
                    extracted_source = line.split('source:', 1)[1].strip()
                    break 
        
            chunk_meta["source"] = extracted_source
            metadata.append(chunk_meta)

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

        # step4 : Create the index for our source filtering 
        self.vectordb_client.create_payload_index(
            collection_name=collection_name,
            field_name="metadata.source",
            field_schema="keyword"  # "keyword" means we are doing exact text matching
        )

        # step5: insert into vector db
        _ = self.vectordb_client.insert_many(
            collection_name=collection_name,
            texts=texts,
            metadata=metadata,
            vectors=vectors,
            record_ids=None, # Utilizing QdrantDBProvider's new UUID fallback instead of sequential ints
        )

        return True

    def search_vector_db_collection(self, text: str, limit: int = 10, source : str = None):

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
            limit=limit,
            source=source
        )

        if not results:
            return False

        return results
    
### version 2.0 with RAG and category definition ###
    def define_answer_category_definition(self, category_prompt: str):

        system_prompt = self.template_parser.get("category_definition", "system_prompt")

        category_definition_prompt = self.template_parser.get("category_definition", "category_definition_prompt", {
            "category_name": category_prompt
        })

        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        full_prompt = "\n\n".join([system_prompt, category_definition_prompt])

        answer = self.generation_client.generate_text(
            prompt=full_prompt,
            chat_history=chat_history
        )

        return answer

    def answer_rag_question(self, query: str, limit: int = 10):
        
        answer, full_prompt, chat_history  = None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query,
            limit=limit,
        )

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history
        
        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")

        documents_prompts = "\n".join([
            self.template_parser.get("rag", "document_prompt", {
                    "doc_num": idx + 1,
                    "chunk_text": doc.payload.get("text", "") if hasattr(doc, "payload") 
                    else getattr(doc, "text", str(doc)),
            })
            for idx, doc in enumerate(retrieved_documents)
        ])

        footer_prompt = self.template_parser.get("rag", "footer_prompt", {
            "query": query
        })

        # step3: Construct Generation Client Prompts
        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        full_prompt = "\n\n".join([documents_prompts, footer_prompt])

        # step4: Retrieve the Answer
        answer = self.generation_client.generate_text(
            prompt=full_prompt,
            chat_history=chat_history
        )

        return answer, full_prompt, chat_history    
    
    def get_article_resources(self, query: str, limit: int = 10, source: str = None):
        answer, full_prompt, chat_history  = None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query,  
            limit=limit,
            source=source
        )

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history
        
        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")

        documents_prompts = "\n".join([
            self.template_parser.get("rag", "document_prompt", {
                    "doc_num": idx + 1,
                    "chunk_text": doc.payload.get("text", "") if hasattr(doc, "payload") 
                    else getattr(doc, "text", str(doc)),
            })
            for idx, doc in enumerate(retrieved_documents)
        ])

        footer_prompt = self.template_parser.get("rag", "footer_prompt", {
            "query": query
        })

        # step3: Construct Generation Client Prompts
        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        full_prompt = "\n\n".join([documents_prompts, footer_prompt])

        # step4: Retrieve the Answer
        answer = self.generation_client.generate_text(
            prompt=full_prompt,
            chat_history=chat_history
        )

        return answer, full_prompt, chat_history
    
    def get_video_resources(self, query: str, limit: int = 10, source: str = None):
        answer, full_prompt, chat_history  = None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query,
            limit=limit,
            source=source
        )

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history
        
        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")

        documents_prompts = "\n".join([
            self.template_parser.get("rag", "document_prompt", {
                    "doc_num": idx + 1,
                    "chunk_text": doc.payload.get("text", "") if hasattr(doc, "payload") 
                    else getattr(doc, "text", str(doc)),
            })
            for idx, doc in enumerate(retrieved_documents)
        ])

        footer_prompt = self.template_parser.get("rag", "footer_prompt", {
            "query": query
        })

        # step3: Construct Generation Client Prompts
        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        full_prompt = "\n\n".join([documents_prompts, footer_prompt])

        # step4: Retrieve the Answer
        answer = self.generation_client.generate_text(
            prompt=full_prompt,
            chat_history=chat_history
        )

        return answer, full_prompt, chat_history
    

    def chat_with_user(self, user_prompt: str):
        """
        Acts as a conversational chatbot.
        Uses internal self.chat_history to maintain state automatically.
        """

        
        # Call the API using the internal class memory
        answer = self.generation_client.generate_text(
            prompt=user_prompt,
            chat_history=self.chat_history
        )

        # Append the AI's generated response to the internal history
        if answer:
            self.chat_history.append(
                self.generation_client.construct_prompt(
                    prompt=answer,
                    role=self.generation_client.enums.ASSISTANT.value, 
                )
            )
        else:
            logger.error("Chatbot failed to generate a response.")

        if answer in ["quit", "exit", "goodbye"]:
            self.chat_history = [] 

        return answer

    def get_roadmap_questions(self, topic: str):
        """
        Generates 5 highly targeted MCQs to help customize a roadmap for a given topic.
        Does not maintain chat history.
        """
        try:
            system_prompt = self.template_parser.get("roadmap_customization", "system_prompt", {"topic": topic})
        except Exception:
            system_prompt = (
                f"You are an expert AI educational advisor. Generate 5 multiple choice questions with 4 choices each to customize a roadmap for {topic}. "
                "Output as JSON object with 'questions' key containing list of objects with 'question' and 'choices' (list of strings)."
            )

        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        user_prompt = f"Please generate the 5 MCQ questions for the topic: {topic} in the requested JSON format."

        answer = self.generation_client.generate_text(
            prompt=user_prompt,
            chat_history=chat_history
        )

        if not answer:
            return None

        # Robust cleaning of markdown code blocks
        cleaned_answer = answer.strip()
        if "```" in cleaned_answer:
            # Extract content between triple backticks
            import re
            match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned_answer, re.DOTALL)
            if match:
                cleaned_answer = match.group(1).strip()
            else:
                # If no pair of backticks found, fallback to simple strip
                cleaned_answer = cleaned_answer.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(cleaned_answer)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {answer}")
            return None

    def generate_customized_roadmap_rag(self, topic: str, customization_answers: list = None):
        """
        Generates a comprehensive customized roadmap with resources in just 2 LLM calls.
        """
        from datetime import datetime
        current_time = datetime.now().isoformat()
        
        customization_str = "None provided"
        if customization_answers:
            customization_str = "\n".join([f"- {ans}" for ans in customization_answers])

        # Step 1: Get sub-topics (LLM Call 1)
        try:
            seg_system_prompt = self.template_parser.get("roadmap_generator", "topic_segmentation_system_prompt")
            seg_user_prompt = self.template_parser.get("roadmap_generator", "topic_segmentation_user_prompt", {
                "topic": topic,
                "customization": customization_str
            })
        except Exception:
            seg_system_prompt = "You are an educational architect. Break down a field into 5-8 sub-topics. Return JSON array of objects with 'title' and 'search_query'."
            seg_user_prompt = f"Break down '{topic}' into 5-8 sub-topics considering these preferences: {customization_str}"

        chat_history_1 = [
            self.generation_client.construct_prompt(prompt=seg_system_prompt, role=self.generation_client.enums.SYSTEM.value)
        ]
        
        topics_json_raw = self.generation_client.generate_text(prompt=seg_user_prompt, chat_history=chat_history_1)
        
        try:
            cleaned_topics = topics_json_raw.strip()
            if "```" in cleaned_topics:
                import re
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned_topics, re.DOTALL)
                if match: cleaned_topics = match.group(1).strip()
            topic_objects = json.loads(cleaned_topics)
            # Ensure it's a list of objects
            if not isinstance(topic_objects, list) or not all(isinstance(obj, dict) for obj in topic_objects):
                raise ValueError("LLM did not return a list of objects.")
        except Exception as e:
            logger.error(f"Failed to parse sub-topics: {e}")
            return None

        # Step 2: Batch Vector Search using 'search_query'
        search_queries = [obj.get("search_query", obj.get("title", "")) for obj in topic_objects]
        vectors = self.embedding_helper.encode_texts(texts=search_queries, collection="all-MiniLM-L6-v2")
        collection_name = self.get_collection_name()
        batch_results = self.vectordb_client.search_batch_by_vectors(
            collection_name=collection_name,
            vectors=vectors,
            limit=10 
        )

        # Format context for the final LLM call
        context_per_topic = []
        for i, obj in enumerate(topic_objects):
            topic_name = obj.get("title")
            results = batch_results[i]
            topic_context = f"### Topic: {topic_name}\n"
            if not results:
                topic_context += "No direct resources found in database for this specific sub-topic.\n"
            else:
                for res in results:
                    payload = getattr(res, "payload", {})
                    text = payload.get("text", "")
                    meta = payload.get("metadata", {})
                    source = meta.get("source", "Unknown").strip()
                    url = meta.get("url", "No URL available").strip()
                    
                    res_type = "Course" 
                    source_lower = source.lower()
                    if any(x in source_lower for x in ["youtube", "video", "vimeo"]):
                        res_type = "Video"
                    elif any(x in source_lower for x in ["w3schools", "article", "documentation", "blog", "medium", "khan academy"]):
                        res_type = "Article"
                    
                    topic_context += f"- [Type: {res_type}] [Source: {source}] [Title: {text}] [URL: {url}]\n"
            context_per_topic.append(topic_context)
        
        full_context = "\n\n".join(context_per_topic)

        # Step 3: Compile Final Roadmap (LLM Call 2)
        try:
            comp_system_prompt = self.template_parser.get("roadmap_generator", "roadmap_compilation_system_prompt", {"current_time": current_time})
            comp_user_prompt = self.template_parser.get("roadmap_generator", "roadmap_compilation_user_prompt", {
                "sub_topics": json.dumps([obj.get("title") for obj in topic_objects]),
                "context": full_context
            })
        except Exception:
            comp_system_prompt = f"Generate a JSON roadmap with topics and resources (Max 3 per topic). Current time: {current_time}."
            comp_user_prompt = f"Topics: {[obj.get('title') for obj in topic_objects]}\nContext: {full_context}"

        chat_history_2 = [
            self.generation_client.construct_prompt(prompt=comp_system_prompt, role=self.generation_client.enums.SYSTEM.value)
        ]

        final_roadmap_raw = self.generation_client.generate_text(prompt=comp_user_prompt, chat_history=chat_history_2)

        try:
            cleaned_roadmap = final_roadmap_raw.strip()
            if "```" in cleaned_roadmap:
                import re
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned_roadmap, re.DOTALL)
                if match: cleaned_roadmap = match.group(1).strip()
            return json.loads(cleaned_roadmap)
        except Exception as e:
            logger.error(f"Failed to parse final roadmap: {e}")
            return None


    def change_roadmap(self, user_prompt: str):

        try:
            system_prompt = self.template_parser.get("chat", "system_prompt")
        except Exception:
                system_prompt = (
                    "You are an expert educational advisor. Your goal is to help the user build a learning roadmap. "
                    "Analyze the user's request and ask 1 or 2 short, clarifying questions to better understand their goals, "
                    "current skill level, or preferred learning style. Do NOT give them a roadmap or list of courses yet. "
                    "Just engage in a helpful conversation and ask questions."
                )

        self.chat_history.append(
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
                )
            )
        
        answer = self.generation_client.generate_text(
            prompt=user_prompt,
            chat_history=self.chat_history
        )
        
        if answer:
            self.chat_history.append(
                self.generation_client.construct_prompt(
                    prompt=answer,
                    role=self.generation_client.enums.ASSISTANT.value, 
                )
            )
        else:
            logger.error("Chatbot failed to generate a response.")

        if answer in ["quit", "exit", "goodbye"]:
            self.chat_history = []    

        return answer    
    

    def explain_node(self, node_name: str, user_question: str = None):
        """
        Retrieves context about a specific node (topic) and explains it.
        If user_question is provided, it answers that specific question about the node.
        """
        # Step 1: Retrieve context for this specific node from the Vector DB
        retrieved_documents = self.search_vector_db_collection(text=node_name, limit=3)
        
        context_text = ""
        if retrieved_documents:
            context_text = "\n".join([
                doc.payload.get("text", "") if hasattr(doc, "payload") else getattr(doc, "text", str(doc)) 
                for doc in retrieved_documents
            ])

        # Step 2: Construct the Prompt
        try:
            system_prompt = self.template_parser.get("explain", "system_prompt")
        except Exception:
            system_prompt = (
                "You are a highly technical AI tutor. Your goal is to explain the requested concept clearly. "
                "Use the provided context to ground your explanation. If the context is insufficient, rely on your "
                "expert knowledge, but prioritize the provided context."
            )

        prompt_content = f"Target Concept: {node_name}\n"
        if user_question:
            prompt_content += f"User Question: {user_question}\n"
        prompt_content += f"\nContext:\n{context_text}\n\nPlease provide a clear, structured explanation."

        # Initialize isolated chat history for this explanation
        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        # Step 3: Generate the answer
        answer = self.generation_client.generate_text(
            prompt=prompt_content,
            chat_history=chat_history
        )

        return answer