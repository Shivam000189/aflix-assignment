const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { withTransaction } = require('../utils/transaction');
const importRoutes = require('./leadImportRoutes');

// Mount CSV & PDF Lead Import routes
router.use('/import', importRoutes);

// Helper to normalize phone numbers (digits only)
const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

// Helper to check whether a role grants global administrative or managerial access
const isGlobalRole = (role) => {
    return typeof role === 'string' && (role === 'admin' || role === 'manager');
};

// Helper to enforce role-based lead data scoping.
// Fail-closed role policy:
// - 'admin' and 'manager': organization-wide access (returns null)
// - 'user', legacy roles ('sales_rep'), unknown/missing/malformed roles: user-scoped access
const getUserScopeFilter = (req) => {
    if (!req.user || !isGlobalRole(req.user.role)) {
        const userId = req.user?.userId || 'unauthenticated';
        const userName = req.user?.name;
        const userEmail = req.user?.email;

        return {
            OR: [
                { assignedToId: userId },
                { createdById: userId },
                ...(userName ? [{ owner: { equals: userName, mode: 'insensitive' } }] : []),
                ...(userEmail ? [{ owner: { equals: userEmail, mode: 'insensitive' } }] : [])
            ]
        };
    }
    return null; // Admin and Manager roles see all leads
};

// Formatting helpers to ensure backward compatibility with frontend and API consumers
const formatTask = (task) => {
    if (!task) return null;
    return {
        ...task,
        _id: task.id
    };
};

const formatActivity = (act) => {
    if (!act) return null;
    return {
        ...act,
        _id: act.id,
        performedBy: act.performedByName || 'Agent'
    };
};

const formatLead = (lead) => {
    if (!lead) return null;
    const tasks = (lead.followUps || []).map(formatTask);
    const activities = (lead.activityLogs || []).map(formatActivity);
    return {
        ...lead,
        _id: lead.id,
        tasks,
        activities
    };
};


const findDuplicates = async ({ email, phone, excludeId = null }) => {
    const conditions = [];
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    const normPhone = phone ? normalizePhone(phone) : '';

    if (normalizedEmail) {
        conditions.push({ email: { equals: normalizedEmail, mode: 'insensitive' } });
    }
    if (normPhone) {
        conditions.push({ normalizedPhone: { contains: normPhone } });
    }

    if (conditions.length === 0) {
        return { isDuplicate: false, reasons: [], matches: [] };
    }

    const whereClause = {
        AND: [
            excludeId ? { id: { not: excludeId } } : {},
            { OR: conditions }
        ]
    };

    const matches = await prisma.lead.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            company: true,
            email: true,
            phone: true,
            normalizedPhone: true,
            status: true,
            priority: true,
            isArchived: true,
            createdAt: true,
            owner: true
        }
    });

    const reasons = new Set();
    matches.forEach(match => {
        if (normalizedEmail && match.email && match.email.toLowerCase() === normalizedEmail) {
            reasons.add('email');
        }
        if (normPhone && match.normalizedPhone && (match.normalizedPhone === normPhone || match.normalizedPhone.includes(normPhone))) {
            reasons.add('phone');
        }
    });

    const formattedMatches = matches.map(m => ({
        ...m,
        _id: m.id
    }));

    return {
        isDuplicate: formattedMatches.length > 0,
        reasons: Array.from(reasons),
        matches: formattedMatches
    };
};


router.get('/check-duplicate', async (req, res) => {
    try {
        const { email, phone, excludeId } = req.query;
        const result = await findDuplicates({ email, phone, excludeId });
        res.status(200).json({
            success: true,
            isDuplicate: result.isDuplicate,
            reasons: result.reasons,
            matches: result.matches
        });
    } catch (err) {
        console.error('Error checking duplicate lead:', err.message);
        res.status(500).json({ success: false, message: 'Server error checking duplicates', error: err.message });
    }
});


router.get('/stats', async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const userScope = getUserScopeFilter(req);

        let leadCounts, followUpCounts;

        if (userScope) {
            const userId = req.user.userId;
            const userName = req.user.name || '';
            const userEmail = req.user.email || '';

            const [scopedLeads] = await prisma.$queryRaw`
                SELECT 
                    COUNT(*)::int AS "total",
                    COUNT(*) FILTER (WHERE "isArchived" = false)::int AS "active",
                    COUNT(*) FILTER (WHERE "isArchived" = true)::int AS "archived",
                    COUNT(*) FILTER (WHERE "isDuplicate" = true)::int AS "duplicates",
                    COUNT(*) FILTER (WHERE "isArchived" = false AND "priority" IN ('High', 'Urgent'))::int AS "highPriority"
                FROM "leads"
                WHERE "assignedToId" = ${userId} 
                   OR "createdById" = ${userId}
                   OR LOWER("owner") = LOWER(${userName})
                   OR LOWER("owner") = LOWER(${userEmail});
            `;
            leadCounts = scopedLeads;

            const [scopedFollowUps] = await prisma.$queryRaw`
                SELECT
                    COUNT(*) FILTER (WHERE f."dueDate" < ${startOfToday})::int AS "overdueTasks",
                    COUNT(*) FILTER (WHERE f."dueDate" >= ${startOfToday})::int AS "upcomingTasks"
                FROM "follow_ups" f
                JOIN "leads" l ON f."leadId" = l.id
                WHERE f."isCompleted" = false 
                  AND l."isArchived" = false
                  AND (l."assignedToId" = ${userId} 
                       OR l."createdById" = ${userId}
                       OR LOWER(l."owner") = LOWER(${userName})
                       OR LOWER(l."owner") = LOWER(${userEmail}));
            `;
            followUpCounts = scopedFollowUps;
        } else {
            const [allLeads] = await prisma.$queryRaw`
                SELECT 
                    COUNT(*)::int AS "total",
                    COUNT(*) FILTER (WHERE "isArchived" = false)::int AS "active",
                    COUNT(*) FILTER (WHERE "isArchived" = true)::int AS "archived",
                    COUNT(*) FILTER (WHERE "isDuplicate" = true)::int AS "duplicates",
                    COUNT(*) FILTER (WHERE "isArchived" = false AND "priority" IN ('High', 'Urgent'))::int AS "highPriority"
                FROM "leads";
            `;
            leadCounts = allLeads;

            const [allFollowUps] = await prisma.$queryRaw`
                SELECT
                    COUNT(*) FILTER (WHERE f."dueDate" < ${startOfToday})::int AS "overdueTasks",
                    COUNT(*) FILTER (WHERE f."dueDate" >= ${startOfToday})::int AS "upcomingTasks"
                FROM "follow_ups" f
                JOIN "leads" l ON f."leadId" = l.id
                WHERE f."isCompleted" = false AND l."isArchived" = false;
            `;
            followUpCounts = allFollowUps;
        }

        const groupWhere = {
            isArchived: false,
            ...(userScope ? userScope : {})
        };

        const [rawStatusGroups, rawPriorityGroups, rawSourceGroups] = await Promise.all([
            prisma.lead.groupBy({
                by: ['status'],
                where: groupWhere,
                _count: { id: true }
            }),
            prisma.lead.groupBy({
                by: ['priority'],
                where: groupWhere,
                _count: { id: true }
            }),
            prisma.lead.groupBy({
                by: ['source'],
                where: groupWhere,
                _count: { id: true }
            })
        ]);

        const total = leadCounts?.total || 0;
        const active = leadCounts?.active || 0;
        const archived = leadCounts?.archived || 0;
        const duplicates = leadCounts?.duplicates || 0;
        const highPriority = leadCounts?.highPriority || 0;
        const overdueTasks = followUpCounts?.overdueTasks || 0;
        const upcomingTasks = followUpCounts?.upcomingTasks || 0;

        const rawMap = {};
        rawStatusGroups.forEach(g => {
            rawMap[g.status || 'Unknown'] = g._count.id;
        });

        const proposalCount = (rawMap['Proposal'] || 0) + (rawMap['Proposal Sent'] || 0) + (rawMap['Negotiation'] || 0);

        const byStatus = {
            New: rawMap['New'] || 0,
            Contacted: rawMap['Contacted'] || 0,
            Qualified: rawMap['Qualified'] || 0,
            Proposal: proposalCount,
            Won: rawMap['Won'] || 0,
            Lost: rawMap['Lost'] || 0
        };

        const totalClosed = byStatus.Won + byStatus.Lost;
        const winRate = totalClosed > 0 ? Math.round((byStatus.Won / totalClosed) * 100) : 0;

        const byPriority = {};
        rawPriorityGroups.forEach(g => {
            byPriority[g.priority || 'Unknown'] = g._count.id;
        });

        const bySource = {};
        rawSourceGroups.forEach(g => {
            bySource[g.source || 'Unknown'] = g._count.id;
        });

        res.status(200).json({
            success: true,
            stats: {
                total,
                active,
                archived,
                duplicates,
                highPriority,
                overdueTasks,
                upcomingTasks,
                winRate,
                byStatus,
                byPriority,
                bySource
            }
        });
    } catch (err) {
        console.error('Error fetching lead stats:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});


router.get('/pipeline', async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

        const userScope = getUserScopeFilter(req);
        const leads = await prisma.lead.findMany({
            where: {
                isArchived: false,
                ...(userScope ? userScope : {})
            },
            include: {
                followUps: {
                    orderBy: { dueDate: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const parseBudgetValue = (budgetStr) => {
            if (!budgetStr) return 0;
            const str = String(budgetStr).trim();

            const parseSingle = (token) => {
                if (!token) return 0;
                let clean = token.replace(/[₹$,\s]/g, '').toLowerCase();
                if (clean.includes('cr') || clean.includes('crore')) {
                    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
                    return isNaN(num) ? 0 : num * 10000000;
                }
                if (clean.includes('l') || clean.includes('lakh')) {
                    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
                    return isNaN(num) ? 0 : num * 100000;
                }
                if (clean.includes('k')) {
                    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
                    return isNaN(num) ? 0 : num * 1000;
                }
                const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
                return isNaN(num) ? 0 : num;
            };

            if (str.includes('-')) {
                const parts = str.split('-');
                const v1 = parseSingle(parts[0]);
                const v2 = parseSingle(parts[1]);
                if (v1 && v2) return (v1 + v2) / 2;
                return v1 || v2 || 0;
            }

            return parseSingle(str);
        };

        const stagesData = {};
        STAGES.forEach(s => {
            stagesData[s] = {
                stage: s,
                leads: [],
                count: 0,
                totalValue: 0
            };
        });

        let highPriorityCount = 0;
        let overdueTasksCount = 0;

        leads.forEach(rawLead => {
            const lead = formatLead(rawLead);
            const pendingTasks = (lead.tasks || []).filter(t => !t.isCompleted);
            const overdueTasks = pendingTasks.filter(t => new Date(t.dueDate) < startOfToday);
            const upcomingTasks = pendingTasks.filter(t => new Date(t.dueDate) >= startOfToday);

            if (overdueTasks.length > 0) overdueTasksCount += overdueTasks.length;
            if (lead.priority === 'High' || lead.priority === 'Urgent') highPriorityCount++;

            let mappedStage = lead.status;
            if (mappedStage === 'Proposal Sent' || mappedStage === 'Negotiation') {
                mappedStage = 'Proposal';
            }
            if (!stagesData[mappedStage]) {
                mappedStage = 'New';
            }

            const val = parseBudgetValue(lead.budget);
            stagesData[mappedStage].totalValue += val;
            stagesData[mappedStage].count += 1;

            stagesData[mappedStage].leads.push({
                ...lead,
                followUpSummary: {
                    hasOverdue: overdueTasks.length > 0,
                    overdueCount: overdueTasks.length,
                    pendingCount: pendingTasks.length,
                    nextTask: overdueTasks[0] || upcomingTasks[0] || null
                }
            });
        });

        const funnelStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won'];
        const baseCount = Math.max(
            1,
            stagesData['New'].count +
            stagesData['Contacted'].count +
            stagesData['Qualified'].count +
            stagesData['Proposal'].count +
            stagesData['Won'].count
        );

        const conversionFunnel = funnelStages.map(stg => {
            const count = stagesData[stg].count;
            return {
                stage: stg,
                count,
                percentage: Math.round((count / baseCount) * 100)
            };
        });

        const stageCounts = {};
        STAGES.forEach(s => {
            stageCounts[s] = stagesData[s].count;
        });

        res.status(200).json({
            success: true,
            stages: stagesData,
            stageList: STAGES,
            metrics: {
                totalActiveLeads: leads.length,
                highPriorityCount,
                overdueTasksCount,
                stageCounts,
                conversionFunnel,
                winRate: (stagesData['Won'].count + stagesData['Lost'].count) > 0
                    ? Math.round((stagesData['Won'].count / (stagesData['Won'].count + stagesData['Lost'].count)) * 100)
                    : 0
            }
        });
    } catch (err) {
        console.error('Error fetching pipeline:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});


router.patch('/:id/stage', async (req, res) => {
    try {
        const { stage, updatedBy } = req.body;
        if (!stage) {
            return res.status(400).json({ success: false, message: 'Pipeline stage is required' });
        }

        const userScope = getUserScopeFilter(req);
        const result = await withTransaction(async (tx) => {
            const leadExists = await tx.lead.findUnique({ where: { id: req.params.id } });
            if (!leadExists) {
                return { status: 404, message: 'Lead not found' };
            }

            if (userScope) {
                const accessible = await tx.lead.findFirst({
                    where: { id: req.params.id, ...userScope }
                });
                if (!accessible) {
                    return { status: 403, message: 'Access denied: you do not have permission to modify this lead stage' };
                }
            }

            const prevStage = leadExists.status;

            // 1. Update lead stage
            const lead = await tx.lead.update({
                where: { id: req.params.id },
                data: { status: stage }
            });

            // 2. Insert audit activity log inside same transaction
            await tx.activityLog.create({
                data: {
                    leadId: lead.id,
                    type: 'status_change',
                    description: `Pipeline stage moved from '${prevStage}' to '${stage}'`,
                    fieldName: 'status',
                    oldValue: prevStage,
                    newValue: stage,
                    performedByName: updatedBy || req.user?.name || 'Agent',
                    performedById: req.user?.userId || null,
                    timestamp: new Date()
                }
            });

            // Re-fetch with fresh relations
            const fullLead = await tx.lead.findUnique({
                where: { id: lead.id },
                include: {
                    followUps: { orderBy: { dueDate: 'asc' } },
                    activityLogs: { orderBy: { timestamp: 'desc' } }
                }
            });

            return { status: 200, lead: fullLead };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: `Lead moved to ${stage}`,
            lead: formatLead(result.lead)
        });
    } catch (err) {
        console.error('Error updating lead stage:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});


const createLeadHandler = async (req, res) => {
    try {
        const {
            name,
            company,
            email,
            phone,
            source,
            serviceInterested,
            budget,
            status,
            priority,
            owner,
            notes,
            tasks,
            activities,
            allowDuplicate,
            preventDuplicates,
            assignedToId,
            createdById
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Lead name is required' });
        }

        // Check for duplicates
        const duplicateCheck = await findDuplicates({ email, phone });

        if (duplicateCheck.isDuplicate) {
            if (preventDuplicates || allowDuplicate === false) {
                return res.status(409).json({
                    success: false,
                    isDuplicate: true,
                    message: `Likely duplicate lead found matching by ${duplicateCheck.reasons.join(' and ')}.`,
                    duplicateReasons: duplicateCheck.reasons,
                    duplicateMatches: duplicateCheck.matches
                });
            }
        }

        const isDup = duplicateCheck.isDuplicate;
        const dupReasons = isDup ? duplicateCheck.reasons : [];
        const dupMatches = isDup ? duplicateCheck.matches.map(m => m.id) : [];

        const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
        const normPhone = phone ? normalizePhone(phone) : '';

        const isPrivileged = req.user && isGlobalRole(req.user.role);
        const effectiveAssignedToId = isPrivileged
            ? (assignedToId || null)
            : req.user.userId;
        const effectiveCreatedById = req.user ? req.user.userId : (createdById || null);
        const effectiveOwner = isPrivileged
            ? (owner || 'Unassigned')
            : (req.user.name || req.user.email || 'User');

        // Execute creation inside PostgreSQL ACID transaction
        const createdLead = await withTransaction(async (tx) => {
            const lead = await tx.lead.create({
                data: {
                    name: String(name).trim(),
                    company: company ? String(company).trim() : '',
                    email: normalizedEmail,
                    phone: phone ? String(phone).trim() : '',
                    normalizedPhone: normPhone,
                    source: source || 'Website',
                    serviceInterested: serviceInterested || 'Web Development',
                    budget: budget || '₹1,00,000 - ₹5,00,000',
                    status: status || 'New',
                    priority: priority || 'Medium',
                    owner: effectiveOwner,
                    notes: notes ? String(notes).trim() : '',
                    isDuplicate: isDup,
                    duplicateReasons: dupReasons,
                    duplicateMatches: dupMatches,
                    assignedToId: effectiveAssignedToId,
                    createdById: effectiveCreatedById
                }
            });

            // 1. Create initial audit log
            await tx.activityLog.create({
                data: {
                    leadId: lead.id,
                    type: 'created',
                    description: `Lead created for ${lead.name}${lead.company ? ` from ${lead.company}` : ''}`,
                    performedByName: effectiveOwner || 'System'
                }
            });

            // 2. Create tasks if provided
            if (Array.isArray(tasks) && tasks.length > 0) {
                for (const t of tasks) {
                    if (t.title) {
                        await tx.followUp.create({
                            data: {
                                leadId: lead.id,
                                title: String(t.title).trim(),
                                type: t.type || 'Follow Up',
                                dueDate: t.dueDate ? new Date(t.dueDate) : new Date(Date.now() + 86400000),
                                notes: t.notes ? String(t.notes).trim() : '',
                                priority: t.priority || 'Medium',
                                isCompleted: Boolean(t.isCompleted),
                                completedAt: t.isCompleted ? new Date() : null,
                                assignedToName: t.assignedTo || owner || 'Unassigned'
                            }
                        });
                    }
                }
            }

            // 3. Create initial custom activities if provided
            if (Array.isArray(activities) && activities.length > 0) {
                for (const act of activities) {
                    if (act.description && act.type !== 'created') {
                        await tx.activityLog.create({
                            data: {
                                leadId: lead.id,
                                type: act.type || 'note_added',
                                description: String(act.description).trim(),
                                performedByName: act.performedBy || owner || 'System',
                                timestamp: act.timestamp ? new Date(act.timestamp) : new Date()
                            }
                        });
                    }
                }
            }

            return await tx.lead.findUnique({
                where: { id: lead.id },
                include: {
                    followUps: { orderBy: { dueDate: 'asc' } },
                    activityLogs: { orderBy: { timestamp: 'desc' } }
                }
            });
        });

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            lead: formatLead(createdLead)
        });
    } catch (err) {
        console.error('Error creating lead:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};

router.post('/', createLeadHandler);
router.post('/lead', createLeadHandler);


const getLeadsHandler = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            priority = '',
            source = '',
            owner = '',
            archived = 'false',
            duplicate = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const andConditions = [];

        // Role-based data scoping for regular users
        const userScope = getUserScopeFilter(req);
        if (userScope) {
            andConditions.push(userScope);
        }

        // Archiving filter
        if (archived === 'true') {
            andConditions.push({ isArchived: true });
        } else if (archived === 'false') {
            andConditions.push({ isArchived: false });
        }

        // Duplicate filter
        if (duplicate === 'true') {
            andConditions.push({ isDuplicate: true });
        } else if (duplicate === 'false') {
            andConditions.push({ isDuplicate: false });
        }

        // Status filter (supports comma-separated)
        if (status) {
            const statusArr = status.split(',').map(s => s.trim()).filter(Boolean);
            if (statusArr.length === 1) {
                andConditions.push({ status: statusArr[0] });
            } else if (statusArr.length > 1) {
                andConditions.push({ status: { in: statusArr } });
            }
        }

        // Priority filter
        if (priority) {
            const priorityArr = priority.split(',').map(p => p.trim()).filter(Boolean);
            if (priorityArr.length === 1) {
                andConditions.push({ priority: priorityArr[0] });
            } else if (priorityArr.length > 1) {
                andConditions.push({ priority: { in: priorityArr } });
            }
        }

        // Source filter
        if (source) {
            andConditions.push({ source: { equals: source, mode: 'insensitive' } });
        }

        // Owner filter
        if (owner) {
            andConditions.push({ owner: { equals: owner, mode: 'insensitive' } });
        }

        // Search across name, company, email, serviceInterested
        if (search && search.trim()) {
            const s = search.trim();
            andConditions.push({
                OR: [
                    { name: { contains: s, mode: 'insensitive' } },
                    { company: { contains: s, mode: 'insensitive' } },
                    { email: { contains: s, mode: 'insensitive' } },
                    { serviceInterested: { contains: s, mode: 'insensitive' } },
                    { notes: { contains: s, mode: 'insensitive' } }
                ]
            });
        }

        const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

        // Valid sorting fields
        const validSortFields = ['createdAt', 'updatedAt', 'name', 'company', 'status', 'priority'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDir = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

        const [totalLeads, leads] = await Promise.all([
            prisma.lead.count({ where: whereClause }),
            prisma.lead.findMany({
                where: whereClause,
                include: {
                    followUps: { orderBy: { dueDate: 'asc' } },
                    activityLogs: { orderBy: { timestamp: 'desc' } }
                },
                orderBy: { [sortField]: sortDir },
                skip,
                take: limitNum
            })
        ]);

        const totalPages = Math.ceil(totalLeads / limitNum);

        res.status(200).json({
            success: true,
            leads: leads.map(formatLead),
            pagination: {
                totalLeads,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (err) {
        console.error('Error fetching leads:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};

router.get('/', getLeadsHandler);
router.get('/lead', getLeadsHandler);

// -------------------------------------------------------------
// GET /api/leads/follow-ups/overview (Comprehensive follow-ups hub)
// -------------------------------------------------------------
router.get('/follow-ups/overview', async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const userScope = getUserScopeFilter(req);
        const allTasks = await prisma.followUp.findMany({
            where: userScope ? { lead: userScope } : {},
            include: {
                lead: {
                    select: {
                        id: true,
                        name: true,
                        company: true,
                        email: true,
                        phone: true,
                        status: true,
                        priority: true,
                        isArchived: true
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        const activeTasks = allTasks.filter(t => !t.lead.isArchived);

        let totalFollowUps = activeTasks.length;
        let completed = 0;
        let pending = 0;
        let overdue = 0;
        let today = 0;
        let upcoming = 0;
        let urgent = 0;

        const overdueList = [];
        const todayList = [];
        const upcomingList = [];

        activeTasks.forEach(rawTask => {
            const task = formatTask(rawTask);
            const taskLead = { ...task.lead, _id: task.lead.id };
            const enrichedTask = {
                ...task,
                lead: taskLead,
                leadId: taskLead.id,
                leadName: taskLead.name,
                leadCompany: taskLead.company
            };

            if (task.isCompleted) {
                completed++;
            } else {
                pending++;
                if (task.priority === 'Urgent') urgent++;

                const d = new Date(task.dueDate);
                if (d < startOfToday) {
                    overdue++;
                    overdueList.push(enrichedTask);
                } else if (d >= startOfToday && d <= endOfToday) {
                    today++;
                    todayList.push(enrichedTask);
                } else {
                    upcoming++;
                    upcomingList.push(enrichedTask);
                }
            }
        });

        res.status(200).json({
            success: true,
            counts: {
                totalFollowUps,
                completed,
                pending,
                overdue,
                today,
                upcoming,
                urgent
            },
            tasks: {
                overdue: overdueList,
                today: todayList,
                upcoming: upcomingList
            }
        });
    } catch (err) {
        console.error('Error fetching follow-ups overview:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// GET /api/leads/:id (Get single lead by ID with all relations)
// -------------------------------------------------------------
router.get('/:id', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const leadExists = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!leadExists) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        if (userScope) {
            const accessible = await prisma.lead.findFirst({
                where: {
                    id: req.params.id,
                    ...userScope
                }
            });
            if (!accessible) {
                return res.status(403).json({ success: false, message: 'Access denied: you do not have permission to view this lead' });
            }
        }

        const lead = await prisma.lead.findUnique({
            where: { id: req.params.id },
            include: {
                followUps: { orderBy: { dueDate: 'asc' } },
                activityLogs: { orderBy: { timestamp: 'desc' } }
            }
        });

        res.status(200).json({
            success: true,
            lead: formatLead(lead)
        });
    } catch (err) {
        console.error('Error fetching lead by ID:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// PUT /api/leads/:id (Update lead fields with audit activity log & transactions)
// -------------------------------------------------------------
const updateLeadHandler = async (req, res) => {
    try {
        const {
            name,
            company,
            email,
            phone,
            source,
            serviceInterested,
            budget,
            status,
            priority,
            owner,
            notes,
            assignedToId
        } = req.body;

        const userScope = getUserScopeFilter(req);
        const isPrivileged = req.user && isGlobalRole(req.user.role);

        const result = await withTransaction(async (tx) => {
            const leadExists = await tx.lead.findUnique({
                where: { id: req.params.id }
            });

            if (!leadExists) {
                return { status: 404, message: 'Lead not found' };
            }

            if (userScope) {
                const accessible = await tx.lead.findFirst({
                    where: {
                        id: req.params.id,
                        ...userScope
                    }
                });
                if (!accessible) {
                    return { status: 403, message: 'Access denied: you do not have permission to modify this lead' };
                }
            }

            // Task 4: Standard users must not change owner, assignedToId, or createdById
            if (!isPrivileged) {
                if ((owner !== undefined && owner !== leadExists.owner) ||
                    (assignedToId !== undefined && assignedToId !== leadExists.assignedToId) ||
                    (req.body.createdById !== undefined && req.body.createdById !== leadExists.createdById)) {
                    return {
                        status: 403,
                        message: 'Access denied: only administrators and managers can reassign lead owners or assignees'
                    };
                }
            }

            const updates = {};
            const activityEntries = [];

            if (name !== undefined && name.trim()) {
                if (leadExists.name !== name.trim()) {
                    activityEntries.push({
                        type: 'field_update',
                        description: `Lead name updated from '${leadExists.name}' to '${name.trim()}'`,
                        fieldName: 'name',
                        oldValue: leadExists.name,
                        newValue: name.trim()
                    });
                }
                updates.name = name.trim();
            }

            if (company !== undefined) {
                if (leadExists.company !== company.trim()) {
                    activityEntries.push({
                        type: 'field_update',
                        description: `Company updated to '${company.trim()}'`,
                        fieldName: 'company',
                        oldValue: leadExists.company,
                        newValue: company.trim()
                    });
                }
                updates.company = company.trim();
            }

            if (email !== undefined) {
                const normEmail = String(email).trim().toLowerCase();
                if (leadExists.email !== normEmail) {
                    activityEntries.push({
                        type: 'field_update',
                        description: `Email updated to '${normEmail}'`,
                        fieldName: 'email',
                        oldValue: leadExists.email,
                        newValue: normEmail
                    });
                }
                updates.email = normEmail;
            }

            if (phone !== undefined) {
                const normPhone = normalizePhone(phone);
                updates.phone = String(phone).trim();
                updates.normalizedPhone = normPhone;
            }

            if (status !== undefined && leadExists.status !== status) {
                activityEntries.push({
                    type: 'status_change',
                    description: `Status changed from '${leadExists.status}' to '${status}'`,
                    fieldName: 'status',
                    oldValue: leadExists.status,
                    newValue: status
                });
                updates.status = status;
            }

            if (priority !== undefined && leadExists.priority !== priority) {
                activityEntries.push({
                    type: 'priority_change',
                    description: `Priority changed from '${leadExists.priority}' to '${priority}'`,
                    fieldName: 'priority',
                    oldValue: leadExists.priority,
                    newValue: priority
                });
                updates.priority = priority;
            }

            if (isPrivileged && owner !== undefined && leadExists.owner !== owner) {
                activityEntries.push({
                    type: 'owner_change',
                    description: `Lead owner reassigned from '${leadExists.owner}' to '${owner}'`,
                    fieldName: 'owner',
                    oldValue: leadExists.owner,
                    newValue: owner
                });
                updates.owner = owner;
            }

            if (source !== undefined) updates.source = source;
            if (serviceInterested !== undefined) updates.serviceInterested = serviceInterested;
            if (budget !== undefined) updates.budget = budget;
            if (notes !== undefined) updates.notes = notes;
            if (isPrivileged && assignedToId !== undefined) updates.assignedToId = assignedToId;

            // 1. Update lead in DB
            await tx.lead.update({
                where: { id: req.params.id },
                data: updates
            });

            // 2. Insert any activity logs inside transaction (batched in single query)
            if (activityEntries.length > 0) {
                await tx.activityLog.createMany({
                    data: activityEntries.map((act) => ({
                        leadId: req.params.id,
                        type: act.type,
                        description: act.description,
                        fieldName: act.fieldName,
                        oldValue: String(act.oldValue ?? ''),
                        newValue: String(act.newValue ?? ''),
                        performedByName: req.user?.name || 'Agent',
                        performedById: req.user?.userId || null
                    }))
                });
            }

            const updated = await tx.lead.findUnique({
                where: { id: req.params.id },
                include: {
                    followUps: { orderBy: { dueDate: 'asc' } },
                    activityLogs: { orderBy: { timestamp: 'desc' } }
                }
            });

            return { status: 200, lead: updated };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            lead: formatLead(result.lead)
        });
    } catch (err) {
        console.error('Error updating lead:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};

router.put('/:id', updateLeadHandler);
router.put('/lead/:id', updateLeadHandler);

// -------------------------------------------------------------
// POST /api/leads/:id/tasks (Add follow-up task inside transaction)
// -------------------------------------------------------------
router.post('/:id/tasks', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!lead) {
            return res.status(404).json({ success: false, message: `Lead with ID ${req.params.id} does not exist.` });
        }

        if (userScope) {
            const accessible = await prisma.lead.findFirst({
                where: { id: req.params.id, ...userScope }
            });
            if (!accessible) {
                return res.status(403).json({ success: false, message: 'Access denied: you do not have permission to add tasks to this lead' });
            }
        }

        const { title, type, dueDate, notes, priority, assignedTo } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Task title is required' });
        }
        if (!dueDate) {
            return res.status(400).json({ success: false, message: 'Task due date is required' });
        }

        const result = await withTransaction(async (tx) => {
            const leadExists = lead;

            const newTask = await tx.followUp.create({
                data: {
                    leadId: req.params.id,
                    title: String(title).trim(),
                    type: type || 'Follow Up',
                    dueDate: new Date(dueDate),
                    notes: notes ? String(notes).trim() : '',
                    priority: priority || 'Medium',
                    isCompleted: false,
                    assignedToName: assignedTo || leadExists.owner || 'Unassigned',
                    assignedToId: leadExists.assignedToId || null,
                    createdById: req.user?.userId || null
                }
            });

            // Activity log for task added
            await tx.activityLog.create({
                data: {
                    leadId: req.params.id,
                    type: 'task_added',
                    description: `Follow-up task scheduled: "${newTask.title}" (Due: ${new Date(newTask.dueDate).toLocaleDateString()})`,
                    performedByName: req.user?.name || assignedTo || 'Agent',
                    performedById: req.user?.userId || null
                }
            });

            return { status: 201, task: newTask };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(201).json({
            success: true,
            message: 'Follow-up task scheduled',
            task: formatTask(result.task)
        });
    } catch (err) {
        console.error('Error adding follow-up task:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// PATCH /api/leads/:id/tasks/:taskId (Toggle task completion or edit task)
// -------------------------------------------------------------
router.patch('/:id/tasks/:taskId', async (req, res) => {
    try {
        const { isCompleted, title, type, dueDate, notes, priority, assignedTo } = req.body;
        const userScope = getUserScopeFilter(req);

        const result = await withTransaction(async (tx) => {
            const leadExists = await tx.lead.findUnique({ where: { id: req.params.id } });
            if (!leadExists) {
                return { status: 404, message: 'Lead not found' };
            }

            if (userScope) {
                const accessible = await tx.lead.findFirst({
                    where: { id: req.params.id, ...userScope }
                });
                if (!accessible) {
                    return { status: 403, message: 'Access denied: you do not have permission to modify tasks on this lead' };
                }
            }

            const existingTask = await tx.followUp.findUnique({
                where: { id: req.params.taskId }
            });

            if (!existingTask || existingTask.leadId !== req.params.id) {
                return { status: 404, message: 'Task not found on this lead' };
            }

            const data = {};
            if (isCompleted !== undefined) {
                data.isCompleted = Boolean(isCompleted);
                data.completedAt = Boolean(isCompleted) ? new Date() : null;
            }
            if (title !== undefined) data.title = String(title).trim();
            if (type !== undefined) data.type = type;
            if (dueDate !== undefined) data.dueDate = new Date(dueDate);
            if (notes !== undefined) data.notes = notes;
            if (priority !== undefined) data.priority = priority;
            if (assignedTo !== undefined) data.assignedToName = assignedTo;

            const task = await tx.followUp.update({
                where: { id: req.params.taskId },
                data
            });

            // Activity log
            if (isCompleted !== undefined && isCompleted !== existingTask.isCompleted) {
                await tx.activityLog.create({
                    data: {
                        leadId: req.params.id,
                        type: 'task_completed',
                        description: `Task "${task.title}" marked as ${task.isCompleted ? 'Completed' : 'Pending'}`,
                        performedByName: req.user?.name || 'Agent',
                        performedById: req.user?.userId || null
                    }
                });
            } else {
                await tx.activityLog.create({
                    data: {
                        leadId: req.params.id,
                        type: 'task_updated',
                        description: `Task "${task.title}" updated`,
                        performedByName: req.user?.name || 'Agent',
                        performedById: req.user?.userId || null
                    }
                });
            }

            return { status: 200, task };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task: formatTask(result.task)
        });
    } catch (err) {
        console.error('Error updating task:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// PATCH /api/leads/tasks/:taskId (Direct toggle/update task by taskId)
// -------------------------------------------------------------
router.patch('/tasks/:taskId', async (req, res) => {
    try {
        const { isCompleted, title, type, dueDate, notes, priority, assignedTo } = req.body;
        const userScope = getUserScopeFilter(req);

        const result = await withTransaction(async (tx) => {
            const existingTask = await tx.followUp.findUnique({
                where: { id: req.params.taskId }
            });

            if (!existingTask) {
                return { status: 404, message: 'Task not found' };
            }

            // Verify parent lead is accessible to this user
            if (userScope) {
                const accessibleLead = await tx.lead.findFirst({
                    where: { id: existingTask.leadId, ...userScope }
                });
                if (!accessibleLead) {
                    return { status: 403, message: 'Access denied: you do not have permission to modify this task' };
                }
            }

            const data = {};
            if (isCompleted !== undefined) {
                data.isCompleted = Boolean(isCompleted);
                data.completedAt = Boolean(isCompleted) ? new Date() : null;
            }
            if (title !== undefined) data.title = String(title).trim();
            if (type !== undefined) data.type = type;
            if (dueDate !== undefined) data.dueDate = new Date(dueDate);
            if (notes !== undefined) data.notes = notes;
            if (priority !== undefined) data.priority = priority;
            if (assignedTo !== undefined) data.assignedToName = assignedTo;

            const task = await tx.followUp.update({
                where: { id: req.params.taskId },
                data
            });

            // Activity log on the lead
            if (isCompleted !== undefined && isCompleted !== existingTask.isCompleted) {
                await tx.activityLog.create({
                    data: {
                        leadId: existingTask.leadId,
                        type: 'task_completed',
                        description: `Task "${task.title}" marked as ${task.isCompleted ? 'Completed' : 'Pending'}`,
                        performedByName: req.user?.name || 'Agent',
                        performedById: req.user?.userId || null
                    }
                });
            } else {
                await tx.activityLog.create({
                    data: {
                        leadId: existingTask.leadId,
                        type: 'task_updated',
                        description: `Task "${task.title}" updated`,
                        performedByName: req.user?.name || 'Agent',
                        performedById: req.user?.userId || null
                    }
                });
            }

            return { status: 200, task };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task: formatTask(result.task)
        });
    } catch (err) {
        console.error('Error updating task directly:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// DELETE /api/leads/:id/tasks/:taskId (Delete follow-up task)
// -------------------------------------------------------------
router.delete('/:id/tasks/:taskId', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const result = await withTransaction(async (tx) => {
            const leadExists = await tx.lead.findUnique({ where: { id: req.params.id } });
            if (!leadExists) {
                return { status: 404, message: 'Lead not found' };
            }

            if (userScope) {
                const accessible = await tx.lead.findFirst({
                    where: { id: req.params.id, ...userScope }
                });
                if (!accessible) {
                    return { status: 403, message: 'Access denied: you do not have permission to delete tasks on this lead' };
                }
            }

            const task = await tx.followUp.findUnique({
                where: { id: req.params.taskId }
            });

            if (!task || task.leadId !== req.params.id) {
                return { status: 404, message: 'Task not found on this lead' };
            }

            await tx.followUp.delete({
                where: { id: req.params.taskId }
            });

            await tx.activityLog.create({
                data: {
                    leadId: req.params.id,
                    type: 'task_deleted',
                    description: `Task "${task.title}" was deleted`,
                    performedByName: req.user?.name || 'Agent',
                    performedById: req.user?.userId || null
                }
            });

            return { status: 200, task };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting task:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// POST /api/leads/:id/activities (Add manual note/activity to lead timeline)
// -------------------------------------------------------------
router.post('/:id/activities', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        if (userScope) {
            const accessible = await prisma.lead.findFirst({
                where: { id: req.params.id, ...userScope }
            });
            if (!accessible) {
                return res.status(403).json({ success: false, message: 'Access denied: you do not have permission to record activities on this lead' });
            }
        }

        const { type, performedBy } = req.body;
        const description = req.body.description || req.body.action || req.body.notes;

        if (!description || !String(description).trim()) {
            return res.status(400).json({ success: false, message: 'Activity description is required' });
        }

        const activity = await prisma.activityLog.create({
            data: {
                leadId: req.params.id,
                type: type || 'note_added',
                description: String(description).trim(),
                performedByName: req.user?.name || performedBy || 'Agent',
                performedById: req.user?.userId || null,
                timestamp: new Date()
            }
        });

        res.status(201).json({
            success: true,
            message: 'Activity recorded',
            activity: formatActivity(activity)
        });
    } catch (err) {
        console.error('Error recording activity:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// PATCH /api/leads/:id/archive (Archive lead)
// -------------------------------------------------------------
router.patch('/:id/archive', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const result = await withTransaction(async (tx) => {
            const existing = await tx.lead.findUnique({ where: { id: req.params.id } });
            if (!existing) return { status: 404, message: 'Lead not found' };

            if (userScope) {
                const accessible = await tx.lead.findFirst({
                    where: { id: req.params.id, ...userScope }
                });
                if (!accessible) {
                    return { status: 403, message: 'Access denied: you do not have permission to archive this lead' };
                }
            }

            const updated = await tx.lead.update({
                where: { id: req.params.id },
                data: {
                    isArchived: true,
                    archivedAt: new Date()
                }
            });

            await tx.activityLog.create({
                data: {
                    leadId: req.params.id,
                    type: 'archived',
                    description: 'Lead was archived',
                    performedByName: req.user?.name || 'Agent',
                    performedById: req.user?.userId || null
                }
            });

            const fullLead = await tx.lead.findUnique({
                where: { id: req.params.id },
                include: { followUps: true, activityLogs: true }
            });

            return { status: 200, lead: fullLead };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: 'Lead archived successfully',
            lead: formatLead(result.lead)
        });
    } catch (err) {
        console.error('Error archiving lead:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// PATCH /api/leads/:id/unarchive (Restore archived lead)
// -------------------------------------------------------------
router.patch('/:id/unarchive', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const result = await withTransaction(async (tx) => {
            const existing = await tx.lead.findUnique({ where: { id: req.params.id } });
            if (!existing) return { status: 404, message: 'Lead not found' };

            if (userScope) {
                const accessible = await tx.lead.findFirst({
                    where: { id: req.params.id, ...userScope }
                });
                if (!accessible) {
                    return { status: 403, message: 'Access denied: you do not have permission to restore this lead' };
                }
            }

            const updated = await tx.lead.update({
                where: { id: req.params.id },
                data: {
                    isArchived: false,
                    archivedAt: null
                }
            });

            await tx.activityLog.create({
                data: {
                    leadId: req.params.id,
                    type: 'restored',
                    description: 'Lead was restored from archive',
                    performedByName: req.user?.name || 'Agent',
                    performedById: req.user?.userId || null
                }
            });

            const fullLead = await tx.lead.findUnique({
                where: { id: req.params.id },
                include: { followUps: true, activityLogs: true }
            });

            return { status: 200, lead: fullLead };
        });

        if (result.status === 403) {
            return res.status(403).json({ success: false, message: result.message });
        }
        if (result.status === 404) {
            return res.status(404).json({ success: false, message: result.message });
        }

        res.status(200).json({
            success: true,
            message: 'Lead restored successfully',
            lead: formatLead(result.lead)
        });
    } catch (err) {
        console.error('Error unarchiving lead:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// DELETE /api/leads/:id (Cascade delete lead & child tasks/logs)
// -------------------------------------------------------------
const deleteLeadHandler = async (req, res) => {
    try {
        const isPrivileged = req.user && isGlobalRole(req.user.role);
        if (!isPrivileged) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: only administrators and managers can permanently delete leads'
            });
        }

        const deleted = await withTransaction(async (tx) => {
            const lead = await tx.lead.findUnique({ where: { id: req.params.id } });
            if (!lead) return null;

            // In PostgreSQL with Prisma onDelete: Cascade, deleting the lead
            // automatically deletes all child FollowUps and ActivityLogs.
            await tx.lead.delete({
                where: { id: req.params.id }
            });

            return lead;
        });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Lead and associated records deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting lead:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};

router.delete('/:id', deleteLeadHandler);
router.delete('/lead/:id', deleteLeadHandler);

// -------------------------------------------------------------
// GET /api/leads/:id/follow-ups (Relational Follow-ups Query)
// -------------------------------------------------------------
router.get('/:id/follow-ups', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        if (userScope) {
            const accessible = await prisma.lead.findFirst({
                where: { id: req.params.id, ...userScope }
            });
            if (!accessible) {
                return res.status(403).json({ success: false, message: 'Access denied: you do not have permission to view records on this lead' });
            }
        }

        const followUps = await prisma.followUp.findMany({
            where: { leadId: req.params.id },
            orderBy: { dueDate: 'asc' }
        });

        res.status(200).json({
            success: true,
            count: followUps.length,
            followUps: followUps.map(formatTask)
        });
    } catch (err) {
        console.error('Error fetching relational follow-ups:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// GET /api/leads/:id/activity-logs (Relational Activity Logs Query)
// -------------------------------------------------------------
router.get('/:id/activity-logs', async (req, res) => {
    try {
        const userScope = getUserScopeFilter(req);
        const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        if (userScope) {
            const accessible = await prisma.lead.findFirst({
                where: { id: req.params.id, ...userScope }
            });
            if (!accessible) {
                return res.status(403).json({ success: false, message: 'Access denied: you do not have permission to view records on this lead' });
            }
        }

        const logs = await prisma.activityLog.findMany({
            where: { leadId: req.params.id },
            orderBy: { timestamp: 'desc' }
        });

        res.status(200).json({
            success: true,
            count: logs.length,
            activities: logs.map(formatActivity)
        });
    } catch (err) {
        console.error('Error fetching relational activity logs:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

// -------------------------------------------------------------
// GET /api/leads/team/users (List active sales reps for assignment)
// -------------------------------------------------------------
router.get('/team/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true
            },
            orderBy: { name: 'asc' }
        });

        res.status(200).json({
            success: true,
            users: users.map(u => ({ ...u, _id: u.id }))
        });
    } catch (err) {
        console.error('Error fetching team users:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

module.exports = router;