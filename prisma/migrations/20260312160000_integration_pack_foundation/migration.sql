-- CreateEnum
CREATE TYPE "ConnectorProvider" AS ENUM ('SLACK', 'JIRA', 'CONFLUENCE', 'GOOGLE_DRIVE', 'OUTBOUND_WEBHOOK');

-- CreateEnum
CREATE TYPE "ConnectorMode" AS ENUM ('SIMULATED', 'LIVE');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('ACTIVE', 'NEEDS_ATTENTION', 'DISABLED');

-- CreateEnum
CREATE TYPE "ConnectorActivityStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ConnectorConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" "ConnectorMode" NOT NULL DEFAULT 'SIMULATED',
    "status" "ConnectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "configJson" JSONB NOT NULL,
    "secretCiphertext" TEXT,
    "lastHealthStatus" "ConnectorActivityStatus",
    "lastHealthCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorId" TEXT,
    "provider" "ConnectorProvider" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "targetLabel" TEXT,
    "externalObjectId" TEXT,
    "externalObjectKey" TEXT,
    "externalObjectUrl" TEXT,
    "status" "ConnectorActivityStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT NOT NULL,
    "payloadJson" JSONB,
    "errorMessage" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorObjectLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "externalObjectId" TEXT NOT NULL,
    "externalObjectKey" TEXT,
    "externalObjectUrl" TEXT,
    "lastSyncStatus" "ConnectorActivityStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorObjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorConfig_tenantId_provider_key" ON "ConnectorConfig"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "ConnectorConfig_tenantId_status_updatedAt_idx" ON "ConnectorConfig"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ConnectorActivity_tenantId_provider_createdAt_idx" ON "ConnectorActivity"("tenantId", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectorActivity_tenantId_connectorId_createdAt_idx" ON "ConnectorActivity"("tenantId", "connectorId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectorActivity_tenantId_entityType_entityId_idx" ON "ConnectorActivity"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorObjectLink_connectorId_entityType_entityId_key" ON "ConnectorObjectLink"("connectorId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ConnectorObjectLink_tenantId_provider_entityType_entityId_idx" ON "ConnectorObjectLink"("tenantId", "provider", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ConnectorConfig" ADD CONSTRAINT "ConnectorConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorActivity" ADD CONSTRAINT "ConnectorActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorActivity" ADD CONSTRAINT "ConnectorActivity_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "ConnectorConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorObjectLink" ADD CONSTRAINT "ConnectorObjectLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorObjectLink" ADD CONSTRAINT "ConnectorObjectLink_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "ConnectorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
