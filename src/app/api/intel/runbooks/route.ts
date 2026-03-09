import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { getSecurityRunbookById, getSecurityRunbooks } from '@/lib/intel/runbooks';
import { runbookTaskSeedSchema } from '@/lib/validation/intel';

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

export async function GET() {
  try {
    await getSessionContext();
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      runbooks: getSecurityRunbooks()
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = runbookTaskSeedSchema.parse(await request.json());
    const runbook = getSecurityRunbookById(payload.runbookId);

    if (!runbook) {
      return NextResponse.json({ error: `Unknown runbook: ${payload.runbookId}` }, { status: 400 });
    }

    const created: Array<{ id: string; title: string }> = [];
    const baseDate = new Date();

    for (const taskTemplate of runbook.tasks) {
      const title = `[Runbook:${runbook.title}] ${taskTemplate.title}`;
      const existing = await prisma.task.findFirst({
        where: {
          tenantId: session.tenantId,
          title,
          status: { not: 'DONE' }
        }
      });

      if (existing) {
        continue;
      }

      const dueDate =
        typeof taskTemplate.dueOffsetHours === 'number'
          ? addHours(baseDate, taskTemplate.dueOffsetHours)
          : addDays(baseDate, taskTemplate.dueOffsetDays);
      const task = await prisma.task.create({
        data: {
          tenantId: session.tenantId,
          title,
          description: `${taskTemplate.details}\n\nRunbook: ${runbook.id}\nLinked workflow: ${runbook.linkedRoute}`,
          assignee: payload.assignee,
          dueDate,
          priority: taskTemplate.priority,
          responseOpsPhase: taskTemplate.phase ?? null,
          createdBy: session.userId
        }
      });

      created.push({ id: task.id, title: task.title });
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'runbook',
      entityId: runbook.id,
      action: 'seed_tasks',
      metadata: {
        runbookTitle: runbook.title,
        createdCount: created.length
      }
    });

    return NextResponse.json({
      runbookId: runbook.id,
      createdCount: created.length,
      created
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
