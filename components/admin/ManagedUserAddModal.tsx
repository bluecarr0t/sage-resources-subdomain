'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input, Modal, ModalContent, Select } from '@/components/ui';
import type { ManagedUser } from '@/lib/auth-helpers';
import { DEFAULT_MANAGED_USER_ROLE } from '@/lib/managed-user-roles';
import { fromManagedUserDivisionSelectValue, toManagedUserDivisionSelectValue } from '@/lib/managed-users/division';

export type ManagedUserCreatePayload = {
  email: string;
  firstName: string;
  lastName: string;
  slackUsername: string;
  role: ManagedUser['role'];
  division: ManagedUser['division'];
  pipeline_view_all: boolean;
  is_active: boolean;
};

const EMPTY_FORM: ManagedUserCreatePayload = {
  email: '',
  firstName: '',
  lastName: '',
  slackUsername: '',
  role: DEFAULT_MANAGED_USER_ROLE,
  division: 'both',
  pipeline_view_all: false,
  is_active: true,
};

interface ManagedUserAddModalProps {
  open: boolean;
  saving?: boolean;
  saveError?: string | null;
  onClose: () => void;
  onSave: (payload: ManagedUserCreatePayload) => void | Promise<void>;
}

export function ManagedUserAddModal({
  open,
  saving = false,
  saveError = null,
  onClose,
  onSave,
}: ManagedUserAddModalProps) {
  const t = useTranslations('admin.managedUsers');
  const [form, setForm] = useState<ManagedUserCreatePayload>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
    }
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof ManagedUserCreatePayload>(
    key: K,
    value: ManagedUserCreatePayload[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl" ariaLabelledBy="managed-user-add-title">
      <ModalContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
            <div>
              <h2
                id="managed-user-add-title"
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
              >
                {t('addUserTitle')}
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {t('addUserSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              aria-label={t('addUserClose')}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <Input
              id="managed-user-email"
              type="email"
              label={t('fieldEmail')}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              autoComplete="off"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="managed-user-first-name"
                label={t('fieldFirstName')}
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                required
                autoComplete="off"
              />
              <Input
                id="managed-user-last-name"
                label={t('fieldLastName')}
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <Input
              id="managed-user-slack"
              label={t('fieldSlackUsername')}
              value={form.slackUsername}
              onChange={(e) => update('slackUsername', e.target.value)}
              placeholder={t('fieldSlackUsernamePlaceholder')}
              autoComplete="off"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="managed-user-role"
                  className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  {t('columnRole')}
                </label>
                <Select
                  id="managed-user-role"
                  value={form.role}
                  onChange={(e) => update('role', e.target.value as ManagedUser['role'])}
                  className="h-10 w-full text-sm"
                >
                  <option value="author">{t('roleAuthor')}</option>
                  <option value="admin">{t('roleAdmin')}</option>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="managed-user-division"
                  className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  {t('columnDivision')}
                </label>
                <Select
                  id="managed-user-division"
                  value={toManagedUserDivisionSelectValue(form.division)}
                  onChange={(e) =>
                    update('division', fromManagedUserDivisionSelectValue(e.target.value))
                  }
                  className="h-10 w-full text-sm"
                >
                  <option value="both">{t('divisionBoth')}</option>
                  <option value="outdoor">{t('divisionOutdoor')}</option>
                  <option value="commercial">{t('divisionCommercial')}</option>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={form.pipeline_view_all}
                  onChange={(e) => update('pipeline_view_all', e.target.checked)}
                  className="rounded border-neutral-300 text-sage-600 focus:ring-sage-600"
                />
                {t('columnViewAllPipeline')}
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => update('is_active', e.target.checked)}
                  className="rounded border-neutral-300 text-sage-600 focus:ring-sage-600"
                />
                {t('columnActive')}
              </label>
            </div>

            {saveError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {saveError}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('addUserCancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? t('addUserSaving') : t('addUserSubmit')}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
