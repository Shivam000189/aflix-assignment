const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { prisma } = require('../config/db');
const { withTransaction } = require('../utils/transaction');
const {
    normalizePhone,
    parseCsvContent,
    detectColumnMapping,
    extractTextFromPdf,
    parsePdfTextToLeads,
    validateAndNormalizeRecord
} = require('../services/leadParserService');

// Helper to check whether a role grants global administrative or managerial access
const isGlobalRole = (role) => {
    return typeof role === 'string' && (role === 'admin' || role === 'manager');
};

// Multer memory storage configuration with 5MB limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (ext !== '.csv' && ext !== '.pdf') {
            return cb(new Error('Unsupported file type. Only .csv and .pdf files are supported.'));
        }
        cb(null, true);
    }
});

/**
 * POST /api/leads/import/preview
 * Upload and parse CSV or PDF file without writing to database.
 * Returns column mapping, extracted records, validation status, and duplicate warnings.
 */
router.post('/preview', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 5MB limit. Please upload a smaller file.'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload error'
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please select a .csv or .pdf file.'
            });
        }

        const fileName = req.file.originalname || 'uploaded_file';
        const fileExt = path.extname(fileName).toLowerCase();
        const fileBuffer = req.file.buffer;
        const fileSize = req.file.size;

        let parsedHeaders = [];
        let rawRecords = [];
        let autoMapping = {};
        let pdfWarning = null;
        let isScannedPdf = false;

        // 1. Parse File Content based on type
        if (fileExt === '.csv') {
            const csvString = fileBuffer.toString('utf8');
            const { headers, rows } = parseCsvContent(csvString);

            if (headers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'The uploaded CSV file is empty or missing headers in the first row.'
                });
            }

            parsedHeaders = headers;
            autoMapping = detectColumnMapping(headers);

            // Check custom mapping override from client request body
            let customMapping = autoMapping;
            if (req.body.mapping) {
                try {
                    const parsedCustom = typeof req.body.mapping === 'string'
                        ? JSON.parse(req.body.mapping)
                        : req.body.mapping;
                    customMapping = { ...autoMapping, ...parsedCustom };
                } catch {
                    // Fallback to autoMapping if malformed
                }
            }

            // Convert rows into record objects using mapping
            rawRecords = rows.map((row) => {
                const record = {};
                headers.forEach((header, idx) => {
                    const targetField = customMapping[header];
                    if (targetField && targetField !== 'ignore') {
                        record[targetField] = row[idx] || '';
                    }
                });
                return record;
            });

        } else if (fileExt === '.pdf') {
            let extractedText = '';
            try {
                extractedText = await extractTextFromPdf(fileBuffer);
            } catch (pdfErr) {
                return res.status(400).json({
                    success: false,
                    message: 'Unable to parse PDF document. The file may be corrupt or encrypted.',
                    error: pdfErr.message
                });
            }

            const pdfResult = parsePdfTextToLeads(extractedText);
            isScannedPdf = pdfResult.isScanned;
            pdfWarning = pdfResult.warning;

            if (isScannedPdf) {
                return res.status(400).json({
                    success: false,
                    isScanned: true,
                    message: pdfWarning || 'The uploaded PDF appears to be scanned or contains only images. Lead extraction requires a text-based PDF or an OCR-processed document.'
                });
            }

            rawRecords = pdfResult.leads;
            parsedHeaders = ['name', 'company', 'email', 'phone', 'serviceInterested', 'status', 'priority'];
            autoMapping = {
                name: 'name',
                company: 'company',
                email: 'email',
                phone: 'phone',
                serviceInterested: 'serviceInterested',
                status: 'status',
                priority: 'priority'
            };
        } else {
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type. Please upload a .csv or .pdf file.'
            });
        }

        // Enforce maximum record count (500 records)
        if (rawRecords.length > 500) {
            return res.status(400).json({
                success: false,
                message: `File contains ${rawRecords.length} records. Maximum allowed records per import is 500.`
            });
        }

        if (rawRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: pdfWarning || 'No lead records could be extracted from the uploaded file.'
            });
        }

        // 2. Validate extracted rows and collect emails/phones for DB duplicate check
        const validatedRows = [];
        const uniqueEmails = new Set();
        const uniquePhones = new Set();
        const seenEmailsInFile = new Map(); // email -> rowNumber
        const seenPhonesInFile = new Map();  // normalizedPhone -> rowNumber

        rawRecords.forEach((raw, idx) => {
            const rowNumber = idx + 1;
            const validated = validateAndNormalizeRecord(raw, rowNumber);

            // Intra-file duplicate check
            const email = validated.data.email;
            const normPhone = validated.data.normalizedPhone;
            let fileDuplicate = false;
            const fileDupReasons = [];

            if (email) {
                if (seenEmailsInFile.has(email)) {
                    fileDuplicate = true;
                    fileDupReasons.push(`email (duplicate of row ${seenEmailsInFile.get(email)})`);
                } else {
                    seenEmailsInFile.set(email, rowNumber);
                    uniqueEmails.add(email);
                }
            }

            if (normPhone && normPhone.length >= 7) {
                if (seenPhonesInFile.has(normPhone)) {
                    fileDuplicate = true;
                    fileDupReasons.push(`phone (duplicate of row ${seenPhonesInFile.get(normPhone)})`);
                } else {
                    seenPhonesInFile.set(normPhone, rowNumber);
                    uniquePhones.add(normPhone);
                }
            }

            validated.isDuplicateInFile = fileDuplicate;
            validated.fileDupReasons = fileDupReasons;
            validatedRows.push(validated);
        });

        // 3. Batch Query Database Duplicates
        const dbConditions = [];
        if (uniqueEmails.size > 0) {
            dbConditions.push({ email: { in: Array.from(uniqueEmails), mode: 'insensitive' } });
        }
        if (uniquePhones.size > 0) {
            dbConditions.push({ normalizedPhone: { in: Array.from(uniquePhones) } });
        }

        let existingLeads = [];
        if (dbConditions.length > 0) {
            existingLeads = await prisma.lead.findMany({
                where: {
                    OR: dbConditions
                },
                select: {
                    id: true,
                    name: true,
                    company: true,
                    email: true,
                    phone: true,
                    normalizedPhone: true,
                    status: true,
                    owner: true,
                    assignedToId: true,
                    createdById: true
                }
            });
        }

        // Map existing matches by email and normalized phone
        const existingByEmail = new Map();
        const existingByPhone = new Map();
        existingLeads.forEach(lead => {
            if (lead.email) {
                const em = lead.email.toLowerCase();
                if (!existingByEmail.has(em)) existingByEmail.set(em, []);
                existingByEmail.get(em).push(lead);
            }
            if (lead.normalizedPhone && lead.normalizedPhone.length >= 7) {
                if (!existingByPhone.has(lead.normalizedPhone)) existingByPhone.set(lead.normalizedPhone, []);
                existingByPhone.get(lead.normalizedPhone).push(lead);
            }
        });

        const isPrivileged = req.user && isGlobalRole(req.user.role);
        const currentUserId = req.user?.userId;

        // 4. Combine intra-file and DB duplicate flags for each row
        const previewRows = validatedRows.map((row) => {
            const email = row.data.email;
            const normPhone = row.data.normalizedPhone;
            const dupReasons = [...(row.fileDupReasons || [])];
            const duplicateMatches = [];

            // Match DB email
            if (email && existingByEmail.has(email)) {
                dupReasons.push('email in database');
                existingByEmail.get(email).forEach(m => {
                    const isVisible = isPrivileged || m.assignedToId === currentUserId || m.createdById === currentUserId;
                    duplicateMatches.push({
                        id: m.id,
                        name: isVisible ? m.name : 'Confidential Lead',
                        company: isVisible ? m.company : '',
                        owner: isVisible ? m.owner : '',
                        reason: 'email'
                    });
                });
            }

            // Match DB phone
            if (normPhone && existingByPhone.has(normPhone)) {
                dupReasons.push('phone in database');
                existingByPhone.get(normPhone).forEach(m => {
                    const isVisible = isPrivileged || m.assignedToId === currentUserId || m.createdById === currentUserId;
                    if (!duplicateMatches.some(dm => dm.id === m.id)) {
                        duplicateMatches.push({
                            id: m.id,
                            name: isVisible ? m.name : 'Confidential Lead',
                            company: isVisible ? m.company : '',
                            owner: isVisible ? m.owner : '',
                            reason: 'phone'
                        });
                    }
                });
            }

            const isDuplicate = dupReasons.length > 0;
            let status = 'valid';
            if (!row.isValid) {
                status = 'invalid';
            } else if (isDuplicate) {
                status = 'duplicate';
            }

            return {
                rowNumber: row.rowNumber,
                selected: row.isValid && !isDuplicate, // Default: pre-select valid non-duplicates
                status,
                data: row.data,
                errors: row.errors,
                warnings: row.warnings,
                isDuplicate,
                duplicateReasons: Array.from(new Set(dupReasons)),
                duplicateMatches
            };
        });

        const summary = {
            total: previewRows.length,
            valid: previewRows.filter(r => r.status === 'valid').length,
            duplicate: previewRows.filter(r => r.status === 'duplicate').length,
            invalid: previewRows.filter(r => r.status === 'invalid').length
        };

        res.status(200).json({
            success: true,
            fileName,
            fileType: fileExt.slice(1).toUpperCase(),
            fileSize,
            headers: parsedHeaders,
            mapping: autoMapping,
            summary,
            rows: previewRows,
            warning: pdfWarning
        });

    } catch (err) {
        console.error('Import preview error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error processing file preview',
            error: err.message
        });
    }
});

/**
 * POST /api/leads/import
 * Confirms and imports selected, validated leads into PostgreSQL in atomic bounded batches.
 * Enforces fail-closed role scoping, assignment rules, activity logging, and duplicate handling.
 */
router.post('/', async (req, res) => {
    try {
        const {
            leads,
            options = {}
        } = req.body;

        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No lead records provided for import.'
            });
        }

        if (leads.length > 500) {
            return res.status(400).json({
                success: false,
                message: `Import batch of ${leads.length} leads exceeds the 500 records limit.`
            });
        }

        const {
            skipDuplicates = true,
            allowDuplicates = false,
            defaultStatus = 'New',
            defaultPriority = 'Medium',
            defaultSource = 'Import'
        } = options;

        const isPrivileged = req.user && isGlobalRole(req.user.role);
        const currentUserId = req.user?.userId;
        const currentUserName = req.user?.name || req.user?.email || 'User';

        let importedCount = 0;
        let skippedCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;
        const errors = [];
        const importedLeads = [];

        // Process in bounded chunks of 50 for transaction safety
        const BATCH_SIZE = 50;
        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
            const chunk = leads.slice(i, i + BATCH_SIZE);

            await withTransaction(async (tx) => {
                for (const item of chunk) {
                    const rowNum = item.rowNumber || (i + 1);
                    const leadData = item.data || item;

                    // 1. Validate required fields
                    const name = leadData.name ? String(leadData.name).trim() : '';
                    if (!name) {
                        failedCount++;
                        errors.push({ rowNumber: rowNum, leadName: 'Unknown', reason: 'Lead name is required' });
                        continue;
                    }

                    const email = leadData.email ? String(leadData.email).trim().toLowerCase() : '';
                    const rawPhone = leadData.phone ? String(leadData.phone).trim() : '';
                    const normPhone = normalizePhone(rawPhone);

                    // 2. Real-time DB Duplicate Re-check (prevents race conditions)
                    const dupConditions = [];
                    if (email) dupConditions.push({ email: { equals: email, mode: 'insensitive' } });
                    if (normPhone && normPhone.length >= 7) dupConditions.push({ normalizedPhone: normPhone });

                    let isDup = Boolean(item.isDuplicate);
                    let dupReasons = Array.isArray(item.duplicateReasons) ? [...item.duplicateReasons] : [];
                    let dupMatchIds = [];

                    if (dupConditions.length > 0) {
                        const existing = await tx.lead.findMany({
                            where: { OR: dupConditions },
                            select: { id: true, email: true, normalizedPhone: true }
                        });

                        if (existing.length > 0) {
                            isDup = true;
                            existing.forEach(ex => {
                                dupMatchIds.push(ex.id);
                                if (email && ex.email && ex.email.toLowerCase() === email && !dupReasons.includes('email in database')) {
                                    dupReasons.push('email in database');
                                }
                                if (normPhone && ex.normalizedPhone === normPhone && !dupReasons.includes('phone in database')) {
                                    dupReasons.push('phone in database');
                                }
                            });
                        }
                    }

                    // Handle Duplicate Policy
                    if (isDup) {
                        duplicateCount++;
                        if (skipDuplicates && !allowDuplicates) {
                            skippedCount++;
                            continue; // Skip this duplicate record
                        }
                    }

                    // 3. Role-based Ownership & Assignment Security
                    // Standard users can NEVER assign leads to arbitrary users/owners.
                    const effectiveAssignedToId = isPrivileged
                        ? (leadData.assignedToId || null)
                        : currentUserId;
                    const effectiveCreatedById = currentUserId || null;
                    const effectiveOwner = isPrivileged
                        ? (leadData.owner || 'Unassigned')
                        : currentUserName;

                    // 4. Create Lead in PostgreSQL
                    const createdLead = await tx.lead.create({
                        data: {
                            name,
                            company: leadData.company ? String(leadData.company).trim() : '',
                            email,
                            phone: rawPhone,
                            normalizedPhone: normPhone,
                            source: leadData.source || defaultSource || 'Import',
                            serviceInterested: leadData.serviceInterested || 'Web Development',
                            budget: leadData.budget || '₹1,00,000 - ₹5,00,000',
                            status: leadData.status || defaultStatus || 'New',
                            priority: leadData.priority || defaultPriority || 'Medium',
                            owner: effectiveOwner,
                            notes: leadData.notes ? String(leadData.notes).trim() : '',
                            isDuplicate: isDup,
                            duplicateReasons: dupReasons,
                            duplicateMatches: dupMatchIds,
                            assignedToId: effectiveAssignedToId,
                            createdById: effectiveCreatedById
                        }
                    });

                    // 5. Create ActivityLog audit record
                    await tx.activityLog.create({
                        data: {
                            leadId: createdLead.id,
                            type: 'imported',
                            description: `Lead imported via ${leadData.source || defaultSource || 'file upload'}`,
                            performedByName: currentUserName,
                            performedById: currentUserId || null
                        }
                    });

                    importedCount++;
                    importedLeads.push({
                        id: createdLead.id,
                        name: createdLead.name,
                        email: createdLead.email,
                        status: createdLead.status
                    });
                }
            });
        }

        res.status(200).json({
            success: true,
            message: `Import complete: ${importedCount} imported, ${skippedCount} skipped duplicates, ${failedCount} failed.`,
            summary: {
                totalProcessed: leads.length,
                importedCount,
                skippedCount,
                duplicateCount,
                failedCount
            },
            importedLeads,
            errors
        });

    } catch (err) {
        console.error('Import confirmation error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during lead import',
            error: err.message
        });
    }
});

module.exports = router;
