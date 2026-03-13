'use client';

import { useState } from 'react';
import { Button, Card, Input, Select } from '@/components/ui';
import { FilePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { UNIT_TYPES } from '@/lib/unit-types';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface UnitMixRow {
  id: string;
  type: string;
  count: number;
}

function createUnitRow(): UnitMixRow {
  return {
    id: crypto.randomUUID(),
    type: UNIT_TYPES[0] ?? 'Cabin',
    count: 1,
  };
}

export default function CreateReportDraftPage() {
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [acres, setAcres] = useState<string>('');
  const [clientEntity, setClientEntity] = useState('');
  const [studyId, setStudyId] = useState('');
  const [unitMix, setUnitMix] = useState<UnitMixRow[]>([createUnitRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addUnitRow = () => {
    setUnitMix((prev) => [...prev, createUnitRow()]);
  };

  const removeUnitRow = (id: string) => {
    setUnitMix((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateUnitRow = (id: string, field: 'type' | 'count', value: string | number) => {
    setUnitMix((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: field === 'count' ? (typeof value === 'number' ? value : parseInt(String(value), 10) || 0) : value }
          : r
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = propertyName.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();

    if (!trimmedName || !trimmedCity || !trimmedState) {
      setError('Property name, city, and state are required.');
      return;
    }

    const validUnitMix = unitMix
      .filter((r) => r.type && r.count > 0)
      .map((r) => ({ type: r.type, count: r.count }));

    setLoading(true);

    try {
      const res = await fetch('/api/admin/reports/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          property_name: trimmedName,
          city: trimmedCity,
          state: trimmedState,
          zip_code: zipCode.trim() || undefined,
          acres: acres ? parseFloat(acres) : undefined,
          unit_mix: validUnitMix,
          client_entity: clientEntity.trim() || undefined,
          study_id: studyId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Generation failed');
        }
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? 'report-draft.docx';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Report draft generated and downloaded successfully.');
      setPropertyName('');
      setCity('');
      setState('');
      setZipCode('');
      setAcres('');
      setClientEntity('');
      setStudyId('');
      setUnitMix([createUnitRow()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create Report Draft
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter property details to generate an AI-assisted feasibility study draft. The system will enrich with
            regional benchmarks and produce a downloadable DOCX.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
            {success}
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Property Name"
              name="property_name"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g. Mountain View Glamping Resort"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                required
              />
              <Select
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Input
                label="ZIP Code"
                name="zip_code"
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="ZIP"
              />
            </div>

            <Input
              label="Acres"
              name="acres"
              type="number"
              min={0}
              step={0.1}
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
              placeholder="e.g. 25"
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit Mix
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addUnitRow}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add unit type
                </Button>
              </div>
              <div className="space-y-3">
                {unitMix.map((row) => (
                  <div key={row.id} className="flex gap-3 items-end">
                    <div className="flex-1 min-w-0">
                      <Select
                        value={row.type}
                        onChange={(e) => updateUnitRow(row.id, 'type', e.target.value)}
                      >
                        {UNIT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min={1}
                        value={row.count}
                        onChange={(e) =>
                          updateUnitRow(row.id, 'count', parseInt(e.target.value, 10) || 0)
                        }
                        placeholder="Count"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeUnitRow(row.id)}
                      disabled={unitMix.length === 1}
                      aria-label="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="Client Entity"
              name="client_entity"
              value={clientEntity}
              onChange={(e) => setClientEntity(e.target.value)}
              placeholder="e.g. ABC Development LLC"
            />

            <Input
              label="Study ID (optional)"
              name="study_id"
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              placeholder="e.g. 25-100A-01 (leave blank to auto-generate)"
            />

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating draft...
                  </>
                ) : (
                  <>
                    <FilePlus className="w-5 h-5" />
                    Generate Draft
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
