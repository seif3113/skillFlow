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

    def __init__(
        self,
        vectordb_client,
        generation_client,
        embedding_client,
        template_parser,
        embedding_helper,
    ):

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
                "",
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

    def reset_vector_db_collection(self, collection_name):
        return self.vectordb_client.delete_collection(collection_name=collection_name)

    def get_vector_db_collection_info(self, collection_name):
        collection_info = self.vectordb_client.get_collection_info(
            collection_name=collection_name
        )

        return json.loads(json.dumps(collection_info, default=lambda x: x.__dict__))

    def index_into_vector_db(
        self, chunks: List[Document], chunks_ids: List[int], do_reset: bool = False
    ):

        # step1: get collection name
        collection_name = self.get_collection_name()

        # step2: manage items
        texts = [c.page_content for c in chunks]

        metadata = []
        for c in chunks:
            chunk_meta = c.metadata.copy() if c.metadata else {}

            # 1. Search the chunk's text to find the actual source platform
            extracted_source = "Unknown"
            for line in c.page_content.split("\n"):
                if line.startswith("source:"):
                    extracted_source = line.split("source:", 1)[1].strip()
                    break

            chunk_meta["source"] = extracted_source
            metadata.append(chunk_meta)

        vectors = []
        logger.info(f"Starting to embed {len(texts)} chunks. This may take a while...")

        for i, text in enumerate(texts):
            # Print progress every 100 chunks
            if i % 100 == 0 and i > 0:
                logger.info(f"Embedded {i}/{len(texts)} chunks...")

            vector = self.embedding_helper.encode_text(
                text=text, collection="all-MiniLM-L6-v2"
            )
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
            field_schema="keyword",  # "keyword" means we are doing exact text matching
        )

        # step5: insert into vector db
        _ = self.vectordb_client.insert_many(
            collection_name=collection_name,
            texts=texts,
            metadata=metadata,
            vectors=vectors,
            record_ids=None,  # Utilizing QdrantDBProvider's new UUID fallback instead of sequential ints
        )

        return True

    def search_vector_db_collection(
        self, text: str, limit: int = 10, source: str = None
    ):

        # step1: get collection name
        collection_name = self.get_collection_name()

        # step2: get text embedding vector
        vector = self.embedding_helper.encode_text(
            text=text, collection="all-MiniLM-L6-v2"
        )

        # print(f"Search query embedding vector: {vector} and length: {len(vector)}")
        if not vector or len(vector) == 0:
            return False

        # step3: do semantic search
        results = self.vectordb_client.search_by_vector(
            collection_name=collection_name, vector=vector, limit=limit, source=source
        )

        if not results:
            return False

        return results

    ### version 2.0 with RAG and category definition ###
    def define_answer_category_definition(self, category_prompt: str):

        system_prompt = self.template_parser.get("category_definition", "system_prompt")

        category_definition_prompt = self.template_parser.get(
            "category_definition",
            "category_definition_prompt",
            {"category_name": category_prompt},
        )

        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        full_prompt = "\n\n".join([system_prompt, category_definition_prompt])

        answer = self.generation_client.generate_text(
            prompt=full_prompt, chat_history=chat_history
        )

        return answer

    def answer_rag_question(self, query: str, limit: int = 10):

        answer, full_prompt, chat_history = None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query,
            limit=limit,
        )

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history

        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")

        documents_prompts = "\n".join(
            [
                self.template_parser.get(
                    "rag",
                    "document_prompt",
                    {
                        "doc_num": idx + 1,
                        "chunk_text": (
                            doc.payload.get("text", "")
                            if hasattr(doc, "payload")
                            else getattr(doc, "text", str(doc))
                        ),
                    },
                )
                for idx, doc in enumerate(retrieved_documents)
            ]
        )

        footer_prompt = self.template_parser.get(
            "rag", "footer_prompt", {"query": query}
        )

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
            prompt=full_prompt, chat_history=chat_history
        )

        return answer, full_prompt, chat_history

    def get_article_resources(self, query: str, limit: int = 10, source: str = None):
        answer, full_prompt, chat_history = None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query, limit=limit, source=source
        )

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history

        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")

        documents_prompts = "\n".join(
            [
                self.template_parser.get(
                    "rag",
                    "document_prompt",
                    {
                        "doc_num": idx + 1,
                        "chunk_text": (
                            doc.payload.get("text", "")
                            if hasattr(doc, "payload")
                            else getattr(doc, "text", str(doc))
                        ),
                    },
                )
                for idx, doc in enumerate(retrieved_documents)
            ]
        )

        footer_prompt = self.template_parser.get(
            "rag", "footer_prompt", {"query": query}
        )

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
            prompt=full_prompt, chat_history=chat_history
        )

        return answer, full_prompt, chat_history

    def get_video_resources(self, query: str, limit: int = 10, source: str = None):
        answer, full_prompt, chat_history = None, None, None

        # step1: retrieve related documents
        retrieved_documents = self.search_vector_db_collection(
            text=query, limit=limit, source=source
        )

        if not retrieved_documents or len(retrieved_documents) == 0:
            return answer, full_prompt, chat_history

        # step2: Construct LLM prompt
        system_prompt = self.template_parser.get("rag", "system_prompt")

        documents_prompts = "\n".join(
            [
                self.template_parser.get(
                    "rag",
                    "document_prompt",
                    {
                        "doc_num": idx + 1,
                        "chunk_text": (
                            doc.payload.get("text", "")
                            if hasattr(doc, "payload")
                            else getattr(doc, "text", str(doc))
                        ),
                    },
                )
                for idx, doc in enumerate(retrieved_documents)
            ]
        )

        footer_prompt = self.template_parser.get(
            "rag", "footer_prompt", {"query": query}
        )

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
            prompt=full_prompt, chat_history=chat_history
        )

        return answer, full_prompt, chat_history

    def chat_with_user(self, user_prompt: str):
        """
        Acts as a conversational chatbot.
        Uses internal self.chat_history to maintain state automatically.
        """

        # Call the API using the internal class memory
        answer = self.generation_client.generate_text(
            prompt=user_prompt, chat_history=self.chat_history
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
            system_prompt = self.template_parser.get(
                "roadmap_customization", "system_prompt", {"topic": topic}
            )
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
            prompt=user_prompt, chat_history=chat_history
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
                cleaned_answer = (
                    cleaned_answer.replace("```json", "").replace("```", "").strip()
                )

        try:
            return json.loads(cleaned_answer)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {answer}")
            return None

    def _extract_json_from_llm_response(self, response: str):
        if not response:
            return None

        cleaned_response = response.strip()
        if "```" in cleaned_response:
            import re

            match = re.search(
                r"```(?:json)?\s*(.*?)\s*```", cleaned_response, re.DOTALL
            )
            if match:
                cleaned_response = match.group(1).strip()
            else:
                cleaned_response = (
                    cleaned_response.replace("```json", "").replace("```", "").strip()
                )

        return json.loads(cleaned_response)

    def _parse_resource_text(self, text: str) -> dict:
        resource = {}

        for line in (text or "").splitlines():
            if ":" not in line:
                continue

            key, value = line.split(":", 1)
            resource[key.strip()] = value.strip()

        return resource

    def _get_resource_type(self, resource: dict) -> str:
        source = resource.get("source", "").strip().lower()
        url = resource.get("canonical_url", "").strip().lower()

        if "youtube" in source or "youtube.com" in url or "youtu.be" in url:
            return "Video"

        if any(
            marker in url
            for marker in ["blog", "docs", "documentation", "article", "medium.com"]
        ):
            return "Article"

        return "Course"

    def _compact_resource(self, result) -> dict:
        payload = getattr(result, "payload", {}) or {}
        resource = self._parse_resource_text(payload.get("text", ""))
        resource_type = self._get_resource_type(resource)

        return {
            "id": resource.get("course_sk") or str(getattr(result, "id", "")),
            "title": resource.get("title", "")[:160],
            "description": (
                resource.get("description") or resource.get("headline", "")
            )[:260],
            "source": resource.get("source", ""),
            "url": resource.get("canonical_url") or resource.get("url", ""),
            "type": resource_type,
            "score": float(getattr(result, "score", 0) or 0),
        }

    def _resource_relevance_score(self, resource: dict, query: str) -> float:
        import re

        query_terms = set(re.findall(r"[a-z0-9]+", (query or "").lower()))
        resource_text = " ".join(
            [
                resource.get("title", ""),
                resource.get("description", ""),
                resource.get("source", ""),
            ]
        ).lower()

        if not query_terms:
            return resource.get("score", 0)

        overlap = sum(1 for term in query_terms if term in resource_text)
        return resource.get("score", 0) + (overlap / max(len(query_terms), 1))

    def _select_roadmap_resources(
        self, results: list, query: str, min_items: int = 2, max_items: int = 3
    ) -> list:
        compact_resources = []
        seen_urls = set()

        for result in results or []:
            resource = self._compact_resource(result)
            url = resource.get("url")
            title = resource.get("title")

            if not url or not title or url in seen_urls:
                continue

            seen_urls.add(url)
            resource["rank_score"] = self._resource_relevance_score(resource, query)
            compact_resources.append(resource)

        compact_resources.sort(key=lambda item: item.get("rank_score", 0), reverse=True)

        selected = []
        used_types = set()

        for resource in compact_resources:
            if resource["type"] in used_types:
                continue
            selected.append(resource)
            used_types.add(resource["type"])
            if len(selected) == max_items:
                break

        if len(selected) < min_items:
            selected_urls = {resource["url"] for resource in selected}
            for resource in compact_resources:
                if resource["url"] in selected_urls:
                    continue
                selected.append(resource)
                selected_urls.add(resource["url"])
                if len(selected) == min_items:
                    break

        return [
            {
                "id": resource["id"],
                "title": resource["title"],
                "description": resource["description"],
                "source": resource["source"],
                "url": resource["url"],
                "type": resource["type"],
            }
            for resource in selected[:max_items]
        ]

    def _make_chat_history(self, system_prompt: str) -> list:
        return [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

    def _generate_json(self, system_prompt: str, user_prompt: str):
        raw_response = self.generation_client.generate_text(
            prompt=user_prompt, chat_history=self._make_chat_history(system_prompt)
        )
        return self._extract_json_from_llm_response(raw_response)

    def _retrieve_roadmap_resources(self, search_queries: list, limit: int = 8) -> list:
        valid_queries = [
            item
            for item in search_queries
            if isinstance(item, dict) and item.get("query")
        ]
        query_texts = [
            f"{item.get('node_title', '')} {item.get('query', '')}".strip()
            for item in valid_queries
        ]

        if not query_texts:
            return []

        vectors = self.embedding_helper.encode_texts(
            texts=query_texts, collection="all-MiniLM-L6-v2"
        )
        batch_results = self.vectordb_client.search_batch_by_vectors(
            collection_name=self.get_collection_name(), vectors=vectors, limit=limit
        )

        retrieved_resources = []
        for idx, query_text in enumerate(query_texts):
            query = valid_queries[idx]
            results = batch_results[idx] if idx < len(batch_results) else []
            retrieved_resources.append(
                {
                    "node_title": query.get("node_title", ""),
                    "query": query.get("query", ""),
                    "resources": self._select_roadmap_resources(
                        results, query_text, min_items=2, max_items=3
                    ),
                }
            )

        return retrieved_resources

    def _build_customized_roadmap_compilation_prompt(
        self, topic: str, customization_answers: list = None
    ):
        """
        Prepares compact RAG context and returns the final roadmap compilation prompt.
        """
        from datetime import datetime

        current_time = datetime.now().isoformat()
        topic = (topic or "").strip()

        if not topic:
            return None, None, None

        customization_str = "None provided"
        if customization_answers:
            customization_str = "\n".join(
                [f"- {str(ans)[:180]}" for ans in customization_answers if ans]
            )

        # Step 1: Get sub-topics (LLM Call 1)
        try:
            seg_system_prompt = self.template_parser.get(
                "roadmap_generator", "topic_segmentation_system_prompt"
            )
            seg_user_prompt = self.template_parser.get(
                "roadmap_generator",
                "topic_segmentation_user_prompt",
                {"topic": topic, "customization": customization_str},
            )
        except Exception:
            seg_system_prompt = "You are an educational architect. Break down a field into 5-8 sub-topics. Return JSON array of objects with 'title' and 'search_query'."
            seg_user_prompt = f"Break down '{topic}' into 5-8 sub-topics considering these preferences: {customization_str}"

        chat_history_1 = [
            self.generation_client.construct_prompt(
                prompt=seg_system_prompt, role=self.generation_client.enums.SYSTEM.value
            )
        ]

        topics_json_raw = self.generation_client.generate_text(
            prompt=seg_user_prompt, chat_history=chat_history_1
        )

        try:
            topic_objects = self._extract_json_from_llm_response(topics_json_raw)
            # Ensure it's a list of objects
            if not isinstance(topic_objects, list) or not all(
                isinstance(obj, dict) for obj in topic_objects
            ):
                raise ValueError("LLM did not return a list of objects.")
            topic_objects = topic_objects[:8]
        except Exception as e:
            logger.error(f"Failed to parse sub-topics: {e}")
            return None, None, None

        # Build the prerequisite plan from Pass 1, aligned to sub-topic order.
        # The streaming endpoint injects each node's `ref`/`dependsOn` by
        # position, so the dependency graph stays deterministic regardless of
        # how the Pass 2 (resource compilation) model formats its output.
        dependency_plan = []
        for i, obj in enumerate(topic_objects):
            ref = str(obj.get("id") or (i + 1))
            raw_deps = obj.get("dependsOn")
            if raw_deps is None:
                raw_deps = obj.get("depends_on") or []
            deps = (
                [str(d) for d in raw_deps if d is not None]
                if isinstance(raw_deps, list)
                else []
            )
            dependency_plan.append({"ref": ref, "dependsOn": deps})

        # Step 2: Batch vector search with concise, sub-topic specific queries.
        search_queries = [
            " ".join(
                [
                    topic,
                    obj.get("title", ""),
                    obj.get("search_query", obj.get("title", "")),
                ]
            ).strip()
            for obj in topic_objects
        ]
        vectors = self.embedding_helper.encode_texts(
            texts=search_queries, collection="all-MiniLM-L6-v2"
        )
        collection_name = self.get_collection_name()
        batch_results = self.vectordb_client.search_batch_by_vectors(
            collection_name=collection_name, vectors=vectors, limit=8
        )

        # Step 3: Pre-select 2-3 compact resources per sub-topic before the final LLM call.
        roadmap_context = []
        for i, obj in enumerate(topic_objects):
            query = search_queries[i]
            results = batch_results[i] if i < len(batch_results) else []
            roadmap_context.append(
                {
                    "title": obj.get("title", "")[:120],
                    "search_query": obj.get("search_query", obj.get("title", ""))[:160],
                    "resources": self._select_roadmap_resources(results, query),
                }
            )

        compact_context = json.dumps(roadmap_context, ensure_ascii=False)

        # Step 4: Compile final roadmap with compact selected context only.
        try:
            comp_system_prompt = self.template_parser.get(
                "roadmap_generator",
                "roadmap_compilation_system_prompt",
                {"current_time": current_time},
            )
            comp_user_prompt = self.template_parser.get(
                "roadmap_generator",
                "roadmap_compilation_user_prompt",
                {
                    "sub_topics": json.dumps(
                        [obj.get("title") for obj in topic_objects], ensure_ascii=False
                    ),
                    "context": compact_context,
                },
            )
        except Exception:
            comp_system_prompt = (
                "Generate JSON only. Use only provided resources. "
                f"Each topic must have 2 to 3 resources. Current time: {current_time}."
            )
            comp_user_prompt = f"Compact roadmap context: {compact_context}"

        return comp_system_prompt, comp_user_prompt, dependency_plan

    def generate_customized_roadmap_rag(
        self, topic: str, customization_answers: list = None
    ):
        """
        Generates a customized roadmap with compact RAG context and pre-selected resources.
        """
        comp_system_prompt, comp_user_prompt, _ = self._build_customized_roadmap_compilation_prompt(
            topic=topic, customization_answers=customization_answers
        )

        if not comp_system_prompt or not comp_user_prompt:
            return None

        chat_history_2 = [
            self.generation_client.construct_prompt(
                prompt=comp_system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        final_roadmap_raw = self.generation_client.generate_text(
            prompt=comp_user_prompt, chat_history=chat_history_2
        )

        try:
            return self._extract_json_from_llm_response(final_roadmap_raw)
        except Exception as e:
            logger.error(f"Failed to parse final roadmap: {e}")
            return None

    def generate_customized_roadmap_rag_stream(
        self, topic: str, customization_answers: list = None
    ):
        """
        Streams the final roadmap JSON text after the RAG context has been prepared.
        This is intentionally separate from generate_customized_roadmap_rag so only
        the streaming endpoint opts into provider streaming.

        Returns a tuple of (token_stream, dependency_plan) where dependency_plan
        is the ordered list of {ref, dependsOn} the endpoint injects per node.
        """
        comp_system_prompt, comp_user_prompt, dependency_plan = (
            self._build_customized_roadmap_compilation_prompt(
                topic=topic, customization_answers=customization_answers
            )
        )

        if not comp_system_prompt or not comp_user_prompt:
            return None, None

        chat_history = [
            self.generation_client.construct_prompt(
                prompt=comp_system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        try:
            stream = self.generation_client.generate_text_stream(
                prompt=comp_user_prompt, chat_history=chat_history
            )
            return stream, dependency_plan
        except NotImplementedError:
            logger.error("Configured generation provider does not support streaming.")
            return None, None

    def edit_roadmap_rag(self, prompt: str, roadmap: list):
        """
        Edits an existing roadmap. Simple structural edits return after one LLM call.
        Resource-sensitive edits retrieve and rank vector DB candidates before a final LLM pass.
        """
        prompt = (prompt or "").strip()

        if not prompt or not roadmap:
            return None

        roadmap_json = json.dumps(roadmap, ensure_ascii=False)

        try:
            decision_system_prompt = self.template_parser.get(
                "roadmap_editor", "edit_decision_system_prompt"
            )
            decision_user_prompt = self.template_parser.get(
                "roadmap_editor",
                "edit_decision_user_prompt",
                {"prompt": prompt, "roadmap": roadmap_json},
            )
        except Exception:
            decision_system_prompt = (
                "You are a strict roadmap edit planner. Return JSON only with "
                "intent, roadmap, and search_queries. intent must be one of: "
                "add_node, remove_node, update_node, general_edit. The roadmap must "
                "not exceed 8 nodes."
            )
            decision_user_prompt = (
                f"USER_CHANGE_REQUEST:\n{prompt}\n\n"
                f"EXISTING_ROADMAP_JSON:\n{roadmap_json}"
            )

        try:
            edit_plan = self._generate_json(decision_system_prompt, decision_user_prompt)
            if not isinstance(edit_plan, dict):
                raise ValueError("Edit planner did not return a JSON object.")
        except Exception as e:
            logger.error(f"Failed to parse roadmap edit decision: {e}")
            return None

        intent = edit_plan.get("intent")
        allowed_intents = {"add_node", "remove_node", "update_node", "general_edit"}
        if intent not in allowed_intents:
            logger.error(f"Roadmap edit decision returned invalid intent: {intent}")
            return None

        if intent in {"remove_node", "general_edit"}:
            updated_roadmap = edit_plan.get("roadmap")
            if not isinstance(updated_roadmap, list):
                logger.error("Roadmap edit decision omitted updated roadmap.")
                return None

            return {
                "intent": intent,
                "roadmap": updated_roadmap[:8],
            }

        search_queries = [
            query
            for query in edit_plan.get("search_queries", [])
            if isinstance(query, dict) and query.get("query")
        ]

        if not search_queries:
            search_queries = [{"node_title": "Roadmap update", "query": prompt}]

        try:
            retrieved_resources = self._retrieve_roadmap_resources(search_queries)
        except Exception as e:
            logger.error(f"Roadmap edit vector retrieval failed: {e}")
            return None

        try:
            compilation_system_prompt = self.template_parser.get(
                "roadmap_editor", "edit_compilation_system_prompt"
            )
            compilation_user_prompt = self.template_parser.get(
                "roadmap_editor",
                "edit_compilation_user_prompt",
                {
                    "prompt": prompt,
                    "roadmap": roadmap_json,
                    "intent": intent,
                    "resources": json.dumps(
                        retrieved_resources, ensure_ascii=False
                    ),
                },
            )
        except Exception:
            compilation_system_prompt = (
                "You are a curriculum editor. Return only the complete updated "
                "roadmap JSON array. Use only provided retrieved resources."
            )
            compilation_user_prompt = "\n\n".join(
                [
                    f"USER_CHANGE_REQUEST:\n{prompt}",
                    f"EXISTING_ROADMAP_JSON:\n{roadmap_json}",
                    f"INTENT:\n{intent}",
                    "RETRIEVED_RESOURCE_CANDIDATES_JSON:\n"
                    f"{json.dumps(retrieved_resources, ensure_ascii=False)}",
                ]
            )

        try:
            final_roadmap = self._generate_json(
                compilation_system_prompt, compilation_user_prompt
            )
            if not isinstance(final_roadmap, list):
                raise ValueError("Final roadmap response is not a JSON array.")
        except Exception as e:
            logger.error(f"Failed to parse edited roadmap: {e}")
            return None

        return {
            "intent": intent,
            "roadmap": final_roadmap[:8],
        }

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
            prompt=user_prompt, chat_history=self.chat_history
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
            context_text = "\n".join(
                [
                    (
                        doc.payload.get("text", "")
                        if hasattr(doc, "payload")
                        else getattr(doc, "text", str(doc))
                    )
                    for doc in retrieved_documents
                ]
            )

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
            prompt=prompt_content, chat_history=chat_history
        )

        return answer

    def generate_node_quiz(
        self, node_name: str, node_description: str = "", num_questions: int = 5
    ):
        """
        Generates a multiple-choice quiz for a roadmap node, grounded in the
        node's vector-DB context when available. Returns a list of dicts:
        {question, choices, answer (0-based index), explanation}.
        """
        node_name = (node_name or "").strip()
        if not node_name:
            return []

        # Ground the quiz in retrieved context for this topic, when available.
        retrieved_documents = self.search_vector_db_collection(
            text=node_name, limit=3
        )
        context_text = ""
        if retrieved_documents:
            context_text = "\n".join(
                [
                    (
                        doc.payload.get("text", "")
                        if hasattr(doc, "payload")
                        else getattr(doc, "text", str(doc))
                    )
                    for doc in retrieved_documents
                ]
            )

        system_prompt = "\n".join(
            [
                "You are an expert assessment designer.",
                "Create a multiple-choice quiz that tests genuine understanding of the given topic.",
                "",
                "### RULES:",
                "1. Each question has exactly 4 choices.",
                "2. Exactly one choice is correct.",
                "3. 'answer' is the 0-based index (0-3) of the correct choice.",
                "4. 'explanation' briefly says why the correct choice is right.",
                "5. Vary difficulty; avoid trivially obvious or trick questions.",
                "",
                "### OUTPUT:",
                "Return ONLY a valid JSON array, no prose, of objects shaped:",
                '{"question": "...", "choices": ["a","b","c","d"], "answer": 0, "explanation": "..."}',
            ]
        )

        user_prompt = "\n".join(
            [
                f"Topic: {node_name}",
                f"Topic description: {node_description or 'N/A'}",
                f"Number of questions: {num_questions}",
                "",
                f"Context (optional grounding):\n{context_text}",
                "",
                "Return the quiz JSON array.",
            ]
        )

        chat_history = [
            self.generation_client.construct_prompt(
                prompt=system_prompt,
                role=self.generation_client.enums.SYSTEM.value,
            )
        ]

        raw = self.generation_client.generate_text(
            prompt=user_prompt, chat_history=chat_history
        )

        try:
            parsed = self._extract_json_from_llm_response(raw)
        except Exception as e:
            logger.error(f"Failed to parse quiz JSON: {e}")
            return []

        if not isinstance(parsed, list):
            return []
        return parsed
