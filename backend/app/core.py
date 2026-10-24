"""Deterministic evidence, finance, comparison and calendar tools. No model calls."""
import calendar
import difflib
import hashlib
import re
import uuid
from datetime import date, datetime, timedelta, timezone

RULES = [
    {'id': 'renewal', 'pattern': r'auto.?renew|automatically renew', 'title': 'Automatic renewal', 'question': 'What is the last day and accepted method for cancelling renewal?'},
    {'id': 'fee', 'pattern': r'penalt|late fee|processing fee|non.refundable', 'title': 'Additional charge', 'question': 'Can the charge be capped, waived, or itemized?'},
    {'id': 'exit', 'pattern': r'lock.in|early termination|foreclos|prepayment', 'title': 'Exit restriction', 'question': 'What is the total cost of leaving early?'},
    {'id': 'change', 'pattern': r'unilateral|sole discretion|without notice', 'title': 'Unilateral change', 'question': 'Can changes require advance notice and a right to exit?'},
    {'id': 'flat', 'pattern': r'flat (?:annual )?(?:rate|interest)|\d+(?:\.\d+)?% flat', 'title': 'Flat-rate interest', 'question': 'What is the effective annual cost including upfront fees?'},
]


def evidence(quote, pages):
    """Match quotes despite whitespace, typography, and capitalization differences.
    Return offsets into the original source text.
    """
    import unicodedata

    if not isinstance(quote, str) or len(quote.strip()) < 12:
        return []

    def normalize_with_positions(text):
        chars = []
        positions = []

        for index, original_char in enumerate(text):
            normalized = unicodedata.normalize("NFKC", original_char)

            for char in normalized:
                char = {
                    "\u2018": "'",
                    "\u2019": "'",
                    "\u201c": '"',
                    "\u201d": '"',
                    "\u2013": "-",
                    "\u2014": "-",
                }.get(char, char)

                if char.isspace():
                    char = " "

                if char == " " and (not chars or chars[-1] == " "):
                    continue

                chars.append(char)
                positions.append(index)

        while chars and chars[0] == " ":
            chars.pop(0)
            positions.pop(0)

        while chars and chars[-1] == " ":
            chars.pop()
            positions.pop()

        return "".join(chars), positions

    normalized_quote, _ = normalize_with_positions(quote)
    normalized_quote = normalized_quote.casefold()

    if len(normalized_quote) < 12:
        return []

    matches = []

    for page in pages:
        original_text = page.get("text", "")
        if not isinstance(original_text, str):
            continue

        normalized_text, positions = normalize_with_positions(original_text)
        normalized_text = normalized_text.casefold()

        start = 0

        while True:
            index = normalized_text.find(normalized_quote, start)

            if index < 0:
                break

            end_index = index + len(normalized_quote)

            if index < len(positions) and end_index <= len(positions):
                matches.append({
                    "page": page["page"],
                    "start": positions[index],
                    "end": positions[end_index - 1] + 1,
                })

            start = index + max(1, len(normalized_quote))

    return matches




def rule_findings(pages):
    findings = []
    for p in pages:
        for line in re.split(r'\n+|(?<=[.!?])\s+', p['text']):
            line = line.strip()
            if len(line) < 12:
                continue
            for rule in RULES:
                if re.search(rule['pattern'], line, re.I):
                    findings.append({'title': rule['title'], 'quote': line, 'explanation': 'Checklist trigger; read the full clause and its exceptions.', 'question': rule['question'], 'rule_id': rule['id'], 'severity': 'review', 'origin': 'deterministic checklist', 'evidence': evidence(line, pages)})
    return findings


def verify_candidates(candidates, pages):
    accepted, rejected = [], []

    for item in candidates:
        quote = item.get('quote', '')
        matches = evidence(quote, pages)

        if not matches:
            print("\n--- REJECTED QUOTE DIAGNOSTIC ---")
            print("QUOTE:", repr(quote))
            print("QUOTE LENGTH:", len(quote))

            for page in pages:
                text = page.get("text", "")

                print("QUOTE REPR:", repr(quote))
                print("SOURCE REPR:", repr(text))
                print("QUOTE IN SOURCE:", quote in text)

                normalized_quote = " ".join(quote.split()).casefold()
                normalized_source = " ".join(text.split()).casefold()

                print(
                    "WHITESPACE-NORMALIZED MATCH:",
                    normalized_quote in normalized_source
                )

        record = {
            **item,
            'origin': 'model suggestion',
            'evidence': matches,
        }

        (accepted if matches else rejected).append(record)

    return accepted, rejected


def chunks(pages, size=2500, overlap=200):
    for page in pages:
        text = page['text']
        for start in range(0, len(text), size - overlap):
            yield {'page': page['page'], 'start': start, 'text': text[start:start + size]}

def compare_text(old, new):
    a, b = old.splitlines(), new.splitlines()
    changes = []
    for tag, i, j, k, l in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag != 'equal':
            changes.append({'type': tag, 'old_lines': [i+1, j], 'new_lines': [k+1, l], 'before': '\n'.join(a[i:j]), 'after': '\n'.join(b[k:l])})
    return changes

def loan_cost(principal, annual_flat_percent, months, upfront_fee=0):
    """Equal monthly end-of-month payments, fee deducted at disbursement."""
    interest = principal * annual_flat_percent / 100 * months / 12
    payment = (principal + interest) / months
    net = principal - upfront_fee
    def pv(rate):
        if rate == 0:
            return payment * months
        return sum(payment / (1 + rate) ** t for t in range(1, months + 1))
    lo, hi = 0., 1.
    while pv(hi) > net:
        hi *= 2
    for _ in range(160):
        mid = (lo + hi) / 2
        if pv(mid) > net:
            lo = mid
        else:
            hi = mid
    monthly = (lo + hi) / 2
    return {'monthly_payment': round(payment, 2), 'total_installments': round(principal + interest, 2), 'interest': round(interest, 2), 'total_cost_including_fee': round(interest + upfront_fee, 2), 'net_disbursed': round(net, 2), 'effective_annual_percent': round(((1 + monthly) ** 12 - 1) * 100, 4), 'assumptions': 'Flat simple interest, equal monthly payments in arrears, upfront fee withheld; no taxes, irregular dates, compounding penalties, or other charges. Effective annual rate is a cash-flow estimate, not a statutory APR.'}

def deadline_candidates(pages):
    """Extract explicit date candidates from text lines that describe an event or obligation."""
    out = []
    seen = set()

    date_pattern = re.compile(
        r'\b(?:'
        r'\d{4}-\d{1,2}-\d{1,2}'
        r'|'
        r'\d{1,2}[-/]\d{1,2}[-/]\d{4}'
        r'|'
        r'\d{1,2}(?:st|nd|rd|th)?\s+'
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)'
        r'\s+\d{4}'
        r'|'
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)'
        r'\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{4}'
        r')\b',
        re.I
    )

    month_formats = (
        '%d %B %Y', '%d %b %Y',
        '%B %d %Y', '%b %d %Y',
        '%Y-%m-%d', '%Y-%m-%d',
        '%d-%m-%Y', '%d/%m/%Y',
        '%m-%d-%Y', '%m/%d/%Y',
    )

    event_pattern = re.compile(
        r'\b(?:'
        r'deadline|due|pay|payment|payable|instalment|installment|'
        r'submit|submission|deliver|delivery|provide|receive|feedback|'
        r'approve|approval|complete|completion|finish|'
        r'renew\w*|notice|terminat\w*|expir\w*|cancel\w*|'
        r'claim|respond|response|review|commence|effective date|'
        r'commencement|file|filing|within\s+\d+\s+(?:calendar\s+)?days?'
        r')\b',
        re.I
    )

    for page in pages:
        for raw_line in page.get('text', '').splitlines():
            line = ' '.join(raw_line.split()).strip()
            if not line:
                continue

            matches = list(date_pattern.finditer(line))
            if not matches or not event_pattern.search(line):
                continue

            for match in matches:
                raw_date = match.group(0).strip()
                cleaned = re.sub(r'(\d)(st|nd|rd|th)\b', r'\1', raw_date, flags=re.I)
                cleaned = cleaned.replace(',', '')

                parsed = None
                for fmt in month_formats:
                    try:
                        parsed = datetime.strptime(cleaned, fmt).date()
                        break
                    except ValueError:
                        continue

                if parsed is None:
                    continue

                iso_date = parsed.isoformat()
                key = (iso_date, line, page.get('page'))

                if key in seen:
                    continue
                seen.add(key)

                out.append({
                    'date': iso_date,
                    'quote': line,
                    'page': page.get('page', 1),
                    'status': 'candidate only; verify the event, date, and any applicable notice period'
                })

    return sorted(out, key=lambda item: (item['date'], item['page']))

def escape_ics(value):
    return value.replace('\\', '\\\\').replace('\r', '').replace('\n', '\\n').replace(';', '\\;').replace(',', '\\,')

def fold_line(line):
    result, current = [], ''
    for char in line:
        if len((current + char).encode()) > 73:
            result.append(current)
            current = ' '
        current += char
    return '\r\n'.join(result + [current])

def make_calendar(title, renewal, notice_days, description):
    day = renewal - timedelta(days=notice_days)
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fine Print Watchdog//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', f'UID:{uuid.uuid4()}@fineprint.local', 'DTSTAMP:' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'), 'DTSTART;VALUE=DATE:' + day.strftime('%Y%m%d'), 'DTEND;VALUE=DATE:' + (day + timedelta(days=1)).strftime('%Y%m%d'), 'SUMMARY:' + escape_ics(title), 'DESCRIPTION:' + escape_ics(description), 'END:VEVENT', 'END:VCALENDAR']
    return '\r\n'.join(map(fold_line, lines)) + '\r\n'



def document_deadline_candidates(pages):
    """Return date and notice-period candidates independently of AI review."""
    dates = deadline_candidates(pages)
    notice_pattern = re.compile(
        r'(?i)\b(?:notice\s+period|prior\s+notice|give\w*\s+notice|giving|notice\s+of\s+\w+|'
        r'within|at\s+least|not\s+less\s+than)\s*(?:of\s*)?(\d{1,4})\s*'
        r'(calendar\s+days?|business\s+days?|working\s+days?|days?|months?|weeks?)\b'
    )
    notices = []
    seen = set()
    for page in pages:
        for raw_line in page.get('text', '').splitlines():
            line = ' '.join(raw_line.split()).strip()
            if not line or not re.search(r'notice|terminat|renew|cancel|expir|non.?renew', line, re.I):
                continue
            for match in notice_pattern.finditer(line):
                unit = match.group(2).lower()
                key = (match.group(1), unit, line, page.get('page', 1))
                if key in seen:
                    continue
                seen.add(key)
                notices.append({
                    'days': int(match.group(1)) * (30 if unit.startswith('month') else 7 if unit.startswith('week') else 1),
                    'stated_value': int(match.group(1)),
                    'unit': unit,
                    'quote': line,
                    'page': page.get('page', 1),
                    'status': 'candidate only; confirm the unit and whether calendar or business days apply',
                })
    return {'dates': dates, 'notice_periods': notices}


def cost_candidates(pages):
    """Find explicit cost figures with their source lines; never infer missing values."""
    patterns = [
        ('principal', r'(?i)\b(?:loan\s+amount|principal(?:\s+amount)?|amount\s+borrowed|loan\s+principal)\s*(?:is|of|:|=)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)'),
        ('annual_flat_percent', r'(?i)\b(?:annual\s+flat\s+(?:interest\s+)?rate|flat\s+(?:annual\s+)?(?:interest\s+)?rate|interest\s+rate|annual\s+interest\s+rate|APR)\s*(?:is|of|:|=)?\s*(\d+(?:\.\d+)?)\s*%'),
        ('months', r'(?i)\b(?:loan\s+tenure|tenure|repayment\s+period|loan\s+term|term)\s*(?:is|of|:|=)?\s*(\d{1,3})\s*(months?|years?)\b'),
        ('upfront_fee', r'(?i)\b(?:processing\s+fee|upfront\s+fee|origination\s+fee|application\s+fee)\s*(?:is|of|:|=)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)'),
        ('contract_value', r'(?i)\b(?:total\s+contract\s+value|contract\s+value|total\s+value|purchase\s+price|project\s+value)\s*(?:is|of|:|=)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)'),
        ('recurring_payment', r'(?i)\b(?:monthly\s+rent|monthly\s+payment|monthly\s+fee|monthly\s+subscription|monthly\s+charge|rent\s+per\s+month)\s*(?:is|of|:|=)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)'),
        ('penalties', r'(?i)\b(?:penalty|late\s+fee|termination\s+fee|cancellation\s+fee|liquidated\s+damages)\s*(?:is|of|:|=)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)'),
    ]
    candidates = []
    seen = set()
    loan_fields = {'principal', 'annual_flat_percent', 'months', 'upfront_fee'}
    general_fields = {'contract_value', 'recurring_payment', 'penalties', 'upfront_fee'}
    detected = set()
    for page in pages:
        for raw_line in page.get('text', '').splitlines():
            line = ' '.join(raw_line.split()).strip()
            for field, pattern in patterns:
                match = re.search(pattern, line)
                if not match:
                    continue
                try:
                    raw = match.group(1).replace(',', '')
                    value = float(raw)
                    if field == 'months' and match.group(2).lower().startswith('year'):
                        value *= 12
                    if field == 'months': value = int(value)
                except (ValueError, IndexError):
                    continue
                key = (field, value, line, page.get('page', 1))
                if key in seen: continue
                seen.add(key)
                detected.add(field)
                candidates.append({'field': field, 'value': value, 'quote': line, 'page': page.get('page', 1), 'status': 'unconfirmed source candidate'})
    has_loan = bool(detected & loan_fields)
    has_general = bool(detected & general_fields)
    kind = 'mixed' if has_loan and has_general else 'loan' if has_loan else 'contract' if has_general else 'unknown'
    return {'kind': kind, 'candidates': candidates, 'notice': 'Candidates are literal text matches, not verified contract facts. Review each source quotation and apply values manually.'}
