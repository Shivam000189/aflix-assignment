const { PrismaClient } = require('@prisma/client');

// Support both DATABASE_URLL and DATABASE_URL
const dbUrl = process.env.DATABASE_URLL || process.env.DATABASE_URL;
if (process.env.DATABASE_URLL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URLL;
}

// PrismaClient singleton instance to prevent multiple client instantiation
let prisma;

const prismaOptions = {
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.PRISMA_LOG ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
};

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient(prismaOptions);
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient(prismaOptions);
    }
    prisma = global.prisma;
}

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("PostgreSQL connected successfully via Prisma");
    } catch (err) {
        console.error("PostgreSQL connection error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
module.exports.prisma = prisma;
