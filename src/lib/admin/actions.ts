'use server';

import { createClient } from '@/lib/supabase/server';

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export async function adminAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    // Defence-in-depth: verify caller is an authenticated admin
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: not authenticated' };
    }

    if (user.app_metadata?.role !== 'admin') {
      return { success: false, error: 'Forbidden: admin access required' };
    }

    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error('[adminAction]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
