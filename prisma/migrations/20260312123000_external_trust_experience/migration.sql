-- CreateEnum
CREATE TYPE "TrustRoomStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrustRoomAccessMode" AS ENUM ('INTERNAL_REVIEW', 'PROTECTED_LINK', 'REQUEST_ACCESS');

-- CreateEnum
CREATE TYPE "TrustRoomAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "TrustRoomEngagementEventType" AS ENUM ('ROOM_VIEWED', 'SECTION_VIEWED', 'PACKET_DOWNLOADED', 'REQUEST_SUBMITTED', 'ACCESS_GRANTED');

-- CreateTable
CREATE TABLE "TrustRoom" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trustPacketId" TEXT NOT NULL,
    "trustInboxItemId" TEXT,
    "questionnaireUploadId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TrustRoomStatus" NOT NULL DEFAULT 'DRAFT',
    "accessMode" "TrustRoomAccessMode" NOT NULL DEFAULT 'INTERNAL_REVIEW',
    "roomSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summaryText" TEXT,
    "termsRequired" BOOLEAN NOT NULL DEFAULT true,
    "ndaRequired" BOOLEAN NOT NULL DEFAULT false,
    "shareKeyHash" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustRoomAccessRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trustRoomId" TEXT NOT NULL,
    "trustPacketId" TEXT,
    "trustInboxItemId" TEXT,
    "questionnaireUploadId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "companyName" TEXT,
    "requestReason" TEXT,
    "status" "TrustRoomAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "assignedOwnerUserId" TEXT,
    "internalNotes" TEXT,
    "approvedAccessTokenHash" TEXT,
    "approvedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustRoomAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustRoomEngagementEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trustRoomId" TEXT NOT NULL,
    "trustPacketId" TEXT,
    "accessRequestId" TEXT,
    "eventType" "TrustRoomEngagementEventType" NOT NULL,
    "sectionKey" TEXT,
    "actorEmail" TEXT,
    "actorLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustRoomEngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustRoom_trustPacketId_key" ON "TrustRoom"("trustPacketId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustRoom_slug_key" ON "TrustRoom"("slug");

-- CreateIndex
CREATE INDEX "TrustRoom_tenantId_status_updatedAt_idx" ON "TrustRoom"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrustRoom_tenantId_accessMode_status_idx" ON "TrustRoom"("tenantId", "accessMode", "status");

-- CreateIndex
CREATE INDEX "TrustRoom_tenantId_trustInboxItemId_idx" ON "TrustRoom"("tenantId", "trustInboxItemId");

-- CreateIndex
CREATE INDEX "TrustRoom_tenantId_questionnaireUploadId_idx" ON "TrustRoom"("tenantId", "questionnaireUploadId");

-- CreateIndex
CREATE INDEX "TrustRoomAccessRequest_tenantId_status_updatedAt_idx" ON "TrustRoomAccessRequest"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrustRoomAccessRequest_tenantId_assignedOwnerUserId_status_idx" ON "TrustRoomAccessRequest"("tenantId", "assignedOwnerUserId", "status");

-- CreateIndex
CREATE INDEX "TrustRoomAccessRequest_tenantId_requesterEmail_createdAt_idx" ON "TrustRoomAccessRequest"("tenantId", "requesterEmail", "createdAt");

-- CreateIndex
CREATE INDEX "TrustRoomAccessRequest_tenantId_trustRoomId_createdAt_idx" ON "TrustRoomAccessRequest"("tenantId", "trustRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "TrustRoomEngagementEvent_tenantId_trustRoomId_createdAt_idx" ON "TrustRoomEngagementEvent"("tenantId", "trustRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "TrustRoomEngagementEvent_tenantId_eventType_createdAt_idx" ON "TrustRoomEngagementEvent"("tenantId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "TrustRoomEngagementEvent_tenantId_accessRequestId_createdAt_idx" ON "TrustRoomEngagementEvent"("tenantId", "accessRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrustRoom" ADD CONSTRAINT "TrustRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoom" ADD CONSTRAINT "TrustRoom_trustPacketId_fkey" FOREIGN KEY ("trustPacketId") REFERENCES "TrustPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoom" ADD CONSTRAINT "TrustRoom_trustInboxItemId_fkey" FOREIGN KEY ("trustInboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoom" ADD CONSTRAINT "TrustRoom_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomAccessRequest" ADD CONSTRAINT "TrustRoomAccessRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomAccessRequest" ADD CONSTRAINT "TrustRoomAccessRequest_trustRoomId_fkey" FOREIGN KEY ("trustRoomId") REFERENCES "TrustRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomAccessRequest" ADD CONSTRAINT "TrustRoomAccessRequest_trustPacketId_fkey" FOREIGN KEY ("trustPacketId") REFERENCES "TrustPacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomAccessRequest" ADD CONSTRAINT "TrustRoomAccessRequest_trustInboxItemId_fkey" FOREIGN KEY ("trustInboxItemId") REFERENCES "TrustInboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomAccessRequest" ADD CONSTRAINT "TrustRoomAccessRequest_questionnaireUploadId_fkey" FOREIGN KEY ("questionnaireUploadId") REFERENCES "QuestionnaireUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomEngagementEvent" ADD CONSTRAINT "TrustRoomEngagementEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomEngagementEvent" ADD CONSTRAINT "TrustRoomEngagementEvent_trustRoomId_fkey" FOREIGN KEY ("trustRoomId") REFERENCES "TrustRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomEngagementEvent" ADD CONSTRAINT "TrustRoomEngagementEvent_trustPacketId_fkey" FOREIGN KEY ("trustPacketId") REFERENCES "TrustPacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustRoomEngagementEvent" ADD CONSTRAINT "TrustRoomEngagementEvent_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "TrustRoomAccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
