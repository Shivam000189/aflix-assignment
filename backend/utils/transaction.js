const { prisma } = require('../config/db');

/**
 * Executes an operation inside a PostgreSQL ACID transaction using Prisma interactive transactions.
 * Guarantees atomic commit or rollback on failure.
 *
 * @param {Function} workFn - async function(tx) that receives the Prisma Transaction Client (tx)
 * @returns {Promise<any>} The result of workFn
 */
async function withTransaction(workFn, options = {}) {
    return await prisma.$transaction(async (tx) => {
        return await workFn(tx);
    }, {
        maxWait: options.maxWait || 10000, // Wait up to 10s to acquire transaction connection
        timeout: options.timeout || 25000  // Allow up to 25s for operations across network
    });
}

module.exports = {
    withTransaction
};
