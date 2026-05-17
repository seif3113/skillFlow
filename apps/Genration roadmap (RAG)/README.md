# RAG Pipeline Graduation Project

Welcome to the **RAG Pipeline Graduation Project**! This project implements a fully functional Retrieval-Augmented Generation (RAG) system utilizing FastAPI, Vector Databases, and Large Language Models (LLMs). It provides robust APIs to ingest, process, and search through document data seamlessly.

## 🚀 Features
- **FastAPI Backend:** High-performance, asynchronous REST API.
- **Document Ingestion:** Processes PDF, DOCX, CSV, and text files, chunking them appropriately.
- **Vector Database Integration:** Supports **Qdrant** and **Pgvector** for advanced vector similarity search.
- **LLM Integration:** Extensible support for OpenAI and Ollama models (embeddings and generation).
- **Multilingual Prompts:** Templating system for prompts available in English and Arabic.
- **Scalable Architecture:** Designed using Factory and Controller design patterns for modularity and ease of configuration.

## 📂 Project Structure
```text
src/
 ├── main.py                    # Application entry point and startup configurations
 ├── requirements.txt           # Python dependencies
 ├── assets/                    # Processed chunks and vector database local files
 ├── controllers/               # Business logic (e.g., NLPController, DocumentLoader)
 ├── data/                      # Raw and cleaned dataset files
 ├── helpers/                   # Configuration loader using Pydantic Settings
 ├── models/                    # Pydantic schemas for API requests/responses
 ├── routes/                    # API endpoints for data ingestion and NLP operations
 └── stores/                    # Core RAG components (Embedding, LLM, VectorDB)
```

## 🛠️ Tech Stack & Dependencies
- **Core Framework:** `fastapi`, `uvicorn`
- **Database:** `qdrant-client`, `supabase` (Pgvector)
- **AI & RAG:** `langchain`, `langchain-community`, `langchain-openai`, `openai`
- **Data Processing:** `pandas`, `pypdf`, `docx2txt`, `opencv-python`, `pytesseract`
- **Environment Management:** `pydantic-settings`, `python-dotenv`

## ⚙️ Setup & Installation

### 1. Requirements
- Python 3.9+
- A running instance of Qdrant (or Supabase/Pgvector for alternative DBs)
- Ensure API keys are set for OpenAI or local Ollama instances.

### 2. Install Dependencies
Navigate to the `src` directory and install the requirements:
```bash
pip install -r requirements.txt
```

### 3. Configuration (.env)
Create a `.env` file in the `src` directory. The project utilizes Pydantic settings (via `helpers/config.py`). Keys you need to define:
- **App Details:** `APP_NAME`, `APP_VERSION`
- **Clients:** `GENERATION_CLIENT`, `EMBEDDING_CLIENT`, `VECTOR_DB_CLIENT`
- **Models:** `OLLAMA_GENERATION_MODEL_NAME`, `OLLAMA_EMBEDDING_MODEL_NAME`, `OPENAI_API_KEY`
- **Vector DB:** `QDRANT_URL`, `QDRANT_API_KEY`, `VECTOR_DB_PATH`
- **Supabase (optional):** `SUPABASE_URL`, `SUPABASE_KEY`
- **Languages:** `PRIMARY_LANG`, `DEFAULT_LANG`

### 4. Running the Application
Start the server using Uvicorn:
```bash
uvicorn main:app --reload
```
The API documentation will be available at: `http://127.0.0.1:8000/docs`

## 📡 API Endpoints Overview
The system contains distinct routing modules:

### Data Router (`/api/v1/data`)
- `POST /upload/{file_path}`: Ingests a local document path, loads its content, processes it into chunks, and saves the formatted chunks into `assets/chunks/processed_chunks.json`.

### NLP Router (`/api/v1/nlp`)
- `POST /index/push/vector`: Reads the processed chunks from the specified file and ingests them into the configured Vector Database.
- `GET /index/info`: Retrieves information regarding the connected Vector Database collection.
- `POST /index/search`: Performs a similarity search on the stored chunks using the query provided.

## 🧩 Architecture Details
- **Providers:** The system uses the Factory pattern (`LLMProviderFactory`, `VectorDBProviderFactory`) to swap out database and LLM implementations dynamically without touching core business logic.
- **Data Loading:** `DocumentLoader` uses chunking logic through Langchain to securely split and parse extensive documents.
- **Templates:** Dynamic prompt creation supporting localization (`stores/llm/templates/locales/`).

## 📜 License
This project is open-source and comes with a `LICENSE` file included in the root directory. Feel free to use, distribute, and modify the code locally.
"@
Set-Content -Path "c:\AI\Rag Pipline Graduation Project\README.md" -Value $text -Encoding UTF8