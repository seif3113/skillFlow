from fastapi import FastAPI, APIRouter, status, Request
from fastapi.responses import JSONResponse
from controllers.NLPController import NLPController
from controllers.document_loader import load_chunks
from models.schemes import SearchRequest , PushRequest, CategoryRequest, ChatRequest, RoadmapRequest
import asyncio
import time
import json

import logging

logger = logging.getLogger('uvicorn.error')

nlp_router = APIRouter(
    prefix="/api/v1/nlp",
    tags=["api_v1", "nlp"],
)

@nlp_router.post("/index/push/vector")
async def index_project(request: Request,file_path:str,push_request: PushRequest):
    
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
                    "message": "No chunks found in the specified file."
                }
            )

        # 4. Push the chunks into the Vector Database
        logger.info(f"Starting to index {len(chunks)} chunks into vector database...")
        success = nlp_controller.index_into_vector_db(
            chunks=chunks, 
            chunks_ids=None, 
            do_reset=push_request.do_reset
        )

        if success:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "signal": "success",
                    "message": f"Successfully embedded and indexed {len(chunks)} chunks into the database.",
                    "collection": nlp_controller.get_collection_name()
                }
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"signal": "error", "message": "Failed to insert chunks into the vector database."}
            )

    except Exception as e:
        logger.error(f"Error indexing chunks: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"signal": "error", "details": str(e)}
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
    collection_info = nlp_controller.get_vector_db_collection_info(collection_name=collection_name)

    return JSONResponse(
        content={
            "signal": "ResponseSignal.VECTORDB_COLLECTION_RETRIEVED.value",
            "collection_info": collection_info
        }
    )  

@nlp_router.post("/index/search")
async def search_index(request: Request, search_request: SearchRequest):

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    results = nlp_controller.search_vector_db_collection(text=search_request.text, 
                                                         limit=search_request.limit,
                                                         source=search_request.source)

    if not results:
        return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "signal": "ResponseSignal.VECTORDB_SEARCH_ERROR.value"
                }
            )
    
    # Safe serialization to ensure ScoredPoint objects are properly loaded into JSON
    return JSONResponse(
        content={
            "signal": "ResponseSignal.VECTORDB_SEARCH_SUCCESS.value",
            "results": [
                {
                    "id": getattr(res, "id", None),
                    "score": getattr(res, "score", None),
                    "payload": getattr(res, "payload", {})
                }
                for res in results
            ]
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

    category = nlp_controller.define_answer_category_definition(category_prompt=category_request.category_name)
    if not category:
        return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "signal": "ResponseSignal.CATEGORY_DEFINITION_ERROR.value"
                }
            )
    return JSONResponse(
        content={
            "signal": "ResponseSignal.CATEGORY_DEFINITION_SUCCESS.value",
            "category": category
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
                content={
                    "signal": "ResponseSignal.RAG_ANSWER_ERROR.value"
                }
        )
    
    return JSONResponse(
        content={
            "signal": "ResponseSignal.RAG_ANSWER_SUCCESS.value",
            "answer": answer,
            "full_prompt": full_prompt,
            "chat_history": chat_history
        }
    )   


@nlp_router.post("/generate-roadmap-rag")
async def generate_roadmap_rag(request: Request, roadmap_request: RoadmapRequest):
    start_time = time.time()

    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    roadmap = nlp_controller.generate_customized_roadmap_rag(
        topic=roadmap_request.topic,
        customization_answers=roadmap_request.customization_answers
    )

    if not roadmap:
        return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "signal": "error",
                    "message": "Failed to generate customized roadmap."
                }
        )

    end_time = time.time()
    response_time = round(end_time - start_time, 2)

    return JSONResponse(
        content={
            "signal": "success",
            "results": roadmap,
            "response_time": f"{response_time} seconds"
        }
    )



@nlp_router.post("/roadmap-customization")
async def roadmap_customization(request: Request, chat_request: ChatRequest):
    
    nlp_controller = NLPController(
        vectordb_client=request.app.vectordb_client,
        generation_client=request.app.generation_client,
        embedding_client=request.app.embedding_client,
        template_parser=request.app.template_parser,
        embedding_helper=request.app.embedding_helper,
    )

    questions_data = nlp_controller.get_roadmap_questions(topic=chat_request.message)

    if not questions_data:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Failed to generate roadmap questions."
            }
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "signal": "success",
            "questions": questions_data.get("questions", [])
        }
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
        node_name=chat_request.message, 
        user_question=None # You can map this if the user asks a specific follow-up
    )

    if not answer:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "error",
                "message": "Node explainer failed to generate an answer."
            }
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "signal": "success",
            "answer": answer
        }
    )
