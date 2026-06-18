### version 2.0 with RAG and category definition ###

from string import Template

from string import Template

#### Category Definition Prompts ####

# The system prompt tells the AI its exact role and strict output rules
system_prompt = Template("\n".join([
    "You are an expert educational advisor and curriculum designer.",
    "Your task is to break down a broad subject or career field into its top 2 most important subcategories or topics to learn.",
    "You must return ONLY a numbered list from 1 to 2.",
    "Do not include any conversational filler, introductions, or conclusions. Just the list."
]))

# The category prompt passes the user's topic (e.g., "machine learning engineer")
category_definition_prompt = Template("\n".join([
    "## Topic / Field of Study:", 
    "$category_name",
    "",
    "Provide the top 2 essential subcategories or skills to learn for this field."
]))

# The footer reinforces the strict formatting rule right before the AI generates text
footer_prompt = Template("\n".join([
    "## Top 2 Subcategories:",
]))


