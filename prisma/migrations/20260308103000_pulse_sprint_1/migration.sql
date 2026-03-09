-- CreateEnum
CREATE TYPE "PulseSnapshotPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "PulseSnapshotStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PulseSourceModule" AS ENUM ('TRUSTOPS', 'ASSESSMENTS', 'FINDINGS', 'TASKS', 'PULSE', 'MANUAL');

-- CreateEnum
CREATE TYPE "RiskRegisterSourceType" AS ENUM ('MANUAL', 'FINDING', 'TRUSTOPS_EVIDENCE_GAP', 'TRUSTOPS_REJECTION', 'TRUSTOPS_EVIDENCE_MAP', 'ASSESSMENT_GAP', 'TASK', 'PULSE_CATEGORY');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskRegisterStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'MITIGATING', 'ACCEPTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoadmapStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoadmapHorizon" AS ENUM ('DAYS_30', 'DAYS_60', 'DAYS_90');

-- CreateEnum
CREATE TYPE "RoadmapItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "BoardBriefStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "QuarterlyReviewStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "PulseSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" "PulseSnapshotPeriodType" NOT NULL,
    "reportingPeriod" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "status" "PulseSnapshotStatus" NOT NULL DEFAULT 'DRAFT',
    "overallScore" DOUBLE PRECISION NOT NULL,
    "overallDelta" DOUBLE PRECISION,
    "assessmentSignalScore" DOUBLE PRECISION NOT NULL,
    "findingsSignalScore" DOUBLE PRECISION NOT NULL,
    "remediationSignalScore" DOUBLE PRECISION NOT NULL,
    "trustSignalScore" DOUBLE PRECISION NOT NULL,
    "readinessSignalScore" DOUBLE PRECISION NOT NULL,
    "openFindingsCount" INTEGER NOT NULL DEFAULT 0,
    "overdueFindingsCount" INTEGER NOT NULL DEFAULT 0,
    "overdueTasksCount" INTEGER NOT NULL DEFAULT 0,
    "openEvidenceGapCount" INTEGER NOT NULL DEFAULT 0,
    "trustReviewBacklogCount" INTEGER NOT NULL DEFAULT 0,
    "answerReuseCount" INTEGER NOT NULL DEFAULT 0,
    "trustPacketsExportedCount" INTEGER NOT NULL DEFAULT 0,
    "assessedControlCount" INTEGER NOT NULL DEFAULT 0,
    "summaryText" TEXT NOT NULL,
    "measuredInputsJson" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseCategoryScore" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "measuredValue" DOUBLE PRECISION NOT NULL,
    "benchmarkValue" DOUBLE PRECISION,
    "summaryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PulseCategoryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRegisterItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedRiskStatement" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "businessImpactSummary" TEXT NOT NULL,
    "sourceType" "RiskRegisterSourceType" NOT NULL,
    "sourceModule" "PulseSourceModule" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceReference" TEXT,
    "severity" "RiskLevel" NOT NULL,
    "likelihood" "RiskLevel" NOT NULL,
    "impact" "RiskLevel" NOT NULL,
    "status" "RiskRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "ownerUserId" TEXT,
    "targetDueAt" TIMESTAMP(3),
    "linkedControlIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedQuestionnaireIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedEvidenceMapIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTrustPacketIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedAssessmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskRegisterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseRoadmap" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportingPeriod" TEXT NOT NULL,
    "status" "RoadmapStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PulseRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "horizon" "RoadmapHorizon" NOT NULL,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "RoadmapItemStatus" NOT NULL DEFAULT 'PLANNED',
    "rationale" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "linkedRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedControlIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardBrief" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportingPeriod" TEXT NOT NULL,
    "status" "BoardBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "overallPostureSummary" TEXT NOT NULL,
    "topRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notableImprovements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "overdueActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "leadershipDecisionsNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roadmap30Days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roadmap60Days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roadmap90Days" TEXT[] DEFAULT ARRAY[]::TEXT[],
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

    CONSTRAINT "BoardBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlyReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "boardBriefId" TEXT NOT NULL,
    "reviewPeriod" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "attendeeNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "decisionsMade" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "QuarterlyReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PulseSnapshot_tenantId_snapshotDate_idx" ON "PulseSnapshot"("tenantId", "snapshotDate");

-- CreateIndex
CREATE INDEX "PulseSnapshot_tenantId_status_updatedAt_idx" ON "PulseSnapshot"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PulseSnapshot_tenantId_periodType_reportingPeriod_key" ON "PulseSnapshot"("tenantId", "periodType", "reportingPeriod");

-- CreateIndex
CREATE INDEX "PulseCategoryScore_tenantId_snapshotId_idx" ON "PulseCategoryScore"("tenantId", "snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseCategoryScore_snapshotId_categoryKey_key" ON "PulseCategoryScore"("snapshotId", "categoryKey");

-- CreateIndex
CREATE INDEX "RiskRegisterItem_tenantId_status_severity_updatedAt_idx" ON "RiskRegisterItem"("tenantId", "status", "severity", "updatedAt");

-- CreateIndex
CREATE INDEX "RiskRegisterItem_tenantId_ownerUserId_targetDueAt_idx" ON "RiskRegisterItem"("tenantId", "ownerUserId", "targetDueAt");

-- CreateIndex
CREATE INDEX "RiskRegisterItem_tenantId_sourceModule_updatedAt_idx" ON "RiskRegisterItem"("tenantId", "sourceModule", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RiskRegisterItem_tenantId_sourceKey_key" ON "RiskRegisterItem"("tenantId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "PulseRoadmap_snapshotId_key" ON "PulseRoadmap"("snapshotId");

-- CreateIndex
CREATE INDEX "PulseRoadmap_tenantId_status_updatedAt_idx" ON "PulseRoadmap"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "RoadmapItem_tenantId_roadmapId_horizon_idx" ON "RoadmapItem"("tenantId", "roadmapId", "horizon");

-- CreateIndex
CREATE INDEX "RoadmapItem_tenantId_status_dueAt_idx" ON "RoadmapItem"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "BoardBrief_tenantId_status_updatedAt_idx" ON "BoardBrief"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "BoardBrief_tenantId_snapshotId_updatedAt_idx" ON "BoardBrief"("tenantId", "snapshotId", "updatedAt");

-- CreateIndex
CREATE INDEX "QuarterlyReview_tenantId_status_reviewDate_idx" ON "QuarterlyReview"("tenantId", "status", "reviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyReview_tenantId_reviewPeriod_key" ON "QuarterlyReview"("tenantId", "reviewPeriod");

-- AddForeignKey
ALTER TABLE "PulseSnapshot" ADD CONSTRAINT "PulseSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseCategoryScore" ADD CONSTRAINT "PulseCategoryScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseCategoryScore" ADD CONSTRAINT "PulseCategoryScore_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PulseSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRegisterItem" ADD CONSTRAINT "RiskRegisterItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseRoadmap" ADD CONSTRAINT "PulseRoadmap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseRoadmap" ADD CONSTRAINT "PulseRoadmap_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PulseSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "PulseRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardBrief" ADD CONSTRAINT "BoardBrief_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardBrief" ADD CONSTRAINT "BoardBrief_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PulseSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardBrief" ADD CONSTRAINT "BoardBrief_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "PulseRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyReview" ADD CONSTRAINT "QuarterlyReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyReview" ADD CONSTRAINT "QuarterlyReview_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PulseSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyReview" ADD CONSTRAINT "QuarterlyReview_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "PulseRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyReview" ADD CONSTRAINT "QuarterlyReview_boardBriefId_fkey" FOREIGN KEY ("boardBriefId") REFERENCES "BoardBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

