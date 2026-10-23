require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { prisma } = require('./config/db');
const leadRoutes = require('./routes/LeadRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMIddleware');

async function testApi() {
    console.log('Connecting to PostgreSQL via Prisma for test suite...');
    await prisma.$connect();
    console.log('Connected to PostgreSQL successfully.');

    // Clean up any lingering test records
    await prisma.followUp.deleteMany({
        where: {
            lead: {
                name: { startsWith: 'API_TEST_' }
            }
        }
    });
    await prisma.activityLog.deleteMany({
        where: {
            lead: {
                name: { startsWith: 'API_TEST_' }
            }
        }
    });
    await prisma.lead.deleteMany({
        where: { name: { startsWith: 'API_TEST_' } }
    });
    await prisma.user.deleteMany({
        where: { email: { startsWith: 'api_test_' } }
    });

    const app = express();
    app.use(cors());
    app.use(express.json());
    // Public auth routes
    app.use('/api/auth', authRoutes);
    // Protected lead routes
    app.use('/api/leads', authMiddleware, leadRoutes);

    const TEST_PORT = 5099;
    const server = app.listen(TEST_PORT);
    const BASE_URL = `http://localhost:${TEST_PORT}/api/leads`;
    const AUTH_URL = `http://localhost:${TEST_PORT}/api/auth`;

    try {
        console.log('\n======================================================');
        console.log('Testing Protected API Routes, Auth & PostgreSQL');
        console.log('======================================================\n');

        // A. Test Route Protection - Unauthenticated Request Blocked
        const unauthRes = await fetch(`${BASE_URL}`);
        console.log('A. GET /api/leads without JWT Token:', unauthRes.status, '(401 Expected)');
        if (unauthRes.status !== 401) throw new Error('Expected 401 Unauthorized for route without token');

        // B. Test Route Protection - Invalid Token Blocked
        const badTokenRes = await fetch(`${BASE_URL}`, {
            headers: { 'Authorization': 'Bearer invalid.token.signature' }
        });
        console.log('B. GET /api/leads with invalid token:', badTokenRes.status, '(403 Expected)');
        if (badTokenRes.status !== 403) throw new Error('Expected 403 Forbidden for invalid token');

        // C. Authenticate & Obtain Valid JWT Token
        const regAuthRes = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'API Auth Tester',
                email: 'api_test_auth@example.com',
                password: 'validPassword123',
                role: 'manager'
            })
        });
        const regAuthData = await regAuthRes.json();
        if (regAuthRes.status !== 201) throw new Error('Auth registration failed: ' + regAuthData.message);

        // Ensure api_test_auth has manager role so administrative operations succeed
        await prisma.user.update({
            where: { email: 'api_test_auth@example.com' },
            data: { role: 'manager' }
        });

        const loginRes = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'api_test_auth@example.com',
                password: 'validPassword123'
            })
        });
        const loginData = await loginRes.json();
        console.log('C. POST /api/auth/login - Issued JWT Token:', loginRes.status, Boolean(loginData.token));
        if (loginRes.status !== 200 || !loginData.token) throw new Error('Login failed to return token');
        const authToken = loginData.token;

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };

        // 1. Create Lead
        const createRes = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'API_TEST_John Doe',
                company: 'Acme Corp',
                email: 'john.acme@example.com',
                phone: '+1 (555) 987-6543',
                source: 'LinkedIn',
                serviceInterested: 'Web Development',
                budget: '₹10,00,000 - ₹25,00,000',
                status: 'New',
                priority: 'High',
                owner: 'Shivam S.',
                notes: 'Key client prospect'
            })
        });
        const createData = await createRes.json();
        console.log('1. POST /api/leads (Authenticated):', createRes.status, createData.message);
        if (createRes.status !== 201) throw new Error('Create failed: ' + JSON.stringify(createData));
        const leadId = createData.lead._id || createData.lead.id;

        // 2. Test Duplicate Check endpoint
        const dupCheckRes = await fetch(`${BASE_URL}/check-duplicate?email=john.acme@example.com`, {
            headers: authHeaders
        });
        const dupCheckData = await dupCheckRes.json();
        console.log('2. GET /api/leads/check-duplicate:', dupCheckData.isDuplicate, 'reasons:', dupCheckData.reasons);
        if (!dupCheckData.isDuplicate) throw new Error('Duplicate check failed to detect existing email');

        // 3. Test Prevention of Duplicate
        const dupPreventRes = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'API_TEST_John Duplicate',
                company: 'Acme Alternate',
                email: 'john.acme@example.com',
                phone: '555-987-6543',
                preventDuplicates: true
            })
        });
        const dupPreventData = await dupPreventRes.json();
        console.log('3. POST /api/leads (preventDuplicates=true):', dupPreventRes.status, dupPreventData.message);
        if (dupPreventRes.status !== 409) throw new Error('Expected 409 Conflict for duplicate');

        // 4. Test Flagging Duplicate with allowDuplicate
        const dupFlagRes = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'API_TEST_John Flagged',
                company: 'Acme Alternate',
                email: 'john.acme@example.com',
                phone: '555-987-6543',
                allowDuplicate: true
            })
        });
        const dupFlagData = await dupFlagRes.json();
        console.log('4. POST /api/leads (allowDuplicate=true):', dupFlagRes.status, 'isDuplicate:', dupFlagData.lead.isDuplicate);
        if (dupFlagRes.status !== 201 || !dupFlagData.lead.isDuplicate) throw new Error('Expected 201 with duplicate flagged');

        // 5. Test List Leads with Pagination, Filter & Sort
        const listRes = await fetch(`${BASE_URL}?page=1&limit=10&search=Acme&sortBy=createdAt&sortOrder=desc`, {
            headers: authHeaders
        });
        const listData = await listRes.json();
        console.log('5. GET /api/leads with search & pagination: found', listData.leads.length, 'leads, total:', listData.pagination.totalLeads);
        if (!listData.success || listData.leads.length === 0) throw new Error('Listing failed');

        // 6. Test View Single Lead
        const getRes = await fetch(`${BASE_URL}/${leadId}`, { headers: authHeaders });
        const getData = await getRes.json();
        console.log('6. GET /api/leads/:id:', getRes.status, getData.lead.name, getData.lead.company);
        if (getRes.status !== 200) throw new Error('Get single lead failed');

        // 7. Test Edit Lead
        const putRes = await fetch(`${BASE_URL}/${leadId}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
                company: 'Acme Enterprise Holdings',
                status: 'Contacted',
                priority: 'Urgent'
            })
        });
        const putData = await putRes.json();
        console.log('7. PUT /api/leads/:id:', putRes.status, putData.lead.company, putData.lead.status, putData.lead.priority);
        if (putData.lead.status !== 'Contacted') throw new Error('Update failed');

        // 8. Test Archive Lead
        const archiveRes = await fetch(`${BASE_URL}/${leadId}/archive`, {
            method: 'PATCH',
            headers: authHeaders
        });
        const archiveData = await archiveRes.json();
        console.log('8. PATCH /api/leads/:id/archive:', archiveRes.status, 'isArchived:', archiveData.lead.isArchived);
        if (!archiveData.lead.isArchived) throw new Error('Archive failed');

        // Verify archived lead doesn't show in active list
        const activeListRes = await fetch(`${BASE_URL}?archived=false&search=Acme`, { headers: authHeaders });
        const activeListData = await activeListRes.json();
        const foundArchivedInActive = activeListData.leads.some(l => (l._id || l.id) === leadId);
        console.log('8.1 Archived lead excluded from active list:', !foundArchivedInActive);
        if (foundArchivedInActive) throw new Error('Archived lead still in active list');

        // 9. Test Unarchive Lead
        const unarchiveRes = await fetch(`${BASE_URL}/${leadId}/unarchive`, {
            method: 'PATCH',
            headers: authHeaders
        });
        const unarchiveData = await unarchiveRes.json();
        console.log('9. PATCH /api/leads/:id/unarchive:', unarchiveRes.status, 'isArchived:', unarchiveData.lead.isArchived);
        if (unarchiveData.lead.isArchived) throw new Error('Unarchive failed');

        // 10. Test Stats Endpoint
        const statsRes = await fetch(`${BASE_URL}/stats`, { headers: authHeaders });
        const statsData = await statsRes.json();
        console.log('10. GET /api/leads/stats: total:', statsData.stats.total, 'active:', statsData.stats.active, 'duplicates:', statsData.stats.duplicates);
        if (!statsData.success) throw new Error('Stats endpoint failed');

        // 11. Test Add Follow-up Task
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const addTaskRes = await fetch(`${BASE_URL}/${leadId}/tasks`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                title: 'Discovery Call with CTO',
                type: 'Call',
                dueDate: tomorrow.toISOString(),
                notes: 'Discuss cloud infrastructure sizing',
                priority: 'High',
                assignedTo: 'Shivam S.'
            })
        });
        const addTaskData = await addTaskRes.json();
        const taskId = addTaskData.task._id || addTaskData.task.id;
        console.log('11. POST /api/leads/:id/tasks:', addTaskRes.status, addTaskData.message, 'Task ID:', taskId);
        if (addTaskRes.status !== 201 || !taskId) throw new Error('Add task failed');

        // 12. Test Toggle Task Completion
        const completeTaskRes = await fetch(`${BASE_URL}/${leadId}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
                isCompleted: true
            })
        });
        const completeTaskData = await completeTaskRes.json();
        console.log('12. PATCH /api/leads/:id/tasks/:taskId:', completeTaskRes.status, 'Completed:', completeTaskData.task.isCompleted);
        if (completeTaskRes.status !== 200 || !completeTaskData.task.isCompleted) throw new Error('Task completion toggle failed');

        // 13. Test Follow-ups Overview Endpoint
        const overviewRes = await fetch(`${BASE_URL}/follow-ups/overview`, { headers: authHeaders });
        const overviewData = await overviewRes.json();
        console.log('13. GET /api/leads/follow-ups/overview:', overviewRes.status, 'counts:', overviewData.counts);
        if (overviewRes.status !== 200 || !overviewData.counts) throw new Error('Follow-ups overview failed');

        // 14. Test Lead Activity History
        const leadDetailRes = await fetch(`${BASE_URL}/${leadId}`, { headers: authHeaders });
        const leadDetailData = await leadDetailRes.json();
        console.log('14. Activity history count:', leadDetailData.lead.activities.length);
        const hasStatusChange = leadDetailData.lead.activities.some(a => a.type === 'status_change');
        const hasTaskAdded = leadDetailData.lead.activities.some(a => a.type === 'task_added');
        const hasTaskCompleted = leadDetailData.lead.activities.some(a => a.type === 'task_completed');
        console.log('14.1 Status change recorded:', hasStatusChange, 'Task added:', hasTaskAdded, 'Task completed:', hasTaskCompleted);
        if (!hasStatusChange || !hasTaskAdded || !hasTaskCompleted) throw new Error('Activity history tracking missing events');

        // 15. Test Delete Lead
        const delRes = await fetch(`${BASE_URL}/${leadId}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        const delData = await delRes.json();
        console.log('15. DELETE /api/leads/:id:', delRes.status, delData.message);
        if (delRes.status !== 200) throw new Error('Delete failed');

        // 16. Test GET /api/leads/pipeline (Sales Pipeline Dashboard)
        const pipelineRes = await fetch(`${BASE_URL}/pipeline`, { headers: authHeaders });
        const pipelineData = await pipelineRes.json();
        console.log('16. GET /api/leads/pipeline:', pipelineRes.status, 'Total active in pipeline:', pipelineData.metrics.totalActiveLeads);
        if (pipelineRes.status !== 200 || !pipelineData.success) throw new Error('GET /api/leads/pipeline failed');

        // Verify all 6 pipeline stages are present
        const expectedStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
        for (const stg of expectedStages) {
            if (!pipelineData.stages[stg]) {
                throw new Error(`Pipeline missing stage: ${stg}`);
            }
        }
        console.log('16.1 All 6 pipeline stages verified:', expectedStages.join(', '));

        // Verify conversion funnel and metrics
        if (!Array.isArray(pipelineData.metrics.conversionFunnel) || pipelineData.metrics.conversionFunnel.length !== 5) {
            throw new Error('Pipeline conversion funnel missing expected 5 stages');
        }
        console.log('16.2 Pipeline conversion funnel verified with 5 conversion steps');

        // 17. Test PATCH /api/leads/:id/stage (Stage Transition)
        const tempLead = await prisma.lead.create({
            data: {
                name: 'API_TEST_Stage_Transition',
                company: 'Test Stage Corp',
                email: 'api_stage@test.com',
                status: 'New',
                priority: 'Urgent'
            }
        });

        const stageTransitionRes = await fetch(`${BASE_URL}/${tempLead.id}/stage`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ stage: 'Qualified', updatedBy: 'Pipeline Agent' })
        });
        const stageTransitionData = await stageTransitionRes.json();
        console.log('17. PATCH /api/leads/:id/stage:', stageTransitionRes.status, 'New stage:', stageTransitionData.lead?.status);
        if (stageTransitionRes.status !== 200 || stageTransitionData.lead?.status !== 'Qualified') {
            throw new Error('Lead stage transition failed');
        }

        // Verify activity log captured stage change
        const stageActivity = await prisma.activityLog.findFirst({
            where: { leadId: tempLead.id, type: 'status_change' }
        });
        if (!stageActivity || stageActivity.newValue !== 'Qualified') {
            throw new Error('Pipeline stage transition activity was not logged');
        }
        console.log('17.1 Activity recorded for stage transition:', stageActivity.description);

        await prisma.lead.delete({ where: { id: tempLead.id } });

        // 18. Test User Schema Constraints (Unique Email & Min Length)
        console.log('\n--- Testing Relational Models, Constraints & Transactions ---');
        const regRes1 = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'API Test User',
                email: 'api_test_user@example.com',
                password: 'secretPassword123',
                role: 'sales_rep'
            })
        });
        const regData1 = await regRes1.json();
        console.log('18. POST /api/auth/register (User Creation):', regRes1.status, regData1.user?.name);
        if (regRes1.status !== 201 || !regData1.user) throw new Error('User registration failed');

        // Test Unique Constraint Violation
        const regRes2 = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'api_test_user@example.com',
                password: 'differentPassword'
            })
        });
        console.log('18.1 User Unique Email Constraint check:', regRes2.status === 400 ? 'PASSED (Duplicate Rejected)' : 'FAILED');
        if (regRes2.status !== 400) throw new Error('User unique email constraint failed');

        // Test Password Minlength Constraint
        const regRes3 = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'api_test_short@example.com',
                password: '123'
            })
        });
        console.log('18.2 Password minlength constraint check:', regRes3.status === 400 ? 'PASSED (Short Password Rejected)' : 'FAILED');
        if (regRes3.status !== 400) throw new Error('Password minlength constraint failed');

        // 19. Test Foreign Key Constraint Violation on FollowUp & ActivityLog
        const nonExistentLeadId = '00000000-0000-0000-0000-000000000000';
        let fkCaught = false;
        try {
            await prisma.followUp.create({
                data: {
                    leadId: nonExistentLeadId,
                    title: 'Invalid FK Task',
                    dueDate: new Date()
                }
            });
        } catch (err) {
            fkCaught = err.code === 'P2003' || err.message.includes('Foreign key');
        }
        console.log('19. Foreign Key Constraint on FollowUp with non-existent leadId:', fkCaught ? 'PASSED (Blocked by PostgreSQL FK)' : 'FAILED');
        if (!fkCaught) throw new Error('Foreign key constraint on FollowUp was not enforced');

        // 20. Test Relational Endpoints (FollowUps & ActivityLogs)
        const relLead = await prisma.lead.create({
            data: {
                name: 'API_TEST_Relational_Lead',
                company: 'Relational Systems Inc',
                email: 'relational@test.com',
                status: 'New'
            }
        });

        // Add task via API
        const addRelTaskRes = await fetch(`${BASE_URL}/${relLead.id}/tasks`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                title: 'Contract Signing Meeting',
                type: 'Meeting',
                dueDate: new Date(Date.now() + 86400000).toISOString(),
                priority: 'High',
                assignedTo: 'Alex M.'
            })
        });
        console.log('20. POST /api/leads/:id/tasks (Saved to PostgreSQL follow_ups table):', addRelTaskRes.status);
        if (addRelTaskRes.status !== 201) throw new Error('Adding task to relational table failed');

        // Query relational follow-ups endpoint
        const relFollowUpsRes = await fetch(`${BASE_URL}/${relLead.id}/follow-ups`, { headers: authHeaders });
        const relFollowUpsData = await relFollowUpsRes.json();
        console.log('20.1 GET /api/leads/:id/follow-ups (Relational Query):', relFollowUpsRes.status, 'Count:', relFollowUpsData.count);
        if (relFollowUpsRes.status !== 200 || relFollowUpsData.count !== 1) throw new Error('Querying relational follow-ups failed');

        // Query relational activity logs endpoint
        const relLogsRes = await fetch(`${BASE_URL}/${relLead.id}/activity-logs`, { headers: authHeaders });
        const relLogsData = await relLogsRes.json();
        console.log('20.2 GET /api/leads/:id/activity-logs (Relational Query):', relLogsRes.status, 'Count:', relLogsData.count);
        if (relLogsRes.status !== 200 || relLogsData.count < 1) throw new Error('Querying relational activity logs failed');

        // 21. Test Cascade Deletion in Transaction (Deleting Lead removes all child FollowUps & ActivityLogs)
        const delRelRes = await fetch(`${BASE_URL}/${relLead.id}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        console.log('21. DELETE /api/leads/:id (Cascade Deletion with Foreign Key & Transaction):', delRelRes.status);
        if (delRelRes.status !== 200) throw new Error('Cascade delete request failed');

        const remainingFollowUps = await prisma.followUp.count({ where: { leadId: relLead.id } });
        const remainingActivityLogs = await prisma.activityLog.count({ where: { leadId: relLead.id } });
        console.log('21.1 Child records remaining in database:', { followUps: remainingFollowUps, activityLogs: remainingActivityLogs });
        if (remainingFollowUps !== 0 || remainingActivityLogs !== 0) {
            throw new Error('Cascade deletion failed: orphaned child documents remain');
        }
        console.log('21.2 Cascade Deletion Verification: PASSED (Zero orphaned records)');

        // =========================================================================
        // PHASE 1: SECURITY HARDENING REGRESSION TEST SUITE (Tasks 1 - 6)
        // =========================================================================
        console.log('\n======================================================');
        console.log('Testing Phase 1: Security Hardening & Authorization');
        console.log('======================================================\n');

        // Helper to register and login a test user with a specific role
        async function setupTestUser(name, email, password, role) {
            await fetch(`${AUTH_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            if (role && role !== 'user') {
                await prisma.user.update({
                    where: { email },
                    data: { role }
                });
            }

            const loginRes = await fetch(`${AUTH_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            return {
                user: loginData.user,
                token: loginData.token,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginData.token}`
                }
            };
        }

        const userA = await setupTestUser('API_User_A', 'api_test_user_a@example.com', 'PassUserA123!', 'user');
        const userB = await setupTestUser('API_User_B', 'api_test_user_b@example.com', 'PassUserB123!', 'user');
        const legacyRep = await setupTestUser('API_Legacy_Rep', 'api_test_legacy_rep@example.com', 'PassLegacy123!', 'sales_rep');
        const adminUser = await setupTestUser('API_Admin_User', 'api_test_admin@example.com', 'PassAdmin123!', 'admin');

        // -------------------------------------------------------------
        // Task 1: User-Directory Endpoint Security (GET /api/auth/users)
        // -------------------------------------------------------------
        console.log('\n--- Task 1: User Directory Endpoint Security ---');

        // 1.1 Unauthenticated request rejected with 401
        const unauthUsersRes = await fetch(`${AUTH_URL}/users`);
        console.log('1.1 GET /api/auth/users without token:', unauthUsersRes.status, '(401 Expected)');
        if (unauthUsersRes.status !== 401) throw new Error('Expected 401 Unauthorized for /api/auth/users without token');

        // 1.2 Standard user rejected with 403
        const stdUserUsersRes = await fetch(`${AUTH_URL}/users`, { headers: userA.headers });
        console.log('1.2 GET /api/auth/users as standard user:', stdUserUsersRes.status, '(403 Expected)');
        if (stdUserUsersRes.status !== 403) throw new Error('Expected 403 Forbidden for standard user on /api/auth/users');

        // 1.3 Legacy sales_rep rejected with 403 (fail-closed)
        const legacyUsersRes = await fetch(`${AUTH_URL}/users`, { headers: legacyRep.headers });
        console.log('1.3 GET /api/auth/users as legacy sales_rep:', legacyUsersRes.status, '(403 Expected)');
        if (legacyUsersRes.status !== 403) throw new Error('Expected 403 Forbidden for legacy sales_rep on /api/auth/users');

        // 1.4 Manager allowed with 200
        const managerUsersRes = await fetch(`${AUTH_URL}/users`, { headers: authHeaders });
        const managerUsersData = await managerUsersRes.json();
        console.log('1.4 GET /api/auth/users as manager:', managerUsersRes.status, 'Count:', managerUsersData.count);
        if (managerUsersRes.status !== 200 || !Array.isArray(managerUsersData.users)) {
            throw new Error('Manager failed to access /api/auth/users');
        }

        // 1.5 Admin allowed with 200
        const adminUsersRes = await fetch(`${AUTH_URL}/users`, { headers: adminUser.headers });
        console.log('1.5 GET /api/auth/users as admin:', adminUsersRes.status, '(200 Expected)');
        if (adminUsersRes.status !== 200) throw new Error('Admin failed to access /api/auth/users');

        // 1.6 Verify NO password hashes or secrets in user response
        const hasExposedSecrets = managerUsersData.users.some(u => u.password || u.hash || u.salt || u.token);
        console.log('1.6 User list contains NO password hashes or sensitive fields:', !hasExposedSecrets);
        if (hasExposedSecrets) throw new Error('User directory leaks sensitive credentials');

        // -------------------------------------------------------------
        // Task 2 & Task 3: Object-Level Authorization (IDOR Protections)
        // -------------------------------------------------------------
        console.log('\n--- Task 2 & 3: Object-Level Authorization on Leads & Follow-ups ---');

        // Setup: User A creates a lead and follow-up task
        const createLeadARes = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: userA.headers,
            body: JSON.stringify({
                name: 'API_TEST_Private_Lead_A',
                company: 'User A Corp',
                email: 'lead_a@example.com',
                phone: '+1 555-100-2000',
                status: 'New',
                priority: 'High',
                notes: 'Confidential client data owned by User A'
            })
        });
        const createLeadAData = await createLeadARes.json();
        const leadAId = createLeadAData.lead._id || createLeadAData.lead.id;
        console.log('Setup: User A created Lead A:', leadAId);

        const createTaskARes = await fetch(`${BASE_URL}/${leadAId}/tasks`, {
            method: 'POST',
            headers: userA.headers,
            body: JSON.stringify({
                title: 'User A Follow-up Task',
                type: 'Call',
                dueDate: new Date(Date.now() + 86400000).toISOString(),
                priority: 'High'
            })
        });
        const createTaskAData = await createTaskARes.json();
        const taskAId = createTaskAData.task._id || createTaskAData.task.id;
        console.log('Setup: User A added task to Lead A:', taskAId);

        // Record initial activity log count on Lead A
        const initialActivityCount = await prisma.activityLog.count({ where: { leadId: leadAId } });

        // 2.1 User B cannot read User A's lead
        const userBGetLeadRes = await fetch(`${BASE_URL}/${leadAId}`, { headers: userB.headers });
        console.log('2.1 User B GET Lead A:', userBGetLeadRes.status, '(403 Expected)');
        if (userBGetLeadRes.status !== 403) throw new Error('Expected 403 for User B viewing Lead A');

        // 2.2 User B cannot update User A's lead
        const userBPutLeadRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'PUT',
            headers: userB.headers,
            body: JSON.stringify({ company: 'Hacked by User B' })
        });
        console.log('2.2 User B PUT Lead A:', userBPutLeadRes.status, '(403 Expected)');
        if (userBPutLeadRes.status !== 403) throw new Error('Expected 403 for User B updating Lead A');

        // 2.3 User B cannot change stage on User A's lead
        const userBStageRes = await fetch(`${BASE_URL}/${leadAId}/stage`, {
            method: 'PATCH',
            headers: userB.headers,
            body: JSON.stringify({ stage: 'Won' })
        });
        console.log('2.3 User B PATCH stage on Lead A:', userBStageRes.status, '(403 Expected)');
        if (userBStageRes.status !== 403) throw new Error('Expected 403 for User B changing stage on Lead A');

        // 2.4 User B cannot archive User A's lead
        const userBArchiveRes = await fetch(`${BASE_URL}/${leadAId}/archive`, {
            method: 'PATCH',
            headers: userB.headers
        });
        console.log('2.4 User B PATCH archive on Lead A:', userBArchiveRes.status, '(403 Expected)');
        if (userBArchiveRes.status !== 403) throw new Error('Expected 403 for User B archiving Lead A');

        // 2.5 User B cannot unarchive User A's lead
        const userBUnarchiveRes = await fetch(`${BASE_URL}/${leadAId}/unarchive`, {
            method: 'PATCH',
            headers: userB.headers
        });
        console.log('2.5 User B PATCH unarchive on Lead A:', userBUnarchiveRes.status, '(403 Expected)');
        if (userBUnarchiveRes.status !== 403) throw new Error('Expected 403 for User B unarchiving Lead A');

        // 2.6 User B cannot delete User A's lead
        const userBDelRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'DELETE',
            headers: userB.headers
        });
        console.log('2.6 User B DELETE Lead A:', userBDelRes.status, '(403 Expected)');
        if (userBDelRes.status !== 403) throw new Error('Expected 403 for User B deleting Lead A');

        // 2.7 User A (standard user) cannot delete own lead (deletion restricted to admin/manager)
        const userADelRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'DELETE',
            headers: userA.headers
        });
        console.log('2.7 User A (standard user) DELETE own lead:', userADelRes.status, '(403 Expected)');
        if (userADelRes.status !== 403) throw new Error('Expected 403 for standard user deleting own lead');

        // 2.8 User B cannot inject manual activity on User A's lead
        const userBActRes = await fetch(`${BASE_URL}/${leadAId}/activities`, {
            method: 'POST',
            headers: userB.headers,
            body: JSON.stringify({ description: 'Malicious injected activity', action: 'Malicious injected activity', type: 'note_added' })
        });
        console.log('2.8 User B POST activity on Lead A:', userBActRes.status, '(403 Expected)');
        if (userBActRes.status !== 403) throw new Error('Expected 403 for User B posting activity on Lead A');

        // 2.9 User B cannot add task to User A's lead
        const userBAddTaskRes = await fetch(`${BASE_URL}/${leadAId}/tasks`, {
            method: 'POST',
            headers: userB.headers,
            body: JSON.stringify({ title: 'Malicious task', dueDate: new Date().toISOString() })
        });
        console.log('2.9 User B POST task on Lead A:', userBAddTaskRes.status, '(403 Expected)');
        if (userBAddTaskRes.status !== 403) throw new Error('Expected 403 for User B adding task to Lead A');

        // 2.10 User B cannot complete User A's task via /:id/tasks/:taskId
        const userBCompleteTaskRes = await fetch(`${BASE_URL}/${leadAId}/tasks/${taskAId}`, {
            method: 'PATCH',
            headers: userB.headers,
            body: JSON.stringify({ isCompleted: true })
        });
        console.log('2.10 User B PATCH /:id/tasks/:taskId on Lead A:', userBCompleteTaskRes.status, '(403 Expected)');
        if (userBCompleteTaskRes.status !== 403) throw new Error('Expected 403 for User B completing task on Lead A');

        // 2.11 User B cannot complete User A's task via /tasks/:taskId (direct IDOR attack)
        const userBDirectTaskRes = await fetch(`${BASE_URL}/tasks/${taskAId}`, {
            method: 'PATCH',
            headers: userB.headers,
            body: JSON.stringify({ isCompleted: true })
        });
        console.log('2.11 User B PATCH /tasks/:taskId direct attack:', userBDirectTaskRes.status, '(403 Expected)');
        if (userBDirectTaskRes.status !== 403) throw new Error('Expected 403 for User B direct task modification');

        // 2.12 User B cannot delete User A's task
        const userBDelTaskRes = await fetch(`${BASE_URL}/${leadAId}/tasks/${taskAId}`, {
            method: 'DELETE',
            headers: userB.headers
        });
        console.log('2.12 User B DELETE /:id/tasks/:taskId on Lead A:', userBDelTaskRes.status, '(403 Expected)');
        if (userBDelTaskRes.status !== 403) throw new Error('Expected 403 for User B deleting task on Lead A');

        // 2.13 Cross-lead task mismatch check (Task A does not belong to Lead A2)
        const createLeadA2Res = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: userA.headers,
            body: JSON.stringify({
                name: 'API_TEST_Private_Lead_A2',
                company: 'User A Corp Second',
                email: 'lead_a2@example.com'
            })
        });
        const createLeadA2Data = await createLeadA2Res.json();
        const leadA2Id = createLeadA2Data.lead._id || createLeadA2Data.lead.id;

        const crossLeadTaskRes = await fetch(`${BASE_URL}/${leadA2Id}/tasks/${taskAId}`, {
            method: 'PATCH',
            headers: userA.headers,
            body: JSON.stringify({ isCompleted: true })
        });
        console.log('2.13 Mismatched parent lead and task ID:', crossLeadTaskRes.status, '(404/400 Expected)');
        if (![400, 404].includes(crossLeadTaskRes.status)) throw new Error('Expected 404 or 400 for task not belonging to lead');

        // -------------------------------------------------------------
        // Task 4: Prevent Unauthorized Lead Ownership & Assignment Changes
        // -------------------------------------------------------------
        console.log('\n--- Task 4: Prevention of Ownership & Assignment Tampering ---');

        // 4.1 Standard User A cannot change owner field
        const tamperOwnerRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'PUT',
            headers: userA.headers,
            body: JSON.stringify({ owner: 'Malicious_New_Owner' })
        });
        console.log('4.1 User A attempting to modify owner field:', tamperOwnerRes.status, '(403 Expected)');
        if (tamperOwnerRes.status !== 403) throw new Error('Expected 403 for standard user changing lead owner');

        // 4.2 Standard User A cannot change assignedToId
        const tamperAssignRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'PUT',
            headers: userA.headers,
            body: JSON.stringify({ assignedToId: '00000000-0000-0000-0000-000000000000' })
        });
        console.log('4.2 User A attempting to modify assignedToId:', tamperAssignRes.status, '(403 Expected)');
        if (tamperAssignRes.status !== 403) throw new Error('Expected 403 for standard user changing assignedToId');

        // 4.3 Standard User A cannot change createdById
        const tamperCreatorRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'PUT',
            headers: userA.headers,
            body: JSON.stringify({ createdById: '00000000-0000-0000-0000-000000000000' })
        });
        console.log('4.3 User A attempting to modify createdById:', tamperCreatorRes.status, '(403 Expected)');
        if (tamperCreatorRes.status !== 403) throw new Error('Expected 403 for standard user changing createdById');

        // 4.4 Standard User A CAN legitimately update permitted lead fields
        const legitimateUpdateRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'PUT',
            headers: userA.headers,
            body: JSON.stringify({
                notes: 'Legitimately updated notes by authorized owner',
                budget: '₹15,00,000'
            })
        });
        console.log('4.4 User A updating normal fields (notes/budget):', legitimateUpdateRes.status, '(200 Expected)');
        if (legitimateUpdateRes.status !== 200) throw new Error('Standard user legitimate lead update failed');

        // -------------------------------------------------------------
        // Task 5: Fail-Closed Role Scope Safety
        // -------------------------------------------------------------
        console.log('\n--- Task 5: Fail-Closed Role Scope Safety ---');

        // 5.1 Legacy sales_rep cannot see User A's private lead in list
        const legacyLeadsRes = await fetch(`${BASE_URL}?search=API_TEST_Private_Lead_A`, {
            headers: legacyRep.headers
        });
        const legacyLeadsData = await legacyLeadsRes.json();
        const legacyFoundPrivate = legacyLeadsData.leads.some(l => (l._id || l.id) === leadAId);
        console.log('5.1 Legacy sales_rep denied access to other user lead in list:', !legacyFoundPrivate);
        if (legacyFoundPrivate) throw new Error('Fail-closed violation: legacy sales_rep accessed unscoped lead');

        // 5.2 Legacy sales_rep cannot access GET /:id of User A's lead
        const legacySingleRes = await fetch(`${BASE_URL}/${leadAId}`, {
            headers: legacyRep.headers
        });
        console.log('5.2 Legacy sales_rep GET single lead A:', legacySingleRes.status, '(403 Expected)');
        if (legacySingleRes.status !== 403) throw new Error('Fail-closed violation: legacy sales_rep accessed single lead');

        // -------------------------------------------------------------
        // Task 7 (from prompt): Admin & Manager Privileged Operations Retained
        // -------------------------------------------------------------
        console.log('\n--- Task 7: Manager & Admin Privileged Operations ---');

        // 7.1 Manager can view User A's lead
        const managerGetRes = await fetch(`${BASE_URL}/${leadAId}`, { headers: authHeaders });
        console.log('7.1 Manager GET Lead A:', managerGetRes.status, '(200 Expected)');
        if (managerGetRes.status !== 200) throw new Error('Manager failed to view Lead A');

        // 7.2 Manager can reassign lead ownership
        const managerReassignRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ owner: 'Shivam S.' })
        });
        console.log('7.2 Manager reassigning lead owner:', managerReassignRes.status, '(200 Expected)');
        if (managerReassignRes.status !== 200) throw new Error('Manager failed to reassign lead');

        // 7.3 Manager can archive lead
        const managerArchiveRes = await fetch(`${BASE_URL}/${leadAId}/archive`, {
            method: 'PATCH',
            headers: authHeaders
        });
        console.log('7.3 Manager archiving Lead A:', managerArchiveRes.status, '(200 Expected)');
        if (managerArchiveRes.status !== 200) throw new Error('Manager failed to archive lead');

        // 7.4 Manager can unarchive lead
        const managerUnarchiveRes = await fetch(`${BASE_URL}/${leadAId}/unarchive`, {
            method: 'PATCH',
            headers: authHeaders
        });
        console.log('7.4 Manager unarchiving Lead A:', managerUnarchiveRes.status, '(200 Expected)');
        if (managerUnarchiveRes.status !== 200) throw new Error('Manager failed to unarchive lead');

        // -------------------------------------------------------------
        // Task 8 (from prompt): Verification of Database Invariance
        // -------------------------------------------------------------
        console.log('\n--- Task 8: Database & Activity Invariance After Unauthorized Attacks ---');

        // 8.1 Verify Task A is still NOT completed despite User B's attacks
        const currentTaskA = await prisma.followUp.findUnique({ where: { id: taskAId } });
        console.log('8.1 Task A remains uncompleted in DB:', currentTaskA && !currentTaskA.isCompleted);
        if (!currentTaskA || currentTaskA.isCompleted) {
            throw new Error('Database invariance violated: Task A was modified by unauthorized requests');
        }

        // 8.2 Verify no unauthorized activity logs were generated by User B
        const userBActivities = await prisma.activityLog.findMany({
            where: {
                leadId: leadAId,
                performedById: userB.user.id
            }
        });
        console.log('8.2 Fraudulent activity logs generated by User B:', userBActivities.length, '(0 Expected)');
        if (userBActivities.length > 0) {
            throw new Error('Database invariance violated: unauthorized activity logs were inserted');
        }

        // 7.5 Admin can permanently delete lead
        const adminDelRes = await fetch(`${BASE_URL}/${leadAId}`, {
            method: 'DELETE',
            headers: adminUser.headers
        });
        console.log('7.5 Admin DELETE Lead A:', adminDelRes.status, '(200 Expected)');
        if (adminDelRes.status !== 200) throw new Error('Admin failed to delete Lead A');

        // Clean up Lead A2
        await fetch(`${BASE_URL}/${leadA2Id}`, {
            method: 'DELETE',
            headers: adminUser.headers
        });

        console.log('\n>>> ALL SECURITY REGRESSION TESTS (TASKS 1-8) PASSED SUCCESSFULLY! <<<');
        console.log('\n>>> ALL TESTS (AUTH SECURITY, PROTECTED ROUTES, LEADS, PIPELINE, RELATIONAL TABLES, CONSTRAINTS & TRANSACTIONS) PASSED ON POSTGRESQL! <<<');

    } finally {
        await prisma.followUp.deleteMany({
            where: {
                lead: {
                    name: { startsWith: 'API_TEST_' }
                }
            }
        });
        await prisma.activityLog.deleteMany({
            where: {
                lead: {
                    name: { startsWith: 'API_TEST_' }
                }
            }
        });
        await prisma.lead.deleteMany({
            where: { name: { startsWith: 'API_TEST_' } }
        });
        await prisma.user.deleteMany({
            where: { email: { startsWith: 'api_test_' } }
        });

        server.close();
        await prisma.$disconnect();
    }
}

testApi().catch(err => {
    console.error('API Test Error:', err);
    process.exit(1);
});
