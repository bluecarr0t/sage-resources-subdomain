'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button, Input, Modal, ModalContent, Select } from '@/components/ui';
import { GLAMPING_IS_OPEN_VALUES } from '@/lib/glamping-is-open';
import { GLAMPING_PROPERTY_TYPE_FORM_OPTIONS } from '@/lib/glamping-property-types';
import {
  buildSagePropertyDraftFromReport,
  sagePropertyCreatePayloadFromDraft,
  type ReportSagePropertyPrefill,
  type SagePropertyCreateDraft,
} from '@/lib/admin/report-sage-property-prefill';

type ReportAddSagePropertyModalProps = {
  open: boolean;
  onClose: () => void;
  prefill: ReportSagePropertyPrefill;
  onCreated: (propertyId: number) => void | Promise<void>;
};

const RESEARCH_STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'published', label: 'Published' },
  { value: 'new', label: 'New' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ReportAddSagePropertyModal({
  open,
  onClose,
  prefill,
  onCreated,
}: ReportAddSagePropertyModalProps) {
  const [draft, setDraft] = useState<SagePropertyCreateDraft>(() =>
    buildSagePropertyDraftFromReport(prefill)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(buildSagePropertyDraftFromReport(prefill));
      setError(null);
    }
    // Refresh draft only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setField = (key: keyof SagePropertyCreateDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!draft.property_name.trim()) {
      setError('Property name is required.');
      return;
    }
    if (!draft.city.trim() || !draft.state.trim()) {
      setError('City and state are required.');
      return;
    }
    if (!draft.url.trim()) {
      setError('Website URL is required (official site or listing page).');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/sage-glamping-data/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sagePropertyCreatePayloadFromDraft(draft)),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create property');
      }
      const propertyId = Number(data.property?.id);
      if (!Number.isFinite(propertyId)) {
        throw new Error('Property created but id was missing');
      }
      await onCreated(propertyId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <ModalContent className="p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Add New Property
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Create a Sage Data property from this report and link it automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              id="new-property-name"
              label="Property name"
              value={draft.property_name}
              onChange={(e) => setField('property_name', e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Input
              id="new-property-address"
              label="Address"
              value={draft.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </div>
          <Input
            id="new-property-city"
            label="City"
            value={draft.city}
            onChange={(e) => setField('city', e.target.value)}
            required
          />
          <Input
            id="new-property-state"
            label="State"
            value={draft.state}
            onChange={(e) => setField('state', e.target.value)}
            required
          />
          <Input
            id="new-property-zip"
            label="ZIP code"
            value={draft.zip_code}
            onChange={(e) => setField('zip_code', e.target.value)}
          />
          <Input
            id="new-property-country"
            label="Country"
            value={draft.country}
            onChange={(e) => setField('country', e.target.value)}
          />
          <Select
            id="new-property-type"
            label="Property type"
            value={draft.property_type}
            onChange={(e) => setField('property_type', e.target.value)}
          >
            {GLAMPING_PROPERTY_TYPE_FORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </Select>
          <Select
            id="new-property-is-open"
            label="Open status"
            value={draft.is_open}
            onChange={(e) => setField('is_open', e.target.value)}
          >
            {GLAMPING_IS_OPEN_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select
            id="new-property-research-status"
            label="Research status"
            value={draft.research_status}
            onChange={(e) => setField('research_status', e.target.value)}
          >
            {RESEARCH_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            id="new-property-total-sites"
            label="Total sites"
            type="number"
            min={0}
            value={draft.property_total_sites}
            onChange={(e) => setField('property_total_sites', e.target.value)}
          />
          <Input
            id="new-property-lat"
            label="Latitude"
            value={draft.lat}
            onChange={(e) => setField('lat', e.target.value)}
          />
          <Input
            id="new-property-lon"
            label="Longitude"
            value={draft.lon}
            onChange={(e) => setField('lon', e.target.value)}
          />
          <div className="md:col-span-2">
            <Input
              id="new-property-url"
              label="Website URL"
              type="url"
              placeholder="https://example.com"
              value={draft.url}
              onChange={(e) => setField('url', e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating…
              </>
            ) : (
              'Create & link property'
            )}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

type ReportAddSagePropertyTriggerProps = {
  prefill: ReportSagePropertyPrefill;
  onCreated: (propertyId: number) => void | Promise<void>;
  disabled?: boolean;
};

export function ReportAddSagePropertyTrigger({
  prefill,
  onCreated,
  disabled,
}: ReportAddSagePropertyTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-sm gap-1.5"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Plus className="w-4 h-4" />
          Add New Property
        </Button>
      </div>
      <ReportAddSagePropertyModal
        open={open}
        onClose={() => setOpen(false)}
        prefill={prefill}
        onCreated={onCreated}
      />
    </>
  );
}
