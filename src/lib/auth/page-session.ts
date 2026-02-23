import { redirect } from 'next/navigation';
import { SessionContextError, getSessionContext } from '@/lib/auth/session';

export async function getPageSessionContext() {
  try {
    return await getSessionContext();
  } catch (error) {
    if (error instanceof SessionContextError) {
      if (error.statusCode === 401) {
        redirect('/login');
      }

      if (error.statusCode === 403) {
        redirect('/login?error=NoMembership');
      }
    }

    throw error;
  }
}
