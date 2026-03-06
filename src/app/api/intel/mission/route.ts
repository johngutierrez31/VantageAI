import { NextResponse } from 'next/server';
import { TaskPriority } from '@prisma/client';
import { getSessionContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError } from '@/lib/http';
import { requireRole } from '@/lib/rbac/authorize';
import { writeAuditLog } from '@/lib/audit';
import { buildSevenDayMissionQueue, getTenantSecurityPulse } from '@/lib/intel/pulse';
import { getTrendSignals } from '@/lib/intel/trends';
import { missionTaskSeedSchema } from '@/lib/validation/intel';

function mapPriority(priority: 'P0' | 'P1' | 'P2'): TaskPriority {
  if (priority === 'P0') return 'CRITICAL';
  if (priority === 'P1') return 'HIGH';
  return 'MEDIUM';
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET() {
  try {
    const session = await getSessionContext();
    const pulse = await getTenantSecurityPulse(session.tenantId);
    const trends = getTrendSignals();
    const missionQueue = buildSevenDayMissionQueue(pulse, trends);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      pulse,
      missionQueue
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'MEMBER');
    const payload = missionTaskSeedSchema.parse(await request.json());

    const pulse = await getTenantSecurityPulse(session.tenantId);
    const trends = getTrendSignals();
    const missionQueue = buildSevenDayMissionQueue(pulse, trends);
    const selectedMissionIds = new Set(payload.missionIds ?? missionQueue.map((mission) => mission.id));
    const selectedMissions = missionQueue.filter((mission) => selectedMissionIds.has(mission.id));

    if (selectedMissions.length === 0) {
      return NextResponse.json({ error: 'No matching mission items selected' }, { status: 400 });
    }

    const created: Array<{ id: string; title: string }> = [];
    const skipped: Array<{ missionId: string; reason: string }> = [];
    const baseDate = new Date();

    for (let index = 0; index < selectedMissions.length; index += 1) {
      const mission = selectedMissions[index];
      const title = `[Mission] ${mission.title}`;
      const dueDate = addDays(baseDate, index);

      const existing = await prisma.task.findFirst({
        where: {
          tenantId: session.tenantId,
          title,
          status: { not: 'DONE' }
        }
      });

      if (existing) {
        skipped.push({ missionId: mission.id, reason: 'Existing active mission task already present' });
        continue;
      }

      const task = await prisma.task.create({
        data: {
          tenantId: session.tenantId,
          title,
          assignee: payload.assignee,
          dueDate,
          priority: mapPriority(mission.priority),
          createdBy: session.userId,
          description: [
            mission.why,
            '',
            'Action Steps:',
            ...mission.actions.map((action) => `- ${action}`),
            '',
            `Linked workflow: ${mission.linkedRoute}`,
            `Mapped trends: ${mission.mappedTrendIds.join(', ')}`
          ].join('\n')
        }
      });

      created.push({ id: task.id, title: task.title });
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'mission_queue',
      entityId: session.tenantId,
      action: 'seed_tasks',
      metadata: {
        selectedMissionCount: selectedMissions.length,
        createdCount: created.length,
        skippedCount: skipped.length
      }
    });

    return NextResponse.json({
      created,
      skipped,
      createdCount: created.length,
      skippedCount: skipped.length
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

