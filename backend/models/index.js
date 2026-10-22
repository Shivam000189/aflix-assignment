const { prisma } = require('../config/db');

// Export Prisma models and helpers for relational queries
module.exports = {
    prisma,
    User: prisma.user,
    Lead: prisma.lead,
    FollowUp: prisma.followUp,
    ActivityLog: prisma.activityLog
};
