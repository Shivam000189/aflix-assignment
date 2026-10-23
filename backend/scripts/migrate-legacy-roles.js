/**
 * Data Migration Script: Migrate Legacy Account Roles to 'user'
 *
 * Scans the database for legacy roles ('sales_rep' or unknown/malformed roles)
 * and safely normalizes them to 'user' while preserving user IDs, password hashes,
 * lead ownership, task assignments, and activity history.
 *
 * Usage:
 *   node backend/scripts/migrate-legacy-roles.js            # Live execution
 *   node backend/scripts/migrate-legacy-roles.js --dry-run  # Dry run preview
 */
require('dotenv').config();
const { prisma } = require('../config/db');

async function migrateLegacyRoles() {
    const isDryRun = process.argv.includes('--dry-run');

    console.log(`\n=============================================================`);
    console.log(`Legacy Role Migration to 'user' ${isDryRun ? '[DRY RUN MODE]' : '[LIVE MODE]'}`);
    console.log(`=============================================================\n`);

    try {
        await prisma.$connect();

        // 1. Identify users with legacy or non-standard roles
        const legacyUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'sales_rep' },
                    { role: { notIn: ['admin', 'manager', 'user'] } }
                ]
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        createdLeads: true,
                        assignedLeads: true,
                        assignedFollowUps: true,
                        activityLogs: true
                    }
                }
            }
        });

        console.log(`Identified ${legacyUsers.length} account(s) with non-standard/legacy roles:`);
        legacyUsers.forEach((u, i) => {
            console.log(`  ${i + 1}. [${u.email}] (Name: "${u.name}", Current Role: "${u.role}")`);
            console.log(`     - Created Leads: ${u._count.createdLeads}`);
            console.log(`     - Assigned Leads: ${u._count.assignedLeads}`);
            console.log(`     - Follow-ups: ${u._count.assignedFollowUps}`);
            console.log(`     - Activity Logs: ${u._count.activityLogs}`);
        });

        if (legacyUsers.length === 0) {
            console.log('\nAll user accounts already have standardized roles (admin, manager, user). No migration needed.');
            return;
        }

        if (isDryRun) {
            console.log('\n[DRY RUN] No database changes were applied. Run without --dry-run to apply.');
            return;
        }

        // 2. Perform atomic batch update
        const userIds = legacyUsers.map(u => u.id);
        const result = await prisma.$transaction(async (tx) => {
            return await tx.user.updateMany({
                where: { id: { in: userIds } },
                data: { role: 'user' }
            });
        });

        console.log(`\nSuccessfully updated ${result.count} account(s) to 'user' role.`);

        // 3. Verify
        const remainingLegacy = await prisma.user.count({
            where: {
                OR: [
                    { role: 'sales_rep' },
                    { role: { notIn: ['admin', 'manager', 'user'] } }
                ]
            }
        });

        console.log(`Remaining legacy accounts in database: ${remainingLegacy}`);
        console.log(`Role normalization complete. All lead relationships, assignments, and histories preserved.`);

    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

migrateLegacyRoles();
