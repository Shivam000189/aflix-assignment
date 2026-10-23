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

const connectDB = async (maxRetries = 5, retryDelayMs = 2500) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await prisma.$connect();
            console.log("PostgreSQL connected successfully via Prisma");
            return prisma;
        } catch (err) {
            console.warn(`PostgreSQL connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
            if (attempt < maxRetries) {
                console.log(`Database may be waking up from sleep (Neon cold start). Retrying in ${retryDelayMs / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            } else {
                console.error("Fatal: Unable to connect to PostgreSQL after multiple attempts:", err.message);
                process.exit(1);
            }
        }
    }
};

module.exports = connectDB;
module.exports.prisma = prisma;
