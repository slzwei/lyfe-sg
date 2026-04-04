'use client';

import { useState } from 'react';
import { User, USER_ROLES, ROLE_LABELS } from '@/lib/admin/types';
import { DataTable } from '@/components/admin/data-table';
import { getColumns } from './columns';
import { UserDialog } from './user-dialog';
import { UserDetailSheet } from './user-detail-sheet';

interface UsersClientProps {
  users: User[];
}

export function UsersClient({ users }: UsersClientProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  const handleEdit = (user: User) => {
    setSheetOpen(false);
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && !sheetOpen) setSelectedUser(null);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open && !dialogOpen) setSelectedUser(null);
  };

  const columns = getColumns(handleEdit);

  const roleFacetOptions = USER_ROLES.map((role) => ({
    label: ROLE_LABELS[role],
    value: role,
  }));

  const activeFacetOptions = [
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        searchColumn="full_name"
        searchPlaceholder="Search users..."
        onRowClick={handleRowClick}
        facetedFilters={[
          {
            columnId: 'role',
            title: 'Role',
            options: roleFacetOptions,
          },
          {
            columnId: 'is_active',
            title: 'Status',
            options: activeFacetOptions,
          },
        ]}
      />

      <UserDetailSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        user={selectedUser}
        allUsers={users}
        onEdit={handleEdit}
      />

      <UserDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        user={selectedUser}
        allUsers={users}
      />
    </>
  );
}
