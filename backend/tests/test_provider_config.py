"""Provider selection tests for the Nebius Token Factory hackathon path."""
import asyncio
import json

import httpx
import pytest

from app import llm, main
from fastapi.testclient import TestClient


def _mock_streamed_findings(request_sink, finish_reason="stop", content=None):
    def handler(request):
        request_sink.append(request)
        message = json.dumps({"findings": []}) if content is None else content
        event = {"choices": [{"delta": {"content": message}, "finish_reason": finish_reason}]}
        body = f"data: {json.dumps(event)}\n\ndata: [DONE]\n\n"
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            content=body.encode("utf-8"),
        )
    return handler


def _install_mock_transport(monkeypatch, handler):
    real_async_client = httpx.AsyncClient

    def mock_client(*, timeout):
        return real_async_client(transport=httpx.MockTransport(handler), timeout=timeout)

    monkeypatch.setattr(llm.httpx, "AsyncClient", mock_client)


def test_nebius_key_selects_token_factory_and_nebius_model(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "test-nebius-key")
    monkeypatch.setenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/")
    monkeypatch.setenv("NEBIUS_MODEL", "nvidia/Nemotron_Example-Test")
    monkeypatch.setenv("LLM_API_KEY", "test-fallback-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
    monkeypatch.setenv("LLM_MODEL", "nvidia/fallback-model")

    config = llm._provider_config()

    assert config["provider"] == "nebius"
    assert config["base_url"] == "https://api.tokenfactory.nebius.com/v1"
    assert config["model"] == "nvidia/Nemotron_Example-Test"
    assert config["api_key"] == "test-nebius-key"
    assert llm.configured_model() == "nvidia/Nemotron_Example-Test"


def test_nebius_request_uses_bearer_key_and_disables_thinking(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "test-nebius-key")
    monkeypatch.delenv("NEBIUS_BASE_URL", raising=False)
    monkeypatch.delenv("NEBIUS_MODEL", raising=False)
    monkeypatch.setenv("LLM_API_KEY", "test-fallback-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
    monkeypatch.setenv("LLM_MODEL", "nvidia/fallback-model")

    requests = []
    _install_mock_transport(monkeypatch, _mock_streamed_findings(requests))
    result = asyncio.run(llm.request_json("synthetic test only", llm.Findings))

    assert result.findings == []
    assert len(requests) == 1
    request = requests[0]
    assert str(request.url) == "https://api.tokenfactory.nebius.com/v1/chat/completions"
    assert request.headers["authorization"] == "Bearer test-nebius-key"
    payload = json.loads(request.content)
    assert payload["model"] == "nvidia/Nemotron-3_5-Lightning"
    assert payload["chat_template_kwargs"]["enable_thinking"] is False
    assert payload["max_tokens"] == 8192


def test_existing_openai_compatible_configuration_remains_fallback(monkeypatch):
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("NEBIUS_BASE_URL", raising=False)
    monkeypatch.delenv("NEBIUS_MODEL", raising=False)
    monkeypatch.setenv("LLM_API_KEY", "test-existing-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://example.test/v1/")
    monkeypatch.setenv("LLM_MODEL", "nvidia/test-fallback")

    config = llm._provider_config()

    assert config["provider"] == "openai-compatible"
    assert config["base_url"] == "https://example.test/v1"
    assert config["model"] == "nvidia/test-fallback"
    assert config["api_key"] == "test-existing-key"
    assert llm.configured_model() == "nvidia/test-fallback"


def test_health_reports_nebius_model_when_nebius_key_is_set(monkeypatch):
    monkeypatch.setenv("WATCHDOG_MODE", "demo")
    monkeypatch.setenv("NEBIUS_API_KEY", "test-nebius-key")
    monkeypatch.setenv("NEBIUS_MODEL", "nvidia/Nemotron_Example-Test")
    monkeypatch.setenv("LLM_MODEL", "nvidia/fallback-model")

    with TestClient(main.app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["model"] == "nvidia/Nemotron_Example-Test"
    assert response.json()["inference_checked"] is False


def test_valid_json_accepted_even_with_length_finish_reason(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "test-nebius-key")
    requests = []
    valid_content = json.dumps({"findings": []})
    _install_mock_transport(monkeypatch, _mock_streamed_findings(requests, finish_reason="length", content=valid_content))
    result = asyncio.run(llm.request_json("synthetic test", llm.Findings))
    assert result.findings == []


def test_truncated_json_with_length_finish_reason_raises(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "test-nebius-key")
    requests = []
    truncated_content = '{"findings": [{"title": "Incomplete"'
    _install_mock_transport(monkeypatch, _mock_streamed_findings(requests, finish_reason="length", content=truncated_content))
    with pytest.raises(ValueError, match="Model output was truncated before a complete response was returned"):
        asyncio.run(llm._request_json_once("synthetic test", llm.Findings))
