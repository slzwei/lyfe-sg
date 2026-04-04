'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/admin/detail-row';
import { User, ROLE_LABELS, LIFECYCLE_STAGE_LABELS } from '@/lib/admin/types';

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  allUsers: User[];
  onEdit: (user: User) => void;
}

export function UserDetailSheet({ open, onOpenChange, user, allUsers, onEdit }: UserDetailSheetProps) {
  if (!user) return null;

  const directReports = allUsers.filter((u) => u.reports_to === user.id);

  // Walk up the reporting chain (manager → director → ...)
  const reportingChain: User[] = [];
  let current = user;
  while (current.reports_to) {
    const superior = allUsers.find((u) => u.id === current.reports_to);
    if (!superior || reportingChain.some((u) => u.id === superior.id)) break;
    reportingChain.push(superior);
    current = superior;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>{user.full_name}</SheetTitle>
          <SheetDescription>{user.email ?? user.phone ?? '—'}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Phone" value={user.phone} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Role" value={<Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>} />
              <DetailRow
                label="Status"
                value={
                  user.is_active ? (
                    <Badge className="bg-green-100 text-green-800 border-transparent hover:bg-green-100">Active</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 border-transparent hover:bg-red-100">Inactive</Badge>
                  )
                }
              />
              <DetailRow
                label="Date of Birth"
                value={user.date_of_birth ? format(new Date(user.date_of_birth), 'dd MMM yyyy') : null}
              />
              <DetailRow
                label="Lifecycle Stage"
                value={
                  user.lifecycle_stage ? (
                    <Badge variant="outline">{LIFECYCLE_STAGE_LABELS[user.lifecycle_stage]}</Badge>
                  ) : null
                }
              />
              <DetailRow label="Created" value={format(new Date(user.created_at), 'dd MMM yyyy')} />
              <DetailRow
                label="Last Login"
                value={
                  user.last_login_at
                    ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                    : 'Never'
                }
              />
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reporting Structure</h3>
            {reportingChain.length === 0 ? (
              <DetailRow label="Reports To" value={null} />
            ) : (
              <div className="flex flex-col gap-1">
                {reportingChain.map((sup) => (
                  <div key={sup.id} className="flex items-center justify-between text-sm">
                    <span>{sup.full_name}</span>
                    <Badge variant="secondary" className="text-xs">{ROLE_LABELS[sup.role]}</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Direct Reports ({directReports.length})
              </span>
              {directReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No direct reports</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {directReports.map((dr) => (
                    <div key={dr.id} className="flex items-center justify-between text-sm">
                      <span>{dr.full_name}</span>
                      <Badge variant="secondary" className="text-xs">{ROLE_LABELS[dr.role]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</h3>
            <Button variant="outline" className="w-full" onClick={() => onEdit(user)}>
              Edit User
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
