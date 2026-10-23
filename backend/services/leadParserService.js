/**
 * Lead Parser Service for Aflix Infotech CRM
 * Handles RFC 4180-compliant CSV parsing, text-based PDF extraction,
 * formula injection prevention, normalization, and duplicate detection.
 */

// Helper to normalize phone numbers (digits only)
const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

// Email validation regex (RFC 5322 compatible)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

// Canonical CRM fields
const VALID_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

// Common header alias dictionary for automated mapping
const HEADER_ALIASES = {
    name: [
        'name', 'fullname', 'full_name', 'full name',
        'leadname', 'lead_name', 'lead name',
        'contactname', 'contact_name', 'contact name',
        'contact', 'lead', 'client name', 'client'
    ],
    email: [
        'email', 'emailaddress', 'email_address', 'email address',
        'workemail', 'work_email', 'work email',
        'e_mail', 'e-mail', 'mail'
    ],
    phone: [
        'phone', 'phonenumber', 'phone_number', 'phone number',
        'mobile', 'mobilenumber', 'mobile_number', 'mobile number',
        'contactnumber', 'contact_number', 'contact number',
        'tel', 'telephone', 'cell'
    ],
    company: [
        'company', 'companyname', 'company_name', 'company name',
        'organization', 'org', 'business', 'account', 'employer', 'firm'
    ],
    source: [
        'source', 'leadsource', 'lead_source', 'lead source',
        'channel', 'origin', 'medium'
    ],
    status: [
        'status', 'stage', 'leadstatus', 'lead_status', 'lead status',
        'pipeline stage', 'pipeline_stage'
    ],
    priority: [
        'priority', 'urgency', 'leadpriority', 'lead_priority', 'lead priority'
    ],
    budget: [
        'budget', 'dealsize', 'deal_size', 'deal size', 'amount', 'value'
    ],
    serviceInterested: [
        'service', 'serviceinterested', 'service_interested', 'service interested',
        'interested in', 'interested_in', 'product', 'requirement'
    ],
    notes: [
        'notes', 'description', 'comments', 'remarks', 'memo', 'details'
    ]
};

/**
 * Protect against CSV Formula Injection when exporting/displaying
 * Values starting with =, +, -, @, \t, \r are prepended with a single quote
 */
function sanitizeFormulaInjection(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed.length > 0 && /^[=+\-@\t\r]/.test(trimmed)) {
        return `'${trimmed}`;
    }
    return value;
}

/**
 * Robust RFC 4180-compliant CSV parser
 * Supports:
 * - UTF-8 with / without BOM (\uFEFF)
 * - Quoted fields with escaped quotes ("")
 * - Commas and newlines inside quoted fields
 * - Trimming and empty line skipping
 */
function parseCsvContent(csvString) {
    if (!csvString || typeof csvString !== 'string') {
        return { headers: [], rows: [] };
    }

    // Strip UTF-8 BOM if present
    let content = csvString;
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    let i = 0;
    const len = content.length;

    while (i < len) {
        const char = content[i];
        const nextChar = i + 1 < len ? content[i + 1] : null;

        if (insideQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped quote ("")
                    currentCell += '"';
                    i += 2;
                    continue;
                } else {
                    // End of quoted value
                    insideQuotes = false;
                    i++;
                    continue;
                }
            } else {
                currentCell += char;
                i++;
                continue;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
                i++;
                continue;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
                i++;
                continue;
            } else if (char === '\r') {
                if (nextChar === '\n') {
                    i++; // skip \r in CRLF
                }
                currentRow.push(currentCell.trim());
                currentCell = '';
                // Only add non-empty rows
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                i++;
                continue;
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                currentCell = '';
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                i++;
                continue;
            } else {
                currentCell += char;
                i++;
                continue;
            }
        }
    }

    // Trailing cell/row
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
        }
    }

    if (rows.length === 0) {
        return { headers: [], rows: [] };
    }

    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    return { headers, rows: dataRows };
}

/**
 * Detect automatic column mapping between CSV headers and CRM fields
 */
function detectColumnMapping(headers) {
    const mapping = {}; // { [csvHeader]: crmField }
    const usedFields = new Set();

    headers.forEach(header => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [crmField, aliases] of Object.entries(HEADER_ALIASES)) {
            if (usedFields.has(crmField)) continue;
            const isMatch = aliases.some(alias => {
                const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normalized === normAlias || normalized.includes(normAlias);
            });
            if (isMatch) {
                mapping[header] = crmField;
                usedFields.add(crmField);
                break;
            }
        }
        if (!mapping[header]) {
            mapping[header] = 'ignore';
        }
    });

    return mapping;
}

/**
 * Extract text from PDF buffer using pdf-parse safely
 */
async function extractTextFromPdf(buffer) {
    if (!buffer || buffer.length === 0) {
        return '';
    }

    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        return data.text || '';
    } else if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        try {
            const data = await parser.getText();
            return data.text || '';
        } finally {
            if (parser.destroy) {
                await parser.destroy();
            }
        }
    }

    throw new Error('Installed PDF parser does not provide getText interface');
}

/**
 * Parse text extracted from PDF into structured candidate lead records
 */
function parsePdfTextToLeads(text) {
    if (!text || typeof text !== 'string') {
        return { leads: [], isScanned: true, warning: 'Empty document' };
    }

    const cleanText = text.replace(/\r/g, '').trim();
    // Check if document has insufficient text or appears to be a scanned image
    const alphanumericCount = (cleanText.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphanumericCount < 20) {
        return {
            leads: [],
            isScanned: true,
            warning: 'The uploaded PDF appears to be scanned or contains only images. Lead extraction requires a text-based PDF or an OCR-processed document.'
        };
    }

    // First, normalize line breaks and handle tab-separated fields/key-values
    const rawLines = cleanText.split('\n');
    const lines = [];
    for (const rawLine of rawLines) {
        if (rawLine.includes('\t') && (rawLine.includes(':') || rawLine.includes('|'))) {
            // Tab-separated tokens
            const tokens = rawLine.split('\t').map(t => t.trim()).filter(Boolean);
            lines.push(...tokens);
        } else {
            const trimmed = rawLine.trim();
            if (trimmed) lines.push(trimmed);
        }
    }
    const candidateLeads = [];

    // Helper regex
    const emailFinder = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneFinder = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;

    // Strategy 1: Delimited lines (pipes | or commas , or tabs \t)
    const delimitedRows = [];
    for (const line of lines) {
        if (line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2) delimitedRows.push(parts);
        } else if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length >= 2) delimitedRows.push(parts);
        }
    }

    if (delimitedRows.length >= 2) {
        // Use first row as headers if it contains words like 'name' or 'email'
        const headerRow = delimitedRows[0].map(h => h.toLowerCase());
        const hasHeader = headerRow.some(h => h.includes('name') || h.includes('email') || h.includes('phone') || h.includes('contact'));
        const startIndex = hasHeader ? 1 : 0;
        const mapping = hasHeader ? detectColumnMapping(delimitedRows[0]) : {};

        for (let i = startIndex; i < delimitedRows.length; i++) {
            const row = delimitedRows[i];
            const lead = {};
            if (hasHeader) {
                row.forEach((val, idx) => {
                    const header = delimitedRows[0][idx];
                    const field = mapping[header];
                    if (field && field !== 'ignore') {
                        lead[field] = val;
                    }
                });
            } else {
                // Heuristic positioning: Name, Company, Email, Phone
                row.forEach(val => {
                    if (emailFinder.test(val) && !lead.email) {
                        lead.email = val.match(emailFinder)[0];
                    } else if (phoneFinder.test(val) && normalizePhone(val).length >= 7 && !lead.phone) {
                        lead.phone = val;
                    } else if (!lead.name) {
                        lead.name = val;
                    } else if (!lead.company) {
                        lead.company = val;
                    }
                });
            }

            if (lead.name || lead.email) {
                candidateLeads.push(lead);
            }
        }
    }

    // Strategy 2: Key-Value / Section based extraction (Name: ..., Email: ...)
    if (candidateLeads.length === 0) {
        let currentLead = null;
        for (const line of lines) {
            const lower = line.toLowerCase();
            const kvMatch = line.match(/^([a-zA-Z\s]+)[:=](.+)$/);

            if (kvMatch) {
                const key = kvMatch[1].trim().toLowerCase();
                const val = kvMatch[2].trim();

                if (key.includes('name') && !key.includes('company')) {
                    if (currentLead && (currentLead.name || currentLead.email)) {
                        candidateLeads.push(currentLead);
                    }
                    currentLead = { name: val };
                    continue;
                }

                if (!currentLead) currentLead = {};

                if (key.includes('company') || key.includes('organization') || key.includes('firm')) {
                    currentLead.company = val;
                } else if (key.includes('email') || key.includes('mail')) {
                    const em = val.match(emailFinder);
                    if (em) currentLead.email = em[0];
                } else if (key.includes('phone') || key.includes('mobile') || key.includes('tel')) {
                    currentLead.phone = val;
                } else if (key.includes('status') || key.includes('stage')) {
                    currentLead.status = val;
                } else if (key.includes('priority')) {
                    currentLead.priority = val;
                } else if (key.includes('service') || key.includes('product')) {
                    currentLead.serviceInterested = val;
                } else if (key.includes('notes') || key.includes('comment')) {
                    currentLead.notes = val;
                }
            } else if (emailFinder.test(line)) {
                if (!currentLead) currentLead = {};
                if (!currentLead.email) {
                    currentLead.email = line.match(emailFinder)[0];
                }
            }
        }

        if (currentLead && (currentLead.name || currentLead.email)) {
            candidateLeads.push(currentLead);
        }
    }

    // Strategy 3: Unstructured blocks with emails
    if (candidateLeads.length === 0) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const emailMatch = line.match(emailFinder);
            if (emailMatch) {
                const email = emailMatch[0];
                const prevLine = i > 0 ? lines[i - 1] : '';
                const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

                let name = '';
                let phone = '';
                let company = '';

                // Check prevLine for name (if not containing email/phone)
                if (prevLine && !emailFinder.test(prevLine) && prevLine.length < 50) {
                    name = prevLine.replace(/^[-•*]\s*/, '');
                }

                // Check current or nextLine for phone
                const phoneInLine = line.match(phoneFinder);
                const phoneInNext = nextLine.match(phoneFinder);

                if (phoneInLine && normalizePhone(phoneInLine[0]).length >= 7) {
                    phone = phoneInLine[0];
                } else if (phoneInNext && normalizePhone(phoneInNext[0]).length >= 7) {
                    phone = phoneInNext[0];
                }

                if (!name) {
                    // Fallback name from email prefix
                    name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }

                candidateLeads.push({
                    name,
                    email,
                    phone,
                    company
                });
            }
        }
    }

    if (candidateLeads.length === 0) {
        return {
            leads: [],
            isScanned: false,
            warning: 'Could not automatically identify lead records in this PDF. Please ensure the document contains contact names, emails, or tables.'
        };
    }

    return {
        leads: candidateLeads,
        isScanned: false,
        warning: null
    };
}

/**
 * Validates a single lead record and normalizes canonical values
 */
function validateAndNormalizeRecord(rawRecord, rowNumber) {
    const errors = [];
    const warnings = [];

    const name = rawRecord.name ? String(rawRecord.name).trim() : '';
    const email = rawRecord.email ? String(rawRecord.email).trim().toLowerCase() : '';
    const rawPhone = rawRecord.phone ? String(rawRecord.phone).trim() : '';
    const normPhone = normalizePhone(rawPhone);
    const company = rawRecord.company ? String(rawRecord.company).trim() : '';
    const source = rawRecord.source ? String(rawRecord.source).trim() : 'Import';
    const notes = rawRecord.notes ? String(rawRecord.notes).trim() : '';
    const budget = rawRecord.budget ? String(rawRecord.budget).trim() : '₹1,00,000 - ₹5,00,000';
    const serviceInterested = rawRecord.serviceInterested ? String(rawRecord.serviceInterested).trim() : 'Web Development';

    // Status normalization
    let status = 'New';
    if (rawRecord.status) {
        const matchedStatus = VALID_STATUSES.find(s => s.toLowerCase() === String(rawRecord.status).trim().toLowerCase());
        status = matchedStatus || 'New';
    }

    // Priority normalization
    let priority = 'Medium';
    if (rawRecord.priority) {
        const matchedPriority = VALID_PRIORITIES.find(p => p.toLowerCase() === String(rawRecord.priority).trim().toLowerCase());
        priority = matchedPriority || 'Medium';
    }

    // Required Field Validation
    if (!name) {
        errors.push('Lead name is required');
    }

    // Email format validation
    if (email && !EMAIL_REGEX.test(email)) {
        errors.push(`Invalid email format: "${email}"`);
    }

    // Phone format validation
    if (rawPhone && normPhone.length < 7) {
        warnings.push(`Phone number "${rawPhone}" has fewer than 7 digits`);
    }

    // Formula injection check on string values
    const safeName = sanitizeFormulaInjection(name);
    const safeCompany = sanitizeFormulaInjection(company);
    const safeNotes = sanitizeFormulaInjection(notes);

    return {
        rowNumber,
        isValid: errors.length === 0,
        errors,
        warnings,
        data: {
            name: safeName,
            email,
            phone: rawPhone,
            normalizedPhone: normPhone,
            company: safeCompany,
            source,
            status,
            priority,
            budget,
            serviceInterested,
            notes: safeNotes
        }
    };
}

module.exports = {
    normalizePhone,
    EMAIL_REGEX,
    VALID_STATUSES,
    VALID_PRIORITIES,
    HEADER_ALIASES,
    sanitizeFormulaInjection,
    parseCsvContent,
    detectColumnMapping,
    extractTextFromPdf,
    parsePdfTextToLeads,
    validateAndNormalizeRecord
};
