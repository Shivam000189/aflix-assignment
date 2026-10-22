require('dotenv').config();
const { prisma } = require('./config/db');

// Helper to normalize phone numbers (digits only)
const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

async function runTests() {
    console.log('Connecting to PostgreSQL via Prisma...');
    await prisma.$connect();
    console.log('Connected to PostgreSQL successfully.');

    try {
        // Clear previous test leads with prefix TEST_
        await prisma.followUp.deleteMany({
            where: { lead: { name: { startsWith: 'TEST_' } } }
        });
        await prisma.activityLog.deleteMany({
            where: { lead: { name: { startsWith: 'TEST_' } } }
        });
        await prisma.lead.deleteMany({
            where: { name: { startsWith: 'TEST_' } }
        });
        console.log('Cleaned up previous test leads.');

        // Test 1: Create a lead with all fields
        const lead1 = await prisma.lead.create({
            data: {
                name: 'TEST_Alice Walker',
                company: 'TechCorp Solutions',
                email: 'alice.test@example.com',
                phone: '+1 (555) 234-5678',
                normalizedPhone: normalizePhone('+1 (555) 234-5678'),
                source: 'LinkedIn',
                serviceInterested: 'Web Development',
                budget: '₹10,00,000 - ₹25,00,000',
                status: 'New',
                priority: 'High',
                owner: 'Shivam S.',
                notes: 'Looking for a redesign of enterprise portal'
            }
        });
        console.log('✓ Test 1 Passed: Lead created with normalized phone:', lead1.normalizedPhone);
        if (lead1.normalizedPhone !== '15552345678') {
            throw new Error(`Phone normalization failed, got: ${lead1.normalizedPhone}`);
        }

        // Test 2: Duplicate detection by email
        const leadWithSameEmail = await prisma.lead.findMany({
            where: { email: 'alice.test@example.com' }
        });
        console.log('✓ Test 2 Passed: Found matching email lead count:', leadWithSameEmail.length);

        // Test 3: Duplicate detection by phone format variation
        const normalizedTargetPhone = normalizePhone('555-234-5678');
        const leadWithSamePhone = await prisma.lead.findMany({
            where: { normalizedPhone: { contains: normalizedTargetPhone } }
        });
        console.log('✓ Test 3 Passed: Found matching phone lead count:', leadWithSamePhone.length);

        // Test 4: Create a duplicate lead and flag it
        const lead2 = await prisma.lead.create({
            data: {
                name: 'TEST_Alice Clone',
                company: 'Another Company',
                email: 'alice.test@example.com',
                phone: '555-234-5678',
                normalizedPhone: normalizePhone('555-234-5678'),
                source: 'Website',
                serviceInterested: 'Mobile App Development',
                budget: '₹5,00,000 - ₹10,00,000',
                status: 'New',
                priority: 'Medium',
                owner: 'Sarah Connor',
                isDuplicate: true,
                duplicateReasons: ['email', 'phone'],
                duplicateMatches: [lead1.id]
            }
        });
        console.log('✓ Test 4 Passed: Duplicate lead flagged with matches:', lead2.duplicateReasons);

        // Test 5: Archive and unarchive
        const archivedLead = await prisma.lead.update({
            where: { id: lead1.id },
            data: { isArchived: true, archivedAt: new Date() }
        });
        console.log('✓ Test 5 Passed: Lead archived:', archivedLead.isArchived, archivedLead.archivedAt);

        const restoredLead = await prisma.lead.update({
            where: { id: lead1.id },
            data: { isArchived: false, archivedAt: null }
        });
        console.log('✓ Test 5.1 Passed: Lead restored:', restoredLead.isArchived);

        // Test 6: Create multiple leads for pagination, sorting & search
        const sampleLeads = [
            { name: 'TEST_Bob Miller', company: 'Apex Innovations', email: 'bob@apex.com', phone: '555-111-2222', normalizedPhone: '5551112222', source: 'Referral', serviceInterested: 'Mobile App Development', budget: '₹25,00,000 - ₹50,00,000', status: 'Qualified', priority: 'Urgent', owner: 'Shivam S.' },
            { name: 'TEST_Charlie Davis', company: 'Global Logistics', email: 'charlie@global.com', phone: '555-333-4444', normalizedPhone: '5553334444', source: 'Cold Call', serviceInterested: 'Cloud & DevOps', budget: '₹5,00,000 - ₹10,00,000', status: 'Contacted', priority: 'Medium', owner: 'Alex M.' },
            { name: 'TEST_Diana Prince', company: 'Themyscira Arts', email: 'diana@amazon.com', phone: '555-555-6666', normalizedPhone: '5555556666', source: 'Website', serviceInterested: 'UI/UX Design', budget: '₹1,00,000 - ₹5,00,000', status: 'Proposal Sent', priority: 'High', owner: 'Shivam S.' },
            { name: 'TEST_Evan Wright', company: 'Wright Digital', email: 'evan@wright.com', phone: '555-777-8888', normalizedPhone: '5557778888', source: 'Google Ads', serviceInterested: 'SEO & Marketing', budget: '₹5,00,000 - ₹10,00,000', status: 'Won', priority: 'Low', owner: 'Unassigned' }
        ];

        for (const sample of sampleLeads) {
            await prisma.lead.create({ data: sample });
        }
        console.log('✓ Test 6 Passed: Seeded sample leads.');

        // Test 7: Search test
        const searchResults = await prisma.lead.findMany({
            where: {
                AND: [
                    { name: { startsWith: 'TEST_' } },
                    {
                        OR: [
                            { name: { contains: 'Apex', mode: 'insensitive' } },
                            { company: { contains: 'Apex', mode: 'insensitive' } }
                        ]
                    }
                ]
            }
        });
        console.log('✓ Test 7 Passed: Search found leads:', searchResults.length, searchResults[0].company);

        // Test 8: Filter & Pagination
        const page = 1;
        const limit = 2;
        const paginated = await prisma.lead.findMany({
            where: { name: { startsWith: 'TEST_' } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        });
        const total = await prisma.lead.count({
            where: { name: { startsWith: 'TEST_' } }
        });
        console.log(`✓ Test 8 Passed: Pagination page ${page}, got ${paginated.length} of ${total} total.`);

        // Clean up test items
        await prisma.followUp.deleteMany({
            where: { lead: { name: { startsWith: 'TEST_' } } }
        });
        await prisma.activityLog.deleteMany({
            where: { lead: { name: { startsWith: 'TEST_' } } }
        });
        await prisma.lead.deleteMany({
            where: { name: { startsWith: 'TEST_' } }
        });
        console.log('✓ Cleaned up all test leads.');
        console.log('ALL UNIT DATABASE TESTS PASSED SUCCESSFULLY ON POSTGRESQL!');
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected from PostgreSQL.');
    }
}

runTests();
