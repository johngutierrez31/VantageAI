-- CreateEnum
CREATE TYPE "WorkspaceMode" AS ENUM ('DEMO', 'TRIAL', 'PAID');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'EXPIRED', 'CONVERTED');

-- AlterTable
ALTER TABLE "Tenant"
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialStatus" "TrialStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "workspaceMode" "WorkspaceMode" NOT NULL DEFAULT 'PAID';
