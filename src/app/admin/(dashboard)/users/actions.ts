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
    revalidatePath('/admin/users');
  });
}
