CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CLOSED');
CREATE TYPE "EvidenceRequestStatus" AS ENUM ('REQUESTED', 'RECEIVED', 'COMPLETE');

ALTER TABLE "Exception"
ADD COLUMN "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "approver" TEXT;

CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "title" TEXT NOT NULL,
    "controlCode" TEXT,
    "description" TEXT,
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "assignee" TEXT,
    "status" "EvidenceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "dueDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Exception_tenantId_assessmentId_status_idx" ON "Exception"("tenantId", "assessmentId", "status");
CREATE INDEX "Exception_tenantId_dueDate_idx" ON "Exception"("tenantId", "dueDate");
CREATE INDEX "Task_tenantId_status_idx" ON "Task"("tenantId", "status");
CREATE INDEX "Task_tenantId_assessmentId_idx" ON "Task"("tenantId", "assessmentId");
CREATE INDEX "Task_tenantId_dueDate_idx" ON "Task"("tenantId", "dueDate");
CREATE INDEX "EvidenceRequest_tenantId_status_idx" ON "EvidenceRequest"("tenantId", "status");
CREATE INDEX "EvidenceRequest_tenantId_assessmentId_idx" ON "EvidenceRequest"("tenantId", "assessmentId");

ALTER TABLE "Exception"
ADD CONSTRAINT "Exception_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceRequest"
ADD CONSTRAINT "EvidenceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceRequest"
ADD CONSTRAINT "EvidenceRequest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
