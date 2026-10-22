const { PrismaClient } = require('@prisma/client');

// PrismaClient singleton instance to prevent multiple client instantiation
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: process.env.PRISMA_LOG ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
        });
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
