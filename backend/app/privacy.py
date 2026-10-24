"""Small, local pattern-based privacy filter for text sent to external AI.

This is a best-effort MVP, not a complete PII detector. Matches are candidates;
users should inspect documents and avoid assuming that every sensitive value is found.
Masking preserves character length and whitespace so source offsets remain usable.
"""
from __future__ import annotations

import re
from collections import Counter

CATEGORIES = {
    "email": {"label": "Email addresses", "description": "Email-shaped strings"},
    "phone": {"label": "Indian phone numbers", "description": "Ten-digit mobile-shaped strings, optionally prefixed with +91"},
    "pan": {"label": "PAN-like identifiers", "description": "Strings shaped like an Indian PAN"},
    "aadhaar": {"label": "Aadhaar-like numbers", "description": "Twelve digits, contiguous or grouped in fours"},
    "ifsc": {"label": "IFSC codes", "description": "Strings shaped like an IFSC code"},
    "bank_account": {"label": "Bank account numbers", "description": "9–18 digit values near an account-number label"},
}
DEFAULT_CATEGORIES = list(CATEGORIES)

# Each pattern can select a subgroup when only the value (not its label) is sensitive.
PATTERNS = {
    "email": (re.compile(r"(?<![\w.+-])[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+", re.I), 0),
    "phone": (re.compile(r"(?<!\w)(?:\+?91[\s().-]?)?[6-9]\d{4}[\s.-]?\d{5}(?!\w)"), 0),
    "pan": (re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b", re.I), 0),
    "aadhaar": (re.compile(r"(?<!\d)(?:\d{4}[ -]\d{4}[ -]\d{4}|\d{12})(?!\d)"), 0),
    "ifsc": (re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b", re.I), 0),
    "bank_account": (re.compile(r"\b(?:bank\s+)?account\s*(?:no\.?|number|#)?\s*[:\-]?\s*(\d(?:[ -]?\d){8,17})\b", re.I), 1),
}

# Specific patterns win if their spans overlap with a more generic pattern.
_PRIORITY = {"email": 0, "bank_account": 1, "pan": 2, "ifsc": 3, "aadhaar": 4, "phone": 5}


def find_sensitive(text: str, categories=None) -> list[dict]:
    """Return non-overlapping text spans without returning the matched raw values."""
    selected = set(categories if categories is not None else CATEGORIES.keys()) & set(CATEGORIES)
    found = []
    for category in selected:
        pattern, group = PATTERNS[category]
        for match in pattern.finditer(text):
            start, end = match.span(group)
            if end > start:
                found.append({"category": category, "start": start, "end": end})
    found.sort(key=lambda item: (_PRIORITY[item["category"]], item["start"], -(item["end"] - item["start"])))
    accepted = []
    for item in found:
        if any(item["start"] < other["end"] and item["end"] > other["start"] for other in accepted):
            continue
        accepted.append(item)
    return sorted(accepted, key=lambda item: item["start"])


def scan_pages(pages: list[dict]) -> dict:
    """Summarize likely matches while never returning the detected raw values."""
    totals = Counter()
    per_page = []
    examples = []
    for page in pages:
        matches = find_sensitive(page["text"])
        counts = Counter(item["category"] for item in matches)
        totals.update(counts)
        per_page.append({"page": page["page"], "total": len(matches), "counts": dict(counts)})
        for item in matches[:3]:
            # A masked preview provides context without echoing the matched value.
            line_start = page["text"].rfind("\n", 0, item["start"]) + 1
            line_end = page["text"].find("\n", item["end"])
            if line_end < 0:
                line_end = len(page["text"])
            left = max(line_start, item["start"] - 42)
            right = min(line_end, item["end"] + 42)
            preview = page["text"][left:right]
            for span in sorted(find_sensitive(preview), key=lambda x: x["start"], reverse=True):
                preview = _mask_span(preview, span["start"], span["end"])
            examples.append({"page": page["page"], "category": item["category"], "preview": preview})
    return {
        "categories": [
            {"id": key, "label": CATEGORIES[key]["label"], "count": int(totals.get(key, 0)), "description": CATEGORIES[key]["description"]}
            for key in CATEGORIES
        ],
        "total_matches": int(sum(totals.values())),
        "pages": per_page,
        "examples": examples[:12],
        "notice": "Pattern-based detection is best-effort. Names, addresses, handwriting, misspellings and other sensitive details may be missed. Review the document before external analysis.",
    }


def _mask_span(text: str, start: int, end: int) -> str:
    """Replace non-whitespace characters with blocks without shifting source offsets."""
    return text[:start] + "".join(ch if ch.isspace() else "█" for ch in text[start:end]) + text[end:]


def redact_text(text: str, categories=None) -> tuple[str, dict[str, int]]:
    selected = set(categories if categories is not None else DEFAULT_CATEGORIES) & set(CATEGORIES)
    matches = find_sensitive(text, selected)
    result = text
    counts = Counter()
    for item in sorted(matches, key=lambda value: value["start"], reverse=True):
        result = _mask_span(result, item["start"], item["end"])
        counts[item["category"]] += 1
    return result, {key: int(counts.get(key, 0)) for key in CATEGORIES}


def redact_pages(pages: list[dict], categories=None) -> tuple[list[dict], dict[str, int]]:
    """Create a redacted copy of pages, leaving originals untouched and offsets stable."""
    redacted = []
    totals = Counter()
    for page in pages:
        text, counts = redact_text(page["text"], categories)
        redacted.append({**page, "text": text})
        totals.update(counts)
    return redacted, {key: int(totals.get(key, 0)) for key in CATEGORIES}
