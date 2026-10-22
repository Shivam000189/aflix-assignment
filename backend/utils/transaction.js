const { prisma } = require('../config/db');

/**
 * Executes an operation inside a PostgreSQL ACID transaction using Prisma interactive transactions.
 * Guarantees atomic commit or rollback on failure.
 *
 * @param {Function} workFn - async function(tx) that receives the Prisma Transaction Client (tx)
 * @returns {Promise<any>} The result of workFn
 */
async function withTransaction(workFn) {
    return await prisma.$transaction(async (tx) => {
        return await workFn(tx);
    });
}

module.exports = {
    withTransaction
};
