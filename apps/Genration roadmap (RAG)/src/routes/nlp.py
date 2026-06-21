from fastapi import FastAPI, APIRouter, status, Request
from fastapi.responses import JSONResponse, StreamingResponse
from controllers.NLPController import NLPController, UnsupportedDomainError
from controllers.document_loader import load_chunks
from models.schemes import (
    SearchRequest,
    PushRequest,
    CategoryRequest,
    ChatRequest,
    RoadmapRequest,
    RoadmapEditRequest,
    QuizRequest,
    RemedialRequest,
)
import asyncio
import time
import json

import logging

logger = logging.getLogger("uvicorn.error")

ALLOWED_RESOURCE_TYPES = {"all", "video", "article", "course"}

# ─────────────────────────────────────────────────────────────────────────────
# Source → Type mapping
# Discovered sources in processed_chunks.json (7,431 total chunks):
#   youtube      → video    (1,953 chunks)
#   udemy        → course   (2,398 chunks)
#   khan_academy → course   (1,620 chunks)
#   coursera     → course   (1,360 chunks)
#   w3schools    → article  (  100 chunks)
# Add new sources here as more data is indexed.
# ─────────────────────────────────────────────────────────────────────────────
VIDEO_SOURCES = {
    "youtube",
}

ARTICLE_SOURCES = {
    "w3schools",
    # future article sources:
    # "medium", "dev.to", "hashnode", "substack", "towardsdatascience",
    # "geeksforgeeks", "freecodecamp", "css-tricks",
}

COURSE_SOURCES = {
    "udemy",
    "khan_academy",
    "coursera",
    # future course sources (not yet indexed):
    # "edx", "udacity", "linkedin_learning", "pluralsight",
    # "skillshare", "futurelearn", "codecademy", "datacamp",
}

# ─────────────────────────────────────────────────────────────────────────────
# Supported domain groups — injected into the LLM system prompt so the model
# decides whether a topic falls within our knowledge base.
# Derived from the 25 categories in processed_chunks.json, grouped into 10.
# Update this list whenever new domain data is indexed.
# ─────────────────────────────────────────────────────────────────────────────
SUPPORTED_DOMAIN_GROUPS = [
    "Programming & Software Development (Python, JavaScript, Java, C++, TypeScript, software engineering, algorithms, data structures)",
    "Web Technologies (HTML, CSS, React, Node.js, Next.js, REST APIs, GraphQL, web frameworks, frontend, backend, fullstack)",
    "Data Science & Machine Learning (data analysis, ML, AI, deep learning, NLP, computer vision, big data, data engineering, statistics)",
    "Databases & SQL (SQL, MySQL, PostgreSQL, MongoDB, Redis, SQLite, NoSQL, database design)",
    "DevOps & Cloud Computing (Docker, Kubernetes, AWS, Azure, GCP, CI/CD, Linux, Git, Terraform, infrastructure)",
    "IT & Cybersecurity (networking, cybersecurity, ethical hacking, penetration testing, operating systems, information technology, computing)",
    "Mathematics (algebra, calculus, linear algebra, statistics, probability, geometry, discrete math, differential equations)",
    "Science (physics, chemistry, biology, astronomy, ecology, genetics, earth science)",
    "Business, Marketing & Finance (entrepreneurship, project management, digital marketing, SEO, economics, finance, accounting, investment, leadership, strategy)",
    "Design & UX (UI/UX, graphic design, Figma, Adobe, web design, product design, motion design)",
]

nlp_router = APIRouter(
    prefix="/api/v1/nlp",
    tags=["api_v1", "nlp"],
)


def _parse_resource_text(text: str) -> dict:
    resource = {}

    for line in (text or "").splitlines():
        if ":" not in line:
            continue

        key, value = line.split(":", 1)
        resource[key.strip()] = value.strip()

    return resource


def _get_resource_type(source: str, url: str = "") -> str:
    """Derive the actual resource type from source/URL metadata — never from the request filter."""
    normalized_source = (source or "").strip().lower()
    normalized_url = (url or "").strip().lower()

    # Check video platforms by source name or URL
    if (
        normalized_source in VIDEO_SOURCES
        or "youtube.com" in normalized_url
        or "youtu.be" in normalized_url
    ):
        return "video"

    # Check article platforms by source name or URL
    if (
        normalized_source in ARTICLE_SOURCES
        or any(s in normalized_url for s in ARTICLE_SOURCES)
        or "w3schools.com" in normalized_url
    ):
        return "article"

    # Explicit course platforms (coursera, udemy, khan_academy, etc.)
    if normalized_source in COURSE_SOURCES:
        return "course"

    # Fallback: guess from URL patterns
    if any(s in normalized_url for s in ("youtu.be", "youtube.com")):
        return "video"
    if any(
        s in normalized_url
        for s in (
            "coursera.org",
            "udemy.com",
            "edx.org",
            "khanacademy.org",
            "linkedin.com/learning",
        )
    ):
        return "course"

    return "course"


def _format_search_result(result) -> dict:
    payload = getattr(result, "payload", {}) or {}
    resource_data = _parse_resource_text(payload.get("text", ""))
    source = resource_data.get("source", "")
    url = resource_data.get("canonical_url") or resource_data.get("url", "")

    return {
        "id": resource_data.get("course_sk") or getattr(result, "id", None),
        "resource": {
            "title": resource_data.get("title", ""),
            "description": resource_data.get("description")
            or resource_data.get("headline", ""),
            "url": url,
            "type": _get_resource_type(source, url),
        },
    }


def _json_stream_event(event: str, payload: dict = None) -> str:
    data = {"event": event}
    if payload:
        data.update(payload)
    return json.dumps(data, ensure_ascii=False) + "\n"


@nlp_router.post("/index/push/vector")
async def index_project(request: Request, file_path: str, push_request: PushRequest):

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    try:

        chunks = load_chunks(file_path=file_path)

        if not chunks or len(chunks) == 0:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "signal": "error",
                    "message": "No chunks found in the specified file.",
                },
            )

        # 4. Push the chunks into the Vector Database
        logger.info(f"Starting to index {len(chunks)} chunks into vector database...")
        success = nlp_controller.index_into_vector_db(
            chunks=chunks, chunks_ids=None, do_reset=push_request.do_reset
        )

        if success:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "signal": "success",
                    "message": f"Successfully embedded and indexed {len(chunks)} chunks into the database.",
                    "collection": nlp_controller.get_collection_name(),
                },
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "signal": "error",
                    "message": "Failed to insert chunks into the vector database.",
                },
            )

    except Exception as e:
        logger.error(f"Error indexing chunks: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"signal": "error", "details": str(e)},
        )


@nlp_router.get("/index/info")
async def get_project_index_info(request: Request):

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    collection_name = nlp_controller.get_collection_name()
    collection_info = nlp_controller.get_vector_db_collection_info(
        collection_name=collection_name
    )

    return JSONResponse(
        content={
            "signal": "ResponseSignal.VECTORDB_COLLECTION_RETRIEVED.value",
            "collection_info": collection_info,
        }
    )


@nlp_router.post("/index/search")
async def search_index(request: Request, search_request: SearchRequest):
    topic = search_request.topic or search_request.text
    resource_type = (search_request.type or "all").lower()
    limit = search_request.limit or 5

    if not topic:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": "error",
                "message": "topic is required.",
            },
        )

    if resource_type not in ALLOWED_RESOURCE_TYPES:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": "error",
                "message": "type must be one of: all, video, article, course.",
            },
        )

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    search_limit = limit if resource_type == "all" else max(limit * 5, limit)
    results = nlp_controller.search_vector_db_collection(text=topic, limit=search_limit)

    if not results:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "error"},
        )

    formatted_results = [_format_search_result(res) for res in results]

    if resource_type != "all":
        formatted_results = [
            res for res in formatted_results if res["resource"]["type"] == resource_type
        ]

    return JSONResponse(
        content={
            "signal": "error",
            "results": formatted_results[:limit],
        }
    )


#### version 2.0 with RAG and category definition ####
@nlp_router.post("/index/define-category")
async def define_category(request: Request, category_request: CategoryRequest):

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    category = nlp_controller.define_answer_category_definition(
        category_prompt=category_request.category_name
    )
    if not category:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "ResponseSignal.CATEGORY_DEFINITION_ERROR.value"},
        )
    return JSONResponse(
        content={
            "signal": "ResponseSignal.CATEGORY_DEFINITION_SUCCESS.value",
            "category": category,
        }
    )


@nlp_router.post("/index/answer")
async def answer_rag(request: Request, search_request: SearchRequest):

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    answer, full_prompt, chat_history = nlp_controller.answer_rag_question(
        query=search_request.text,
        limit=search_request.limit,
    )

    if not answer:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "ResponseSignal.RAG_ANSWER_ERROR.value"},
        )

    return JSONResponse(
        content={
            "signal": "ResponseSignal.RAG_ANSWER_SUCCESS.value",
            "answer": answer,
            "full_prompt": full_prompt,
            "chat_history": chat_history,
        }
    )


@nlp_router.post("/generate-roadmap-rag")
async def generate_roadmap_rag(request: Request, roadmap_request: RoadmapRequest):
    topic = (roadmap_request.topic or "").strip()

    if not topic:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "error", "message": "topic is required."},
        )

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    try:
        stream, dependency_plan = nlp_controller.generate_customized_roadmap_rag_stream(
            topic=topic, customization_answers=roadmap_request.customization_answers
        )
        dependency_plan = dependency_plan or []
        if not stream:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "signal": "error",
                    "message": "Failed to start roadmap generation stream.",
                },
            )
    except UnsupportedDomainError as e:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "signal": "unsupported_domain",
                "message": "We don't support this domain at this time.",
            },
        )
    except Exception as e:
        logger.error(f"Roadmap pre-generation failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Roadmap pre-generation failed.",
            },
        )

    def stream_roadmap(stream_obj, dep_plan):
        full_response = ""
        nodes = []
        scan_index = 0
        in_array = False
        object_start = None
        depth = 0
        in_string = False
        escape = False
        node_index = 0

        yield _json_stream_event("start", {"signal": "success"})

        try:
            for chunk in stream_obj:
                if not chunk:
                    continue

                chunk = str(chunk)
                full_response += chunk

                while scan_index < len(full_response):
                    char = full_response[scan_index]

                    if not in_array:
                        if char == "[":
                            in_array = True
                        scan_index += 1
                        continue

                    if object_start is None:
                        if char == "{":
                            object_start = scan_index
                            depth = 1
                            in_string = False
                            escape = False
                        scan_index += 1
                        continue

                    if in_string:
                        if escape:
                            escape = False
                        elif char == "\\":
                            escape = True
                        elif char == '"':
                            in_string = False
                    else:
                        if char == '"':
                            in_string = True
                        elif char == "{":
                            depth += 1
                        elif char == "}":
                            depth -= 1

                    scan_index += 1

                    if depth == 0 and object_start is not None:
                        node_text = full_response[object_start:scan_index]
                        object_start = None
                        try:
                            node = json.loads(node_text)
                        except json.JSONDecodeError:
                            continue

                        # Inject the prerequisite plan (ref + dependsOn) by
                        # position so the backend can wire DAG edges. Emitted in
                        # topological order, matching Pass 1's sub-topic order.
                        if node_index < len(dep_plan):
                            plan = dep_plan[node_index]
                            node["ref"] = plan["ref"]
                            node["dependsOn"] = plan["dependsOn"]
                        node_index += 1

                        nodes.append(node)
                        yield _json_stream_event("node", {"node": node})

            yield _json_stream_event("nodes", {"nodes": nodes})
            yield _json_stream_event("done", {"signal": "success"})

        except Exception as e:
            logger.error(f"Roadmap RAG streaming failed: {str(e)}")
            yield _json_stream_event(
                "error",
                {
                    "signal": "error",
                    "message": "Roadmap generation failed.",
                },
            )

    return StreamingResponse(
        stream_roadmap(stream, dependency_plan),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@nlp_router.post("/edit-roadmap-rag")
async def edit_roadmap_rag(request: Request, edit_request: RoadmapEditRequest):
    prompt = (edit_request.prompt or "").strip()

    if not prompt:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "error", "message": "prompt is required."},
        )

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    try:
        # Sort nodes by ID ascending first to guarantee consistent ordering
        sorted_roadmap = sorted(edit_request.roadmap, key=lambda n: n.id)

        ordered_roadmap = []
        for index, node in enumerate(sorted_roadmap):
            node_dict = node.dict()
            node_dict["order"] = (
                index + 1
            )  # Provide explicit 1-based ordering for the LLM
            ordered_roadmap.append(node_dict)

        edited_roadmap = nlp_controller.edit_roadmap_rag(
            prompt=prompt,
            roadmap=ordered_roadmap,
        )
    except Exception as e:
        logger.error(f"Roadmap RAG edit failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Roadmap edit failed.",
            },
        )

    if not edited_roadmap:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": "error",
                "message": "Failed to edit roadmap.",
            },
        )

    return JSONResponse(
        content={
            "roadmap": edited_roadmap.get("roadmap", []),
        }
    )


@nlp_router.post("/roadmap-customization")
async def roadmap_customization(request: Request, chat_request: ChatRequest):
    topic = (chat_request.message or "").strip()

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    questions_data = nlp_controller.get_roadmap_questions(topic=topic)

    if not questions_data:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Failed to generate roadmap questions.",
            },
        )

    if not questions_data.get("supported", True):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "signal": "unsupported_domain",
                "message": "We don't support this domain at this time.",
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"signal": "success", "questions": questions_data.get("questions", [])},
    )


@nlp_router.post("/explain-node")
async def chat_explain_node(request: Request, chat_request: ChatRequest):

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    answer = nlp_controller.explain_node(
        node_name=chat_request.node_name or chat_request.message,
        user_question=chat_request.message if chat_request.node_name else None,
    )

    if not answer:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Node explainer failed to generate an answer.",
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK, content={"signal": "success", "answer": answer}
    )


@nlp_router.post("/generate-quiz")
async def generate_quiz(request: Request, quiz_request: QuizRequest):
    node_name = (quiz_request.node_name or "").strip()
    if not node_name:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "error", "message": "node_name is required."},
        )

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    questions = nlp_controller.generate_node_quiz(
        node_name=node_name,
        node_description=quiz_request.node_description or "",
        num_questions=quiz_request.num_questions or 5,
    )

    if not questions:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Quiz generation failed to produce questions.",
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"signal": "success", "questions": questions},
    )


@nlp_router.post("/generate-remedial")
async def generate_remedial(request: Request, remedial_request: RemedialRequest):
    node_name = (remedial_request.node_name or "").strip()
    if not node_name:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"signal": "error", "message": "node_name is required."},
        )

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    remedials = nlp_controller.generate_remedial_subtopics(
        node_name=node_name,
        node_description=remedial_request.node_description or "",
        missed_questions=list(remedial_request.missed_questions or []),
        num_remedials=remedial_request.num_remedials or 3,
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"signal": "success", "remedials": remedials},
    )
