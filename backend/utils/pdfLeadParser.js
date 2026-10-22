const pdfParse = require('pdf-parse');

/**
 * Normalizes phone numbers to digits only
 */
const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

/**
 * Standardize Priority
 */
const normalizePriority = (raw) => {
    if (!raw) return 'Medium';
    const lower = String(raw).toLowerCase().trim();
    if (lower.includes('urgent')) return 'Urgent';
    if (lower.includes('high')) return 'High';
    if (lower.includes('low')) return 'Low';
    return 'Medium';
};

/**
 * Standardize Status
 */
const normalizeStatus = (raw) => {
    if (!raw) return 'New';
    const lower = String(raw).toLowerCase().trim();
    if (lower.includes('won') || lower.includes('close')) return 'Won';
    if (lower.includes('lost')) return 'Lost';
    if (lower.includes('prop')) return 'Proposal';
    if (lower.includes('qual')) return 'Qualified';
    if (lower.includes('contact')) return 'Contacted';
    return 'New';
};

/**
 * Parse raw text into structured lead objects
 */
function parseTextToLeads(text) {
    if (!text || typeof text !== 'string') return [];

    const leads = [];
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Strategy 1: Check if text has distinct blocks separated by "Lead", numbered items, or horizontal rules
    const blockSplitter = /(?:\n\s*(?:---+|===+|___+|\*\*\*+)\s*\n)|(?:\n\s*(?:Lead|Contact)\s*#?\d*[:\s-]+)|(?:\n\s*\d+\.\s+)/i;
    let rawBlocks = normalizedText.split(blockSplitter).map(b => b.trim()).filter(b => b.length > 10);

    // If only 1 block or none, try splitting by double newlines
    if (rawBlocks.length <= 1) {
        const doubleNewlineBlocks = normalizedText.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 15);
        if (doubleNewlineBlocks.length > 1) {
            rawBlocks = doubleNewlineBlocks;
        } else {
            // Check for tabular lines (each line has email or pipe delimiter)
            const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            const tabularLines = lines.filter(l => l.includes('|') || l.includes('\t') || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(l));
            if (tabularLines.length > 1) {
                rawBlocks = tabularLines;
            } else {
                rawBlocks = [normalizedText.trim()];
            }
        }
    }

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;

    for (const block of rawBlocks) {
        // Check if block has tabular delimiter: e.g. Name | Company | Email | Phone
        if (block.includes('|') || block.includes('\t')) {
            const parts = block.split(/[|\t]/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
                let name = '';
                let company = '';
                let email = '';
                let phone = '';
                let service = 'Web Development';
                let budget = '₹1,00,000 - ₹5,00,000';
                let priority = 'Medium';
                let status = 'New';
                let notes = '';

                parts.forEach((part) => {
                    if (emailRegex.test(part) && !email) {
                        email = part.match(emailRegex)[1].toLowerCase();
                    } else if (phoneRegex.test(part) && !phone) {
                        phone = part.match(phoneRegex)[0];
                    } else if (/[₹$]|inr|\d+k|\d+l/i.test(part) && budget === '₹1,00,000 - ₹5,00,000') {
                        budget = part;
                    } else if (/urgent|high|medium|low/i.test(part)) {
                        priority = normalizePriority(part);
                    } else if (/new|contacted|qualified|proposal|won|lost/i.test(part)) {
                        status = normalizeStatus(part);
                    } else if (!name) {
                        name = part;
                    } else if (!company) {
                        company = part;
                    } else if (!service || service === 'Web Development') {
                        service = part;
                    } else {
                        notes += (notes ? ' ' : '') + part;
                    }
                });

                if (name || email || phone) {
                    leads.push({
                        name: name || (email ? email.split('@')[0] : 'Unknown Contact'),
                        company: company || '',
                        email: email || '',
                        phone: phone || '',
                        serviceInterested: service || 'Web Development',
                        budget: budget || '₹1,00,000 - ₹5,00,000',
                        priority: priority || 'Medium',
                        status: status || 'New',
                        notes: notes || '',
                        source: 'PDF Upload'
                    });
                    continue;
                }
            }
        }

        // Labeled key-value extraction
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        const leadObj = {
            name: '',
            company: '',
            email: '',
            phone: '',
            serviceInterested: 'Web Development',
            budget: '₹1,00,000 - ₹5,00,000',
            priority: 'Medium',
            status: 'New',
            notes: '',
            source: 'PDF Upload'
        };

        let hasSpecificLabels = false;

        lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            const kvMatch = line.match(/^([^:]+):\s*(.*)$/);

            if (kvMatch) {
                const key = kvMatch[1].trim().toLowerCase();
                const val = kvMatch[2].trim();

                if (key.includes('name') || key === 'contact' || key === 'client') {
                    leadObj.name = val;
                    hasSpecificLabels = true;
                } else if (key.includes('company') || key.includes('organization') || key === 'org') {
                    leadObj.company = val;
                    hasSpecificLabels = true;
                } else if (key.includes('email') || key === 'mail') {
                    const m = val.match(emailRegex);
                    leadObj.email = (m ? m[1] : val).toLowerCase();
                    hasSpecificLabels = true;
                } else if (key.includes('phone') || key.includes('mobile') || key === 'tel') {
                    leadObj.phone = val;
                    hasSpecificLabels = true;
                } else if (key.includes('service') || key.includes('project') || key.includes('requirement')) {
                    leadObj.serviceInterested = val;
                    hasSpecificLabels = true;
                } else if (key.includes('budget') || key.includes('value') || key.includes('amount') || key.includes('deal')) {
                    leadObj.budget = val;
                    hasSpecificLabels = true;
                } else if (key.includes('priority')) {
                    leadObj.priority = normalizePriority(val);
                    hasSpecificLabels = true;
                } else if (key.includes('status') || key.includes('stage')) {
                    leadObj.status = normalizeStatus(val);
                    hasSpecificLabels = true;
                } else if (key.includes('note') || key.includes('desc') || key.includes('comment')) {
                    leadObj.notes += (leadObj.notes ? '\n' : '') + val;
                    hasSpecificLabels = true;
                }
            } else {
                // Not a direct "key: value", try regex matching
                if (!leadObj.email && emailRegex.test(line)) {
                    leadObj.email = line.match(emailRegex)[1].toLowerCase();
                } else if (!leadObj.phone && phoneRegex.test(line)) {
                    leadObj.phone = line.match(phoneRegex)[0];
                } else if (!leadObj.name && lines.length <= 4 && !/^[0-9+() -]+$/.test(line)) {
                    leadObj.name = line;
                } else {
                    leadObj.notes += (leadObj.notes ? ' ' : '') + line;
                }
            }
        });

        // If no name but has email, use email username
        if (!leadObj.name && leadObj.email) {
            const rawPart = leadObj.email.split('@')[0];
            leadObj.name = rawPart.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        // Only include if has minimal identifiable lead information
        if (leadObj.name || leadObj.email || leadObj.phone) {
            leads.push(leadObj);
        }
    }

    return leads;
}

/**
 * Parse an uploaded PDF Buffer into raw text, then extracted lead candidates
 */
async function parsePdfBuffer(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Invalid PDF buffer provided.');
    }

    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text || '';
    const numPages = pdfData.numpages || 1;

    const parsedLeads = parseTextToLeads(rawText);

    return {
        numPages,
        rawText,
        leads: parsedLeads
    };
}

module.exports = {
    parsePdfBuffer,
    parseTextToLeads,
    normalizePhone,
    normalizePriority,
    normalizeStatus
};
