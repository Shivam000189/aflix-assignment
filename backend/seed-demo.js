/**
 * Seed script to populate standardized demo accounts and rich demo leads across all 6 pipeline stages in PostgreSQL:
 * New, Contacted, Qualified, Proposal, Won, Lost
 *
 * Demo Credentials (Development & Demonstration ONLY):
 *   Admin:   admin@aflix.com   / password123 (role: admin)   - Organization-wide access
 *   Manager: manager@aflix.com / password123 (role: manager) - Organization-wide access
 *   User:    user@aflix.com    / password123 (role: user)    - Scoped access (sees only assigned leads)
 *
 * NOTE: This script is fully idempotent. It uses Prisma upsert and checks before inserting,
 * ensuring repeated seed runs never duplicate accounts or delete existing user data.
 */
require('dotenv').config();
const { prisma } = require('./config/db');
const bcrypt = require('bcryptjs');

// Helper to normalize phone numbers (digits only)
const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

async function seed() {
    console.log('\n======================================================');
    console.log('Seeding Demo Accounts and CRM Pipeline Leads');
    console.log('======================================================\n');

    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Seed or Upsert Standard Demo Users
    console.log('1. Upserting standard demo accounts...');
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@aflix.com' },
        update: {
            role: 'admin',
            name: 'Aflix Admin',
            isActive: true
        },
        create: {
            name: 'Aflix Admin',
            email: 'admin@aflix.com',
            password: defaultPasswordHash,
            role: 'admin',
            phone: '+1 (555) 000-0001',
            isActive: true
        }
    });

    const managerUser = await prisma.user.upsert({
        where: { email: 'manager@aflix.com' },
        update: {
            role: 'manager',
            name: 'Aflix Manager',
            isActive: true
        },
        create: {
            name: 'Aflix Manager',
            email: 'manager@aflix.com',
            password: defaultPasswordHash,
            role: 'manager',
            phone: '+1 (555) 000-0002',
            isActive: true
        }
    });

    const standardUser = await prisma.user.upsert({
        where: { email: 'user@aflix.com' },
        update: {
            role: 'user',
            name: 'Aflix User',
            isActive: true
        },
        create: {
            name: 'Aflix User',
            email: 'user@aflix.com',
            password: defaultPasswordHash,
            role: 'user',
            phone: '+1 (555) 000-0003',
            isActive: true
        }
    });

    console.log('   ✓ Admin Account:   admin@aflix.com   (role: admin)');
    console.log('   ✓ Manager Account: manager@aflix.com (role: manager)');
    console.log('   ✓ User Account:    user@aflix.com    (role: user)');

    // Map user roles for lead association
    const userMap = {
        'Aflix Admin': adminUser.id,
        'Aflix Manager': managerUser.id,
        'Aflix User': standardUser.id,
        'Admin': adminUser.id,
        'Manager': managerUser.id,
        'User': standardUser.id,
        'Shivam S.': managerUser.id,
        'Alex M.': standardUser.id
    };

    // 2. Demo Leads Definition
    const demoLeads = [
        {
            name: 'Sophia Laurent',
            company: 'Aura Fintech Solutions',
            email: 'sophia.l@aurafintech.io',
            phone: '+1 (415) 890-1234',
            source: 'Website',
            serviceInterested: 'Enterprise Software',
            budget: '₹25,00,000 - ₹50,00,000',
            status: 'New',
            priority: 'Urgent',
            owner: 'Aflix User',
            notes: 'High-intent enterprise lead looking for real-time payments platform architecture.',
            tasks: [
                {
                    title: 'Conduct initial discovery call',
                    type: 'Call',
                    dueDate: tomorrow,
                    priority: 'Urgent',
                    notes: 'Prepare slide deck on SOC2 compliance and scalability.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'created',
                    description: 'Inbound enterprise inquiry received from website pricing calculator.'
                }
            ]
        },
        {
            name: 'Marcus Vance',
            company: 'Apex Logistics Global',
            email: 'm.vance@apexlogistics.com',
            phone: '+1 (312) 555-8910',
            source: 'LinkedIn',
            serviceInterested: 'Cloud & DevOps',
            budget: '₹10,00,000 - ₹25,00,000',
            status: 'New',
            priority: 'Medium',
            owner: 'Aflix Manager',
            notes: 'AWS cloud migration and Kubernetes infrastructure audit needed before Q3.',
            tasks: [],
            activities: [
                {
                    type: 'created',
                    description: 'Lead imported via LinkedIn InMail campaign.'
                }
            ]
        },
        {
            name: 'Elena Rostova',
            company: 'CyberShield Systems',
            email: 'elena@cybershield.tech',
            phone: '+1 (650) 441-9988',
            source: 'Referral',
            serviceInterested: 'Enterprise Software',
            budget: '₹15,00,000 - ₹30,00,000',
            status: 'Contacted',
            priority: 'High',
            owner: 'Aflix User',
            notes: 'Spoke with CTO, requested technical audit scope and compliance roadmap.',
            tasks: [
                {
                    title: 'Send compliance questionnaire response',
                    type: 'Email',
                    dueDate: yesterday, // OVERDUE
                    priority: 'High',
                    notes: 'CTO requested this by close of business yesterday.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Status moved from New to Contacted after 20-min intro call.'
                }
            ]
        },
        {
            name: 'David Chen',
            company: 'OmniHealth AI',
            email: 'david.chen@omnihealth.ai',
            phone: '+1 (206) 789-0123',
            source: 'Google Ads',
            serviceInterested: 'Enterprise Software',
            budget: '₹50,00,000+',
            status: 'Contacted',
            priority: 'Urgent',
            owner: 'Aflix Manager',
            notes: 'HIPAA compliant mobile healthcare patient portal app.',
            tasks: [
                {
                    title: 'Schedule technical deep-dive call with Head of Engineering',
                    type: 'Meeting',
                    dueDate: twoDaysAgo, // OVERDUE
                    priority: 'Urgent',
                    notes: 'Follow up on calendar link.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'task_added',
                    description: 'Created follow-up task for technical deep-dive.'
                }
            ]
        },
        {
            name: 'Sarah Jenkins',
            company: 'NextGen Cloud AI',
            email: 'sarah.jenkins@nextgen.ai',
            phone: '+1 (555) 432-8765',
            source: 'LinkedIn',
            serviceInterested: 'Cloud & DevOps',
            budget: '₹10,00,000 - ₹25,00,000',
            status: 'Qualified',
            priority: 'High',
            owner: 'Aflix User',
            notes: 'Budget and technical fit confirmed. Stakeholder buy-in established.',
            tasks: [
                {
                    title: 'Deliver architecture blueprint presentation',
                    type: 'Meeting',
                    dueDate: nextWeek,
                    priority: 'High',
                    notes: 'Present proposed multi-region cluster architecture.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Lead qualified based on ₹20,00,000 budget and active Q3 timeline.'
                }
            ]
        },
        {
            name: 'Dr. Evelyn Reed',
            company: 'BioHealth Dynamics',
            email: 'evelyn@biohealth.org',
            phone: '+1 (555) 777-9911',
            source: 'Website',
            serviceInterested: 'Web Development',
            budget: '₹10,00,000 - ₹25,00,000',
            status: 'Qualified',
            priority: 'High',
            owner: 'Aflix Manager',
            notes: 'Clinical trial patient recruitment dashboard redesign.',
            tasks: [
                {
                    title: 'Review RFP scope and draft statement of work',
                    type: 'Follow Up',
                    dueDate: tomorrow,
                    priority: 'Medium',
                    notes: 'Outline milestones and deliverables.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Lead qualified by marketing team.'
                }
            ]
        },
        {
            name: 'Liam Gallagher',
            company: 'Pulse Digital Media',
            email: 'liam@pulsedigital.co',
            phone: '+1 (917) 654-3210',
            source: 'Referral',
            serviceInterested: 'Web Development',
            budget: '₹25,00,000 - ₹50,00,000',
            status: 'Proposal',
            priority: 'Urgent',
            owner: 'Aflix Admin',
            notes: 'Comprehensive ₹35,00,000 proposal sent covering UI/UX redesign and Next.js backend migration.',
            tasks: [
                {
                    title: 'Proposal review call with VP of Product',
                    type: 'Meeting',
                    dueDate: tomorrow,
                    priority: 'Urgent',
                    notes: 'Walk through scope, SLA and contract terms.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Stage changed to Proposal after formal delivery of SOW.'
                }
            ]
        },
        {
            name: 'Rachel Green',
            company: 'Zenith Retail Brands',
            email: 'rachel@zenithretail.com',
            phone: '+1 (212) 889-4455',
            source: 'Facebook Ads',
            serviceInterested: 'Web Development',
            budget: '₹15,00,000 - ₹30,00,000',
            status: 'Proposal',
            priority: 'High',
            owner: 'Aflix Manager',
            notes: 'Shopify Plus headless migration proposal under executive review.',
            tasks: [
                {
                    title: 'Follow up on proposal feedback',
                    type: 'Email',
                    dueDate: yesterday, // OVERDUE
                    priority: 'High',
                    notes: 'Check if CFO had questions regarding milestone billing.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Proposal delivered with 14-day validity.'
                }
            ]
        },
        {
            name: 'Vikram Malhotra',
            company: 'Indus Capital Partners',
            email: 'v.malhotra@induscap.in',
            phone: '+91 98200 12345',
            source: 'Website',
            serviceInterested: 'Enterprise Software',
            budget: '₹50,00,000+',
            status: 'Won',
            priority: 'High',
            owner: 'Aflix Admin',
            notes: 'Deal closed! ₹55,00,000 multi-tenant portfolio management system signed.',
            tasks: [
                {
                    title: 'Conduct project kickoff workshop',
                    type: 'Meeting',
                    dueDate: yesterday,
                    priority: 'High',
                    notes: 'Kickoff workshop completed with core stakeholders.',
                    isCompleted: true,
                    completedAt: yesterday
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Deal marked as WON! Contract signed (₹55,00,000).'
                }
            ]
        },
        {
            name: 'Claire Beauchamp',
            company: 'Highland Hospitality Group',
            email: 'claire@highlandhotels.co.uk',
            phone: '+44 20 7946 0991',
            source: 'Cold Call',
            serviceInterested: 'Web Development',
            budget: '₹10,00,000 - ₹25,00,000',
            status: 'Won',
            priority: 'Medium',
            owner: 'Aflix User',
            notes: 'Contract executed. Custom hotel booking engine with PMS integration.',
            tasks: [
                {
                    title: 'Onboarding setup call',
                    type: 'Call',
                    dueDate: nextWeek,
                    priority: 'Medium',
                    notes: 'Send welcome kit and establish Slack channel.',
                    isCompleted: false
                }
            ],
            activities: [
                {
                    type: 'status_change',
                    description: 'Deal closed and won!'
                }
            ]
        },
        {
            name: 'Arthur Pendelton',
            company: 'Pendelton Heritage Antiques',
            email: 'arthur@pendeltonheritage.com',
            phone: '+1 (617) 555-0144',
            source: 'Other',
            serviceInterested: 'Web Development',
            budget: '₹1,00,000 - ₹5,00,000',
            status: 'Lost',
            priority: 'Low',
            owner: 'Aflix Admin',
            notes: 'Budget mismatch. Client opted for a free off-the-shelf Wix template.',
            tasks: [],
            activities: [
                {
                    type: 'status_change',
                    description: 'Marked as Lost due to pricing/budget constraints.'
                }
            ]
        },
        {
            name: 'Jordan Miller',
            company: 'FastTrack Courier Systems',
            email: 'jordan@fasttrackcourier.com',
            phone: '+1 (773) 555-7890',
            source: 'Cold Call',
            serviceInterested: 'Enterprise Software',
            budget: '₹5,00,000 - ₹10,00,000',
            status: 'Lost',
            priority: 'Low',
            owner: 'Aflix User',
            notes: 'Internal project paused indefinitely due to company restructuring.',
            tasks: [],
            activities: [
                {
                    type: 'status_change',
                    description: 'Deal lost - prospect postponed technology initiatives.'
                }
            ]
        }
    ];

    // 3. Idempotently Seed Leads, Follow-ups, and Activity Logs
    console.log('\n2. Idempotently syncing demo leads and tasks...');
    let leadsCreated = 0;
    let leadsUpdated = 0;
    let tasksCreated = 0;
    let logsCreated = 0;

    for (const leadData of demoLeads) {
        const assignedUserId = userMap[leadData.owner] || standardUser.id;
        const normalizedEmail = leadData.email.toLowerCase();

        let lead = await prisma.lead.findFirst({
            where: { email: normalizedEmail }
        });

        if (!lead) {
            lead = await prisma.lead.create({
                data: {
                    name: leadData.name,
                    company: leadData.company,
                    email: normalizedEmail,
                    phone: leadData.phone,
                    normalizedPhone: normalizePhone(leadData.phone),
                    source: leadData.source,
                    serviceInterested: leadData.serviceInterested,
                    budget: leadData.budget,
                    status: leadData.status,
                    priority: leadData.priority,
                    owner: leadData.owner,
                    notes: leadData.notes,
                    assignedToId: assignedUserId,
                    createdById: assignedUserId
                }
            });
            leadsCreated++;
        } else {
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    name: leadData.name,
                    company: leadData.company,
                    source: leadData.source,
                    serviceInterested: leadData.serviceInterested,
                    budget: leadData.budget,
                    status: leadData.status,
                    priority: leadData.priority,
                    owner: leadData.owner,
                    assignedToId: assignedUserId,
                    createdById: assignedUserId
                }
            });
            leadsUpdated++;
        }

        // Seed FollowUp tasks idempotently
        for (const t of (leadData.tasks || [])) {
            const existingTask = await prisma.followUp.findFirst({
                where: { leadId: lead.id, title: t.title }
            });

            if (!existingTask) {
                await prisma.followUp.create({
                    data: {
                        leadId: lead.id,
                        title: t.title,
                        type: t.type,
                        dueDate: t.dueDate,
                        notes: t.notes || '',
                        priority: t.priority,
                        assignedToId: assignedUserId,
                        assignedToName: leadData.owner,
                        isCompleted: Boolean(t.isCompleted),
                        completedAt: t.completedAt || null
                    }
                });
                tasksCreated++;
            }
        }

        // Seed ActivityLogs idempotently
        for (const a of (leadData.activities || [])) {
            const existingLog = await prisma.activityLog.findFirst({
                where: { leadId: lead.id, type: a.type, description: a.description }
            });

            if (!existingLog) {
                await prisma.activityLog.create({
                    data: {
                        leadId: lead.id,
                        type: a.type,
                        description: a.description,
                        performedById: assignedUserId,
                        performedByName: leadData.owner,
                        timestamp: a.timestamp || new Date()
                    }
                });
                logsCreated++;
            }
        }
    }

    console.log(`\nDemo seeding complete!`);
    console.log(`  - Leads Created: ${leadsCreated}, Updated: ${leadsUpdated}`);
    console.log(`  - Tasks Added:   ${tasksCreated}`);
    console.log(`  - Logs Added:    ${logsCreated}`);

    console.log('\n-------------------------------------------------------------');
    console.log('Available Demo Login Accounts:');
    console.log('-------------------------------------------------------------');
    console.log('  Admin:   admin@aflix.com   / password123 (Global Pipeline Access)');
    console.log('  Manager: manager@aflix.com / password123 (Global Pipeline Access)');
    console.log('  User:    user@aflix.com    / password123 (User-Scoped Access)');
    console.log('-------------------------------------------------------------');
    console.log('NOTICE: These credentials are strictly for development and');
    console.log('demonstrations. They MUST be changed or disabled in production.');
    console.log('-------------------------------------------------------------\n');
}

seed()
    .catch(err => {
        console.error('Seed script error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
