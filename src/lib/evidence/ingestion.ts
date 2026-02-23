import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { splitIntoChunks } from '@/lib/evidence/chunking';
import { createEmbedding } from '@/lib/evidence/embeddings';

type IngestArgs = {
  tenantId: string;
  userId: string;
  name: string;
  content: string;
  mimeType?: string;
  tags?: string[];
  sourceUri?: string;
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function estimateTokenCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

export async function ingestEvidenceText(args: IngestArgs) {
  const evidence = await prisma.evidence.create({
    data: {
      tenantId: args.tenantId,
      name: args.name,
      storageKey: `tenant/${args.tenantId}/evidence/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
      mimeType: args.mimeType ?? 'text/plain',
      byteSize: Buffer.byteLength(args.content, 'utf-8'),
      sha256: sha256(args.content),
      sourceUri: args.sourceUri,
      tags: args.tags ?? [],
      extractedText: args.content,
      ingestionStatus: 'PROCESSING',
      createdBy: args.userId
    }
  });

  try {
    return await indexEvidenceById(args.tenantId, evidence.id);
  } catch (error) {
    await prisma.evidence.update({
      where: { id: evidence.id },
      data: {
        ingestionStatus: 'FAILED',
        ingestionError: error instanceof Error ? error.message : 'Unknown ingestion error'
      }
    });
    throw error;
  }
}

export async function indexEvidenceById(tenantId: string, evidenceId: string) {
  const evidence = await prisma.evidence.findFirst({
    where: { id: evidenceId, tenantId },
    select: {
      id: true,
      tenantId: true,
      extractedText: true
    }
  });

  if (!evidence) {
    throw new Error('Evidence not found');
  }

  if (!evidence.extractedText || !evidence.extractedText.trim()) {
    throw new Error('Evidence has no extracted text to index');
  }

  await prisma.evidence.update({
    where: { id: evidence.id },
    data: {
      ingestionStatus: 'PROCESSING',
      ingestionError: null
    }
  });

  await prisma.evidenceChunk.deleteMany({
    where: { tenantId, evidenceId: evidence.id }
  });

  const chunks = splitIntoChunks(evidence.extractedText);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunkText = chunks[index];
    const embedding = await createEmbedding(chunkText);

    await prisma.evidenceChunk.create({
      data: {
        tenantId,
        evidenceId: evidence.id,
        chunkIndex: index,
        chunkText,
        tokenCount: estimateTokenCount(chunkText),
        embedding
      }
    });
  }

  const updated = await prisma.evidence.update({
    where: { id: evidence.id },
    data: {
      ingestionStatus: 'COMPLETED',
      ingestionError: null,
      extractedAt: new Date()
    },
    include: { chunks: true }
  });

  return updated;
}
