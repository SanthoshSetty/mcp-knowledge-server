"""
Minimal Workflow Runner Service

Executes SW 1.0.2 workflow specifications via HTTP API.
Supports: trustana-serpapi-csv, aeo-visibility-score workflows

API:
  POST /runs - Start a workflow run
  GET /runs/<run_id> - Get run status
  GET /health - Health check
  GET /workflows - List available workflows
"""

import os
import json
import csv
import re
import uuid
import logging
from datetime import datetime
from pathlib import Path
from threading import Thread
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from flask import Flask, request, jsonify
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# In-memory run storage
RUNS: dict[str, dict] = {}
WORKFLOW_DIR = os.environ.get("WORKFLOW_DIR", "/app/workflows")
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/app/output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_workflow(flow_id: str) -> dict | None:
    """Load workflow spec from JSON file."""
    workflow_path = Path(WORKFLOW_DIR) / f"{flow_id}.json"
    if workflow_path.exists():
        with open(workflow_path) as f:
            return json.load(f)
    return None


def fetch_trustana_product(api_key: str) -> dict:
    """Fetch first product from Trustana API."""
    logger.info("Fetching product from Trustana...")

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }

    with httpx.Client(timeout=30) as client:
        response = client.post(
            "https://api.trustana.com/v1/products/search",
            headers=headers,
            json={"pagination": {"offset": 0, "limit": 1}}
        )

    if response.status_code != 200:
        raise Exception(f"Trustana API error: {response.status_code} - {response.text}")

    data = response.json()
    # Trustana API returns: {"errorCode": ..., "data": {"result": [...], "total": N}}
    products = data.get("data", {}).get("result", [])
    logger.info(f"Products count: {len(products)}")

    if not products:
        raise Exception("No products found in Trustana")

    product = products[0]

    # Extract name and brand from attributes array
    attrs = {attr["key"]: attr["value"] for attr in product.get("attributes", [])}
    product["name"] = attrs.get("name", "Unknown")
    product["brand"] = attrs.get("brand", "")
    logger.info(f"Fetched product: {product.get('name', 'Unknown')}")
    return product


def search_serpapi(api_key: str, query: str, num_results: int = 10) -> list[dict]:
    """Search Google via SerpAPI."""
    logger.info(f"Searching SerpAPI for: {query}")

    params = {
        "q": query,
        "api_key": api_key,
        "engine": "google",
        "num": num_results,
        "hl": "en"
    }

    with httpx.Client(timeout=30) as client:
        response = client.get("https://serpapi.com/search", params=params)

    if response.status_code != 200:
        raise Exception(f"SerpAPI error: {response.status_code} - {response.text}")

    data = response.json()
    organic_results = data.get("organic_results", [])

    results = []
    for result in organic_results:
        results.append({
            "position": result.get("position"),
            "title": result.get("title"),
            "link": result.get("link"),
            "snippet": result.get("snippet"),
            "displayed_link": result.get("displayed_link"),
        })

    logger.info(f"Found {len(results)} search results")
    return results


def export_to_csv(product: dict, search_results: list[dict], filename: str) -> str:
    """Export product + search results to CSV."""
    logger.info(f"Exporting to CSV: {filename}")

    filepath = OUTPUT_DIR / filename

    columns = ["product_name", "brand", "sku", "search_position", "result_title", "result_link", "result_snippet"]

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(columns)

        for result in search_results:
            writer.writerow([
                product.get("name", "N/A"),
                product.get("brand", "N/A"),
                product.get("skuId", "N/A"),
                result.get("position", "N/A"),
                result.get("title", "N/A"),
                result.get("link", "N/A"),
                result.get("snippet", "N/A"),
            ])

    logger.info(f"CSV exported: {filepath}")
    return str(filepath)


def search_gemini(api_key: str, query: str) -> dict:
    """Search with Gemini using Google Search grounding."""
    logger.info(f"Searching Gemini (grounded) for: {query}")

    model = "gemini-2.0-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"Search for: {query}\n\nProvide results with source URLs. List all relevant URLs you find."
                    }
                ]
            }
        ],
        "tools": [
            {
                "google_search": {}
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 4096,
        }
    }

    with httpx.Client(timeout=90) as client:
        response = client.post(url, params={"key": api_key}, json=body)

    if response.status_code != 200:
        logger.error(f"Gemini error: {response.status_code} - {response.text[:500]}")
        return {"response": "", "urls": [], "error": response.text[:500]}

    data = response.json()

    # Extract response text
    candidates = data.get("candidates", [])
    if not candidates:
        return {"response": "", "urls": [], "error": "No response"}

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    text_response = "".join(part.get("text", "") for part in parts if "text" in part)

    # Extract URLs from grounding metadata
    grounding_metadata = candidates[0].get("groundingMetadata", {})
    grounding_chunks = grounding_metadata.get("groundingChunks", [])

    urls = []
    for i, chunk in enumerate(grounding_chunks):
        web_info = chunk.get("web", {})
        if web_info:
            urls.append({
                "position": i + 1,
                "url": web_info.get("uri", ""),
                "title": web_info.get("title", ""),
            })

    # Also extract URLs from text
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    text_urls = re.findall(url_pattern, text_response)
    for url in text_urls:
        url = url.rstrip('.,;:')
        if not any(u["url"] == url for u in urls):
            urls.append({"position": len(urls) + 1, "url": url, "title": ""})

    logger.info(f"Gemini found {len(urls)} URLs")
    return {"response": text_response, "urls": urls}


def search_perplexity(api_key: str, query: str) -> dict:
    """Search with Perplexity API with citations."""
    logger.info(f"Searching Perplexity for: {query}")

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body = {
        "model": "sonar",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful search assistant. Provide detailed results with source URLs."
            },
            {
                "role": "user",
                "content": f"Search for: {query}\n\nList all relevant sources and URLs."
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
        "return_citations": True,
    }

    with httpx.Client(timeout=90) as client:
        response = client.post(url, headers=headers, json=body)

    if response.status_code != 200:
        logger.error(f"Perplexity error: {response.status_code} - {response.text[:500]}")
        return {"response": "", "urls": [], "error": response.text[:500]}

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        return {"response": "", "urls": [], "error": "No response"}

    text_response = choices[0].get("message", {}).get("content", "")
    citations = data.get("citations", [])

    urls = []
    for i, citation in enumerate(citations):
        if isinstance(citation, str):
            urls.append({"position": i + 1, "url": citation, "title": ""})
        elif isinstance(citation, dict):
            urls.append({
                "position": i + 1,
                "url": citation.get("url", ""),
                "title": citation.get("title", ""),
            })

    # Extract URLs from text
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\])(\]]+'
    text_urls = re.findall(url_pattern, text_response)
    for url in text_urls:
        url = url.rstrip('.,;:')
        if not any(u["url"] == url for u in urls):
            urls.append({"position": len(urls) + 1, "url": url, "title": ""})

    logger.info(f"Perplexity found {len(urls)} URLs")
    return {"response": text_response, "urls": urls}


def search_openai(api_key: str, query: str) -> dict:
    """Search with OpenAI (uses chat completions as fallback)."""
    logger.info(f"Searching OpenAI for: {query}")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful search assistant. When searching, always include source URLs. Format URLs clearly."
            },
            {
                "role": "user",
                "content": f"Search for: {query}\n\nProvide results with source URLs. List all relevant URLs you know about."
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    with httpx.Client(timeout=90) as client:
        response = client.post(url, headers=headers, json=body)

    if response.status_code != 200:
        logger.error(f"OpenAI error: {response.status_code} - {response.text[:500]}")
        return {"response": "", "urls": [], "error": response.text[:500]}

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        return {"response": "", "urls": [], "error": "No response"}

    text_response = choices[0].get("message", {}).get("content", "")

    # Extract URLs from text
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\])(\]]+'
    urls = []
    text_urls = re.findall(url_pattern, text_response)
    for i, url in enumerate(text_urls):
        url = url.rstrip('.,;:')
        if not any(u["url"] == url for u in urls):
            urls.append({"position": i + 1, "url": url, "title": ""})

    logger.info(f"OpenAI found {len(urls)} URLs")
    return {"response": text_response, "urls": urls}


def calculate_aeo_score(urls: list[dict], retailer_domain: str) -> dict:
    """
    Calculate position-weighted AEO score.
    1st position = 100 points, -10 per position
    Checks both URL and title fields for domain presence.
    """
    score = 0
    domain_found = False
    matched_positions = []
    retailer_domain_lower = retailer_domain.lower()

    for url_info in urls:
        url = url_info.get("url", "").lower()
        title = url_info.get("title", "").lower()
        position = url_info.get("position", 999)

        # Check both URL and title for domain presence
        if retailer_domain_lower in url or retailer_domain_lower in title:
            domain_found = True
            position_score = max(100 - (position - 1) * 10, 10)
            score = max(score, position_score)
            matched_positions.append(position)

    return {
        "score": score,
        "domain_found": domain_found,
        "matched_positions": matched_positions
    }


def send_to_slack(token: str, channel: str, message: str) -> dict:
    """Send message to Slack channel."""
    logger.info(f"Sending to Slack channel {channel}")

    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = {
        "channel": channel,
        "text": message,
        "mrkdwn": True,
    }

    with httpx.Client(timeout=30) as client:
        response = client.post(url, headers=headers, json=body)

    data = response.json()
    if not data.get("ok"):
        logger.error(f"Slack error: {data.get('error')}")
        return {"error": data.get("error")}

    logger.info("Slack message sent successfully")
    return {"ts": data.get("ts"), "channel": data.get("channel")}


def execute_aeo_visibility(run_id: str, input_data: dict) -> None:
    """Execute the AEO visibility score workflow."""
    run = RUNS[run_id]

    try:
        # Get required inputs
        product_id = input_data.get("product_id")
        retailer_domain = input_data.get("retailer_domain")

        if not product_id:
            raise Exception("product_id is required")
        if not retailer_domain:
            raise Exception("retailer_domain is required")

        # Get API keys
        trustana_key = os.environ.get("TRUSTANA_API_KEY")
        gemini_key = os.environ.get("GEMINI_API_KEY")
        perplexity_key = os.environ.get("PERPLEXITY_API_KEY")
        openai_key = os.environ.get("OPENAI_API_KEY")
        slack_token = os.environ.get("SLACK_BOT_TOKEN")
        slack_channel = os.environ.get("SLACK_CHANNEL", "C09M1SAG22E")

        if not trustana_key:
            raise Exception("TRUSTANA_API_KEY not set")

        # Step 1: Fetch product from Trustana
        run["status"] = "running"
        run["current_step"] = "fetch_product"
        product = fetch_trustana_product(trustana_key)

        product_name = product.get("name", "Unknown")
        brand = product.get("brand", "")
        sku = product.get("skuId", product_id)
        search_query = f"{product_name} {brand}".strip()

        logger.info(f"Product: {product_name} | Brand: {brand} | Query: {search_query}")

        # Step 2: Search all AI engines in parallel
        run["current_step"] = "search_ai_engines"
        results = {}

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {}

            if gemini_key:
                futures[executor.submit(search_gemini, gemini_key, search_query)] = "gemini"
            else:
                results["gemini"] = {"response": "", "urls": [], "error": "API key not set"}

            if perplexity_key:
                futures[executor.submit(search_perplexity, perplexity_key, search_query)] = "perplexity"
            else:
                results["perplexity"] = {"response": "", "urls": [], "error": "API key not set"}

            if openai_key:
                futures[executor.submit(search_openai, openai_key, search_query)] = "openai"
            else:
                results["openai"] = {"response": "", "urls": [], "error": "API key not set"}

            for future in as_completed(futures):
                engine = futures[future]
                try:
                    results[engine] = future.result()
                except Exception as e:
                    logger.error(f"{engine} error: {e}")
                    results[engine] = {"response": "", "urls": [], "error": str(e)}

        # Step 3: Calculate AEO scores
        run["current_step"] = "calculate_scores"

        gemini_score = calculate_aeo_score(results.get("gemini", {}).get("urls", []), retailer_domain)
        perplexity_score = calculate_aeo_score(results.get("perplexity", {}).get("urls", []), retailer_domain)
        openai_score = calculate_aeo_score(results.get("openai", {}).get("urls", []), retailer_domain)

        scores = [gemini_score["score"], perplexity_score["score"], openai_score["score"]]
        non_zero = [s for s in scores if s > 0]
        overall_score = round(sum(non_zero) / len(non_zero), 1) if non_zero else 0

        logger.info(f"AEO Scores - Gemini: {gemini_score['score']}, Perplexity: {perplexity_score['score']}, OpenAI: {openai_score['score']}, Overall: {overall_score}")

        # Step 4: Export to CSV
        run["current_step"] = "export_to_csv"

        # Create CSV with AEO scores and URLs
        timestamp = int(datetime.now().timestamp())
        filename = f"aeo-score-{sku}-{timestamp}.csv"
        filepath = OUTPUT_DIR / filename

        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            # Write header
            writer.writerow([
                "product_id", "product_name", "brand", "retailer_domain",
                "overall_aeo_score", "engines_with_presence",
                "gemini_score", "gemini_domain_found", "gemini_positions",
                "perplexity_score", "perplexity_domain_found", "perplexity_positions",
                "openai_score", "openai_domain_found", "openai_positions"
            ])

            # Write scores row
            writer.writerow([
                sku, product_name, brand, retailer_domain,
                overall_score, len(non_zero),
                gemini_score['score'], gemini_score['domain_found'], str(gemini_score['matched_positions']),
                perplexity_score['score'], perplexity_score['domain_found'], str(perplexity_score['matched_positions']),
                openai_score['score'], openai_score['domain_found'], str(openai_score['matched_positions'])
            ])

            # Add blank row
            writer.writerow([])

            # Write URLs section header
            writer.writerow(["engine", "position", "url", "title"])

            # Write Gemini URLs
            for url_info in results.get('gemini', {}).get('urls', []):
                writer.writerow([
                    "gemini",
                    url_info.get("position", ""),
                    url_info.get("url", ""),
                    url_info.get("title", "")
                ])

            # Write Perplexity URLs
            for url_info in results.get('perplexity', {}).get('urls', []):
                writer.writerow([
                    "perplexity",
                    url_info.get("position", ""),
                    url_info.get("url", ""),
                    url_info.get("title", "")
                ])

            # Write OpenAI URLs
            for url_info in results.get('openai', {}).get('urls', []):
                writer.writerow([
                    "openai",
                    url_info.get("position", ""),
                    url_info.get("url", ""),
                    url_info.get("title", "")
                ])

        logger.info(f"AEO results exported to: {filepath}")

        # Complete
        run["status"] = "completed"
        run["current_step"] = None
        run["completed_at"] = datetime.utcnow().isoformat()
        run["result"] = {
            "product_id": sku,
            "product_name": product_name,
            "brand": brand,
            "retailer_domain": retailer_domain,
            "overall_aeo_score": overall_score,
            "scores": {
                "gemini": gemini_score,
                "perplexity": perplexity_score,
                "openai": openai_score,
            },
            "urls": {
                "gemini": results.get("gemini", {}).get("urls", []),
                "perplexity": results.get("perplexity", {}).get("urls", []),
                "openai": results.get("openai", {}).get("urls", []),
            },
            "csv_path": str(filepath),
        }

        logger.info(f"AEO workflow {run_id} completed - Overall score: {overall_score} - CSV: {filepath}")

    except Exception as e:
        logger.error(f"AEO workflow error: {e}")
        run["status"] = "failed"
        run["error"] = str(e)


def execute_trustana_serpapi_csv(run_id: str) -> None:
    """Execute the trustana-serpapi-csv workflow."""
    run = RUNS[run_id]

    try:
        # Get API keys from environment
        trustana_key = os.environ.get("TRUSTANA_API_KEY")
        serpapi_key = os.environ.get("SERPAPI_API_KEY")

        if not trustana_key:
            raise Exception("TRUSTANA_API_KEY not set")
        if not serpapi_key:
            raise Exception("SERPAPI_API_KEY not set")

        # Step 1: Fetch product from Trustana
        run["status"] = "running"
        run["current_step"] = "fetch_product"
        product = fetch_trustana_product(trustana_key)

        # Step 2: Build search query
        run["current_step"] = "build_query"
        product_name = product.get("name", "")
        brand = product.get("brand", "")
        search_query = f"{product_name} {brand}".strip()
        logger.info(f"Search query: {search_query}")

        # Step 3: Search Google via SerpAPI
        run["current_step"] = "search_google"
        search_results = search_serpapi(serpapi_key, search_query, num_results=10)

        # Step 4: Export to CSV
        run["current_step"] = "export_to_csv"
        sku = product.get("skuId", "unknown")
        filename = f"product-search-{sku}-{int(datetime.now().timestamp())}.csv"
        csv_path = export_to_csv(product, search_results, filename)

        # Complete
        run["status"] = "completed"
        run["current_step"] = None
        run["completed_at"] = datetime.utcnow().isoformat()
        run["result"] = {
            "product_name": product.get("name"),
            "brand": product.get("brand"),
            "sku": product.get("skuId"),
            "search_query": search_query,
            "search_results_count": len(search_results),
            "csv_path": csv_path,
            "search_results": search_results
        }

        logger.info(f"Workflow {run_id} completed successfully")

    except Exception as e:
        logger.error(f"Workflow error: {e}")
        run["status"] = "failed"
        run["error"] = str(e)


def translate_with_gpt51(api_key: str, system_prompt: str, user_prompt: str, reasoning_effort: str = "low") -> dict:
    """Translate text using OpenAI GPT-5.1 Responses API."""
    logger.info(f"Translating with OpenAI GPT-5.1 (reasoning: {reasoning_effort})...")

    url = "https://api.openai.com/v1/responses"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # GPT-5.1 Responses API format
    body = {
        "model": "gpt-5.1",
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "text": {
            "format": {
                "type": "text"
            },
            "verbosity": "medium"
        },
        "reasoning": {
            "effort": reasoning_effort,
            "summary": "auto"
        },
        "tools": [],
        "store": True
    }

    with httpx.Client(timeout=180) as client:
        response = client.post(url, headers=headers, json=body)

    if response.status_code != 200:
        logger.error(f"OpenAI GPT-5.1 error: {response.status_code} - {response.text[:500]}")
        return {"content": "", "error": response.text[:500]}

    data = response.json()

    # Extract content from GPT-5.1 response format
    output = data.get("output", [])
    content = ""
    for item in output:
        if item.get("type") == "message" and item.get("role") == "assistant":
            for content_block in item.get("content", []):
                if content_block.get("type") == "output_text":
                    content += content_block.get("text", "")

    if not content:
        content = data.get("output_text", "") or data.get("text", "")

    logger.info(f"Translation completed with GPT-5.1, length: {len(content)} chars")
    return {"content": content}


def execute_localization(run_id: str, input_data: dict) -> None:
    """Execute the localization workflow."""
    run = RUNS[run_id]

    try:
        # Get inputs
        target_language = input_data.get("target_language", "Modern Standard Arabic")
        fields_to_translate = input_data.get("fields_to_translate", [])
        transliterate_brand = input_data.get("transliterate_brand", True)
        preserve_html = input_data.get("preserve_html", True)
        glossary = input_data.get("glossary", "")
        reasoning_effort = input_data.get("reasoning_effort", "low")

        # Validate required inputs
        if not fields_to_translate:
            raise Exception("fields_to_translate is required")
        if not glossary:
            raise Exception("glossary is required - please provide unit/abbreviation replacements (e.g., 'V → فولت\\nW → واط')")

        # Get API keys
        trustana_key = os.environ.get("TRUSTANA_API_KEY")
        openai_key = os.environ.get("OPENAI_API_KEY")

        if not trustana_key:
            raise Exception("TRUSTANA_API_KEY not set")
        if not openai_key:
            raise Exception("OPENAI_API_KEY not set")

        # Step 1: Fetch product from Trustana
        run["status"] = "running"
        run["current_step"] = "fetch_product"
        product = fetch_trustana_product(trustana_key)

        product_name = product.get("name", "Unknown")
        brand = product.get("brand", "")
        attrs = product.get("attributes", [])

        logger.info(f"Product: {product_name} | Brand: {brand}")

        # Step 2: Extract fields to translate
        run["current_step"] = "extract_fields"

        def get_attribute_value(attributes, field_path):
            parts = field_path.split('//')
            for attr in attributes:
                if len(parts) == 2:
                    if attr.get("category") == parts[0] and attr.get("key") == parts[1]:
                        return attr.get("value", "")
                elif attr.get("key") == field_path:
                    return attr.get("value", "")
            return None

        fields_data = {}
        for field in fields_to_translate:
            value = get_attribute_value(attrs, field)
            if value:
                fields_data[field] = value
            else:
                # Use product name/description as fallback for testing
                if "name" in field.lower():
                    fields_data[field] = product_name
                elif "description" in field.lower():
                    fields_data[field] = product.get("longDescription", product_name)

        if not fields_data:
            # Fallback: translate product name
            fields_data["name"] = product_name

        logger.info(f"Found {len(fields_data)} fields to translate")

        # Step 3: Build translation prompt
        run["current_step"] = "build_prompt"

        system_prompt = f"""You are an expert translator and localization specialist for {target_language}.

Key principles:
1. Maintain exact meaning and intent of the original text
2. Use natural, fluent {target_language} that reads well to native speakers
3. Handle technical terminology appropriately
4. Preserve all HTML tags and structure - translate only text content between tags
5. Transliterate brand names to Arabic script letter-by-letter (e.g., Oppo → أوبو, Samsung → سامسونج, Apple → أبل)
6. Apply unit/abbreviation replacements from the glossary provided
7. For Arabic translations: No English letters in translated text (except in HTML attributes and E-XXX codes)
8. Preserve all numbers exactly as they appear
9. For acronyms not in glossary, transliterate them letter-by-letter to Arabic script

{f"=== GLOSSARY ==={chr(10)}{glossary}{chr(10)}===" if glossary else ""}

Return the translated text for each field, clearly labeled."""

        user_prompt = f"Product: {product_name}\nBrand: {brand}\n\nTranslate the following to {target_language}:\n\n"
        for field, value in fields_data.items():
            user_prompt += f"=== {field} ===\n{value}\n\n"

        # Step 4: Translate with GPT-5.1
        run["current_step"] = "translate"
        logger.info(f"Calling GPT-5.1 with reasoning effort: {reasoning_effort}")
        ai_response = translate_with_gpt51(openai_key, system_prompt, user_prompt, reasoning_effort)

        if ai_response.get("error"):
            raise Exception(f"Translation error: {ai_response['error']}")

        response_text = ai_response.get("content", "")

        # Step 5: Parse results
        run["current_step"] = "parse_results"
        translations = {}

        # Simple parsing - assign full response if single field
        if len(fields_data) == 1:
            translations[list(fields_data.keys())[0]] = response_text.strip()
        else:
            # Try to parse by field markers
            current_field = None
            current_text = []
            for line in response_text.split('\n'):
                if line.startswith('===') and line.endswith('==='):
                    if current_field and current_text:
                        translations[current_field] = '\n'.join(current_text).strip()
                    current_field = line.strip('= ').strip()
                    current_text = []
                elif current_field:
                    current_text.append(line)
            if current_field and current_text:
                translations[current_field] = '\n'.join(current_text).strip()

            # Fallback if parsing failed
            if not translations:
                translations[list(fields_data.keys())[0]] = response_text.strip()

        # Complete
        run["status"] = "completed"
        run["current_step"] = None
        run["completed_at"] = datetime.utcnow().isoformat()
        run["result"] = {
            "product_id": product.get("skuId", "unknown"),
            "product_name": product_name,
            "brand": brand,
            "target_language": target_language,
            "original_fields": fields_data,
            "translated_fields": translations,
            "field_count": len(translations),
        }

        logger.info(f"Localization workflow {run_id} completed - {len(translations)} fields translated")

    except Exception as e:
        logger.error(f"Localization workflow error: {e}")
        run["status"] = "failed"
        run["error"] = str(e)


def execute_workflow(run_id: str, workflow: dict, input_data: dict = None, flow_id: str = None) -> None:
    """Execute a workflow based on flow_id."""
    # Support both workflow_id (from spec) and flow_id (from request)
    flow_id = flow_id or workflow.get("workflow_id", "") or workflow.get("flow_id", "")
    input_data = input_data or {}

    if flow_id == "trustana-serpapi-csv":
        execute_trustana_serpapi_csv(run_id)
    elif flow_id == "aeo-visibility-score":
        execute_aeo_visibility(run_id, input_data)
    elif flow_id == "localization":
        execute_localization(run_id, input_data)
    else:
        run = RUNS[run_id]
        run["status"] = "failed"
        run["error"] = f"Unsupported workflow: {flow_id}"


# API Routes

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "workflow-runner"})


@app.route("/runs", methods=["POST"])
def create_run():
    """Start a new workflow run."""
    data = request.json or {}

    tenant_id = data.get("tenant_id", "default")
    flow_id = data.get("flow_id")

    if not flow_id:
        return jsonify({"error": "flow_id is required"}), 400

    # Load workflow
    workflow = load_workflow(flow_id)
    if not workflow:
        return jsonify({"error": f"Workflow '{flow_id}' not found"}), 404

    # Create run
    run_id = str(uuid.uuid4())[:8]
    run = {
        "run_id": run_id,
        "flow_id": flow_id,
        "tenant_id": tenant_id,
        "status": "starting",
        "current_step": None,
        "created_at": datetime.utcnow().isoformat(),
        "input": data.get("input", {})
    }
    RUNS[run_id] = run

    # Execute in background
    input_data = data.get("input", {})
    thread = Thread(target=execute_workflow, args=(run_id, workflow, input_data, flow_id))
    thread.start()

    logger.info(f"Started run {run_id} for workflow {flow_id}")

    return jsonify({
        "run_id": run_id,
        "flow_id": flow_id,
        "status": "starting",
        "message": f"Workflow started. Check status at GET /runs/{run_id}"
    }), 201


@app.route("/runs/<run_id>", methods=["GET"])
def get_run(run_id: str):
    """Get run status and details."""
    run = RUNS.get(run_id)
    if not run:
        return jsonify({"error": "Run not found"}), 404

    response = {
        "run_id": run["run_id"],
        "flow_id": run["flow_id"],
        "status": run["status"],
        "current_step": run.get("current_step"),
        "created_at": run["created_at"],
    }

    if run["status"] == "completed":
        response["result"] = run.get("result")
        response["completed_at"] = run.get("completed_at")

    if run["status"] == "failed":
        response["error"] = run.get("error")

    return jsonify(response)


@app.route("/workflows", methods=["GET"])
def list_workflows():
    """List available workflows."""
    workflow_dir = Path(WORKFLOW_DIR)
    workflows = []

    for f in workflow_dir.glob("*.json"):
        try:
            with open(f) as fh:
                spec = json.load(fh)
                workflows.append({
                    "flow_id": f.stem,
                    "name": spec.get("name", f.stem),
                    "description": spec.get("metadata", {}).get("description", "")
                })
        except Exception:
            pass

    return jsonify({"workflows": workflows})


@app.route("/output/<filename>", methods=["GET"])
def get_output(filename: str):
    """Download output file."""
    filepath = OUTPUT_DIR / filename
    if not filepath.exists():
        return jsonify({"error": "File not found"}), 404

    with open(filepath, "r") as f:
        content = f.read()

    return content, 200, {"Content-Type": "text/csv"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8015, debug=True)
