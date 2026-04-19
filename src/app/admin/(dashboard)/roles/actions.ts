'use server';

import { adminAction } from '@/lib/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { canReassignAgents, type UserRole } from '@/lib/shared-types/roles';
import { revalidatePath } from 'next/cache';

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export async function updateReportsTo(userId: string, reportsTo: string | null): Promise<ActionResult> {
  try {
    // Authorize: any role with reassign_agents capability (admin, director, pa).
    const sb = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();
    if (authErr || !user) return { success: false, error: 'Unauthorized: not authenticated' };
    const callerRole = user.app_metadata?.role as UserRole | undefined;
    if (!callerRole || !canReassignAgents(callerRole)) {
      return { success: false, error: 'Forbidden: reassign_agents capability required' };
    }

    const supabase = getAdminClient();

    if (reportsTo) {
      // Only managers and directors can be uplines (the target holder).
      const { data: target, error: targetErr } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', reportsTo)
        .single();
      if (targetErr) return { success: false, error: targetErr.message };
      if (!target || !target.is_active) {
        return { success: false, error: 'Reports-to target not found or inactive' };
      }
      if (!['manager', 'director'].includes(target.role)) {
        return { success: false, error: 'Reports-to target must be a manager or director' };
      }
    }

    const { error } = await supabase.from('users').update({ reports_to: reportsTo }).eq('id', userId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/roles');
    return { success: true };
  } catch (error) {
    console.error('[updateReportsTo]', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
  }
}

export async function createPaAssignment(paId: string, managerId: string) {
  return adminAction(async () => {
    const supabase = getAdminClient();
    const { error } = await supabase.from('pa_manager_assignments').insert({ pa_id: paId, manager_id: managerId });
    if (error) throw new Error(error.message);
    revalidatePath('/admin/roles');
  });
}

export async function deletePaAssignment(id: string) {
  return adminAction(async () => {
    const supabase = getAdminClient();
    const { error } = await supabase.from('pa_manager_assignments').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/roles');
  });
}
