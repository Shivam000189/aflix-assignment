require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function introspect() {
  console.log('--- Read-Only Database Schema & Migration Status Introspection ---');
  try {
    // 1. Check existing tables in public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Tables in public schema:', tables.map(t => t.table_name));

    // 2. Check if _prisma_migrations table exists
    const hasMigrationsTable = tables.some(t => t.table_name === '_prisma_migrations');
    console.log('_prisma_migrations table exists:', hasMigrationsTable);

    if (hasMigrationsTable) {
      const recordedMigrations = await prisma.$queryRaw`
        SELECT id, migration_name, finished_at, rolled_back_at 
        FROM "_prisma_migrations" 
        ORDER BY started_at ASC;
      `;
      console.log('Recorded migrations:', recordedMigrations);
    }

    // 3. Check users table columns & defaults
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    console.log('\nUsers table columns:');
    userColumns.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (default: ${c.column_default}, nullable: ${c.is_nullable})`);
    });

    // 4. Check existing user roles distribution
    const roleCounts = await prisma.$queryRaw`
      SELECT "role", count(*)::int as count
      FROM "users"
      GROUP BY "role";
    `;
    console.log('\nCurrent user role distribution in database:');
    roleCounts.forEach(r => console.log(`  - role '${r.role}': ${r.count} users`));

    // 5. Check constraints on users table (including any role check constraints)
    const constraints = await prisma.$queryRaw`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'users'::regclass;
    `;
    console.log('\nConstraints on users table:');
    constraints.forEach(c => console.log(`  - [${c.contype}] ${c.conname}: ${c.definition}`));

    // 6. Check foreign key constraints across tables
    const foreignKeys = await prisma.$queryRaw`
      SELECT conname, pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND contype = 'f';
    `;
    console.log('\nForeign key constraints in public schema:');
    foreignKeys.forEach(fk => console.log(`  - ${fk.conname}: ${fk.definition}`));

    // 7. Check lead and follow-up counts
    const leadCount = await prisma.lead.count();
    const followUpCount = await prisma.followUp.count();
    const activityCount = await prisma.activityLog.count();
    console.log(`\nRecord Counts: Leads: ${leadCount}, FollowUps: ${followUpCount}, ActivityLogs: ${activityCount}`);

  } catch (err) {
    console.error('Error during read-only introspection:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

introspect();
