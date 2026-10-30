import os

import httpx


TAVILY_SEARCH_URL = "https://api.tavily.com/search"


async def search_web(query: str, max_results: int = 5) -> dict:
    """Search the public web using Tavily without exposing the API key."""

    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY is not configured")

    query = query.strip()
    if not query:
        raise ValueError("Search query cannot be empty")

    payload = {
        "query": query,
        "search_depth": "basic",
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False,
        "include_images": False,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            TAVILY_SEARCH_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    return {
        "query": data.get("query", query),
        "results": [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score"),
            }
            for item in data.get("results", [])[:max_results]
        ],
        "response_time": data.get("response_time"),
    }
