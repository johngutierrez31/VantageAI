-- Normalize tenant roles to OWNER/ADMIN/MEMBER/VIEWER.
CREATE TYPE "TenantRole_new" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

ALTER TABLE "Membership"
ALTER COLUMN "role" TYPE TEXT;

UPDATE "Membership"
SET "role" = CASE
  WHEN "role" = 'OWNER' THEN 'OWNER'
  WHEN "role" = 'ADMIN' THEN 'ADMIN'
  WHEN "role" = 'ANALYST' THEN 'MEMBER'
  WHEN "role" = 'CLIENT_VIEWER' THEN 'VIEWER'
  WHEN "role" = 'MEMBER' THEN 'MEMBER'
  WHEN "role" = 'VIEWER' THEN 'VIEWER'
  ELSE 'VIEWER'
END;

ALTER TABLE "Membership"
ALTER COLUMN "role" TYPE "TenantRole_new"
USING ("role"::"TenantRole_new");

DROP TYPE "TenantRole";
ALTER TYPE "TenantRole_new" RENAME TO "TenantRole";

-- Normalize plan tiers for new entitlement matrix.
CREATE TYPE "PlanTier_new" AS ENUM ('FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');

ALTER TABLE "Subscription"
ALTER COLUMN "plan" DROP DEFAULT;

ALTER TABLE "Subscription"
ALTER COLUMN "plan" TYPE TEXT;

UPDATE "Subscription"
SET "plan" = CASE
  WHEN "plan" = 'FREE' THEN 'FREE'
  WHEN "plan" = 'STARTER' THEN 'STARTER'
  WHEN "plan" = 'PRO' THEN 'PRO'
  WHEN "plan" = 'PARTNER' THEN 'BUSINESS'
  WHEN "plan" = 'BUSINESS' THEN 'BUSINESS'
  WHEN "plan" = 'ENTERPRISE' THEN 'ENTERPRISE'
  ELSE 'STARTER'
END;

ALTER TABLE "Subscription"
ALTER COLUMN "plan" TYPE "PlanTier_new"
USING ("plan"::"PlanTier_new");

ALTER TABLE "Subscription"
ALTER COLUMN "plan" SET DEFAULT 'STARTER';

DROP TYPE "PlanTier";
ALTER TYPE "PlanTier_new" RENAME TO "PlanTier";

CREATE TYPE "TemplateQuestionType" AS ENUM ('LIKERT', 'TEXT', 'MULTI');
CREATE TYPE "QuestionnaireOriginalFormat" AS ENUM ('CSV', 'XLSX', 'DOCX', 'JSON');
CREATE TYPE "QuestionnaireMappingStatus" AS ENUM ('MAPPED', 'UNMAPPED');
CREATE TYPE "TrustInboxStatus" AS ENUM ('NEW', 'IN_REVIEW', 'DRAFT_READY', 'DELIVERED');

ALTER TABLE "Question"
ADD COLUMN "sectionId" TEXT,
ADD COLUMN "guidance" TEXT,
ADD COLUMN "answerType" "TemplateQuestionType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "scoringRubricJson" JSONB,
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "TemplateSection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionnaireUpload" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFormat" "QuestionnaireOriginalFormat" NOT NULL,
    "parsedJson" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionnaireUpload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionnaireItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "questionnaireUploadId" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "contextJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionnaireItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionnaireMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "questionnaireItemId" TEXT NOT NULL,
    "templateQuestionId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "QuestionnaireMappingStatus" NOT NULL DEFAULT 'UNMAPPED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionnaireMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DraftAnswer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "questionnaireItemId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "citationsJson" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustInboxItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "status" "TrustInboxStatus" NOT NULL DEFAULT 'NEW',
    "questionnaireUploadId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrustInboxItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustDoc" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "tagsJson" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustDoc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustInboxAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inboxItemId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustInboxAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Question_controlId_order_idx" ON "Question"("controlId", "order");
CREATE INDEX "Question_sectionId_order_idx" ON "Question"("sectionId", "order");
CREATE INDEX "TemplateSection_tenantId_templateVersionId_order_idx" ON "TemplateSection"("tenantId", "templateVersionId", "order");
CREATE INDEX "QuestionnaireUpload_tenantId_createdAt_idx" ON "QuestionnaireUpload"("tenantId", "createdAt");
CREATE INDEX "QuestionnaireItem_tenantId_questionnaireUploadId_idx" ON "QuestionnaireItem"("tenantId", "questionnaireUploadId");
CREATE INDEX "QuestionnaireItem_questionnaireUploadId_rowKey_idx" ON "QuestionnaireItem"("questionnaireUploadId", "rowKey");
CREATE INDEX "QuestionnaireMapping_tenantId_status_idx" ON "QuestionnaireMapping"("tenantId", "status");
CREATE INDEX "QuestionnaireMapping_tenantId_questionnaireItemId_idx" ON "QuestionnaireMapping"("tenantId", "questionnaireItemId");
CREATE INDEX "DraftAnswer_tenantId_questionnaireItemId_createdAt_idx" ON "DraftAnswer"("tenantId", "questionnaireItemId", "createdAt");
CREATE INDEX "TrustInboxItem_tenantId_status_updatedAt_idx" ON "TrustInboxItem"("tenantId", "status", "updatedAt");
CREATE UNIQUE INDEX "TrustInboxItem_questionnaireUploadId_key" ON "TrustInboxItem"("questionnaireUploadId");
CREATE UNIQUE INDEX "TrustDoc_tenantId_evidenceId_key" ON "TrustDoc"("tenantId", "evidenceId");
CREATE UNIQUE INDEX "TrustInboxAttachment_inboxItemId_evidenceId_key" ON "TrustInboxAttachment"("inboxItemId", "evidenceId");
CREATE INDEX "TrustInboxAttachment_tenantId_inboxItemId_idx" ON "TrustInboxAttachment"("tenantId", "inboxItemId");

ALTER TABLE "TemplateSection"
ADD CONSTRAINT "TemplateSection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TemplateSection"
ADD CONSTRAINT "TemplateSection_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Question"
ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TemplateSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireUpload"
ADD CONSTRAINT "QuestionnaireUpload_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireItem"
ADD CONSTRAINT "QuestionnaireItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireItem"
ADD CONSTRAINT "QuestionnaireItem_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireMapping"
ADD CONSTRAINT "QuestionnaireMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireMapping"
ADD CONSTRAINT "QuestionnaireMapping_questionnaireItemId_fkey" FOREIGN KEY ("questionnaireItemId") REFERENCES "QuestionnaireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireMapping"
ADD CONSTRAINT "QuestionnaireMapping_templateQuestionId_fkey" FOREIGN KEY ("templateQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DraftAnswer"
ADD CONSTRAINT "DraftAnswer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DraftAnswer"
ADD CONSTRAINT "DraftAnswer_questionnaireItemId_fkey" FOREIGN KEY ("questionnaireItemId") REFERENCES "QuestionnaireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustInboxItem"
ADD CONSTRAINT "TrustInboxItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustInboxItem"
ADD CONSTRAINT "TrustInboxItem_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrustDoc"
ADD CONSTRAINT "TrustDoc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustDoc"
ADD CONSTRAINT "TrustDoc_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustInboxAttachment"
ADD CONSTRAINT "TrustInboxAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustInboxAttachment"
ADD CONSTRAINT "TrustInboxAttachment_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustInboxAttachment"
ADD CONSTRAINT "TrustInboxAttachment_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

