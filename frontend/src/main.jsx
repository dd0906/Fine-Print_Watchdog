import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const apiFieldLabels = {
  principal: 'Principal amount',
  annual_flat_percent: 'Annual flat rate',
  months: 'Loan term',
  upfront_fee: 'Upfront fee',
  document_id: 'Document',
  old_id: 'Original document',
  new_id: 'Revised document',
  renewal_date: 'Renewal date',
  notice_days: 'Notice period',
  title: 'Title',
};

function friendlyValidationIssue(issue) {
  const loc = Array.isArray(issue?.loc) ? issue.loc : [];
  const fieldKey = [...loc].reverse().find(part => typeof part === 'string' && part !== 'body' && part !== 'query' && part !== 'path');
  const label = apiFieldLabels[fieldKey] || (fieldKey ? String(fieldKey).replaceAll('_', ' ') : 'Input');
  const original = String(issue?.msg || 'Invalid value').replace(/^Value error,\s*/i, '').trim();
  const message = original.replace(/^Input should be\s+/i, '').trim();

  if (/fee must be less than 95% of principal/i.test(original)) {
    return 'Upfront fee must be less than 95% of the principal amount.';
  }
  if (/field required/i.test(original)) return `${label} is required.`;
  if (/greater than 0/i.test(message) && !/equal/i.test(message)) return `${label} must be greater than 0.`;
  if (/greater than or equal to 0/i.test(message)) return `${label} must be 0 or greater.`;
  if (/greater than or equal to 1/i.test(message) && fieldKey === 'months') return 'Loan term must be at least 1 month.';
  if (/less than or equal to/i.test(message)) {
    if (fieldKey === 'principal') return 'Principal amount must not exceed Rs 1,000,000,000,000.';
    if (fieldKey === 'annual_flat_percent') return 'Annual flat rate must not exceed 100%.';
    if (fieldKey === 'months') return 'Loan term must not exceed 600 months.';
  }
  if (/valid integer|whole number|integer/i.test(original)) return `${label} must be a whole number.`;
  if (/finite number|nan|infinity/i.test(original)) return `${label} must be a valid finite number.`;
  if (label !== 'Input') return `${label}: ${message.replace(/[.]$/, '')}.`;
  return original;
}

function formatApiError(payload, status) {
  const detail = payload?.detail;
  if (Array.isArray(detail)) {
    const messages = [...new Set(detail.map(friendlyValidationIssue).filter(Boolean))];
    if (messages.length) return messages.join(' ');
    return 'Some input values are invalid. Please check the form and try again.';
  }
  if (typeof detail === 'string' && detail.trim()) {
    if (/fee must be less than 95% of principal/i.test(detail)) return 'Upfront fee must be less than 95% of the principal amount.';
    return detail.trim();
  }
  if (status === 404) return 'The document is no longer available in this browser session. Upload it again to continue.';
  if (status === 413) return 'This file is too large to process. Try a smaller document.';
  if (status === 422) return 'Some input values are invalid. Please check the form and try again.';
  if (status === 401 || status === 403) return 'Access was denied. Check the app access settings and try again.';
  return `Request failed (${status}). Please try again.`;
}

async function api(path, body) {
  const options = body instanceof FormData
    ? { method: 'POST', body }
    : body === undefined
      ? {}
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const response = await fetch(`/api/${path}`, options);
  if (!response.ok) {
    const raw = await response.text();
    let payload = null;
    try { payload = JSON.parse(raw); } catch { payload = { detail: raw }; }
    throw new Error(formatApiError(payload, response.status));
  }
  return response.headers.get('content-type')?.includes('text/calendar')
    ? response.text()
    : response.json();
}

function save(name, data, type = 'application/json') {
  const contents = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function formatRupees(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function printCostReport(inputs, result) {
  const reportWindow = window.open('', '_blank', 'width=900,height=760');
  if (!reportWindow) return false;
  reportWindow.opener = null;
  const generated = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const assumptions = escapeHtml(result.assumptions || 'Calculations use the values entered by the user.');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fine-Print Watchdog — Loan Cost Estimate</title>
<style>
@page{size:A4;margin:17mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#20343b;margin:0;background:#fff;font-size:12px;line-height:1.5}header{border-bottom:3px solid #176b62;padding:0 0 18px;margin-bottom:22px}header .brand{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#176b62;font-weight:700}h1{font-size:25px;line-height:1.2;margin:8px 0;color:#20343b}header p{margin:5px 0 0;color:#62757b}.generated{font-size:10px;color:#72858a;margin-top:8px}.highlight{border:1px solid #d8e8e4;background:#f1f8f6;border-radius:10px;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}.highlight span,.item span{display:block;color:#65797d;font-size:10px;margin-bottom:5px}.highlight strong{font-size:20px;color:#155e55}.section{margin:22px 0}.section h2{font-size:14px;border-bottom:1px solid #dce6e7;padding-bottom:7px;margin:0 0 8px}.row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #edf1f2;padding:9px 0}.row span{color:#65797d}.row strong{text-align:right;font-weight:600}.note{background:#f7f9f9;border-left:3px solid #9abeb7;padding:12px;color:#52666b;font-size:10px}.footer{border-top:1px solid #dce6e7;margin-top:26px;padding-top:12px;color:#829195;font-size:9px}.action{margin:18px 0 0;padding:9px 12px;border:0;border-radius:6px;background:#176b62;color:#fff;font-weight:700}@media print{.action{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<header><div class="brand">Fine-Print Watchdog</div><h1>Loan Cost Estimate</h1><p>A summary of the loan figures you entered and the calculated cash-flow estimate.</p><div class="generated">Generated ${escapeHtml(generated)}</div></header>
<div class="highlight"><div><span>Estimated effective annual rate</span><strong>${escapeHtml(result.effective_annual_percent)}%</strong></div><div><span>Monthly instalment</span><strong>${escapeHtml(formatRupees(result.monthly_payment))}</strong></div></div>
<section class="section"><h2>Loan assumptions</h2>
<div class="row"><span>Principal amount</span><strong>${escapeHtml(formatRupees(inputs.principal))}</strong></div>
<div class="row"><span>Annual flat rate</span><strong>${escapeHtml(Number(inputs.annual_flat_percent).toLocaleString('en-IN'))}%</strong></div>
<div class="row"><span>Loan term</span><strong>${escapeHtml(inputs.months)} month(s)</strong></div>
<div class="row"><span>Upfront fee</span><strong>${escapeHtml(formatRupees(inputs.upfront_fee))}</strong></div></section>
<section class="section"><h2>Calculated results</h2>
<div class="row"><span>Net amount disbursed</span><strong>${escapeHtml(formatRupees(result.net_disbursed))}</strong></div>
<div class="row"><span>Total instalments</span><strong>${escapeHtml(formatRupees(result.total_installments))}</strong></div>
<div class="row"><span>Interest + fee</span><strong>${escapeHtml(formatRupees(result.total_cost_including_fee))}</strong></div>
<div class="row"><span>Estimated effective annual rate</span><strong>${escapeHtml(result.effective_annual_percent)}%</strong></div></section>
<section class="section"><h2>Assumptions and limitations</h2><div class="note">${assumptions}<br><br>This is an estimate based on user-entered information, not a jurisdictional APR, legal determination, or financial recommendation. Confirm all fees, taxes, dates, payment timing, and contract terms with the lender.</div></section>
<div class="footer">Prepared locally by Fine-Print Watchdog. Verify these figures against the original loan offer before making a decision.</div>
<button class="action" onclick="window.print()">Print / Save PDF</button>
<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print()},200)});</script>
</body></html>`;
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  return true;
}


function printReadableReport(title, subtitle, bodyHtml, footerNote) {
  const reportWindow = window.open('', '_blank', 'width=980,height=780');
  if (!reportWindow) return false;
  reportWindow.opener = null;
  const generated = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#20343b;margin:0;background:#fff;font-size:11px;line-height:1.55}header{border-bottom:3px solid #176b62;padding:0 0 16px;margin-bottom:20px}.brand{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#176b62;font-weight:700}h1{font-size:24px;line-height:1.2;margin:8px 0;color:#20343b}header p{margin:5px 0 0;color:#62757b;font-size:12px}.generated{font-size:9px;color:#72858a;margin-top:8px}.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0 22px}.summary-item{border:1px solid #d8e8e4;background:#f4f9f8;border-radius:8px;padding:10px}.summary-item span{display:block;color:#65797d;font-size:9px;margin-bottom:4px}.summary-item strong{font-size:16px;color:#155e55;overflow-wrap:anywhere}.section{margin:20px 0}.section-title{font-size:14px;margin:0 0 9px;border-bottom:1px solid #dce6e7;padding-bottom:6px}.result-card{border:1px solid #dce6e7;border-radius:8px;padding:12px;margin:10px 0;break-inside:avoid}.card-meta{font-size:9px;color:#176b62;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px}.result-card h2{font-size:13px;margin:4px 0 8px}.result-card p{margin:6px 0}.quote{background:#f6f8f8;border-left:3px solid #92bcb4;padding:9px 11px;margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}.question{background:#f4f8f8;padding:9px 11px;border-radius:5px;margin-top:8px}.row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #edf1f2;padding:7px 0}.row span{color:#65797d}.row strong{text-align:right;font-weight:600}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:10px}.change-block{border:1px solid #dce6e7;border-radius:7px;padding:10px;break-inside:avoid}.change-label{font-size:9px;font-weight:700;color:#62757b;text-transform:uppercase;margin-bottom:5px}.change-block pre{font:10px/1.5 Arial,Helvetica,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.removed{border-left:3px solid #c77970}.added{border-left:3px solid #4f9e87}.warning{border-left:3px solid #cc9a46;background:#fff9ef;padding:10px 12px;margin:10px 0;color:#755222;overflow-wrap:anywhere}.notice{border-left:3px solid #92bcb4;background:#f4f8f8;padding:10px 12px;margin:12px 0;color:#52666b}.muted{color:#72858a;font-size:9px}.source-url{font-size:9px;overflow-wrap:anywhere;word-break:break-word}.source-url a{color:#176b62}.footer{border-top:1px solid #dce6e7;margin-top:24px;padding-top:10px;color:#829195;font-size:9px}.action{margin:16px 0 0;padding:9px 12px;border:0;border-radius:6px;background:#176b62;color:#fff;font-weight:700}@media print{.action{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.result-card,.change-block{break-inside:avoid}}
</style></head><body>
<header><div class="brand">Fine-Print Watchdog</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><div class="generated">Generated locally ${escapeHtml(generated)}</div></header>
${bodyHtml}
<div class="footer">${escapeHtml(footerNote || 'Prepared locally by Fine-Print Watchdog. Verify all results against the original documents.')}<br>Prototype output, not legal advice. AI findings and keyword matches are suggestions for human review.</div>
<button class="action" onclick="window.print()">Print / Save PDF</button>
<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print()},250)});</script>
</body></html>`);
  reportWindow.document.close();
  return true;
}

function printReviewReport(documentName, report) {
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const coverage = report?.coverage || {};
  const rejected = Array.isArray(report?.rejected_findings) ? report.rejected_findings : [];
  const failures = Array.isArray(coverage.failures) ? coverage.failures : [];
  const deadlines = Array.isArray(report?.deadlines) ? report.deadlines : [];
  const findingCards = findings.map((finding, index) => {
    const severity = escapeHtml(finding.severity || 'Review');
    const page = finding.evidence?.[0]?.page;
    return `<article class="result-card"><div class="card-meta">Finding ${index + 1} · ${severity}${page ? ` · Source page ${escapeHtml(page)}` : ''}</div><h2>${escapeHtml(finding.title || 'Untitled finding')}</h2><div class="quote">${escapeHtml(finding.quote || 'No source quotation supplied.')}</div><p>${escapeHtml(finding.explanation || '')}</p>${finding.question ? `<div class="question"><strong>Question to clarify</strong><p>${escapeHtml(finding.question)}</p></div>` : ''}</article>`;
  }).join('');
  const warnings = (Array.isArray(report?.warnings) ? report.warnings : []).map(warning => `<li>${escapeHtml(warning)}</li>`).join('');
  const failureHtml = failures.length ? `<div class="warning"><strong>AI coverage incomplete.</strong> ${escapeHtml(coverage.model_chunks_failed ?? failures.length)} passage(s) failed; results may be incomplete.<ul>${failures.map(item => `<li>Chunk ${escapeHtml(item.chunk ?? '?')}, page ${escapeHtml(item.page ?? '?')}: ${escapeHtml(item.error || 'Failure')}</li>`).join('')}</ul></div>` : '';
  const deadlineHtml = deadlines.length ? `<section class="section"><h2 class="section-title">Date candidates — verify against the document</h2>${deadlines.map(item => `<div class="result-card"><div class="card-meta">${escapeHtml(item.status || 'Candidate date')} · Page ${escapeHtml(item.page ?? '—')}</div><h2>${escapeHtml(item.date || '')}</h2><div class="quote">${escapeHtml(item.quote || '')}</div></div>`).join('')}</section>` : '';
  const body = `<div class="summary-grid"><div class="summary-item"><span>Review points</span><strong>${findings.length}</strong></div><div class="summary-item"><span>Quotes rejected</span><strong>${rejected.length}</strong></div><div class="summary-item"><span>AI passages completed</span><strong>${escapeHtml(coverage.model_chunks_completed ?? 0)} / ${escapeHtml(coverage.chunks_total ?? 0)}</strong></div></div>${report?.mode === 'demo' ? '<div class="warning">Demo mode was active. These are checklist results, not hosted AI findings.</div>' : ''}${failureHtml}<section class="section"><h2 class="section-title">Findings and source quotations</h2>${findingCards || '<p>No review points were returned. This does not establish that the document is complete, fair, or safe.</p>'}</section>${deadlineHtml}${warnings ? `<section class="section"><h2 class="section-title">Warnings and limitations</h2><ul>${warnings}</ul></section>` : ''}`;
  return printReadableReport('Document Review Report', `Document: ${documentName}`, body, 'Review every quotation in the original document. A source match confirms text presence only; it does not establish legal effect or completeness.');
}

function printCompareReport(originalName, revisedName, comparison) {
  const changes = Array.isArray(comparison?.changes) ? comparison.changes : [];
  const conflicts = Array.isArray(comparison?.possible_conflicts) ? comparison.possible_conflicts : [];
  const rejected = Array.isArray(comparison?.rejected_conflicts) ? comparison.rejected_conflicts : [];
  const changesHtml = changes.map((change, index) => `<article class="result-card"><div class="card-meta">Change ${index + 1} · ${escapeHtml(change.type || 'modified')} · Original lines ${escapeHtml((change.old_lines || []).join('–') || '—')} · Revised lines ${escapeHtml((change.new_lines || []).join('–') || '—')}</div><div class="two-columns" style="min-width:0;max-width:100%;grid-template-columns:repeat(2,minmax(0,1fr));"><div class="change-block removed"><div class="change-label">Previous wording</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;max-width:100%;box-sizing:border-box;">${escapeHtml(change.before || '(No text)')}</pre></div><div class="change-block added"><div class="change-label">Revised wording</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;max-width:100%;box-sizing:border-box;">${escapeHtml(change.after || '(No text)')}</pre></div></div></article>`).join('');
  const conflictsHtml = conflicts.map((item, index) => `<article class="result-card"><div class="card-meta">Potential conflict ${index + 1}</div><div class="quote"><strong>Original document</strong><br>${escapeHtml(item.quote_a || '')}</div><div class="quote"><strong>Revised document</strong><br>${escapeHtml(item.quote_b || '')}</div><p>${escapeHtml(item.explanation || '')}</p><p class="muted">Verify both quotations in the source documents before relying on this suggestion.</p></article>`).join('');
  const privacy = comparison?.privacy || {};
  const categories = Array.isArray(privacy.categories) ? privacy.categories.join(', ') : 'Not specified';
  const maskedOld = privacy.masked_counts_old && typeof privacy.masked_counts_old === 'object' ? Object.entries(privacy.masked_counts_old).map(([name, count]) => `${escapeHtml(name)}: ${escapeHtml(count)}`).join(' · ') : 'Not available';
  const maskedNew = privacy.masked_counts_new && typeof privacy.masked_counts_new === 'object' ? Object.entries(privacy.masked_counts_new).map(([name, count]) => `${escapeHtml(name)}: ${escapeHtml(count)}`).join(' · ') : 'Not available';
  const body = `<div class="summary-grid"><div class="summary-item"><span>Text changes</span><strong>${changes.length}</strong></div><div class="summary-item"><span>Possible conflicts</span><strong>${conflicts.length}</strong></div><div class="summary-item"><span>Rejected conflict candidates</span><strong>${rejected.length}</strong></div></div>${comparison?.warning ? `<div class="warning">${escapeHtml(comparison.warning)}</div>` : ''}<section class="section"><h2 class="section-title">Document versions</h2><div class="row"><span>Original / current</span><strong>${escapeHtml(originalName)}</strong></div><div class="row"><span>Revised version</span><strong>${escapeHtml(revisedName)}</strong></div></section><section class="section"><h2 class="section-title">Text changes</h2>${changesHtml || '<p>No text changes detected in the extracted text.</p>'}</section><section class="section"><h2 class="section-title">Possible conflicts</h2>${conflictsHtml || '<p>No possible conflicts were returned. This is not a guarantee that there are no inconsistencies.</p>'}</section><section class="section"><h2 class="section-title">Privacy masking summary</h2><p><strong>Selected categories:</strong> ${escapeHtml(categories)}</p><p><strong>Original document masked counts:</strong> ${maskedOld}</p><p><strong>Revised document masked counts:</strong> ${maskedNew}</p><p class="muted">${escapeHtml(privacy.notice || 'Masking is pattern-based and only applies to selected categories.')}</p></section><div class="notice">${escapeHtml(comparison?.note || 'Differences are not necessarily contradictions or unagreed changes. Review context and both original documents.')}</div>`;
  return printReadableReport('Document Comparison Report', `${originalName} compared with ${revisedName}`, body, 'Differences and conflict suggestions require human interpretation. Confirm all quotations and changes against both source documents.');
}

function printPolicyReport(policyScan) {
  const matches = Array.isArray(policyScan?.matches) ? policyScan.matches : [];
  const cards = matches.map((item, index) => {
    const terms = Array.isArray(item.matched_terms) ? item.matched_terms.join(', ') : '';
    const sourceUrl = String(item.source_url || '');
    const sourceLink = sourceUrl ? `<p class="source-url"><strong>Official source:</strong> <a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>` : '<p class="source-url">Official source URL not provided.</p>';
    return `<article class="result-card"><div class="card-meta">Reference ${index + 1} · ${escapeHtml(item.category || 'Uncategorised')} · ${escapeHtml(item.signal || 'Keyword signal')}</div><h2>${escapeHtml(item.title || 'Untitled reference')}</h2><p>${escapeHtml(item.summary || '')}</p><p><strong>Matched text signals:</strong> ${escapeHtml(terms || 'None listed')}</p><p><strong>Authority:</strong> ${escapeHtml(item.authority || 'Not specified')}</p><p><strong>Scope check:</strong> ${escapeHtml(item.applicability || 'Check the official source for current scope and applicability.')}</p>${sourceLink}</article>`;
  }).join('');
  const warnings = (Array.isArray(policyScan?.warnings) ? policyScan.warnings : []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const body = `<div class="summary-grid"><div class="summary-item"><span>Potentially relevant references</span><strong>${escapeHtml(policyScan?.matched_count ?? matches.length)}</strong></div><div class="summary-item"><span>Catalogue references</span><strong>${escapeHtml(policyScan?.catalogue_count ?? '—')}</strong></div><div class="summary-item"><span>Catalogue checked on</span><strong>${escapeHtml(policyScan?.catalogue_checked_on || '—')}</strong></div></div><div class="notice"><strong>Research leads, not legal conclusions.</strong> Keyword matches do not establish that a law applies, that a clause is unlawful, or that a document complies. The catalogue may be incomplete.</div><p>${escapeHtml(policyScan?.matching_method || 'Matching uses literal keywords in extracted text.')}</p><section class="section"><h2 class="section-title">Potentially relevant references</h2>${cards || '<p>No keyword signals were found. That does not mean the document has no legal or regulatory issues.</p>'}</section>${warnings ? `<section class="section"><h2 class="section-title">Warnings and limitations</h2><ul>${warnings}</ul></section>` : ''}`;
  return printReadableReport('India Policy Lens — Matching Report', `Document: ${policyScan?.document_name || 'Selected document'}`, body, 'Verify current amendments, commencement, territorial scope, exceptions, and official sources. This report is a starting point for research, not legal advice.');
}

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.1-8 10-4.6-1.9-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    review: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    compare: <><path d="M8 4H4v16h4M16 4h4v16h-4M9 8h6M9 12h6M9 16h6"/></>,
    calculator: <><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8v4H8zM8 14h1M12 14h1M16 14h.01M8 17h1M12 17h1M16 17h.01"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 17v3h16v-3"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16h.01"/></>,
    sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    landmark: <><path d="M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M2 21h20M12 3 2 8h20L12 3Z"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

const navigation = [
  { label: 'Review', icon: 'review', description: 'AI-assisted clause review' },
  { label: 'Compare', icon: 'compare', description: 'Find changes between versions' },
  { label: 'Cost calculator', icon: 'calculator', description: 'Estimate the real cost' },
  { label: 'Deadlines', icon: 'calendar', description: 'Export a notice-date event' },
  { label: 'India Policy Lens', icon: 'landmark', description: 'Find potentially relevant Indian laws and official guidance' },
];

const pageCopy = {
  Review: { eyebrow: 'DOCUMENT REVIEW', title: 'Review a contract', description: 'Identify clauses worth a closer look, with source quotations you can verify.' },
  Compare: { eyebrow: 'VERSION COMPARISON', title: 'Compare documents', description: 'Inspect exact text changes and review potential conflicts between versions.' },
  'Cost calculator': { eyebrow: 'COST ANALYSIS', title: 'Understand the real cost', description: 'Calculate instalments and an effective annual rate from figures you confirm.' },
  Deadlines: { eyebrow: 'NOTICE PLANNING', title: 'Keep important dates visible', description: 'Calculate a calendar-day notice date and export an event to your calendar.' },
  'India Policy Lens': { eyebrow: 'INDIAN LAW & REGULATORY REFERENCES', title: 'Explore relevant Indian laws', description: 'Find official government and regulator sources that may be relevant to your document.' },
};

const privacyCategoryOptions = [
  { id: 'email', label: 'Email addresses' },
  { id: 'phone', label: 'Indian phone numbers' },
  { id: 'pan', label: 'PAN-like identifiers' },
  { id: 'aadhaar', label: 'Aadhaar-like number patterns' },
  { id: 'ifsc', label: 'IFSC codes' },
  { id: 'bank_account', label: 'Account numbers near account labels' },
];
const defaultPrivacyCategories = privacyCategoryOptions.map(item => item.id);

function App() {
  const [health, setHealth] = useState(null);
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState('');
  const [other, setOther] = useState('');
  const [tab, setTab] = useState(() => {
    try {
      const savedTab = window.sessionStorage.getItem('fine-print-watchdog.activeTab');
      return navigation.some(item => item.label === savedTab) ? savedTab : 'Review';
    } catch {
      return 'Review';
    }
  });
  const [language, setLanguage] = useState('English');
  const [report, setReport] = useState(null);
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState(null);
  const [cost, setCost] = useState(null);
  const [loan, setLoan] = useState({ principal: '', annual_flat_percent: '', months: '', upfront_fee: '' });
  const [costMode, setCostMode] = useState('loan');
  const [costCandidates, setCostCandidates] = useState(null);
  const [contractCost, setContractCost] = useState({ contract_value: '', recurring_payment: '', recurring_periods: '', upfront_charges: '', penalties: '' });
  const [cal, setCal] = useState({ title: '', renewal_date: '', notice_days: '', description: '', confirmed: false });
  const [deadlineScan, setDeadlineScan] = useState(null);
  const [showText, setShowText] = useState(false);
  const [policyCatalogue, setPolicyCatalogue] = useState(null);
  const [policyScan, setPolicyScan] = useState(null);
  const [policySearch, setPolicySearch] = useState('');
  const [webResearchQuery, setWebResearchQuery] = useState('');
  const [webResearchResults, setWebResearchResults] = useState(null);
  const [webResearchLoading, setWebResearchLoading] = useState(false);
  const [webResearchError, setWebResearchError] = useState('');
  const [policyCategory, setPolicyCategory] = useState('All categories');
  const [privacyScan, setPrivacyScan] = useState(null);
  const [privacyScanError, setPrivacyScanError] = useState('');
  const [privacyCategories, setPrivacyCategories] = useState(defaultPrivacyCategories);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { api('health').then(setHealth).catch(e => setError(e.message)); }, []);
  useEffect(() => { api('policies').then(setPolicyCatalogue).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = event => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!selected) { setPrivacyScan(null); setPrivacyScanError(''); return undefined; }
    let cancelled = false;
    setPrivacyScan(null);
    setPrivacyScanError('');
    api('privacy/scan', { document_id: selected })
      .then(result => { if (!cancelled) setPrivacyScan(result); })
      .catch(e => { if (!cancelled) setPrivacyScanError(e.message); });
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    if (!selected || (tab !== 'Deadlines' && tab !== 'Cost calculator')) return undefined;
    let cancelled = false;
    const path = tab === 'Deadlines' ? 'deadlines' : 'cost-candidates';
    api(path, { document_id: selected })
      .then(result => {
        if (cancelled) return;
        if (tab === 'Deadlines') setDeadlineScan(result);
        else {
          setCostCandidates(result);
          setCostMode(result.kind === 'loan' || result.kind === 'contract' ? result.kind : 'loan');
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [selected, tab]);

  const current = docs.find(doc => doc.id === selected);
  const copy = pageCopy[tab];
  const mode = health?.mode || '';
  const isDemo = mode.toLowerCase() === 'demo';

  async function run(fn) {
    setBusy(true);
    setError('');
    try { await fn(); }
    catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  async function upload(file, compareSlot = '') {
    if (!file) return;
    await run(async () => {
      const form = new FormData();
      form.append('file', file);
      const doc = await api('documents', form);
      setDocs(items => [...items, doc]);

      if (compareSlot === 'original') {
        setSelected(doc.id);
        setOther(previous => previous === doc.id ? '' : previous);
      } else if (compareSlot === 'revised') {
        setOther(doc.id);
      } else {
        setSelected(doc.id);
      }

      setReport(null);
      setDiff(null);
      setCost(null);
      setCostCandidates(null);
      setDeadlineScan(null);
      setLoan({ principal: '', annual_flat_percent: '', months: '', upfront_fee: '' });
      setContractCost({ contract_value: '', recurring_payment: '', recurring_periods: '', upfront_charges: '', penalties: '' });
      setCal({ title: '', renewal_date: '', notice_days: '', description: '', confirmed: false });
      setSource(null);
      setPolicyScan(null);
      setShowText(false);
    });
  }

  function selectDocument(id) {
    setSelected(id);
    setReport(null);
    setDiff(null);
    setCost(null);
    setCostCandidates(null);
    setDeadlineScan(null);
    setLoan({ principal: '', annual_flat_percent: '', months: '', upfront_fee: '' });
    setContractCost({ contract_value: '', recurring_payment: '', recurring_periods: '', upfront_charges: '', penalties: '' });
    setCal({ title: '', renewal_date: '', notice_days: '', description: '', confirmed: false });
    setSource(null);
    setPolicyScan(null);
    setShowText(false);
    setOther(previous => previous === id ? '' : previous);
  }

  async function deleteCurrent() {
    if (!selected) return;
    await run(async () => {
      const response = await fetch(`/api/documents/${selected}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete the document.');
      setDocs(items => items.filter(doc => doc.id !== selected));
      setSelected('');
      setReport(null);
      setDiff(null);
      setCost(null);
      setCostCandidates(null);
      setDeadlineScan(null);
      setLoan({ principal: '', annual_flat_percent: '', months: '', upfront_fee: '' });
      setContractCost({ contract_value: '', recurring_payment: '', recurring_periods: '', upfront_charges: '', penalties: '' });
      setCal({ title: '', renewal_date: '', notice_days: '', description: '', confirmed: false });
      setSource(null);
      setPolicyScan(null);
      setOther('');
    });
  }

  function showEvidence(finding) {
    const match = finding.evidence?.[0];
    if (!current || !match) { setSource(null); return; }
    const page = current.pages?.find(item => item.page === match.page);
    if (!page) {
      setSource({ page: match.page, text: 'The extracted source page is unavailable in the current document view.', start: 0, end: 0 });
      return;
    }
    setSource({ page: match.page, text: page.text, start: match.start, end: match.end });
  }

  function changeTab(label) {
    // Preserve only the selected section across refreshes; forms start blank each time they are opened.
    try { window.sessionStorage.setItem('fine-print-watchdog.activeTab', label); } catch {}
    if (label === 'Cost calculator') {
      setCost(null);
      setLoan({ principal: '', annual_flat_percent: '', months: '', upfront_fee: '' });
      setContractCost({ contract_value: '', recurring_payment: '', recurring_periods: '', upfront_charges: '', penalties: '' });
      setCostCandidates(null);
    }
    if (label === 'Deadlines') {
      setCal({ title: '', renewal_date: '', notice_days: '', description: '', confirmed: false });
      setDeadlineScan(null);
    }
    setTab(label);
    setError('');
    setSource(null);
    setSidebarOpen(false);
  }

  async function scanIndianPolicies() {
    if (!selected) return;
    await run(async () => {
      setPolicyScan(null);
      setPolicyScan(await api('policies/match', { document_id: selected }));
    });
  }

  function togglePrivacyCategory(category) {
    setPrivacyCategories(previous => previous.includes(category)
      ? previous.filter(item => item !== category)
      : [...previous, category]);
    setReport(null);
    setDiff(null);
  }

  async function searchWebResearch(event) {
    event.preventDefault();
    const query = webResearchQuery.trim();
    if (!query || webResearchLoading) return;

    setWebResearchLoading(true);
    setWebResearchError('');
    setWebResearchResults(null);

    try {
      const result = await api('research', { query, max_results: 5 });
      setWebResearchResults(result);
    } catch (error) {
      setWebResearchError(error.message || 'Web research failed. Please try again.');
    } finally {
      setWebResearchLoading(false);
    }
  }

  const policyItems = policyCatalogue?.items || [];
  const matchingPolicyIds = new Set((policyScan?.matches || []).map(item => item.id));
  const visiblePolicyItems = policyItems.filter(item => {
    const query = policySearch.trim().toLowerCase();
    const text = `${item.title} ${item.summary} ${item.category} ${item.authority}`.toLowerCase();
    return (!query || text.includes(query)) && (policyCategory === 'All categories' || item.category === policyCategory);
  });

  return (
    <div className="app-shell">
      <aside id="app-navigation" className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-hidden={!sidebarOpen}>
        <div className="brand-lockup">
          <div className="brand-mark"><img className="brand-mark-image" src="/watchdog-mark.png" alt="" aria-hidden="true" /></div>
          <div className="brand-name">Fine-Print <span>Watchdog</span></div>
          <button className="drawer-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation menu" tabIndex={sidebarOpen ? 0 : -1}><Icon name="close" size={19} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(item => (
            <button key={item.label} className={`nav-item ${tab === item.label ? 'active' : ''}`} onClick={() => changeTab(item.label)} tabIndex={sidebarOpen ? 0 : -1} aria-current={tab === item.label ? 'page' : undefined}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {tab === item.label && <span className="nav-active-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status-icon"><Icon name={isDemo ? 'info' : 'sparkles'} size={18} /></div>
          <div className="sidebar-status-copy">
            <strong>{health ? (isDemo ? 'Demo mode' : `${mode.charAt(0).toUpperCase()}${mode.slice(1)} inference`) : 'Connecting to app'}</strong>
            <span>{health ? (isDemo ? 'AI calls are disabled' : 'Nemotron is configured') : 'Checking configuration…'}</span>
          </div>
          <span className={`status-dot ${health ? (isDemo ? 'warning' : 'online') : ''}`} />
          <p>Source matching verifies quotation presence, not legal conclusions.</p>
        </div>
        <div className="sidebar-footer"><span>FINE-PRINT WATCHDOG</span><span>Prototype workspace</span></div>
      </aside>
      {sidebarOpen && <button className="drawer-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation menu" />}

      <main className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu" aria-expanded={sidebarOpen} aria-controls="app-navigation"><Icon name="menu" size={20} /></button>
            <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={13} /><strong>{tab}</strong></div>
          </div>
          <div className="topbar-right">
            <span className={`connection-badge ${health && !isDemo ? 'connected' : ''}`}><span className="status-dot" />{health ? (isDemo ? 'Demo environment' : 'Nemotron configured') : 'Connecting…'}</span>
            <span className="workspace-avatar" title="Fine-Print Watchdog"><img src="/favicon.png" alt="" aria-hidden="true" /></span>
          </div>
        </div>

        <header className="page-header">
          <div>
            <div className="eyebrow">{copy.eyebrow}</div>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <div className="header-note"><Icon name="shield" size={18} /><span>Evidence-first<br /><strong>review workflow</strong></span></div>
        </header>

        {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={19} /><div><strong>Something needs attention</strong><p>{error}</p></div><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {busy && <div className="alert alert-progress" role="status"><span className="spinner" /><div><strong>Working on your request</strong><p>Longer documents may take a little time to review.</p></div></div>}

        <section className={`upload-panel ${current ? 'has-document' : ''}`}>
          <div className="upload-icon"><Icon name={current ? 'file' : 'upload'} size={22} /></div>
          <div className="upload-copy">
            <div className="upload-title">{current ? 'Active document' : 'Start with a document'}</div>
            <div className="upload-subtitle">{current ? current.name : 'Upload a contract, agreement, or brochure to get started.'}</div>
            <div className="upload-meta">TXT, MD, text PDF or DOCX <span>·</span> up to 8 MB <span>·</span> no OCR</div>
          </div>
          {current && <div className="document-count"><strong>{(current.characters || 0).toLocaleString()}</strong><span>characters</span></div>}
          <label className="button button-primary upload-button"><Icon name="upload" size={16} />{current ? 'Upload another' : 'Choose document'}<input type="file" accept=".txt,.md,.pdf,.docx" disabled={busy} onChange={event => { upload(event.target.files[0]); event.target.value = ''; }} /></label>
        </section>

        <section className="document-toolbar" aria-label="Document settings">
          <label className="field document-field"><span>Current document</span><div className="select-wrap"><Icon name="file" size={16} /><select value={selected} disabled={busy} onChange={event => selectDocument(event.target.value)}><option value="">Select uploaded document</option>{docs.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></div></label>
          {(tab === 'Review' || tab === 'Compare') && <label className="field language-field"><span>Explanation language</span><select value={language} disabled={busy} onChange={event => setLanguage(event.target.value)}>{['English', 'German', 'Spanish', 'French', 'Italian', 'Japanese'].map(item => <option key={item}>{item}</option>)}</select></label>}
          {current && <div className="document-toolbar-actions"><span className="selected-status"><Icon name="check" size={14} /> Document ready</span><button className="text-button danger-text" disabled={busy} onClick={deleteCurrent}><Icon name="trash" size={15} />Remove</button></div>}
        </section>

        {current?.warnings?.map((warning, index) => <div className="alert alert-warning" key={index}><Icon name="info" size={18} /><p>{warning}</p></div>)}

        {current && (tab === 'Review' || tab === 'Compare') && <section className="privacy-shield" aria-labelledby="privacy-shield-title">
          <div className="privacy-shield-header">
            <span className="privacy-shield-icon"><Icon name="shield" size={20} /></span>
            <div className="privacy-shield-heading">
              <h2 id="privacy-shield-title">Privacy Shield</h2>
              <p>Choose which detected patterns to mask before text is sent to the external AI provider. Compare applies these choices to both versions.</p>
            </div>
            <span className={`privacy-status ${privacyCategories.length ? '' : 'privacy-status-warning'}`}><span className={`status-dot ${privacyCategories.length ? 'online' : 'warning'}`} />{privacyCategories.length ? 'Masking enabled' : 'Select a category'}</span>
          </div>
          {privacyScanError ? <div className="privacy-inline-warning"><Icon name="alert" size={16} /> Could not scan for sensitive patterns: {privacyScanError}. AI actions are still protected by the selected server-side masking rules.</div> : !privacyScan ? <div className="privacy-scan-loading"><span className="spinner" /> Checking the extracted text for common sensitive patterns…</div> : <>
            <div className="privacy-count-line"><strong>{privacyScan.total_matches} possible match{privacyScan.total_matches === 1 ? '' : 'es'} detected</strong><span>Current document only · preview obscures detected values; checked categories control masking sent to AI.</span></div>
            <div className="privacy-category-grid">
              {privacyCategoryOptions.map(item => {
                const scanCategory = privacyScan.categories?.find(category => category.id === item.id);
                return <label className="privacy-category-option" key={item.id}>
                  <input type="checkbox" checked={privacyCategories.includes(item.id)} onChange={() => togglePrivacyCategory(item.id)} disabled={busy} />
                  <span className="privacy-checkbox-mark"><Icon name="check" size={12} /></span>
                  <span className="privacy-category-copy"><strong>{item.label}</strong><small>{scanCategory?.count ?? 0} possible match{scanCategory?.count === 1 ? '' : 'es'}</small></span>
                </label>;
              })}
            </div>
            {privacyCategories.length === 0 && <div className="privacy-inline-warning"><Icon name="alert" size={16} /> Select at least one category before running Review or Compare.</div>}
            {privacyScan.examples?.length > 0 && <details className="privacy-examples"><summary>Example excerpts (detected values obscured)</summary><div>{privacyScan.examples.slice(0, 5).map((example, index) => <p key={`${example.page}-${example.category}-${index}`}><span>Page {example.page} · {privacyCategoryOptions.find(item => item.id === example.category)?.label || example.category}</span><code>{example.preview}</code></p>)}</div></details>}
          </>}
          <p className="privacy-disclaimer"><Icon name="info" size={14} /> Selected patterns are masked in Review and AI-powered Compare requests. This is best-effort—not a guarantee that all personal data is detected. Names, addresses, handwriting and image-only/scanned PDFs may not be covered. The original file is still uploaded to this application server.</p>
        </section>}

        <div className="workspace-content">
          {tab === 'Review' && <>
            <div className="section-heading-row">
              <div><h2>Document review</h2><p>Model suggestions are paired with source evidence for your verification.</p></div>
              <button className="button button-primary" disabled={!current || busy || privacyCategories.length === 0} onClick={() => run(async () => { setReport(null); setSource(null); setReport(await api('analyze', { document_id: selected, language, privacy_categories: privacyCategories })); })}><Icon name="sparkles" size={16} />{busy ? 'Reviewing…' : 'Review document'}</button>
            </div>
            {current && <div className="extract-panel">
              <button className="extract-toggle" onClick={() => setShowText(value => !value)} aria-expanded={showText}><span className="extract-icon"><Icon name="eye" size={17} /></span><span><strong>Extracted text</strong><small>{(current.characters || 0).toLocaleString()} characters extracted for review</small></span><span className="extract-chevron"><Icon name="chevron" size={16} /></span></button>
              {showText && <div className="extracted-pages">{current.pages?.map(page => <div className="extracted-page" key={page.page}><strong>Page {page.page}</strong><pre>{page.text}</pre></div>)}</div>}
            </div>}
            {!current && <EmptyState icon="upload" title="Your review starts here" body="Choose a document above, then run a review to see potential concerns and their supporting source text." hint="For a quick test, use samples/contract_v1.txt." />}
            {report && <>
              <div className="metric-grid">
                <Metric icon="review" label="Review points" value={report.findings?.length ?? 0} accent="teal" />
                <Metric icon="alert" label="Quotes rejected" value={report.rejected_findings?.length ?? 0} accent="amber" />
                <Metric icon="check" label="AI passages completed" value={`${report.coverage?.model_chunks_completed ?? 0}/${report.coverage?.chunks_total ?? 0}`} accent="blue" />
              </div>
              {report.mode === 'demo' && <div className="alert alert-warning"><Icon name="info" size={18} /><p>Demo mode uses keyword checklists only. Nemotron analysis is disabled.</p></div>}
              {(report.coverage?.failures?.length || 0) > 0 && <div className="alert alert-error"><Icon name="alert" size={18} /><div><strong>{report.coverage?.status === 'failed' ? 'AI review failed' : 'AI coverage is incomplete'}</strong><p>{report.coverage.model_chunks_failed ?? report.coverage.failures.length} of {report.coverage.chunks_total} passage(s) failed. {report.coverage?.status === 'failed' ? 'Any checklist findings shown below are not AI findings.' : 'Some passages may be missing from the AI review.'} Review the failure details and retry before relying on these results.</p><pre>{JSON.stringify(report.coverage.failures, null, 2)}</pre></div></div>}
              <div className="results-toolbar"><div><h2>Findings and evidence</h2><p>Review each suggestion in context before acting on it.</p></div><button className="button button-secondary" title="Opens a formatted report. Choose Save as PDF in the print dialog." onClick={() => { if (!printReviewReport(current?.name || 'Selected document', report)) setError('Your browser blocked the report window. Allow pop-ups for this local app, then try again.'); }}><Icon name="download" size={16} />Print / Save PDF</button></div>
              {report.findings?.length === 0 ? <EmptyState icon="check" title="No review points returned" body="This does not establish that the contract is complete, fair, or safe." /> : <div className="review-layout">
                <div className="finding-list">{report.findings.map((finding, index) => <FindingCard key={`${finding.title}-${index}`} finding={finding} onSource={() => showEvidence(finding)} />)}</div>
                <aside className="evidence-panel">
                  <div className="panel-heading"><span className="panel-icon"><Icon name="search" size={17} /></span><div><h3>Source evidence</h3><p>Check the original wording</p></div></div>
                  {source ? <><div className="evidence-meta"><span className="evidence-dot" />Page {source.page}<span>·</span>Extracted text</div><pre>{source.text.slice(0, source.start)}<mark>{source.text.slice(source.start, source.end)}</mark>{source.text.slice(source.end)}</pre><div className="evidence-note"><Icon name="info" size={15} />Quote presence is checked mechanically; interpretation still needs review.</div></> : <div className="evidence-empty"><div className="evidence-empty-icon"><Icon name="search" size={22} /></div><strong>No quote selected</strong><p>Select “View source” on a finding to see the matched text in context.</p></div>}
                </aside>
              </div>}
              {report.warnings?.map((warning, index) => <p className="inline-note" key={index}><Icon name="info" size={14} />{warning}</p>)}
            </>}
          </>}

          {tab === 'Compare' && <>
            <div className="section-heading-row"><div><h2>Compare versions</h2><p>Choose the original document above and the revised version below.</p></div></div>
            <div className="compare-setup compare-setup-upload">
              <div className="version-box">
                <span className="version-label"><span className="version-number">01</span> ORIGINAL DOCUMENT</span>
                <strong>{current?.name || 'No original document selected'}</strong>
                <small>{current ? `${(current.characters || 0).toLocaleString()} characters` : 'Upload the original version below'}</small>
                <label className="button button-secondary compare-upload-button">
                  <Icon name="upload" size={16} />{current ? 'Replace original' : 'Upload original'}
                  <input type="file" accept=".txt,.md,.pdf,.docx" disabled={busy} onChange={event => { upload(event.target.files[0], 'original'); event.target.value = ''; }} />
                </label>
                <label className="field compare-library-select"><span>Or choose an uploaded document</span><select value={selected} onChange={event => { selectDocument(event.target.value); }} disabled={busy}><option value="">Choose original document</option>{docs.filter(doc => doc.id !== other).map(doc => <option value={doc.id} key={doc.id}>{doc.name}</option>)}</select></label>
              </div>

              <div className="compare-arrow"><Icon name="compare" size={19} /></div>

              <div className="version-box revised-box">
                <span className="version-label"><span className="version-number second">02</span> REVISED DOCUMENT</span>
                <strong>{docs.find(doc => doc.id === other)?.name || 'No revised document selected'}</strong>
                <small>{docs.find(doc => doc.id === other) ? `${(docs.find(doc => doc.id === other).characters || 0).toLocaleString()} characters` : 'Upload the revised version below'}</small>
                <label className="button button-secondary compare-upload-button">
                  <Icon name="upload" size={16} />{other ? 'Replace revised' : 'Upload revised'}
                  <input type="file" accept=".txt,.md,.pdf,.docx" disabled={busy} onChange={event => { upload(event.target.files[0], 'revised'); event.target.value = ''; }} />
                </label>
                <label className="field compare-library-select"><span>Or choose an uploaded document</span><select value={other} onChange={event => { setOther(event.target.value); setDiff(null); }} disabled={busy}><option value="">Choose revised document</option>{docs.filter(doc => doc.id !== selected).map(doc => <option value={doc.id} key={doc.id}>{doc.name}</option>)}</select></label>
              </div>

              <button className="button button-primary compare-run" disabled={!current || !docs.some(doc => doc.id === other && doc.id !== selected) || busy || privacyCategories.length === 0} onClick={() => run(async () => { setDiff(null); setDiff(await api('compare', { old_id: selected, new_id: other, language, privacy_categories: privacyCategories })); })}><Icon name="compare" size={16} />Compare versions</button>
            </div>
            {!current && <EmptyState icon="compare" title="Select two documents to begin" body="Upload both versions, choose the original as the current document, then select the revised version." />}
            {diff && <>
              {diff.note && <div className="alert alert-info"><Icon name="info" size={18} /><p>{diff.note}</p></div>}
              {diff.warning && <div className="alert alert-warning"><Icon name="alert" size={18} /><p>{diff.warning}</p></div>}
              <div className="results-toolbar"><div><h2>Text changes <span className="count-pill">{diff.changes?.length ?? 0}</span></h2><p>Removed wording is on the left; added wording is on the right.</p></div><button className="button button-secondary" title="Opens a formatted comparison report. Choose Save as PDF in the print dialog." onClick={() => { if (!printCompareReport(current?.name || 'Original document', docs.find(doc => doc.id === other)?.name || 'Revised document', diff)) setError('Your browser blocked the report window. Allow pop-ups for this local app, then try again.'); }}><Icon name="download" size={16} />Print / Save PDF</button></div>
              {diff.changes?.length ? <div className="change-list">{diff.changes.map((change, index) => <article className="change-card" key={index}><div className="change-card-top"><span className={`change-type ${String(change.type).toLowerCase()}`}>{change.type}</span><span className="change-index">Change {String(index + 1).padStart(2, '0')}</span></div><div className="change-columns" style={{minWidth:0,maxWidth:"100%",gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}><div className="change-side removed"><span><span className="change-symbol">−</span> Previous wording</span><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",wordBreak:"normal",maxWidth:"100%",boxSizing:"border-box"}}>{change.before || '(No text)'}</pre></div><div className="change-side added"><span><span className="change-symbol">+</span> Revised wording</span><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",wordBreak:"normal",maxWidth:"100%",boxSizing:"border-box"}}>{change.after || '(No text)'}</pre></div></div></article>)}</div> : <EmptyState icon="check" title="No text changes detected" body="The extracted text appears identical for the comparison performed." />}
              <div className="results-toolbar conflict-heading"><div><h2>Possible conflicts <span className="count-pill">{diff.mode === 'demo' ? 0 : (diff.possible_conflicts?.length ?? 0)}</span></h2><p>Potential inconsistencies require human interpretation.</p></div></div>
              {diff.mode === 'demo' ? <div className="alert alert-warning"><Icon name="info" size={18} /><p>AI conflict analysis is unavailable in demo mode. Exact text comparison is still shown above.</p></div> : diff.possible_conflicts?.length ? <div className="conflict-list">{diff.possible_conflicts.map((conflict, index) => <article className="conflict-card" key={index}><div className="change-card-top"><span className="conflict-label"><Icon name="alert" size={15} />Possible conflict</span><span className="change-index">Item {index + 1}</span></div><div className="conflict-quotes"><blockquote><span>Document 1</span>{conflict.quote_a}</blockquote><blockquote><span>Document 2</span>{conflict.quote_b}</blockquote></div><p>{conflict.explanation}</p><small>Both quotes matched their respective source documents. Interpretation needs review.</small></article>)}</div> : <div className="soft-empty">No possible conflicts were returned for this comparison.</div>}
            </>}
          </>}

          {tab === 'Cost calculator' && <>
            <div className="section-heading-row"><div><h2>Document cost calculator</h2><p>Scan the selected document for explicit figures. Nothing is filled in automatically; apply only the candidates you verify.</p></div><span className="assumption-pill"><Icon name="info" size={14} />Unconfirmed until applied</span></div>
            {!current && <EmptyState icon="file" title="Select a document first" body="Upload or select a document to scan it for loan or contract-cost figures. You can still enter values manually after selecting a document." />}
            {current && <>
              <div className="candidate-panel"><div className="candidate-header"><div><h3>Figures detected in the document</h3><p>{costCandidates?.document_name ? `Scanned: ${costCandidates.document_name}` : 'Scanning selected document…'} Values below are suggestions only.</p></div><button className="button button-secondary small-button" disabled={busy} onClick={() => run(async () => setCostCandidates(await api('cost-candidates', { document_id: selected })))}><Icon name="search" size={14} />Scan again</button></div>
                {costCandidates?.candidates?.length ? costCandidates.candidates.map((item, index) => <article className="deadline-candidate" key={`${item.field}-${item.page}-${index}`}><div className="candidate-date"><Icon name="file" size={17} /><strong>{({principal:'Loan principal',annual_flat_percent:'Interest rate',months:'Loan term',upfront_fee:'Upfront fee',contract_value:'Contract value',recurring_payment:'Recurring payment',penalties:'Penalty or fee'})[item.field] || item.field}: {Number(item.value).toLocaleString()}</strong><span>Page {item.page}</span></div><blockquote>{item.quote}</blockquote><div className="candidate-bottom"><small>{item.status}</small><button className="button button-secondary small-button" onClick={() => { if (['principal','annual_flat_percent','months','upfront_fee'].includes(item.field)) { setCostMode('loan'); setLoan(previous => ({...previous, [item.field]: String(item.value)})); } else { setCostMode('contract'); setContractCost(previous => ({...previous, [({contract_value:'contract_value',recurring_payment:'recurring_payment',penalties:'penalties'})[item.field] || 'upfront_charges']: String(item.value)})); } setCost(null); }}>Apply value</button></div></article>) : costCandidates ? <p className="inline-note"><Icon name="info" size={14} />No supported cost figures were detected. You can enter figures manually, or try a text-based PDF, DOCX, TXT or MD document.</p> : null}
                {costCandidates?.kind === 'mixed' && <p className="inline-note"><Icon name="info" size={14} />This document contains both loan-related and general contract-cost signals. Choose the calculator type that matches the transaction you want to estimate.</p>}
                {costCandidates?.notice && <p className="inline-note"><Icon name="info" size={14} />{costCandidates.notice}</p>}
              </div>
              <label className="field cost-mode-field"><span>Calculator type</span><select value={costMode} onChange={event => { setCostMode(event.target.value); setCost(null); }}><option value="loan">Loan / financing</option><option value="contract">General contract costs</option></select></label>
              {costMode === 'loan' ? <section className="calculator-card"><div className="form-grid">{Object.keys(loan).map(key => <label className="field" key={key}><span>{({ principal: 'Principal amount (₹)', annual_flat_percent: 'Annual flat interest rate (%)', months: 'Loan term (months)', upfront_fee: 'Upfront fee (₹)' })[key]}</span><div className="input-affix"><input type="number" min="0" step={key === 'annual_flat_percent' ? '0.01' : 'any'} value={loan[key]} onChange={event => { setCost(null); setLoan({ ...loan, [key]: event.target.value }); }} placeholder="Enter value" /><span>{key === 'annual_flat_percent' ? '%' : key === 'months' ? 'mo' : '₹'}</span></div></label>)}</div><div className="calculator-actions"><p><Icon name="info" size={15} />Requires principal, interest rate and term. Missing fees are treated as zero only after you calculate.</p><button className="button button-primary" disabled={busy || loan.principal === '' || loan.annual_flat_percent === '' || loan.months === '' || Number(loan.principal) <= 0 || Number(loan.months) <= 0 || Object.values(loan).some(value => value !== '' && Number(value) < 0)} onClick={() => run(async () => setCost(await api('calculate', { principal: Number(loan.principal), annual_flat_percent: Number(loan.annual_flat_percent), months: Number(loan.months), upfront_fee: loan.upfront_fee === '' ? 0 : Number(loan.upfront_fee) })))}><Icon name="calculator" size={16} />Calculate loan cost</button></div></section> : <section className="calculator-card"><div className="form-grid">{Object.keys(contractCost).map(key => <label className="field" key={key}><span>{({contract_value:'Contract value (₹)',recurring_payment:'Recurring payment per period (₹)',recurring_periods:'Number of payment periods',upfront_charges:'Upfront charges (₹)',penalties:'Known penalties / fees (₹)'})[key]}</span><div className="input-affix"><input type="number" min="0" step="any" value={contractCost[key]} placeholder="Enter value" onChange={event => { setCost(null); setContractCost({...contractCost,[key]:event.target.value}); }} /><span>{key === 'recurring_periods' ? 'periods' : '₹'}</span></div></label>)}</div><div className="calculator-actions"><p><Icon name="info" size={15} />The estimate adds the contract value, entered recurring payments, upfront charges and known penalties. Leave a field blank if unknown; it will count as zero.</p><button className="button button-primary" disabled={busy || !Object.values(contractCost).some(value => value !== '' && Number(value) > 0)} onClick={() => run(async () => { const payload = Object.fromEntries(Object.entries(contractCost).map(([key, value]) => [key, value === '' ? 0 : Number(value)])); setCost(await api('calculate-contract', payload)); })}><Icon name="calculator" size={16} />Calculate contract cost</button></div></section>}
              {cost && <><div className="results-toolbar"><div><h2>Calculation results</h2><p>Computed only from the values entered above.</p></div><button className="button button-secondary" onClick={() => { const printable = costMode === 'loan' ? printCostReport(loan, cost) : printReadableReport('Contract Cost Estimate', current.name, `<div class="summary-grid"><div class="summary-item"><span>Estimated total</span><strong>₹${escapeHtml(Number(cost.estimated_total).toLocaleString())}</strong></div><div class="summary-item"><span>Recurring total</span><strong>₹${escapeHtml(Number(cost.recurring_total).toLocaleString())}</strong></div></div><p>${escapeHtml(cost.assumptions)}</p>`, 'Estimate only. Check the full agreement and all exclusions.'); if (!printable) setError('Your browser blocked the report window. Allow pop-ups and try again.'); }}><Icon name="download" size={16} />Print / Save PDF</button></div>
                {costMode === 'loan' ? <><div className="metric-grid cost-metrics"><Metric icon="calculator" label="Effective annual rate" value={`${cost.effective_annual_percent}%`} accent="teal" featured /><Metric icon="calendar" label="Monthly payment" value={Number(cost.monthly_payment).toLocaleString(undefined, { maximumFractionDigits: 2 })} accent="blue" /><Metric icon="file" label="Interest + fee" value={Number(cost.total_cost_including_fee).toLocaleString(undefined, { maximumFractionDigits: 2 })} accent="amber" /></div><section className="cost-summary"><div><span>Net amount disbursed</span><strong>{Number(cost.net_disbursed).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div><div><span>Total instalments</span><strong>{Number(cost.total_installments).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div></section></> : <div className="metric-grid cost-metrics"><Metric icon="calculator" label="Estimated total cost" value={`₹${Number(cost.estimated_total).toLocaleString(undefined, {maximumFractionDigits:2})}`} accent="teal" featured /><Metric icon="calendar" label="Recurring payments total" value={`₹${Number(cost.recurring_total).toLocaleString(undefined, {maximumFractionDigits:2})}`} accent="blue" /><Metric icon="file" label="Other entered costs" value={`₹${Number(cost.known_costs_total).toLocaleString(undefined, {maximumFractionDigits:2})}`} accent="amber" /></div>}
                <div className="alert alert-info"><Icon name="info" size={18} /><p>{cost.assumptions} This is an estimate, not legal, tax or financial advice.</p></div></>}
            </>}
          </>}

          {tab === 'India Policy Lens' && <>
            <div className="section-heading-row policy-section-heading">
              <div><h2>India Policy Lens</h2><p>Search a curated catalogue of central laws, rules and regulator guidance, or look for literal keyword signals in the selected document.</p></div>
              <button className="button button-primary" disabled={!current || busy} onClick={scanIndianPolicies}><Icon name="landmark" size={16} />{busy ? 'Checking…' : 'Match current document'}</button>
            </div>
            <div className="policy-notice"><span className="policy-notice-icon"><Icon name="info" size={18} /></span><div><strong>Research leads, not legal conclusions</strong><p>The matcher checks extracted text for literal keywords. A match does not establish that a law applies, that a clause is unlawful, or that a document complies. The catalogue is curated and incomplete; State/UT laws, rules, Gazette notifications, amendments and sector-specific requirements may be missing.</p></div></div>
            <section className="policy-research-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Research the web</h2>
                  <p>Search for additional legal and regulatory sources using Tavily. Verify findings against official sources.</p>
                </div>
              </div>
              <form onSubmit={searchWebResearch} className="policy-filter-bar">
                <label className="field policy-search-field">
                  <span>Research question</span>
                  <div className="policy-search-wrap">
                    <Icon name="search" size={16} />
                    <input
                      type="search"
                      value={webResearchQuery}
                      onChange={event => setWebResearchQuery(event.target.value)}
                      placeholder="e.g. Indian data protection laws for businesses"
                      required
                    />
                  </div>
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={webResearchLoading || !webResearchQuery.trim()}
                >
                  {webResearchLoading ? 'Researching...' : 'Search the web'}
                </button>
              </form>
              {webResearchError && <div className="alert alert-info" role="alert"><Icon name="alert" size={18} /><p>{webResearchError}</p></div>}
              {webResearchLoading && <p className="inline-note">Searching for relevant sources...</p>}
              {webResearchResults && (() => {
                const results = Array.isArray(webResearchResults)
                  ? webResearchResults
                  : webResearchResults.results || webResearchResults.items || [];
                return results.length ? (
                  <div className="policy-list">
                    {results.map((item, index) => (
                      <article className="policy-card" key={item.url || item.link || index}>
                        <h3>{item.title || item.url || item.link || `Result ${index + 1}`}</h3>
                        <p className="policy-summary">{item.content || item.snippet || item.description || 'No summary available.'}</p>
                        {(item.url || item.link) && <div className="policy-source-row">
                          <span>{item.source || 'Web source'}</span>
                          <a href={item.url || item.link} target="_blank" rel="noopener noreferrer">Open source <Icon name="chevron" size={14} /></a>
                        </div>}
                      </article>
                    ))}
                  </div>
                ) : <EmptyState icon="search" title="No results returned" body="Try a more specific question." />;
              })()}
            </section>
            <div className="policy-catalogue-meta"><span><Icon name="landmark" size={15} />{policyCatalogue ? `${policyCatalogue.count} references` : 'Loading catalogue…'}</span><span>Source review date: {policyCatalogue?.checked_on || '—'}</span><span>Official government / regulator links</span></div>

            {policyScan && <>
              <div className="results-toolbar policy-results-heading"><div><h2>Potentially relevant references <span className="count-pill">{policyScan.matched_count}</span></h2><p>For {policyScan.document_name}. Matches are based only on literal keywords in extracted text.</p></div><button className="button button-secondary" title="Opens a formatted policy matching report. Choose Save as PDF in the print dialog." onClick={() => { if (!printPolicyReport(policyScan)) setError('Your browser blocked the report window. Allow pop-ups for this local app, then try again.'); }}><Icon name="download" size={16} />Print / Save PDF</button></div>
              <div className="policy-method-note"><Icon name="search" size={15} />{policyScan.matching_method}</div>
              {policyScan.matches.length ? <div className="policy-list">{policyScan.matches.map(item => <article className="policy-card policy-card-match" key={item.id}>
                <div className="policy-card-top"><span className="policy-category">{item.category}</span><span className="policy-signal">{item.signal}</span></div>
                <h3>{item.title}</h3><p className="policy-summary">{item.summary}</p>
                <div className="policy-terms"><strong>Matched text signals</strong><div>{item.matched_terms.map(term => <span className="policy-term" key={term}>{term}</span>)}</div></div>
                <p className="policy-applicability"><strong>Scope check:</strong> {item.applicability}</p>
                <div className="policy-source-row"><span>{item.authority}</span><a href={item.source_url} target="_blank" rel="noreferrer">Open official source <Icon name="chevron" size={14} /></a></div>
              </article>)}</div> : <EmptyState icon="search" title="No keyword signals found" body="That does not mean the document has no legal or regulatory issues. Browse the catalogue and check provisions against the actual transaction." />}
              {policyScan.warnings?.map((warning, index) => <p className="inline-note" key={index}><Icon name="info" size={14} />{warning}</p>)}
            </>}
            <div className="results-toolbar policy-browse-heading"><div><h2>Browse the source catalogue</h2><p>Use search and categories to locate potentially relevant official references.</p></div></div>
            <div className="policy-filter-bar">
              <label className="field policy-search-field"><span>Search catalogue</span><div className="policy-search-wrap"><Icon name="search" size={16} /><input type="search" value={policySearch} onChange={event => setPolicySearch(event.target.value)} placeholder="e.g. personal data, refund, lease, loan…" /></div></label>
              <label className="field policy-category-field"><span>Category</span><select value={policyCategory} onChange={event => setPolicyCategory(event.target.value)}><option>All categories</option>{(policyCatalogue?.categories || []).map(category => <option key={category}>{category}</option>)}</select></label>
              <span className="policy-result-count">Showing {visiblePolicyItems.length} of {policyItems.length}</span>
            </div>
            <div className="policy-list">{visiblePolicyItems.map(item => <article className={`policy-card ${matchingPolicyIds.has(item.id) ? 'policy-card-match' : ''}`} key={item.id}>
              <div className="policy-card-top"><span className="policy-category">{item.category}</span>{matchingPolicyIds.has(item.id) ? <span className="policy-signal">Keyword match</span> : <span className="policy-kind">{item.kind}</span>}</div>
              <h3>{item.title}</h3><p className="policy-summary">{item.summary}</p>
              <p className="policy-applicability"><strong>Scope check:</strong> {item.applicability}</p>
              <div className="policy-source-row"><span>{item.authority}</span><a href={item.source_url} target="_blank" rel="noreferrer">Open official source <Icon name="chevron" size={14} /></a></div>
            </article>)}</div>
            {!visiblePolicyItems.length && <EmptyState icon="search" title="No references found" body="Try a different search phrase or select All categories." />}
          </>}

          {tab === 'Deadlines' && <>
            <div className="section-heading-row"><div><h2>Build a calendar event</h2><p>Verify the renewal date and notice period before confirming the reminder date.</p></div><span className="assumption-pill"><Icon name="calendar" size={14} />Calendar-day calculation</span></div>
            {!current && <EmptyState icon="calendar" title="Select a document first" body="Upload or select a document to scan it for explicit dates and notice periods." />}
            {current && <section className="candidate-panel"><div className="candidate-header"><div><h3>Detected date and notice-period candidates</h3><p>{deadlineScan?.document_name ? `Scanned: ${deadlineScan.document_name}` : 'Scanning selected document…'} Nothing is added to the reminder until you choose it.</p></div><button className="button button-secondary small-button" disabled={busy} onClick={() => run(async () => setDeadlineScan(await api('deadlines', { document_id: selected })))}><Icon name="search" size={14} />Scan again</button></div>
              {deadlineScan?.dates?.map((deadline, index) => <article className="deadline-candidate" key={`date-${index}`}><div className="candidate-date"><Icon name="calendar" size={17} /><strong>{deadline.date}</strong><span>Page {deadline.page}</span></div><blockquote>{deadline.quote}</blockquote><div className="candidate-bottom"><small>{deadline.status}</small><button className="button button-secondary small-button" onClick={() => setCal(previous => ({ ...previous, renewal_date: deadline.date, description: deadline.quote, confirmed: false }))}>Apply date</button></div></article>)}
              {deadlineScan?.notice_periods?.map((notice, index) => <article className="deadline-candidate" key={`notice-${index}`}><div className="candidate-date"><Icon name="calendar" size={17} /><strong>Notice period: {notice.stated_value} {notice.unit}</strong><span>Page {notice.page}</span></div><blockquote>{notice.quote}</blockquote><div className="candidate-bottom"><small>{notice.status}</small><button className="button button-secondary small-button" onClick={() => setCal(previous => ({ ...previous, notice_days: String(notice.days), description: [previous.description, notice.quote].filter(Boolean).join('\n'), confirmed: false }))}>Apply notice period</button></div></article>)}
              {deadlineScan && !deadlineScan.dates?.length && !deadlineScan.notice_periods?.length && <p className="inline-note"><Icon name="info" size={14} />No supported date or notice-period candidates were found. Check the document text manually.</p>}</section>}
            <section className="deadline-card">
              <div className="deadline-card-head"><div className="deadline-icon"><Icon name="calendar" size={22} /></div><div><h3>Reminder details</h3><p>Confirm the inputs to enable calendar export.</p></div></div>
              <div className="form-grid deadline-grid">
                <label className="field field-wide"><span>Reminder title</span><input value={cal.title} onChange={event => setCal({ ...cal, title: event.target.value, confirmed: false })} placeholder="e.g. Send cancellation notice" /></label>
                <label className="field"><span>Renewal or expiry date</span><input type="date" value={cal.renewal_date} onChange={event => setCal({ ...cal, renewal_date: event.target.value, confirmed: false })} /></label>
                <label className="field"><span>Notice period (calendar days)</span><input type="number" min="0" value={cal.notice_days} onChange={event => setCal({ ...cal, notice_days: event.target.value, confirmed: false })} placeholder="Enter days" /></label>
                <label className="field field-wide"><span>Notes (optional)</span><textarea value={cal.description} onChange={event => setCal({ ...cal, description: event.target.value })} rows="3" placeholder="Add context or a source quote…" /></label>
              </div>
              <label className="confirmation-check"><input type="checkbox" checked={cal.confirmed} onChange={event => setCal({ ...cal, confirmed: event.target.checked })} /><span className="fake-check"><Icon name="check" size={13} /></span><span><strong>I have verified the renewal date and notice period.</strong><small>Contract exceptions, business-day rules, and jurisdiction-specific requirements must be checked separately.</small></span></label>
              <div className="deadline-actions"><p><Icon name="info" size={15} />Exports an importable event. It does not automatically schedule a notification.</p><button className="button button-primary" disabled={!cal.confirmed || !cal.renewal_date || !cal.title.trim() || cal.notice_days === '' || Number(cal.notice_days) < 0 || busy} onClick={() => run(async () => save('notice-deadline.ics', await api('calendar', cal), 'text/calendar'))}><Icon name="download" size={16} />Download calendar event</button></div>
            </section>
          </>}
        </div>

        <footer className="app-footer"><div className="footer-mark"><img src="/watchdog-mark.png" alt="" aria-hidden="true" /></div><div><strong>Handle documents thoughtfully</strong><span>Files are held in server memory until deleted or the server restarts. Hosted mode sends extracted text to your configured provider.</span></div><span className="footer-disclaimer">Prototype · Not legal advice</span></footer>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, accent = 'teal', featured = false }) {
  return <div className={`metric-card accent-${accent} ${featured ? 'featured' : ''}`}><div className="metric-top"><span className="metric-icon"><Icon name={icon} size={17} /></span><span>{label}</span></div><strong className="metric-value">{value}</strong></div>;
}

function FindingCard({ finding, onSource }) {
  const severity = String(finding.severity || 'Review').toLowerCase().replace(/[^a-z]+/g, '-');
  return <article className="finding-card">
    <div className="finding-card-meta"><span className="finding-origin">{finding.origin || 'Model finding'}</span><span className={`severity-badge severity-${severity}`}>{finding.severity || 'Review'}</span></div>
    <h3>{finding.title}</h3>
    <blockquote>{finding.quote}</blockquote>
    <p className="finding-explanation">{finding.explanation}</p>
    {finding.question && <div className="question-note"><strong>Question to clarify</strong><p>{finding.question}</p></div>}
    <button className="source-link" onClick={onSource}><Icon name="search" size={15} />View source <span>· page {finding.evidence?.[0]?.page ?? '—'}</span><Icon name="chevron" size={14} /></button>
  </article>;
}

function EmptyState({ icon = 'file', title, body, hint }) {
  return <div className="empty-state"><div className="empty-state-icon"><Icon name={icon} size={24} /></div><h3>{title}</h3><p>{body}</p>{hint && <span>{hint}</span>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);