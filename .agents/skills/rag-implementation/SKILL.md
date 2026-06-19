---
name: rag-implementation
description: Comprehensive guide to implementing RAG systems including vector database selection, chunking strategies, embedding models, and retrieval optimization. Use when building RAG systems, implementing semantic search, optimizing retrieval quality, or debugging RAG performance issues.
---

# RAG Implementation Patterns

Comprehensive guide to implementing Retrieval-Augmented Generation (RAG) systems including vector database selection, chunking strategies, embedding models, retrieval optimization, and production deployment patterns.

---

## Quick Reference

**When to use this skill:**
- Building RAG/semantic search systems
- Implementing document retrieval pipelines
- Optimizing vector database performance
- Debugging retrieval quality issues
- Choosing between vector database options
- Designing chunking strategies
- Implementing hybrid search

**Technologies covered:**
- Vector DBs: Qdrant, Pinecone, Chroma, Weaviate, Milvus
- Embeddings: OpenAI, Sentence Transformers, Cohere
- Frameworks: LangChain, LlamaIndex, Haystack

---

## Part 1: Vector Database Selection

### Database Comparison Matrix

| Database | Best For | Deployment | Performance | Cost |
|----------|----------|------------|-------------|------|
| **Qdrant** | Self-hosted, production | Docker/K8s | Excellent (Rust) | Free (self-host) |
| **Pinecone** | Managed, rapid prototyping | Cloud | Excellent | Pay-per-use |
| **Chroma** | Local development, embedded | In-process | Good (Python) | Free |
| **Weaviate** | Complex schemas, GraphQL | Docker/Cloud | Excellent (Go) | Free + Cloud |
| **Milvus** | Large-scale, distributed | K8s | Excellent (C++) | Free (self-host) |

### Qdrant Setup (Recommended for Production)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Initialize client (local or cloud)
client = QdrantClient(url="http://localhost:6333")  # or cloud URL

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(
        size=1536,  # OpenAI text-embedding-3-small dimension
        distance=Distance.COSINE  # or DOT, EUCLID
    )
)

# Insert vectors with payload
client.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id=1,
            vector=[0.1, 0.2, ...],  # 1536 dimensions
            payload={
                "text": "Document content",
                "source": "doc.pdf",
                "page": 1,
                "metadata": {...}
            }
        )
    ]
)

# Search
results = client.search(
    collection_name="documents",
    query_vector=[0.1, 0.2, ...],
    limit=5,
    score_threshold=0.7  # Minimum similarity
)
```

### Pinecone Setup (Managed Service)

```python
from pinecone import Pinecone, ServerlessSpec

# Initialize
pc = Pinecone(api_key="your-key")

# Create index
pc.create_index(
    name="documents",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1")
)

# Get index
index = pc.Index("documents")

# Upsert vectors
index.upsert(vectors=[
    ("doc1", [0.1, 0.2, ...], {"text": "...", "source": "..."})
])

# Query
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    include_metadata=True
)
```

---

## Part 2: Chunking Strategies

### Strategy 1: Fixed-Size Chunking (Simple, Fast)

```python
def fixed_size_chunking(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """
    Split text into fixed-size chunks with overlap.

    Pros: Simple, predictable chunk sizes
    Cons: May break mid-sentence, poor semantic boundaries
    """
    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)

    return chunks

# Usage
chunks = fixed_size_chunking(document, chunk_size=512, overlap=50)
```

**When to use:**
- Simple documents (logs, transcripts)
- Prototyping/MVP
- Consistent token budgets needed

### Strategy 2: Semantic Chunking (Better Quality)

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

def semantic_chunking(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Split on semantic boundaries (paragraphs, sentences).

    Pros: Preserves meaning, better retrieval quality
    Cons: Variable chunk sizes, slower processing
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],  # Priority order
        length_function=len
    )

    return splitter.split_text(text)

# Usage
chunks = semantic_chunking(document, chunk_size=1000, overlap=200)
```

**When to use:**
- Long-form documents (articles, books, reports)
- Quality > speed
- Natural language content

### Strategy 3: Hierarchical Chunking (Best for Structured Docs)

```python
def hierarchical_chunking(document: dict) -> list[dict]:
    """
    Chunk based on document structure (sections, subsections).

    Pros: Preserves hierarchy, enables parent-child retrieval
    Cons: Requires structured input, more complex
    """
    chunks = []

    for section in document['sections']:
        # Parent chunk (section summary)
        chunks.append({
            'text': section['title'] + '\n' + section['summary'],
            'type': 'parent',
            'section_id': section['id']
        })

        # Child chunks (paragraphs)
        for para in section['paragraphs']:
            chunks.append({
                'text': para,
                'type': 'child',
                'parent_id': section['id']
            })

    return chunks
```

**When to use:**
- Technical documentation
- Books with TOC
- Legal documents
- Need to preserve context hierarchy

### Strategy 4: Sliding Window (Maximum Context Preservation)

```python
def sliding_window_chunking(text: str, window_size: int = 512, stride: int = 256) -> list[str]:
    """
    Overlapping windows for maximum context.

    Pros: No information loss at boundaries
    Cons: Storage overhead (duplicate content)
    """
    words = text.split()
    chunks = []

    for i in range(0, len(words) - window_size + 1, stride):
        chunk = ' '.join(words[i:i + window_size])
        chunks.append(chunk)

    return chunks
```

**When to use:**
- Critical retrieval accuracy needed
- Short queries need broader context
- Storage cost not a concern

---

## Part 3: Embedding Models

### Model Selection Guide

| Model | Dimensions | Speed | Quality | Cost | Use Case |
|-------|-----------|-------|---------|------|----------|
| **OpenAI text-embedding-3-small** | 1536 | Fast | Excellent | $0.02/1M tokens | Production, general purpose |
| **OpenAI text-embedding-3-large** | 3072 | Medium | Best | $0.13/1M tokens | High-quality retrieval |
| **all-MiniLM-L6-v2** | 384 | Very fast | Good | Free | Self-hosted, prototyping |
| **all-mpnet-base-v2** | 768 | Fast | Very good | Free | Self-hosted, quality |
| **Cohere embed-english-v3.0** | 1024 | Fast | Excellent | $0.10/1M tokens | Semantic search focus |

### OpenAI Embeddings (Recommended)

```python
from openai import OpenAI

client = OpenAI(api_key="your-key")

def get_embeddings(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """
    Generate embeddings using OpenAI.

    Batch size: Up to 2048 inputs per request
    Rate limits: Check tier limits
    """
    response = client.embeddings.create(
        model=model,
        input=texts
    )

    return [item.embedding for item in response.data]

# Usage
chunks = ["chunk 1", "chunk 2"]
embeddings = get_embeddings(chunks)
```
