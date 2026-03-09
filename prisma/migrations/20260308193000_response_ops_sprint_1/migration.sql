-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('NEW', 'TRIAGE', 'ACTIVE', 'CONTAINED', 'RECOVERING', 'RESOLVED', 'POST_INCIDENT_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('IDENTITY_COMPROMISE', 'RANSOMWARE', 'PHISHING', 'THIRD_PARTY_BREACH', 'CLOUD_EXPOSURE', 'LOST_DEVICE', 'AI_MISUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResponseOpsPhase" AS ENUM ('TRIAGE', 'EVIDENCE_COLLECTION', 'CONTAINMENT', 'ERADICATION', 'RECOVERY', 'COMMUNICATIONS', 'POST_INCIDENT_REVIEW');

-- CreateEnum
CREATE TYPE "IncidentRunbookPackStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IncidentTimelineEventType" AS ENUM ('CREATED', 'TRIAGE_STARTED', 'STATUS_CHANGED', 'RUNBOOK_LAUNCHED', 'COMMUNICATION_SENT', 'CONTAINMENT_COMPLETED', 'DECISION_LOG', 'NOTE', 'AFTER_ACTION_GENERATED', 'TABLETOP_LINKED');

-- CreateEnum
CREATE TYPE "AfterActionReportStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "TabletopExerciseStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FindingSourceType" ADD VALUE 'RESPONSE_OPS_INCIDENT';
ALTER TYPE "FindingSourceType" ADD VALUE 'RESPONSE_OPS_AFTER_ACTION';
ALTER TYPE "FindingSourceType" ADD VALUE 'RESPONSE_OPS_TABLETOP';

-- AlterEnum
ALTER TYPE "PulseSourceModule" ADD VALUE 'RESPONSE_OPS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiskRegisterSourceType" ADD VALUE 'INCIDENT';
ALTER TYPE "RiskRegisterSourceType" ADD VALUE 'TABLETOP';

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "incidentId" TEXT,
ADD COLUMN     "tabletopExerciseId" TEXT;

-- AlterTable
ALTER TABLE "RiskRegisterItem" ADD COLUMN     "linkedIncidentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedTabletopIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "incidentId" TEXT,
ADD COLUMN     "incidentRunbookPackId" TEXT,
ADD COLUMN     "responseOpsOrder" INTEGER,
ADD COLUMN     "responseOpsPhase" "ResponseOpsPhase",
ADD COLUMN     "tabletopExerciseId" TEXT;

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentType" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'NEW',
    "detectionSource" TEXT,
    "reportedBy" TEXT,
    "incidentOwnerUserId" TEXT,
    "communicationsOwnerUserId" TEXT,
    "affectedSystems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedVendorNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiUseCaseId" TEXT,
    "aiVendorReviewId" TEXT,
    "questionnaireUploadId" TEXT,
    "trustInboxItemId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declaredAt" TIMESTAMP(3),
    "containedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "nextUpdateDueAt" TIMESTAMP(3),
    "executiveSummary" TEXT,
    "internalNotes" TEXT,
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedBoardBriefIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedQuarterlyReviewIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentRunbookPack" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "runbookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "IncidentRunbookPackStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentRunbookPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentTimelineEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "eventType" "IncidentTimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "isShareable" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfterActionReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "AfterActionReportStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "affectedScope" TEXT NOT NULL,
    "timelineSummary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionsTaken" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentStatus" TEXT NOT NULL,
    "lessonsLearned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decisionsNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewerNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "lastExportedAt" TIMESTAMP(3),
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AfterActionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabletopExercise" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scenarioType" "IncidentType" NOT NULL,
    "status" "TabletopExerciseStatus" NOT NULL DEFAULT 'DRAFT',
    "exerciseDate" TIMESTAMP(3) NOT NULL,
    "participantNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "participantRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scenarioSummary" TEXT NOT NULL,
    "exerciseObjectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedDecisions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exerciseNotes" TEXT,
    "decisionsMade" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gapsIdentified" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewerNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TabletopExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_tenantId_status_severity_updatedAt_idx" ON "Incident"("tenantId", "status", "severity", "updatedAt");

-- CreateIndex
CREATE INDEX "Incident_tenantId_incidentOwnerUserId_nextUpdateDueAt_idx" ON "Incident"("tenantId", "incidentOwnerUserId", "nextUpdateDueAt");

-- CreateIndex
CREATE INDEX "Incident_tenantId_incidentType_createdAt_idx" ON "Incident"("tenantId", "incidentType", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_tenantId_aiUseCaseId_idx" ON "Incident"("tenantId", "aiUseCaseId");

-- CreateIndex
CREATE INDEX "Incident_tenantId_aiVendorReviewId_idx" ON "Incident"("tenantId", "aiVendorReviewId");

-- CreateIndex
CREATE INDEX "IncidentRunbookPack_tenantId_incidentId_updatedAt_idx" ON "IncidentRunbookPack"("tenantId", "incidentId", "updatedAt");

-- CreateIndex
CREATE INDEX "IncidentRunbookPack_tenantId_status_updatedAt_idx" ON "IncidentRunbookPack"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "IncidentTimelineEvent_tenantId_incidentId_createdAt_idx" ON "IncidentTimelineEvent"("tenantId", "incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentTimelineEvent_tenantId_eventType_createdAt_idx" ON "IncidentTimelineEvent"("tenantId", "eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AfterActionReport_incidentId_key" ON "AfterActionReport"("incidentId");

-- CreateIndex
CREATE INDEX "AfterActionReport_tenantId_status_updatedAt_idx" ON "AfterActionReport"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AfterActionReport_tenantId_incidentId_updatedAt_idx" ON "AfterActionReport"("tenantId", "incidentId", "updatedAt");

-- CreateIndex
CREATE INDEX "TabletopExercise_tenantId_status_exerciseDate_idx" ON "TabletopExercise"("tenantId", "status", "exerciseDate");

-- CreateIndex
CREATE INDEX "TabletopExercise_tenantId_scenarioType_updatedAt_idx" ON "TabletopExercise"("tenantId", "scenarioType", "updatedAt");

-- CreateIndex
CREATE INDEX "Finding_tenantId_incidentId_idx" ON "Finding"("tenantId", "incidentId");

-- CreateIndex
CREATE INDEX "Finding_tenantId_tabletopExerciseId_idx" ON "Finding"("tenantId", "tabletopExerciseId");

-- CreateIndex
CREATE INDEX "Task_tenantId_incidentId_idx" ON "Task"("tenantId", "incidentId");

-- CreateIndex
CREATE INDEX "Task_tenantId_incidentRunbookPackId_idx" ON "Task"("tenantId", "incidentRunbookPackId");

-- CreateIndex
CREATE INDEX "Task_tenantId_tabletopExerciseId_idx" ON "Task"("tenantId", "tabletopExerciseId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_incidentRunbookPackId_fkey" FOREIGN KEY ("incidentRunbookPackId") REFERENCES "IncidentRunbookPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tabletopExerciseId_fkey" FOREIGN KEY ("tabletopExerciseId") REFERENCES "TabletopExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_tabletopExerciseId_fkey" FOREIGN KEY ("tabletopExerciseId") REFERENCES "TabletopExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "AIUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_aiVendorReviewId_fkey" FOREIGN KEY ("aiVendorReviewId") REFERENCES "AIVendorReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_trustInboxItemId_fkey" FOREIGN KEY ("trustInboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRunbookPack" ADD CONSTRAINT "IncidentRunbookPack_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRunbookPack" ADD CONSTRAINT "IncidentRunbookPack_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTimelineEvent" ADD CONSTRAINT "IncidentTimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTimelineEvent" ADD CONSTRAINT "IncidentTimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfterActionReport" ADD CONSTRAINT "AfterActionReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfterActionReport" ADD CONSTRAINT "AfterActionReport_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabletopExercise" ADD CONSTRAINT "TabletopExercise_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

