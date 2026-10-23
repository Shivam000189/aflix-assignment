-- Baseline Migration: 0_init
-- Represents the initial PostgreSQL schema state of Aflix Infotech CRM

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'sales_rep',
    "phone" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable leads
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "normalizedPhone" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'Website',
    "serviceInterested" TEXT NOT NULL DEFAULT 'Web Development',
    "budget" TEXT NOT NULL DEFAULT '₹1,00,000 - ₹5,00,000',
    "status" TEXT NOT NULL DEFAULT 'New',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "owner" TEXT NOT NULL DEFAULT 'Unassigned',
    "notes" TEXT NOT NULL DEFAULT '',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duplicateMatches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable follow_ups
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Follow Up',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "assignedToName" TEXT NOT NULL DEFAULT 'Unassigned',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable activity_logs
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "performedById" TEXT,
    "performedByName" TEXT NOT NULL DEFAULT 'System',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex users
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex leads
CREATE INDEX "leads_email_idx" ON "leads"("email");
CREATE INDEX "leads_normalizedPhone_idx" ON "leads"("normalizedPhone");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_priority_idx" ON "leads"("priority");
CREATE INDEX "leads_source_idx" ON "leads"("source");
CREATE INDEX "leads_isArchived_idx" ON "leads"("isArchived");
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");
CREATE INDEX "leads_assignedToId_idx" ON "leads"("assignedToId");

-- CreateIndex follow_ups
CREATE INDEX "follow_ups_leadId_idx" ON "follow_ups"("leadId");
CREATE INDEX "follow_ups_dueDate_idx" ON "follow_ups"("dueDate");
CREATE INDEX "follow_ups_isCompleted_idx" ON "follow_ups"("isCompleted");
CREATE INDEX "follow_ups_assignedToId_idx" ON "follow_ups"("assignedToId");
CREATE INDEX "follow_ups_leadId_dueDate_idx" ON "follow_ups"("leadId", "dueDate");

-- CreateIndex activity_logs
CREATE INDEX "activity_logs_leadId_idx" ON "activity_logs"("leadId");
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");
CREATE INDEX "activity_logs_leadId_timestamp_idx" ON "activity_logs"("leadId", "timestamp");
CREATE INDEX "activity_logs_performedById_idx" ON "activity_logs"("performedById");

-- AddForeignKey leads
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey follow_ups
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey activity_logs
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
