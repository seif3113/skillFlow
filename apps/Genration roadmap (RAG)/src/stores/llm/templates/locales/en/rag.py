from string import Template

#### RAG PROMPTS ####

#### System ####

system_prompt = Template("\n".join([
    "You are a helpful educational assistant.",
    "You will be provided with a set of documents containing course information associated with the user's query.",
    "Your task is to extract the relevant courses from these documents and answer the user's query.",
    "Ignore documents that are not relevant to the user's query.",
    "CRITICAL INSTRUCTION: You MUST return your entire response ONLY as a valid JSON object. Do not include any conversational text, markdown formatting (like ```json), introductions, or conclusions outside of the JSON structure.",
    "If you cannot find an answer in the provided documents, return a JSON object with an empty list for courses and an apology in the message.",
    "Generate the content in the same language as the user's query."
]))

#### Document ####
document_prompt = Template(
    "\n".join([
        "## Document No: $doc_num",
        "### Content: $chunk_text",
    ])
)

#### Footer ####
footer_prompt = Template("\n".join([
    "Based ONLY on the above documents, answer the user's question.",
    "You must format your response exactly according to the following JSON structure. Ensure you use the correct data types (strings, numbers, or booleans):",
    "{",
    '  "message": "A brief, polite answer summarizing what you found.",',
    '  "courses": [',
    "    {",
    '      "title": "The title of the course",',
    '      "source": "The platform (e.g., YouTube, Coursera, Udemy)",',
    '      "url": "The link to the course (canonical_url or source_course_key)",',
    '      "rating": 0.0,',
    '      "rating_source": "Where the rating came from",',
    '      "num_reviews": 0,',
    '      "num_enrolled": 0,',
    '      "is_free": true,',
    '      "duration_hours": 0.0,',
    '      "level_normalized": "The difficulty level",',
    '      "language_normalized": "The language of the course",',
    '      "category": "The course category",',
    '      "has_certificate": false,',
    '      "engagement_proxy": 0.0,',
    '      "completeness_score": 0.0',
    "    }",
    "  ]",
    "}",
    "",
    "## Question:",
    "$query",
    "",
    "## JSON Response:"
]))

