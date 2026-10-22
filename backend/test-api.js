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
