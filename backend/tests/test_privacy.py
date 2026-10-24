import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import main
from app.privacy import find_sensitive, redact_text, scan_pages


def test_detects_common_indian_sensitive_patterns():
    text = (
        'Email priya@example.com; phone +91 98765 43210; PAN ABCDE1234F; '
        'Aadhaar 1234 5678 9012; IFSC HDFC0001234; account number 123456789012.'
    )
    matches = find_sensitive(text)
    assert {item['category'] for item in matches} == {
        'email', 'phone', 'pan', 'aadhaar', 'ifsc', 'bank_account'
    }


def test_redaction_removes_values_and_preserves_length_and_offsets():
    text = 'Contact priya@example.com before payment.'
    masked, counts = redact_text(text)
    assert 'priya@example.com' not in masked
    assert '█' in masked
    assert len(masked) == len(text)
    assert masked.index('before payment') == text.index('before payment')
    assert counts['email'] == 1


def test_category_selection_masks_only_selected_categories():
    text = 'Email priya@example.com or phone 9876543210.'
    masked, counts = redact_text(text, ['email'])
    assert 'priya@example.com' not in masked
    assert '9876543210' in masked
    assert counts['email'] == 1
    assert counts['phone'] == 0


def test_scan_response_does_not_echo_detected_raw_values():
    result = scan_pages([{'page': 1, 'text': 'Contact priya@example.com for help.'}])
    serialized = json.dumps(result)
    assert 'priya@example.com' not in serialized
    assert result['total_matches'] == 1
    assert result['categories'][0]['count'] == 1
    assert 'masked' in result['examples'][0]['preview'] or '█' in result['examples'][0]['preview']


def test_privacy_scan_endpoint_is_session_scoped():
    client = TestClient(main.app)
    uploaded = client.post('/api/documents', files={'file': ('test.txt', b'Email priya@example.com', 'text/plain')})
    assert uploaded.status_code == 200
    doc = uploaded.json()
    result = client.post('/api/privacy/scan', json={'document_id': doc['id']})
    assert result.status_code == 200
    assert result.json()['total_matches'] == 1
    other = TestClient(main.app)
    assert other.post('/api/privacy/scan', json={'document_id': doc['id']}).status_code == 404
    client.close()
    other.close()


def test_external_review_receives_redacted_text(monkeypatch):
    # Use TestClient locally to keep this test standalone and independent of fixtures.
    from fastapi.testclient import TestClient
    main.DOCUMENTS.clear()
    monkeypatch.setenv('WATCHDOG_MODE', 'local')
    seen = []

    async def fake_extract(chunk, language):
        seen.append(chunk['text'])
        return SimpleNamespace(findings=[])

    monkeypatch.setattr(main.llm, 'extract', fake_extract)
    with TestClient(main.app) as client:
        uploaded = client.post('/api/documents', files={'file': ('test.txt', b'Contact priya@example.com about this renewal clause.', 'text/plain')})
        assert uploaded.status_code == 200
        response = client.post('/api/analyze', json={'document_id': uploaded.json()['id']})
        assert response.status_code == 200, response.text
        assert seen
        assert all('priya@example.com' not in text for text in seen)
        assert any('█' in text for text in seen)
        assert response.json()['privacy']['masked_counts']['email'] == 1


def test_external_compare_receives_redacted_text(monkeypatch):
    from fastapi.testclient import TestClient
    main.DOCUMENTS.clear()
    monkeypatch.setenv('WATCHDOG_MODE', 'local')
    seen = []

    async def fake_conflicts(a, b, language):
        seen.extend([a, b])
        return SimpleNamespace(conflicts=[])

    monkeypatch.setattr(main.llm, 'conflicts', fake_conflicts)
    with TestClient(main.app) as client:
        a = client.post('/api/documents', files={'file': ('old.txt', b'Contact priya@example.com about the renewal clause.', 'text/plain')})
        b = client.post('/api/documents', files={'file': ('new.txt', b'Contact priya@example.com about the updated renewal clause.', 'text/plain')})
        assert a.status_code == 200 and b.status_code == 200
        response = client.post('/api/compare', json={'old_id': a.json()['id'], 'new_id': b.json()['id']})
        assert response.status_code == 200, response.text
        assert len(seen) == 2
        assert all('priya@example.com' not in text for text in seen)
        assert all('█' in text for text in seen)


def test_review_masks_only_selected_categories_before_model_call(monkeypatch):
    main.DOCUMENTS.clear()
    monkeypatch.setenv('WATCHDOG_MODE', 'local')
    seen = []

    async def fake_extract(chunk, language):
        seen.append(chunk['text'])
        return SimpleNamespace(findings=[])

    monkeypatch.setattr(main.llm, 'extract', fake_extract)
    with TestClient(main.app) as client:
        text = b'Contact priya@example.com or call 9876543210 about this renewal clause.'
        uploaded = client.post('/api/documents', files={'file': ('test.txt', text, 'text/plain')})
        assert uploaded.status_code == 200, uploaded.text
        response = client.post('/api/analyze', json={
            'document_id': uploaded.json()['id'],
            'privacy_categories': ['email'],
        })
        assert response.status_code == 200, response.text
        assert seen and all('priya@example.com' not in chunk for chunk in seen)
        assert all('9876543210' in chunk for chunk in seen)
        assert response.json()['privacy']['masked_counts']['email'] == 1
        assert response.json()['privacy']['masked_counts']['phone'] == 0


def test_compare_masks_only_selected_categories_in_both_model_inputs(monkeypatch):
    main.DOCUMENTS.clear()
    monkeypatch.setenv('WATCHDOG_MODE', 'local')
    seen = []

    async def fake_conflicts(a, b, language):
        seen.extend([a, b])
        return SimpleNamespace(conflicts=[])

    monkeypatch.setattr(main.llm, 'conflicts', fake_conflicts)
    with TestClient(main.app) as client:
        text_a = b'Contact priya@example.com or call 9876543210 for the original terms.'
        text_b = b'Contact priya@example.com or call 9876543210 for the revised terms.'
        a = client.post('/api/documents', files={'file': ('old.txt', text_a, 'text/plain')})
        b = client.post('/api/documents', files={'file': ('new.txt', text_b, 'text/plain')})
        assert a.status_code == 200 and b.status_code == 200
        response = client.post('/api/compare', json={
            'old_id': a.json()['id'],
            'new_id': b.json()['id'],
            'privacy_categories': ['email'],
        })
        assert response.status_code == 200, response.text
        assert len(seen) == 2
        assert all('priya@example.com' not in text for text in seen)
        assert all('9876543210' in text for text in seen)
        assert response.json()['privacy']['masked_counts_old']['email'] == 1
        assert response.json()['privacy']['masked_counts_new']['email'] == 1
        assert response.json()['privacy']['masked_counts_old']['phone'] == 0
        assert response.json()['privacy']['masked_counts_new']['phone'] == 0
