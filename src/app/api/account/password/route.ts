import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { handleRouteError, unauthorized } from '@/lib/http';
import { prisma } from '@/lib/db/prisma';
import { accountPasswordUpdateSchema } from '@/lib/validation/auth';

export async function PATCH(request: Request) {
  try {
    const session = await getSessionContext();
    if (!session.userId) return unauthorized();

    const payload = accountPasswordUpdateSchema.parse(await request.json());
    const existingCredential = await prisma.userCredential.findUnique({
      where: { userId: session.userId },
      select: { passwordHash: true }
    });

    if (existingCredential && !payload.currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }

    if (
      existingCredential &&
      payload.currentPassword &&
      !verifyPassword(payload.currentPassword, existingCredential.passwordHash)
    ) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    const passwordHash = hashPassword(payload.newPassword);
    await prisma.userCredential.upsert({
      where: { userId: session.userId },
      update: { passwordHash },
      create: { userId: session.userId, passwordHash }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
