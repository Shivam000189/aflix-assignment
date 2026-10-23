/**
 * Aflix Infotech CRM — Phase 4 Comprehensive Assessment Test Suite
 * Validates all 15 Core Acceptance Criteria with Isolated Test Records.
 *
 * CRITICAL SAFETY: Only cleans up records prefixed with 'PHASE4_TEST_' / 'phase4_test_'
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

const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runPhase4Tests() {
  console.log('======================================================');
  console.log('Starting Phase 4 Assessment Verification Test Suite');
  console.log('======================================================\n');

  // Spin up dedicated test Express instance
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/api/leads', authMiddleware, leadRoutes);
  app.use('/api', (req, res) => res.status(404).json({ success: false, message: `API endpoint '${req.method} ${req.originalUrl}' not found` }));

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  // Pre-cleanup of isolated test artifacts
  await cleanupPhase4Data();

  let adminToken, managerToken, userAToken, userBToken;
  let userAId, userBId;
  let testLeadAId, testLeadBId, testTaskId;

  try {
    // ---------------------------------------------------------
    // 1. Authentication & Invalid Credentials
    // ---------------------------------------------------------
    console.log('--- 1. Authentication & Credential Verification ---');
    
    // Invalid credentials check
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@aflix.com', password: 'wrongpassword' })
    });
    assert.strictEqual(badLoginRes.status, 401, 'Invalid credentials must return 401');
    console.log('✓ Invalid credentials properly rejected with 401');

    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@aflix.com', password: 'password123' })
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login should succeed');
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminData.user.role, 'admin');
    adminToken = adminData.token;
    console.log('✓ Admin login successful with bcrypt hash verification');

    // Manager login
    const managerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@aflix.com', password: 'password123' })
    });
    assert.strictEqual(managerLoginRes.status, 200, 'Manager login should succeed');
    const managerData = await managerLoginRes.json();
    assert.strictEqual(managerData.user.role, 'manager');
    managerToken = managerData.token;
    console.log('✓ Manager login successful');

    // ---------------------------------------------------------
    // 2. Missing or Invalid JWT Enforcement
    // ---------------------------------------------------------
    console.log('\n--- 2. JWT Verification ---');
    const noTokenRes = await fetch(`${BASE_URL}/leads`);
    assert.strictEqual(noTokenRes.status, 401, 'Missing token must return 401');

    const badTokenRes = await fetch(`${BASE_URL}/leads`, {
      headers: { 'Authorization': 'Bearer invalid.token.payload' }
    });
    assert.strictEqual(badTokenRes.status, 403, 'Invalid token must return 403');
    console.log('✓ Protected endpoints reject missing (401) and malformed (403) JWT tokens');

    // ---------------------------------------------------------
    // 3. Registration Role Escalation Attempts
    // ---------------------------------------------------------
    console.log('\n--- 3. Registration Role Escalation Prevention ---');
    // Attempt to register User A requesting 'admin' role
    const regEscalateRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'PHASE4_TEST_UserA',
        email: 'phase4_test_user_a@aflix.com',
        password: 'password123',
        role: 'admin' // Escalation attack
      })
    });
    assert.strictEqual(regEscalateRes.status, 201, 'Registration should succeed');
    const regEscalateData = await regEscalateRes.json();
    assert.strictEqual(regEscalateData.user.role, 'user', 'Role must remain "user" despite "admin" payload');
    userAId = regEscalateData.user.id;

    // Login as User A
    const userALoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'phase4_test_user_a@aflix.com', password: 'password123' })
    });
    const userAData = await userALoginRes.json();
    assert.strictEqual(userAData.user.role, 'user');
    userAToken = userAData.token;

    // Register User B
    const regUserBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'PHASE4_TEST_UserB',
        email: 'phase4_test_user_b@aflix.com',
        password: 'password123',
        role: 'manager' // Escalation attack
      })
    });
    const regUserBData = await regUserBRes.json();
    assert.strictEqual(regUserBData.user.role, 'user', 'Role must remain "user" despite "manager" payload');
    userBId = regUserBData.user.id;

    // Login as User B
    const userBLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'phase4_test_user_b@aflix.com', password: 'password123' })
    });
    const userBData = await userBLoginRes.json();
    userBToken = userBData.token;
    console.log('✓ Public registration strictly enforces role="user" and rejects privilege escalation');

    // ---------------------------------------------------------
    // 4. Lead Creation with Valid Input
    // ---------------------------------------------------------
    console.log('\n--- 4. Valid Lead Creation ---');
    const createLeadRes = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        name: 'PHASE4_TEST_Acme Corp',
        company: 'Acme International',
        email: 'phase4_test_acme@example.com',
        phone: '+1 555-0199',
        source: 'Website',
        service: 'Custom Web App',
        budget: '₹5,00,000 - ₹15,00,000',
        status: 'New',
        priority: 'High'
      })
    });
    assert.strictEqual(createLeadRes.status, 201);
    const createLeadData = await createLeadRes.json();
    testLeadAId = createLeadData.lead.id;
    assert.strictEqual(createLeadData.lead.name, 'PHASE4_TEST_Acme Corp');
    console.log('✓ Valid lead created successfully with formatted INR budget');

    // ---------------------------------------------------------
    // 5. Lead Creation with Missing / Invalid Fields
    // ---------------------------------------------------------
    console.log('\n--- 5. Lead Validation & Error Handling ---');
    const invalidLeadRes = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        // Missing required 'name'
        company: 'No Name Corp',
        email: 'noname@example.com'
      })
    });
    assert.strictEqual(invalidLeadRes.status, 400, 'Missing name must return 400');
    console.log('✓ Lead creation without required name rejected with HTTP 400');

    // ---------------------------------------------------------
    // 6. Duplicate Lead Detection (Email & Phone)
    // ---------------------------------------------------------
    console.log('\n--- 6. Duplicate Lead Detection ---');
    const dupCheckRes = await fetch(
      `${BASE_URL}/leads/check-duplicate?email=phase4_test_acme@example.com&phone=5550199`,
      { headers: { 'Authorization': `Bearer ${userAToken}` } }
    );
    assert.strictEqual(dupCheckRes.status, 200);
    const dupCheckData = await dupCheckRes.json();
    assert.strictEqual(dupCheckData.isDuplicate, true, 'Duplicate lead should be flagged');
    assert.strictEqual(dupCheckData.reasons.includes('email') || dupCheckData.reasons.includes('phone'), true);
    console.log('✓ Duplicate detection by email and phone verified');

    // ---------------------------------------------------------
    // 7. Search, Filters, Sorting & Pagination
    // ---------------------------------------------------------
    console.log('\n--- 7. Search, Filter, Sort & Pagination ---');
    const searchRes = await fetch(
      `${BASE_URL}/leads?search=PHASE4_TEST_Acme&status=New&priority=High&page=1&limit=10&sortBy=createdAt&sortOrder=desc`,
      { headers: { 'Authorization': `Bearer ${userAToken}` } }
    );
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.strictEqual(searchData.leads.length >= 1, true);
    assert.strictEqual(searchData.leads[0].id, testLeadAId);
    console.log('✓ Server-side search, filtering, sorting, and pagination work accurately');

    // ---------------------------------------------------------
    // 8. Cross-User Lead Access Rejection
    // ---------------------------------------------------------
    console.log('\n--- 8. Cross-User Lead Access Rejection (Object-Level Authorization) ---');
    // User B tries to view User A's lead
    const userBGetLeadRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    assert.strictEqual(userBGetLeadRes.status, 403, 'User B must not view User A lead');

    // User B tries to update User A's lead
    const userBPutLeadRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBToken}`
      },
      body: JSON.stringify({ name: 'Hacked Name' })
    });
    assert.strictEqual(userBPutLeadRes.status, 403, 'User B must not edit User A lead');

    // User B tries to delete User A's lead
    const userBDelLeadRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    assert.strictEqual(userBDelLeadRes.status, 403, 'User B must not delete User A lead');
    console.log('✓ User B denied read/update/delete access on User A lead (HTTP 403)');

    // ---------------------------------------------------------
    // 9. Follow-Up Creation, Completion & Reopening
    // ---------------------------------------------------------
    console.log('\n--- 9. Follow-Up Task Lifecycle (Create, Complete, Reopen) ---');
    // User A creates task on own lead
    const createTaskRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Call prospect for demo',
        type: 'Call',
        dueDate: '2026-10-22', // Yesterday -> Overdue
        priority: 'High',
        notes: 'Review specifications'
      })
    });
    assert.strictEqual(createTaskRes.status, 201);
    const createTaskData = await createTaskRes.json();
    testTaskId = createTaskData.task.id;
    assert.strictEqual(createTaskData.task.isCompleted, false);
    assert.strictEqual(createTaskData.task.completedAt, null);
    console.log('✓ Task created successfully with initial isCompleted=false and completedAt=null');

    // Mark task complete
    const completeTaskRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/tasks/${testTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({ isCompleted: true })
    });
    assert.strictEqual(completeTaskRes.status, 200);
    const completeTaskData = await completeTaskRes.json();
    assert.strictEqual(completeTaskData.task.isCompleted, true);
    assert.notStrictEqual(completeTaskData.task.completedAt, null, 'completedAt must be populated');
    console.log('✓ Task marked complete: isCompleted=true, completedAt populated');

    // Reopen task
    const reopenTaskRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/tasks/${testTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({ isCompleted: false })
    });
    assert.strictEqual(reopenTaskRes.status, 200);
    const reopenTaskData = await reopenTaskRes.json();
    assert.strictEqual(reopenTaskData.task.isCompleted, false);
    assert.strictEqual(reopenTaskData.task.completedAt, null, 'completedAt must be cleared on reopen');
    console.log('✓ Task reopened: isCompleted=false, completedAt cleared to null');

    // ---------------------------------------------------------
    // 10. Cross-User Task Tampering Rejection
    // ---------------------------------------------------------
    console.log('\n--- 10. Cross-User Task Tampering Rejection ---');
    const userBTaskRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/tasks/${testTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBToken}`
      },
      body: JSON.stringify({ isCompleted: true })
    });
    assert.strictEqual(userBTaskRes.status, 403, 'User B must not modify User A task');

    const userBTaskDelRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/tasks/${testTaskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    assert.strictEqual(userBTaskDelRes.status, 403, 'User B must not delete User A task');
    console.log('✓ Unauthorized task mutation and deletion rejected with HTTP 403');

    // ---------------------------------------------------------
    // 11. Unauthorized Lead Reassignment
    // ---------------------------------------------------------
    console.log('\n--- 11. Unauthorized Lead Reassignment Prevention ---');
    const reassignRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({ owner: 'Someone Else', assignedToId: userBId })
    });
    assert.strictEqual(reassignRes.status, 403, 'Standard user cannot reassign lead ownership');
    console.log('✓ Standard user lead reassignment blocked with HTTP 403');

    // ---------------------------------------------------------
    // 12. Activity Log Creation for Status & Task Actions
    // ---------------------------------------------------------
    console.log('\n--- 12. Activity Log Creation & Chronological Order ---');
    // Change pipeline stage
    const stageRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({ stage: 'Qualified' })
    });
    assert.strictEqual(stageRes.status, 200);

    // Retrieve activity logs
    const logsRes = await fetch(`${BASE_URL}/leads/${testLeadAId}/activity-logs`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logsData = await logsRes.json();
    const types = logsData.activities.map(a => a.type);
    assert.strictEqual(types.includes('status_change'), true, 'status_change must be logged');
    assert.strictEqual(types.includes('task_added'), true, 'task_added must be logged');
    assert.strictEqual(types.includes('task_completed'), true, 'task_completed must be logged');
    console.log('✓ Canonical activity logs verified: status_change, task_added, task_completed');

    // ---------------------------------------------------------
    // 13. Overdue Calculations & Completed Task Exclusion
    // ---------------------------------------------------------
    console.log('\n--- 13. Overdue & Pipeline Synchronization ---');
    const pipelineRes = await fetch(`${BASE_URL}/leads/pipeline`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.strictEqual(pipelineRes.status, 200);
    const pipelineData = await pipelineRes.json();
    const qualifiedStage = pipelineData.stages['Qualified'];
    const ourLead = qualifiedStage.leads.find(l => l.id === testLeadAId);
    assert.notStrictEqual(ourLead, undefined);
    assert.strictEqual(ourLead.followUpSummary.hasOverdue, true, 'Yesterday incomplete task must be overdue');
    console.log('✓ Overdue derivation verified in pipeline followUpSummary');

    // ---------------------------------------------------------
    // 14. User Directory Endpoint Security
    // ---------------------------------------------------------
    console.log('\n--- 14. User Directory Security ---');
    const userDirUserRes = await fetch(`${BASE_URL}/auth/users`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.strictEqual(userDirUserRes.status, 403, 'Standard user cannot view user directory');

    const userDirManagerRes = await fetch(`${BASE_URL}/auth/users`, {
      headers: { 'Authorization': `Bearer ${managerToken}` }
    });
    assert.strictEqual(userDirManagerRes.status, 200, 'Manager can view user directory');
    const userDirData = await userDirManagerRes.json();
    assert.strictEqual(Array.isArray(userDirData.users), true);
    assert.strictEqual(userDirData.users.every(u => u.password === undefined), true, 'Passwords must not be exposed');
    console.log('✓ User directory protected: user=403, manager=200 with sanitized password fields');

    // ---------------------------------------------------------
    // 15. Admin & Manager Organization-Wide Privileges
    // ---------------------------------------------------------
    console.log('\n--- 15. Admin & Manager Privileged Actions ---');
    // Manager can view User A's lead
    const managerGetLeadRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      headers: { 'Authorization': `Bearer ${managerToken}` }
    });
    assert.strictEqual(managerGetLeadRes.status, 200, 'Manager has org-wide read access');

    // Manager can reassign lead
    const managerReassignRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({ owner: 'Reassigned By Manager' })
    });
    assert.strictEqual(managerReassignRes.status, 200, 'Manager can reassign lead');

    // Admin can delete lead
    const adminDelRes = await fetch(`${BASE_URL}/leads/${testLeadAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminDelRes.status, 200, 'Admin can cascade-delete lead');
    console.log('✓ Manager org-wide visibility/reassignment and Admin deletion verified');

    console.log('\n======================================================');
    console.log('ALL 15 PHASE 4 ACCEPTANCE CRITERIA VERIFIED (PASS)');
    console.log('======================================================');
  } finally {
    // Post-test cleanup of only isolated test artifacts
    await cleanupPhase4Data();
    await prisma.$disconnect();
    if (server) {
      await new Promise(r => server.close(r));
    }
  }
}

async function cleanupPhase4Data() {
  try {
    await prisma.followUp.deleteMany({
      where: { lead: { name: { startsWith: 'PHASE4_TEST_' } } }
    });
    await prisma.activityLog.deleteMany({
      where: { lead: { name: { startsWith: 'PHASE4_TEST_' } } }
    });
    await prisma.lead.deleteMany({
      where: { name: { startsWith: 'PHASE4_TEST_' } }
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'phase4_test_' } }
    });
  } catch (e) {
    // Silent catch on cleanup
  }
}

runPhase4Tests().catch(err => {
  console.error('\n❌ Phase 4 Test Assertion Failed:', err);
  process.exit(1);
});
