-- CreateEnum
CREATE TYPE "ApprovedAnswerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceMapStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceMapSupportStrength" AS ENUM ('STRONG', 'MODERATE', 'WEAK', 'MISSING');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FindingSourceType" AS ENUM ('TRUSTOPS_EVIDENCE_GAP', 'TRUSTOPS_REJECTION', 'TRUSTOPS_EVIDENCE_MAP');

-- AlterTable
ALTER TABLE "ApprovedAnswer" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerUserId" TEXT,
ADD COLUMN     "sourceQuestionnaireItemId" TEXT,
ADD COLUMN     "status" "ApprovedAnswerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "QuestionnaireUpload" ADD COLUMN     "assignedReviewerUserId" TEXT,
ADD COLUMN     "reviewDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TrustPacket" ADD COLUMN     "approvedContactEmail" TEXT,
ADD COLUMN     "approvedContactName" TEXT,
ADD COLUMN     "assignedReviewerUserId" TEXT,
ADD COLUMN     "evidenceMapId" TEXT,
ADD COLUMN     "exportCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastExportedAt" TIMESTAMP(3),
ADD COLUMN     "packageManifestJson" JSONB,
ADD COLUMN     "reviewDueAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "reviewerNotes" TEXT;

-- CreateTable
CREATE TABLE "EvidenceMap" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "questionnaireUploadId" TEXT NOT NULL,
    "trustInboxItemId" TEXT,
    "name" TEXT NOT NULL,
    "status" "EvidenceMapStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedReviewerUserId" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceMapItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "evidenceMapId" TEXT NOT NULL,
    "questionnaireItemId" TEXT,
    "questionCluster" TEXT NOT NULL,
    "normalizedQuestion" TEXT NOT NULL,
    "relatedControlIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportStrength" "EvidenceMapSupportStrength" NOT NULL,
    "buyerSafeSummary" TEXT NOT NULL,
    "recommendedNextAction" TEXT NOT NULL,
    "relatedTaskId" TEXT,
    "relatedFindingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceMapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" "FindingSourceType" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "controlCode" TEXT,
    "supportStrength" "EvidenceMapSupportStrength",
    "ownerUserId" TEXT,
    "questionnaireUploadId" TEXT,
    "questionnaireItemId" TEXT,
    "evidenceMapId" TEXT,
    "evidenceMapItemId" TEXT,
    "taskId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceMap_questionnaireUploadId_key" ON "EvidenceMap"("questionnaireUploadId");

-- CreateIndex
CREATE INDEX "EvidenceMap_tenantId_status_updatedAt_idx" ON "EvidenceMap"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "EvidenceMap_tenantId_assignedReviewerUserId_reviewDueAt_idx" ON "EvidenceMap"("tenantId", "assignedReviewerUserId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "EvidenceMap_tenantId_trustInboxItemId_idx" ON "EvidenceMap"("tenantId", "trustInboxItemId");

-- CreateIndex
CREATE INDEX "EvidenceMapItem_tenantId_evidenceMapId_idx" ON "EvidenceMapItem"("tenantId", "evidenceMapId");

-- CreateIndex
CREATE INDEX "EvidenceMapItem_tenantId_questionnaireItemId_idx" ON "EvidenceMapItem"("tenantId", "questionnaireItemId");

-- CreateIndex
CREATE INDEX "EvidenceMapItem_tenantId_supportStrength_idx" ON "EvidenceMapItem"("tenantId", "supportStrength");

-- CreateIndex
CREATE INDEX "Finding_tenantId_status_priority_updatedAt_idx" ON "Finding"("tenantId", "status", "priority", "updatedAt");

-- CreateIndex
CREATE INDEX "Finding_tenantId_questionnaireUploadId_idx" ON "Finding"("tenantId", "questionnaireUploadId");

-- CreateIndex
CREATE INDEX "Finding_tenantId_questionnaireItemId_idx" ON "Finding"("tenantId", "questionnaireItemId");

-- CreateIndex
CREATE INDEX "Finding_tenantId_evidenceMapId_idx" ON "Finding"("tenantId", "evidenceMapId");

-- CreateIndex
CREATE INDEX "ApprovedAnswer_tenantId_status_scope_updatedAt_idx" ON "ApprovedAnswer"("tenantId", "status", "scope", "updatedAt");

-- CreateIndex
CREATE INDEX "QuestionnaireUpload_tenantId_assignedReviewerUserId_reviewD_idx" ON "QuestionnaireUpload"("tenantId", "assignedReviewerUserId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "TrustPacket_tenantId_assignedReviewerUserId_reviewDueAt_idx" ON "TrustPacket"("tenantId", "assignedReviewerUserId", "reviewDueAt");

-- AddForeignKey
ALTER TABLE "ApprovedAnswer" ADD CONSTRAINT "ApprovedAnswer_sourceQuestionnaireUploadId_fkey" FOREIGN KEY ("sourceQuestionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedAnswer" ADD CONSTRAINT "ApprovedAnswer_sourceQuestionnaireItemId_fkey" FOREIGN KEY ("sourceQuestionnaireItemId") REFERENCES "QuestionnaireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPacket" ADD CONSTRAINT "TrustPacket_evidenceMapId_fkey" FOREIGN KEY ("evidenceMapId") REFERENCES "EvidenceMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceMap" ADD CONSTRAINT "EvidenceMap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceMap" ADD CONSTRAINT "EvidenceMap_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceMap" ADD CONSTRAINT "EvidenceMap_trustInboxItemId_fkey" FOREIGN KEY ("trustInboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceMapItem" ADD CONSTRAINT "EvidenceMapItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceMapItem" ADD CONSTRAINT "EvidenceMapItem_evidenceMapId_fkey" FOREIGN KEY ("evidenceMapId") REFERENCES "EvidenceMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceMapItem" ADD CONSTRAINT "EvidenceMapItem_questionnaireItemId_fkey" FOREIGN KEY ("questionnaireItemId") REFERENCES "QuestionnaireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_questionnaireItemId_fkey" FOREIGN KEY ("questionnaireItemId") REFERENCES "QuestionnaireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_evidenceMapId_fkey" FOREIGN KEY ("evidenceMapId") REFERENCES "EvidenceMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
