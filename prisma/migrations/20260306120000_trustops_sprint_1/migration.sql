-- CreateEnum
CREATE TYPE "QuestionnaireUploadStatus" AS ENUM ('UPLOADED', 'MAPPED', 'DRAFTED', 'NEEDS_REVIEW', 'APPROVED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "DraftAnswerStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovedAnswerScope" AS ENUM ('REUSABLE', 'TENANT_SPECIFIC');

-- CreateEnum
CREATE TYPE "TrustPacketStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'READY_TO_SHARE', 'SHARED');

-- CreateEnum
CREATE TYPE "TrustPacketShareMode" AS ENUM ('INTERNAL_REVIEW', 'EXTERNAL_SHARE');

-- AlterTable
ALTER TABLE "DraftAnswer" ADD COLUMN     "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "mappedControlIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "normalizedQuestion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "notesForReviewer" TEXT,
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "reviewerNotes" TEXT,
ADD COLUMN     "status" "DraftAnswerStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "supportingEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "QuestionnaireItem" ADD COLUMN     "normalizedQuestion" TEXT,
ADD COLUMN     "rowOrder" INTEGER;

-- AlterTable
ALTER TABLE "QuestionnaireUpload" ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerUserId" TEXT,
ADD COLUMN     "status" "QuestionnaireUploadStatus" NOT NULL DEFAULT 'UPLOADED';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "questionnaireItemId" TEXT,
ADD COLUMN     "questionnaireUploadId" TEXT,
ADD COLUMN     "trustInboxItemId" TEXT;

-- Backfill existing questionnaire rows and drafts before constraints are added
WITH ordered_rows AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "questionnaireUploadId"
            ORDER BY "createdAt" ASC, id ASC
        ) AS row_order
    FROM "QuestionnaireItem"
)
UPDATE "QuestionnaireItem" item
SET
    "rowOrder" = ordered_rows.row_order,
    "normalizedQuestion" = TRIM(REGEXP_REPLACE(LOWER(COALESCE(item."questionText", '')), '[^a-z0-9\s]+', ' ', 'g'))
FROM ordered_rows
WHERE ordered_rows.id = item.id;

UPDATE "DraftAnswer" draft
SET "normalizedQuestion" = COALESCE(NULLIF(item."normalizedQuestion", ''), '')
FROM "QuestionnaireItem" item
WHERE item.id = draft."questionnaireItemId";

ALTER TABLE "QuestionnaireItem" ALTER COLUMN "rowOrder" SET NOT NULL;

-- CreateTable
CREATE TABLE "ApprovedAnswer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "normalizedQuestion" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "mappedControlIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportingEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" "ApprovedAnswerScope" NOT NULL DEFAULT 'REUSABLE',
    "sourceDraftAnswerId" TEXT,
    "sourceQuestionnaireUploadId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovedAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustPacket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trustInboxItemId" TEXT,
    "questionnaireUploadId" TEXT,
    "name" TEXT NOT NULL,
    "status" "TrustPacketStatus" NOT NULL DEFAULT 'DRAFT',
    "shareMode" "TrustPacketShareMode" NOT NULL DEFAULT 'INTERNAL_REVIEW',
    "packetSections" JSONB NOT NULL,
    "includedArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "staleArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewerRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustPacket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovedAnswer_tenantId_normalizedQuestion_idx" ON "ApprovedAnswer"("tenantId", "normalizedQuestion");

-- CreateIndex
CREATE INDEX "ApprovedAnswer_tenantId_scope_updatedAt_idx" ON "ApprovedAnswer"("tenantId", "scope", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedAnswer_tenantId_normalizedQuestion_scope_key" ON "ApprovedAnswer"("tenantId", "normalizedQuestion", "scope");

-- CreateIndex
CREATE INDEX "TrustPacket_tenantId_status_updatedAt_idx" ON "TrustPacket"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrustPacket_tenantId_trustInboxItemId_idx" ON "TrustPacket"("tenantId", "trustInboxItemId");

-- CreateIndex
CREATE INDEX "TrustPacket_tenantId_questionnaireUploadId_idx" ON "TrustPacket"("tenantId", "questionnaireUploadId");

-- CreateIndex
CREATE INDEX "DraftAnswer_tenantId_status_createdAt_idx" ON "DraftAnswer"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionnaireItem_tenantId_normalizedQuestion_idx" ON "QuestionnaireItem"("tenantId", "normalizedQuestion");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireItem_questionnaireUploadId_rowOrder_key" ON "QuestionnaireItem"("questionnaireUploadId", "rowOrder");

-- CreateIndex
CREATE INDEX "QuestionnaireUpload_tenantId_status_updatedAt_idx" ON "QuestionnaireUpload"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Task_tenantId_questionnaireUploadId_idx" ON "Task"("tenantId", "questionnaireUploadId");

-- CreateIndex
CREATE INDEX "Task_tenantId_questionnaireItemId_idx" ON "Task"("tenantId", "questionnaireItemId");

-- CreateIndex
CREATE INDEX "Task_tenantId_trustInboxItemId_idx" ON "Task"("tenantId", "trustInboxItemId");

-- CreateIndex
CREATE INDEX "TrustDoc_tenantId_category_idx" ON "TrustDoc"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_questionnaireItemId_fkey" FOREIGN KEY ("questionnaireItemId") REFERENCES "QuestionnaireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_trustInboxItemId_fkey" FOREIGN KEY ("trustInboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedAnswer" ADD CONSTRAINT "ApprovedAnswer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPacket" ADD CONSTRAINT "TrustPacket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPacket" ADD CONSTRAINT "TrustPacket_trustInboxItemId_fkey" FOREIGN KEY ("trustInboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPacket" ADD CONSTRAINT "TrustPacket_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

