import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { SessionContextError } from '@/lib/auth/session';

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function paymentRequired(message = 'Payment required') {
  return NextResponse.json({ error: message }, { status: 402 });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest('Invalid request payload', error.flatten());
  }

  if (error instanceof SessionContextError) {
    if (error.statusCode === 401) return unauthorized(error.message);
    return forbidden(error.message);
  }

  if (error instanceof Error && error.message.startsWith('Forbidden')) {
    return forbidden(error.message);
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
