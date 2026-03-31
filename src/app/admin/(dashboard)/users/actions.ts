'use server';

import { adminAction } from '@/lib/admin/actions';
import { getAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function updateUser(
  id: string,
  data: { role?: string; reports_to?: string | null; is_active?: boolean },
) {
  return adminAction(async () => {
    const supabase = getAdminClient();
    const { error } = await supabase.from('users').update(data as { role?: 'admin' | 'director' | 'manager' | 'agent' | 'pa' | 'candidate'; reports_to?: string | null; is_active?: boolean }).eq('id', id);
    if (error) throw new Error(error.message);

    // Sync role change to auth.users app_metadata so JWT claims update immediately
    if (data.role) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
        app_metadata: { role: data.role },
      });
      if (authErr) throw new Error(`Role synced to DB but JWT update failed: ${authErr.message}`);
    }

    // Force-logout deactivated users so they can't continue using stale sessions
    if (data.is_active === false) {
      await supabase.auth.admin.signOut(id, 'global');
    }

    revalidatePath('/admin/users');
  });
}
