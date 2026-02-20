-- Initial VantageCISO schema
CREATE TYPE "TenantRole" AS ENUM ('ADMIN','ANALYST','VIEWER','CLIENT_VIEWER');
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT','IN_PROGRESS','COMPLETED');
CREATE TYPE "PlanTier" AS ENUM ('STARTER','PRO','PARTNER');

CREATE TABLE "Tenant" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);
CREATE TABLE "Membership" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "TenantRole" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "userId")
);
CREATE TABLE "Template" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("tenantId", "name")
);
CREATE TABLE "TemplateVersion" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "templateId" TEXT NOT NULL REFERENCES "Template"("id") ON DELETE CASCADE,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("templateId", "version")
);
CREATE TABLE "Control" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "templateVersionId" TEXT NOT NULL REFERENCES "TemplateVersion"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("templateVersionId", "code")
);
CREATE TABLE "Question" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "controlId" TEXT NOT NULL REFERENCES "Control"("id") ON DELETE CASCADE,
  "prompt" TEXT NOT NULL,
  "rubric" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Assessment" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "templateId" TEXT NOT NULL REFERENCES "Template"("id") ON DELETE RESTRICT,
  "templateVersionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);
CREATE TABLE "Response" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "assessmentId" TEXT NOT NULL REFERENCES "Assessment"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE,
  "answer" TEXT,
  "score" DOUBLE PRECISION,
  "confidence" DOUBLE PRECISION,
  "rationale" TEXT,
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("assessmentId", "questionId")
);
CREATE TABLE "Evidence" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL,
  "extractedText" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "EvidenceLink" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "evidenceId" TEXT NOT NULL REFERENCES "Evidence"("id") ON DELETE CASCADE,
  "questionId" TEXT REFERENCES "Question"("id") ON DELETE CASCADE,
  "responseId" TEXT REFERENCES "Response"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AISuggestion" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "assessmentId" TEXT,
  "questionId" TEXT,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "output" JSONB NOT NULL,
  "citations" TEXT[] NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Exception" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "assessmentId" TEXT NOT NULL,
  "controlCode" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "owner" TEXT,
  "dueDate" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "actorUserId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "StripeCustomer" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "stripeCustomerId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "plan" "PlanTier" NOT NULL DEFAULT 'STARTER',
  "stripeSubscriptionId" TEXT UNIQUE,
  "status" TEXT NOT NULL,
  "currentPeriodEnd" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX "TemplateVersion_tenant_template_idx" ON "TemplateVersion"("tenantId", "templateId");
CREATE INDEX "Control_tenant_templateVersion_idx" ON "Control"("tenantId", "templateVersionId");
CREATE INDEX "Response_tenant_assessment_idx" ON "Response"("tenantId", "assessmentId");
