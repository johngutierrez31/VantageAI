import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/rbac/authorize';
import { getTenantEntitlements } from '@/lib/billing/entitlements';
import { handleRouteError, paymentRequired, badRequest } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';

const ACCEPTED_TYPES = new Set(['text/plain', 'text/csv', 'text/markdown', 'application/pdf']);

function normalizeTags(value: FormDataEntryValue | null) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function detectMimeType(file: File) {
  if (file.type && ACCEPTED_TYPES.has(file.type)) return file.type;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv')) return 'text/csv';
  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) return 'text/markdown';
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  return file.type || 'text/plain';
}

function extractTextFromBuffer(buffer: Buffer, mimeType: string) {
  // MVP: raw text ingestion only. PDF extraction remains a lightweight best-effort.
  if (mimeType === 'application/pdf') {
    return buffer.toString('utf8').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ').trim();
  }
  return buffer.toString('utf8').trim();
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');

    const entitlements = await getTenantEntitlements(session.tenantId);
    const count = await prisma.evidence.count({ where: { tenantId: session.tenantId } });
    if (count >= entitlements.limits.evidenceFilesMax) {
      return paymentRequired('Evidence file limit reached for current plan');
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) {
      return badRequest('file is required');
    }

    if (!fileEntry.name.trim()) {
      return badRequest('file name is required');
    }

    const mimeType = detectMimeType(fileEntry);
    if (!ACCEPTED_TYPES.has(mimeType)) {
      return badRequest('Unsupported file type. Use PDF, TXT, MD, or CSV for MVP.');
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = extractTextFromBuffer(buffer, mimeType);

    if (!extractedText || extractedText.length < 20) {
      return badRequest('Uploaded file did not contain enough extractable text');
    }

    const sourceUriEntry = formData.get('sourceUri');
    const sourceUri = typeof sourceUriEntry === 'string' && sourceUriEntry.trim() ? sourceUriEntry.trim() : null;
    const tags = normalizeTags(formData.get('tags'));

    const evidence = await prisma.evidence.create({
      data: {
        tenantId: session.tenantId,
        name: fileEntry.name,
        storageKey: `tenant/${session.tenantId}/uploads/${Date.now()}-${fileEntry.name}`,
        mimeType,
        byteSize: buffer.byteLength,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        sourceUri,
        tags,
        extractedText,
        ingestionStatus: 'PENDING',
        createdBy: session.userId
      }
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'evidence',
      entityId: evidence.id,
      action: 'upload',
      metadata: {
        fileName: evidence.name,
        mimeType: evidence.mimeType,
        byteSize: evidence.byteSize
      }
    });

    return NextResponse.json(
      {
        id: evidence.id,
        name: evidence.name,
        ingestionStatus: evidence.ingestionStatus
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
