-- CreateEnum
CREATE TYPE "AdoptionImportTarget" AS ENUM ('FINDINGS', 'RISKS', 'APPROVED_ANSWERS', 'INCIDENTS');

-- CreateEnum
CREATE TYPE "AdoptionImportSource" AS ENUM ('MANUAL', 'CSV', 'CONNECTOR_EXPORT');

-- CreateEnum
CREATE TYPE "AdoptionImportStatus" AS ENUM ('SUCCEEDED', 'PARTIAL', 'FAILED');

-- AlterEnum
ALTER TYPE "FindingSourceType" ADD VALUE IF NOT EXISTS 'ADOPTION_IMPORT';

-- CreateTable
CREATE TABLE "AdoptionImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorId" TEXT,
    "target" "AdoptionImportTarget" NOT NULL,
    "source" "AdoptionImportSource" NOT NULL,
    "status" "AdoptionImportStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "sourceLabel" TEXT,
    "summary" TEXT NOT NULL,
    "rawInput" JSONB NOT NULL,
    "resultJson" JSONB,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdoptionImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdoptionImport_tenantId_target_createdAt_idx" ON "AdoptionImport"("tenantId", "target", "createdAt");

-- CreateIndex
CREATE INDEX "AdoptionImport_tenantId_status_createdAt_idx" ON "AdoptionImport"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AdoptionImport_tenantId_connectorId_createdAt_idx" ON "AdoptionImport"("tenantId", "connectorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdoptionImport" ADD CONSTRAINT "AdoptionImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionImport" ADD CONSTRAINT "AdoptionImport_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "ConnectorConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
