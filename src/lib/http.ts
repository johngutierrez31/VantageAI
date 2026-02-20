import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest('Invalid request payload', error.flatten());
  }

  if (error instanceof Error && error.message.startsWith('Forbidden')) {
    return forbidden(error.message);
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
