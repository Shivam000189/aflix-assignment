/**
 * Aflix Infotech CRM — Phase 5 Lead Import Automated Test Suite
 * Tests CSV & PDF parsing, validation, duplicate detection, role-based ownership,
 * activity logging, and error handling with isolated test fixtures.
 *
 * CRITICAL SAFETY: Only cleans up records prefixed with 'PHASE5_TEST_' / 'phase5_test_'
 */

require('dotenv').config();
const assert = require('assert');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const leadRoutes = require('./routes/LeadRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMIddleware');

const TEST_PORT = 5097;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function cleanupPhase5Data() {
    await prisma.activityLog.deleteMany({
        where: {
            lead: {
                name: { startsWith: 'PHASE5_TEST_' }
            }
        }
    });
    await prisma.followUp.deleteMany({
        where: {
            lead: {
                name: { startsWith: 'PHASE5_TEST_' }
            }
        }
    });
    await prisma.lead.deleteMany({
        where: {
            OR: [
                { name: { startsWith: 'PHASE5_TEST_' } },
                { email: { contains: '_phase5@' } }
            ]
        }
    });
    await prisma.user.deleteMany({
        where: { email: { startsWith: 'phase5_test_' } }
    });
}

/**
 * Creates a minimal valid text-based PDF buffer containing lead details
 */
function createSyntheticPdf(text) {
    const streamContent = `BT /F1 12 Tf 50 200 Td (${text.replace(/[\r\n]+/g, ') Tj T* (')}) Tj ET`;
    const streamLength = Buffer.byteLength(streamContent);
    const pdfData = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length ${streamLength}>>stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000216 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
${270 + streamLength}
%%EOF`;
    return Buffer.from(pdfData);
}

/**
 * Creates an image/empty PDF buffer simulating a scanned document with no extractable text
 */
function createScannedPdf() {
    const pdfData = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 0>>stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000216 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
266
%%EOF`;
    return Buffer.from(pdfData);
}

async function runPhase5Tests() {
    console.log('======================================================');
    console.log('Starting Phase 5: CSV and PDF Lead Import Test Suite');
    console.log('======================================================\n');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/leads', authMiddleware, leadRoutes);

    const server = await new Promise((resolve) => {
        const s = app.listen(TEST_PORT, () => resolve(s));
    });

    await cleanupPhase5Data();

    try {
        // -------------------------------------------------------------
        // Setup Test Users: Admin and Standard User
        // -------------------------------------------------------------
        console.log('--- Setting up test users ---');
        const adminEmail = 'phase5_test_admin@aflix.com';
        const userEmail = 'phase5_test_user@aflix.com';
        const password = 'password123';

        // Register Admin
        await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Phase5 Admin', email: adminEmail, password })
        });
        await prisma.user.update({
            where: { email: adminEmail },
            data: { role: 'admin' }
        });
        const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password })
        });
        const adminData = await adminLogin.json();
        const adminToken = adminData.token;

        // Register Standard User
        await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Phase5 User', email: userEmail, password })
        });
        const userLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, password })
        });
        const userData = await userLogin.json();
        const userToken = userData.token;
        const userAId = userData.user.id;
        console.log('✓ Test users initialized.\n');

        // -------------------------------------------------------------
        // Test 1: Unauthenticated Import Requests are Rejected (401)
        // -------------------------------------------------------------
        console.log('--- 1. Authentication Check ---');
        const unauthRes = await fetch(`${BASE_URL}/leads/import/preview`, { method: 'POST' });
        assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
        console.log('✓ 1. Unauthenticated requests rejected with 401');

        // -------------------------------------------------------------
        // Test 2: Unsupported File Types and Malformed Uploads (400)
        // -------------------------------------------------------------
        console.log('\n--- 2. Unsupported File Type Validation ---');
        const badForm = new FormData();
        badForm.append('file', new Blob(['binary data'], { type: 'application/zip' }), 'malicious.zip');

        const badExtRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: badForm
        });
        assert.strictEqual(badExtRes.status, 400, 'Non-CSV/PDF files must be rejected with 400');
        const badExtData = await badExtRes.json();
        assert.ok(badExtData.message.includes('Unsupported file type'), 'Should return clear unsupported message');
        console.log('✓ 2. Unsupported file types (.zip) rejected with 400');

        // -------------------------------------------------------------
        // Test 3: Valid CSV Preview Extracts Correct Fields
        // -------------------------------------------------------------
        console.log('\n--- 3. Valid CSV Preview & Tokenizer ---');
        const validCsv = `Full Name,Work Email,Mobile,Company,Stage,Priority
"PHASE5_TEST_Alice, VP",alice_phase5@acme.com,"+91 9123456781","Acme, Inc.",New,High
PHASE5_TEST_Bob,bob_phase5@globex.com,+91 9123456782,Globex Corp,Qualified,Medium`;

        const csvForm = new FormData();
        csvForm.append('file', new Blob([validCsv], { type: 'text/csv' }), 'leads.csv');

        const previewRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: csvForm
        });
        assert.strictEqual(previewRes.status, 200, 'Valid CSV preview must return 200');
        const previewData = await previewRes.json();
        assert.strictEqual(previewData.summary.total, 2, 'Should detect 2 rows');
        assert.strictEqual(previewData.rows[0].data.name, 'PHASE5_TEST_Alice, VP', 'Should handle commas in quotes');
        assert.strictEqual(previewData.rows[0].data.company, 'Acme, Inc.', 'Should parse quoted company name');
        assert.strictEqual(previewData.rows[0].data.email, 'alice_phase5@acme.com');
        console.log('✓ 3. Valid CSV preview extracted correct fields, preserving commas inside quotes');

        // -------------------------------------------------------------
        // Test 4: Alternative Header Column Mapping
        // -------------------------------------------------------------
        console.log('\n--- 4. Alternative Column Header Mapping ---');
        const altCsv = `lead name, email address, contact number, employer, urgency
PHASE5_TEST_Charlie, charlie_phase5@initech.com, 9876543201, Initech, Urgent`;

        const altForm = new FormData();
        altForm.append('file', new Blob([altCsv], { type: 'text/csv' }), 'alt_leads.csv');

        const altRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: altForm
        });
        const altData = await altRes.json();
        assert.strictEqual(altData.rows[0].data.name, 'PHASE5_TEST_Charlie');
        assert.strictEqual(altData.rows[0].data.email, 'charlie_phase5@initech.com');
        assert.strictEqual(altData.rows[0].data.company, 'Initech');
        assert.strictEqual(altData.rows[0].data.priority, 'Urgent');
        console.log('✓ 4. Alternative headers ("lead name", "email address", "employer", "urgency") automatically mapped');

        // -------------------------------------------------------------
        // Test 5: Intra-file Duplicate Detection
        // -------------------------------------------------------------
        console.log('\n--- 5. Intra-file Duplicate Detection ---');
        const dupCsv = `Name,Email,Phone,Company
PHASE5_TEST_Dave,dave_phase5@hooli.com,9998887771,Hooli
PHASE5_TEST_DaveDup,dave_phase5@hooli.com,9998887772,Hooli Duplicate`;

        const dupForm = new FormData();
        dupForm.append('file', new Blob([dupCsv], { type: 'text/csv' }), 'dup.csv');

        const dupRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: dupForm
        });
        const dupData = await dupRes.json();
        assert.strictEqual(dupData.rows[0].status, 'valid', 'First row should be valid');
        assert.strictEqual(dupData.rows[1].status, 'duplicate', 'Second row should be marked duplicate');
        assert.ok(dupData.rows[1].duplicateReasons.some(r => r.includes('email')), 'Should cite email as duplicate reason');
        console.log('✓ 5. Intra-file duplicate email detected and flagged on second occurrence');

        // -------------------------------------------------------------
        // Test 6: Invalid Rows Reported without Corrupting Valid Records
        // -------------------------------------------------------------
        console.log('\n--- 6. Invalid Row Handling ---');
        const invalidCsv = `Name,Email,Phone
,missing_name_phase5@example.com,9876543210
PHASE5_TEST_ValidContact,valid_contact_phase5@example.com,9876543211
PHASE5_TEST_BadEmail,invalid-email-address,9876543212`;

        const invForm = new FormData();
        invForm.append('file', new Blob([invalidCsv], { type: 'text/csv' }), 'invalid.csv');

        const invRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: invForm
        });
        const invData = await invRes.json();
        assert.strictEqual(invData.summary.invalid, 2, 'Should detect 2 invalid rows');
        assert.strictEqual(invData.summary.valid, 1, 'Should detect 1 valid row');
        assert.ok(invData.rows[0].errors.includes('Lead name is required'));
        assert.ok(invData.rows[2].errors.some(e => e.includes('Invalid email format')));
        console.log('✓ 6. Invalid rows flagged with exact errors (missing name, malformed email)');

        // -------------------------------------------------------------
        // Test 7: Text-based PDF Lead Extraction
        // -------------------------------------------------------------
        console.log('\n--- 7. Text-Based PDF Parsing ---');
        const pdfText = `Name: PHASE5_TEST_PdfLead1
Email: pdflead1_phase5@techcorp.com
Phone: +91 9876543220
Company: TechCorp India`;

        const pdfBuffer = createSyntheticPdf(pdfText);
        const pdfForm = new FormData();
        pdfForm.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'leads.pdf');

        const pdfRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: pdfForm
        });
        assert.strictEqual(pdfRes.status, 200, 'Valid PDF preview must return 200');
        const pdfData = await pdfRes.json();
        assert.ok(pdfData.rows.length >= 1, 'Should extract at least one lead from PDF');
        assert.strictEqual(pdfData.rows[0].data.name, 'PHASE5_TEST_PdfLead1');
        assert.strictEqual(pdfData.rows[0].data.email, 'pdflead1_phase5@techcorp.com');
        console.log('✓ 7. Text-based PDF parsed successfully and candidate lead extracted');

        // -------------------------------------------------------------
        // Test 8: Scanned / Empty PDF Returns Clear Warning
        // -------------------------------------------------------------
        console.log('\n--- 8. Scanned / Empty PDF Detection ---');
        const scannedBuffer = createScannedPdf();
        const scannedForm = new FormData();
        scannedForm.append('file', new Blob([scannedBuffer], { type: 'application/pdf' }), 'scanned.pdf');

        const scannedRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: scannedForm
        });
        assert.strictEqual(scannedRes.status, 400, 'Scanned PDF must return 400');
        const scannedData = await scannedRes.json();
        assert.strictEqual(scannedData.isScanned, true, 'isScanned flag must be true');
        assert.ok(scannedData.message.includes('OCR'), 'Message must explain that OCR is required');
        console.log('✓ 8. Scanned/image-only PDF detected with explicit OCR guidance');

        // -------------------------------------------------------------
        // Test 9: Existing Database Duplicate Detection & Policy Enforcement
        // -------------------------------------------------------------
        console.log('\n--- 9. Database Duplicate Detection & Scope Safety ---');
        // Pre-create an existing lead in DB
        const existingLead = await prisma.lead.create({
            data: {
                name: 'PHASE5_TEST_ExistingLead',
                email: 'existing_phase5@aflix.com',
                phone: '+91 99999 11111',
                normalizedPhone: '919999911111',
                owner: 'Phase5 Admin',
                status: 'New'
            }
        });

        const checkDbDupCsv = `Name,Email,Phone,Company
PHASE5_TEST_NewLead,new_phase5@example.com,9876543219,New Corp
PHASE5_TEST_ClashingLead,existing_phase5@aflix.com,9999911111,Existing Corp`;

        const checkDbDupForm = new FormData();
        checkDbDupForm.append('file', new Blob([checkDbDupCsv], { type: 'text/csv' }), 'check_db_dup.csv');

        const checkDbDupRes = await fetch(`${BASE_URL}/leads/import/preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}` }, // Standard user request
            body: checkDbDupForm
        });
        const checkDbDupData = await checkDbDupRes.json();
        const clashingRow = checkDbDupData.rows.find(r => r.data.email === 'existing_phase5@aflix.com');
        assert.ok(clashingRow, 'Clashing row must be found');
        assert.strictEqual(clashingRow.status, 'duplicate', 'Clashing row must be marked duplicate');
        assert.ok(clashingRow.duplicateReasons.some(r => r.includes('database')), 'Reason must cite database match');
        // Verify standard user does not see confidential lead name of other owner
        assert.strictEqual(clashingRow.duplicateMatches[0].name, 'Confidential Lead', 'Must not leak lead name outside user scope');
        console.log('✓ 9. Database duplicates detected with fail-closed privacy (confidential details masked for standard users)');

        // -------------------------------------------------------------
        // Test 10: Import Confirmation & Batch Ingestion
        // -------------------------------------------------------------
        console.log('\n--- 10. Import Execution & Bounded Transactions ---');
        const leadsToImport = [
            {
                rowNumber: 1,
                data: {
                    name: 'PHASE5_TEST_ImportLead1',
                    email: 'import1_phase5@example.com',
                    phone: '9876500001',
                    company: 'Import Corp 1',
                    status: 'New',
                    priority: 'High'
                }
            },
            {
                rowNumber: 2,
                data: {
                    name: 'PHASE5_TEST_ImportLead2',
                    email: 'import2_phase5@example.com',
                    phone: '9876500002',
                    company: 'Import Corp 2',
                    status: 'Qualified',
                    priority: 'Medium'
                }
            }
        ];

        const importRes = await fetch(`${BASE_URL}/leads/import`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ leads: leadsToImport })
        });
        assert.strictEqual(importRes.status, 200, 'Import execution must return 200');
        const importData = await importRes.json();
        assert.strictEqual(importData.summary.importedCount, 2, 'Should import 2 leads');
        console.log('✓ 10. Bounded transaction batch import completed successfully');

        // -------------------------------------------------------------
        // Test 11: Role Authorization & Ownership Enforced (Standard User)
        // -------------------------------------------------------------
        console.log('\n--- 11. Role Authorization & Ownership Assignment ---');
        const userTamperedLead = [
            {
                rowNumber: 1,
                data: {
                    name: 'PHASE5_TEST_UserLead',
                    email: 'userlead_phase5@example.com',
                    assignedToId: 'malicious-target-user-id',
                    owner: 'Admin'
                }
            }
        ];

        const userImportRes = await fetch(`${BASE_URL}/leads/import`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ leads: userTamperedLead })
        });
        assert.strictEqual(userImportRes.status, 200);

        // Check created record in database
        const createdUserLead = await prisma.lead.findFirst({
            where: { email: 'userlead_phase5@example.com' }
        });
        assert.strictEqual(createdUserLead.assignedToId, userAId, 'Standard user cannot reassign lead; must be assigned to self');
        assert.strictEqual(createdUserLead.createdById, userAId, 'createdById must be authenticated user');
        assert.strictEqual(createdUserLead.owner, 'Phase5 User', 'owner must be authenticated user name');
        console.log('✓ 11. Ownership tampering blocked: standard user lead forced to own identity');

        // -------------------------------------------------------------
        // Test 12: ActivityLog Creation
        // -------------------------------------------------------------
        console.log('\n--- 12. ActivityLog Creation ---');
        const activityLog = await prisma.activityLog.findFirst({
            where: { leadId: createdUserLead.id }
        });
        assert.ok(activityLog, 'ActivityLog record must be created');
        assert.strictEqual(activityLog.type, 'imported', 'ActivityLog type must be canonical "imported"');
        assert.strictEqual(activityLog.performedById, userAId, 'performedById must match authenticated user');
        console.log('✓ 12. Canonical "imported" ActivityLog audit trail verified in PostgreSQL');

        // -------------------------------------------------------------
        // Test 13: Partial Failure Resilience & Error Reporting
        // -------------------------------------------------------------
        console.log('\n--- 13. Partial Failure Reporting ---');
        const mixedLeads = [
            {
                rowNumber: 1,
                data: { name: '', email: 'missing_name@example.com' } // Invalid: missing name
            },
            {
                rowNumber: 2,
                data: { name: 'PHASE5_TEST_GoodLead', email: 'good_phase5@example.com' } // Valid
            }
        ];

        const mixedRes = await fetch(`${BASE_URL}/leads/import`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ leads: mixedLeads })
        });
        const mixedData = await mixedRes.json();
        assert.strictEqual(mixedData.summary.importedCount, 1, 'Valid lead must be imported');
        assert.strictEqual(mixedData.summary.failedCount, 1, 'Invalid lead must be counted as failed');
        assert.strictEqual(mixedData.errors[0].reason, 'Lead name is required');
        console.log('✓ 13. Partial failures reported safely with row number and reason without rolling back valid records');

        // -------------------------------------------------------------
        // Test 14: Duplicate Skipping vs Idempotent Re-Import
        // -------------------------------------------------------------
        console.log('\n--- 14. Idempotency & Duplicate Skipping ---');
        const reImportLead = [
            {
                rowNumber: 1,
                data: { name: 'PHASE5_TEST_GoodLead', email: 'good_phase5@example.com' }
            }
        ];

        const reImportRes = await fetch(`${BASE_URL}/leads/import`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leads: reImportLead,
                options: { skipDuplicates: true, allowDuplicates: false }
            })
        });
        const reImportData = await reImportRes.json();
        assert.strictEqual(reImportData.summary.skippedCount, 1, 'Duplicate record must be skipped');
        assert.strictEqual(reImportData.summary.importedCount, 0, 'No duplicate record created');
        console.log('✓ 14. Idempotency verified: duplicate lead safely skipped on re-import');

        console.log('\n======================================================');
        console.log('>>> ALL 14 PHASE 5 IMPORT TEST CASES PASSED! <<<');
        console.log('======================================================\n');

    } finally {
        await cleanupPhase5Data();
        await new Promise((resolve) => server.close(resolve));
        await prisma.$disconnect();
    }
}

runPhase5Tests().catch((err) => {
    console.error('Phase 5 Test Failure:', err);
    process.exit(1);
});
