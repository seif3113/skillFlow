import json
import os
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from controllers.document_loader import DocumentLoader
import logging

logger = logging.getLogger("uvicorn.error")

data_router = APIRouter(
    prefix="/api/v1/data",
    tags=["data", "nlp"] 
)

@data_router.post("/upload/{file_path:path}")
async def upload_data(file_path: str): 

    try:
        clean_path = file_path.strip(' "\'')
        
        if not os.path.exists(clean_path):
            logger.error(f"File not found: {clean_path}")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "signal": "error",
                    "message": f"File not found on server: {clean_path}"
                }
            )
    
        loader = DocumentLoader(clean_path)

        file_content = loader.load_files() 

        chunks = loader.process_file_content(file_content=file_content)

        formatted_chunks = []
        for chunk in chunks:
            formatted_chunks.append({
                "page_content": chunk.page_content,
                "metadata": chunk.metadata
            })

        # 2. Define where you want to save it on your PC
        save_path = r"C:\AI\\Rag Pipline Graduation Project\src\\assets\\chunks\\processed_chunks.json"

        # 3. Save to a JSON file
        with open(save_path, "w", encoding="utf-8") as file:
            json.dump(formatted_chunks, file, ensure_ascii=False, indent=4)


        if not chunks or len(chunks) == 0:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST, 
                content={
                    "signal": "error",
                    "message": "No content extracted or file is empty"
                }
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "signal": "success",
                "chunks_count": len(chunks),
                "chunks":"first 10 chunks: " + ", ".join([chunk.page_content for chunk in chunks[:1]])
            }
        )

    except Exception as e:
        logger.error(f"Error handling file: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"signal": "error", "details": str(e)}
        )
