-- CreateEnum
CREATE TYPE "AIGovernanceStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AIUseCaseType" AS ENUM ('INTERNAL_PRODUCTIVITY', 'CUSTOMER_FACING', 'SECURITY_WORKFLOW', 'ENGINEERING_WORKFLOW', 'CONTENT_WORKFLOW', 'ANALYTICS_WORKFLOW', 'OTHER');

-- CreateEnum
CREATE TYPE "AIWorkflowType" AS ENUM ('ASSISTANT', 'CHATBOT', 'AUTOMATION', 'AGENT', 'RAG', 'ANALYTICS', 'CONTENT_GENERATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AIDeploymentContext" AS ENUM ('SAAS', 'INTERNAL', 'HYBRID', 'API', 'LOCAL_MODEL', 'OTHER');

-- CreateEnum
CREATE TYPE "AIRiskTier" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIYesNoUnknown" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AIRetentionStatus" AS ENUM ('KNOWN', 'UNKNOWN', 'NO_RETENTION');

-- CreateEnum
CREATE TYPE "AIDpaStatus" AS ENUM ('NOT_STARTED', 'REQUESTED', 'RECEIVED', 'SIGNED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "AIDataClass" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'CUSTOMER_DATA', 'CUSTOMER_CONTENT', 'CUSTOMER_METADATA', 'PII', 'PHI', 'PCI', 'FINANCIAL', 'SOURCE_CODE', 'SECRETS', 'SECURITY_LOGS', 'HR');

-- CreateEnum
CREATE TYPE "AIPolicyRequirement" AS ENUM ('HUMAN_REVIEW_REQUIRED', 'APPROVED_VENDOR_ONLY', 'NO_CUSTOMER_SECRETS', 'NO_REGULATED_DATA', 'NO_INTERNET_ACCESS', 'NO_EXTERNAL_TOOL_INVOCATION', 'LOGGING_REQUIRED', 'RETENTION_MUST_BE_KNOWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FindingSourceType" ADD VALUE 'AI_GOVERNANCE_HIGH_RISK';
ALTER TYPE "FindingSourceType" ADD VALUE 'AI_GOVERNANCE_REJECTION';
ALTER TYPE "FindingSourceType" ADD VALUE 'AI_VENDOR_REVIEW';

-- AlterEnum
ALTER TYPE "PulseSourceModule" ADD VALUE 'AI_GOVERNANCE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiskRegisterSourceType" ADD VALUE 'AI_USE_CASE';
ALTER TYPE "RiskRegisterSourceType" ADD VALUE 'AI_VENDOR_REVIEW';

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "aiUseCaseId" TEXT,
ADD COLUMN     "aiVendorReviewId" TEXT;

-- AlterTable
ALTER TABLE "RiskRegisterItem" ADD COLUMN     "linkedAiUseCaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedAiVendorReviewIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "aiUseCaseId" TEXT,
ADD COLUMN     "aiVendorReviewId" TEXT;

-- CreateTable
CREATE TABLE "AIUseCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorReviewId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "businessOwner" TEXT NOT NULL,
    "department" TEXT,
    "useCaseType" "AIUseCaseType" NOT NULL,
    "workflowType" "AIWorkflowType" NOT NULL,
    "vendorName" TEXT,
    "modelFamily" TEXT,
    "deploymentContext" "AIDeploymentContext" NOT NULL,
    "dataClasses" "AIDataClass"[] DEFAULT ARRAY[]::"AIDataClass"[],
    "allowedDataClasses" "AIDataClass"[] DEFAULT ARRAY[]::"AIDataClass"[],
    "restrictedDataClasses" "AIDataClass"[] DEFAULT ARRAY[]::"AIDataClass"[],
    "prohibitedDataClasses" "AIDataClass"[] DEFAULT ARRAY[]::"AIDataClass"[],
    "customerDataInvolved" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "regulatedDataInvolved" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "secretsInvolved" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "externalToolAccess" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "internetAccess" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "riskTier" "AIRiskTier" NOT NULL DEFAULT 'MODERATE',
    "status" "AIGovernanceStatus" NOT NULL DEFAULT 'DRAFT',
    "linkedPolicyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedPolicyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredConditions" "AIPolicyRequirement"[] DEFAULT ARRAY[]::"AIPolicyRequirement"[],
    "unmetRequirements" "AIPolicyRequirement"[] DEFAULT ARRAY[]::"AIPolicyRequirement"[],
    "approvalBlockers" "AIPolicyRequirement"[] DEFAULT ARRAY[]::"AIPolicyRequirement"[],
    "decisionConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryRisks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredControls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedReviewerUserId" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIVendorReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "primaryUseCase" TEXT NOT NULL,
    "modelProvider" TEXT,
    "deploymentType" "AIDeploymentContext" NOT NULL,
    "authenticationSupport" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "loggingSupport" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "retentionPolicyStatus" "AIRetentionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "trainsOnCustomerData" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "subprocessorsStatus" "AIYesNoUnknown" NOT NULL DEFAULT 'UNKNOWN',
    "dpaStatus" "AIDpaStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "securityDocsRequested" BOOLEAN NOT NULL DEFAULT false,
    "securityDocsReceived" BOOLEAN NOT NULL DEFAULT false,
    "dataClasses" "AIDataClass"[] DEFAULT ARRAY[]::"AIDataClass"[],
    "linkedPolicyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedPolicyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredConditions" "AIPolicyRequirement"[] DEFAULT ARRAY[]::"AIPolicyRequirement"[],
    "unmetRequirements" "AIPolicyRequirement"[] DEFAULT ARRAY[]::"AIPolicyRequirement"[],
    "approvalBlockers" "AIPolicyRequirement"[] DEFAULT ARRAY[]::"AIPolicyRequirement"[],
    "decisionConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskNotes" TEXT,
    "primaryRisks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredControls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerUserId" TEXT,
    "assignedReviewerUserId" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "riskTier" "AIRiskTier" NOT NULL DEFAULT 'MODERATE',
    "status" "AIGovernanceStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "evidenceArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedRiskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIVendorReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIUseCase_tenantId_status_updatedAt_idx" ON "AIUseCase"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AIUseCase_tenantId_riskTier_updatedAt_idx" ON "AIUseCase"("tenantId", "riskTier", "updatedAt");

-- CreateIndex
CREATE INDEX "AIUseCase_tenantId_assignedReviewerUserId_reviewDueAt_idx" ON "AIUseCase"("tenantId", "assignedReviewerUserId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "AIUseCase_tenantId_vendorReviewId_idx" ON "AIUseCase"("tenantId", "vendorReviewId");

-- CreateIndex
CREATE INDEX "AIUseCase_tenantId_name_idx" ON "AIUseCase"("tenantId", "name");

-- CreateIndex
CREATE INDEX "AIVendorReview_tenantId_status_updatedAt_idx" ON "AIVendorReview"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AIVendorReview_tenantId_riskTier_updatedAt_idx" ON "AIVendorReview"("tenantId", "riskTier", "updatedAt");

-- CreateIndex
CREATE INDEX "AIVendorReview_tenantId_assignedReviewerUserId_reviewDueAt_idx" ON "AIVendorReview"("tenantId", "assignedReviewerUserId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "AIVendorReview_tenantId_ownerUserId_reviewDueAt_idx" ON "AIVendorReview"("tenantId", "ownerUserId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "AIVendorReview_tenantId_vendorName_productName_idx" ON "AIVendorReview"("tenantId", "vendorName", "productName");

-- CreateIndex
CREATE INDEX "Finding_tenantId_aiUseCaseId_idx" ON "Finding"("tenantId", "aiUseCaseId");

-- CreateIndex
CREATE INDEX "Finding_tenantId_aiVendorReviewId_idx" ON "Finding"("tenantId", "aiVendorReviewId");

-- CreateIndex
CREATE INDEX "Task_tenantId_aiUseCaseId_idx" ON "Task"("tenantId", "aiUseCaseId");

-- CreateIndex
CREATE INDEX "Task_tenantId_aiVendorReviewId_idx" ON "Task"("tenantId", "aiVendorReviewId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "AIUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_aiVendorReviewId_fkey" FOREIGN KEY ("aiVendorReviewId") REFERENCES "AIVendorReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "AIUseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_aiVendorReviewId_fkey" FOREIGN KEY ("aiVendorReviewId") REFERENCES "AIVendorReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUseCase" ADD CONSTRAINT "AIUseCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUseCase" ADD CONSTRAINT "AIUseCase_vendorReviewId_fkey" FOREIGN KEY ("vendorReviewId") REFERENCES "AIVendorReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIVendorReview" ADD CONSTRAINT "AIVendorReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
