'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Plus } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import {
  ManagedUserAddModal,
  type ManagedUserCreatePayload,
} from '@/components/admin/ManagedUserAddModal';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import type { ManagedUser } from '@/lib/auth-helpers';
import { normalizeManagedUserRole } from '@/lib/managed-user-roles';
import {
  fromManagedUserDivisionSelectValue,
  getManagedUserDivisionSelectTextClassName,
  sortManagedUsersByFirstName,
  toManagedUserDivisionSelectValue,
} from '@/lib/managed-users/division';

type EditableManagedUser = ManagedUser;

export default function ManagedUsersPage() {
  const t = useTranslations('admin.managedUsers');
  const [users, setUsers] = useState<EditableManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/managed-users');
      const body = (await res.json()) as { users?: EditableManagedUser[]; error?: string };
      if (!res.ok) {
        throw new Error(body.error || t('loadError'));
      }
      setUsers(sortManagedUsersByFirstName(body.users ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saveUser = async (user: EditableManagedUser, patch: Partial<EditableManagedUser>) => {
    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/managed-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...patch }),
      });
      const body = (await res.json()) as { user?: EditableManagedUser; error?: string };
      if (!res.ok) {
        throw new Error(body.error || t('saveError'));
      }
      if (body.user) {
        setUsers((current) =>
          sortManagedUsersByFirstName(
            current.map((row) => (row.id === body.user!.id ? body.user! : row))
          )
        );
      }
      setToast({ message: t('saveSuccess'), variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSavingId(null);
    }
  };

  const createUser = async (payload: ManagedUserCreatePayload) => {
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/managed-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
          division: payload.division,
          is_active: payload.is_active,
        }),
      });
      const body = (await res.json()) as { user?: EditableManagedUser; error?: string };
      if (!res.ok) {
        throw new Error(body.error || t('addUserError'));
      }
      if (body.user) {
        setUsers((current) => sortManagedUsersByFirstName([...current, body.user!]));
      }
      setAddModalOpen(false);
      setToast({ message: t('addUserSuccess'), variant: 'success' });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('addUserError'));
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div
          className={`${adminPageHeadingMargin} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div>
            <h1 className={`${adminPageTitle} mb-1`}>{t('title')}</h1>
            <p className={adminPageDescription}>{t('subtitle')}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="shrink-0 whitespace-nowrap"
            onClick={() => {
              setAddError(null);
              setAddModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t('addUser')}
          </Button>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="py-12 flex justify-center text-neutral-500">{t('loading')}</div>
        ) : (
          <div className="admin-surface overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="admin-table-head">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnDisplayName')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnEmail')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnRole')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnProjectManager')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnDivision')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnActive')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {users.map((user) => (
                  <tr key={user.id} className="text-sm">
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        defaultValue={user.display_name ?? ''}
                        disabled={savingId === user.id}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== (user.display_name ?? null)) {
                            void saveUser(user, { display_name: next });
                          }
                        }}
                        className="h-9 w-full min-w-[10rem] rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {user.email}
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={normalizeManagedUserRole(user.role)}
                        disabled={savingId === user.id}
                        onChange={(e) =>
                          void saveUser(user, { role: e.target.value as ManagedUser['role'] })
                        }
                        className="h-9 min-w-[6rem] text-sm"
                      >
                        <option value="author">{t('roleAuthor')}</option>
                        <option value="admin">{t('roleAdmin')}</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(user.is_project_manager)}
                        disabled={savingId === user.id}
                        onChange={(e) =>
                          void saveUser(user, { is_project_manager: e.target.checked })
                        }
                        className="rounded border-neutral-300 text-sage-600 focus:ring-sage-600"
                        aria-label={t('columnProjectManager')}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={toManagedUserDivisionSelectValue(user.division)}
                        disabled={savingId === user.id}
                        onChange={(e) =>
                          void saveUser(user, {
                            division: fromManagedUserDivisionSelectValue(e.target.value),
                          })
                        }
                        className={`h-9 min-w-[8rem] text-sm ${getManagedUserDivisionSelectTextClassName(user.division)}`}
                      >
                        <option value="both">{t('divisionBoth')}</option>
                        <option value="outdoor">{t('divisionOutdoor')}</option>
                        <option value="commercial">{t('divisionCommercial')}</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={user.is_active}
                        disabled={savingId === user.id}
                        onChange={(e) => void saveUser(user, { is_active: e.target.checked })}
                        className="rounded border-neutral-300 text-sage-600 focus:ring-sage-600"
                        aria-label={t('columnActive')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ManagedUserAddModal
        open={addModalOpen}
        saving={addSaving}
        saveError={addError}
        onClose={() => {
          if (!addSaving) setAddModalOpen(false);
        }}
        onSave={createUser}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.variant === 'success'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-red-700 text-white dark:bg-red-900 dark:text-red-50'
          }`}
        >
          {toast.variant === 'success' ? (
            <CheckCircle
              className="h-4 w-4 shrink-0 text-emerald-300 dark:text-emerald-700"
              aria-hidden
            />
          ) : null}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label={t('dismissToast')}
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  );
}
