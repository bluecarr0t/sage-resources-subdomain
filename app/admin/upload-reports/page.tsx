'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Input, Select } from '@/components/ui';

interface Client {
  id: string;
  name: string;
  company: string | null;
}

const MARKET_TYPES = [
  { value: 'outdoor_hospitality', label: 'Outdoor Hospitality' },
  { value: 'glamping', label: 'Glamping' },
  { value: 'campground', label: 'Campground' },
  { value: 'rv-park', label: 'RV Park' },
  { value: 'mixed', label: 'Mixed Use' },
];

export default function UploadReportsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    property_name: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    market_type: 'outdoor_hospitality',
    total_sites: '',
    dropbox_url: '',
    client_id: '',
  });

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/clients');
      const data = await res.json();
      if (data.success && data.clients) setClients(data.clients);
    } catch {
      setClients([]);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const fd = new FormData(form);

    fd.set('title', formData.title);
    fd.set('property_name', formData.property_name);
    fd.set('address_1', formData.address_1);
    fd.set('address_2', formData.address_2);
    fd.set('city', formData.city);
    fd.set('state', formData.state);
    fd.set('zip_code', formData.zip_code);
    fd.set('country', formData.country);
    fd.set('market_type', formData.market_type);
    fd.set('total_sites', formData.total_sites);
    fd.set('dropbox_url', formData.dropbox_url);
    fd.set('client_id', formData.client_id || '');

    try {
      const res = await fetch('/api/admin/reports/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setSuccess(true);
      setFormData({
        title: '',
        property_name: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'USA',
        market_type: 'outdoor_hospitality',
        total_sites: '',
        dropbox_url: '',
        client_id: '',
      });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Upload Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload feasibility study documents (narrative and/or financial .docx
            files)
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
            Report uploaded successfully.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="title"
              name="title"
              label="Title *"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
            />
            <Input
              id="property_name"
              name="property_name"
              label="Property Name *"
              type="text"
              required
              value={formData.property_name}
              onChange={handleChange}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="address_1"
                name="address_1"
                label="Address"
                type="text"
                value={formData.address_1}
                onChange={handleChange}
              />
              <Input
                id="address_2"
                name="address_2"
                label="Address 2"
                type="text"
                value={formData.address_2}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="city"
                name="city"
                label="City"
                type="text"
                value={formData.city}
                onChange={handleChange}
              />
              <Input
                id="state"
                name="state"
                label="State"
                type="text"
                value={formData.state}
                onChange={handleChange}
              />
              <Input
                id="zip_code"
                name="zip_code"
                label="Zip Code"
                type="text"
                value={formData.zip_code}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="market_type"
                name="market_type"
                label="Market Type"
                value={formData.market_type}
                onChange={handleChange}
              >
                {MARKET_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Input
                id="total_sites"
                name="total_sites"
                label="Total Sites"
                type="number"
                min={0}
                value={formData.total_sites}
                onChange={handleChange}
              />
            </div>
            <Input
              id="dropbox_url"
              name="dropbox_url"
              label="Dropbox URL"
              type="url"
              value={formData.dropbox_url}
              onChange={handleChange}
            />
            <Select
              id="client_id"
              name="client_id"
              label="Client"
              value={formData.client_id}
              onChange={handleChange}
            >
              <option value="">No client assigned</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </Select>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Files *
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                At least one .docx file required (narrative and/or financial)
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="narrative_file" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Narrative file (.docx)
                  </label>
                  <input
                    id="narrative_file"
                    name="narrative_file"
                    type="file"
                    accept=".docx"
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="financial_file" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Financial file (.docx)
                  </label>
                  <input
                    id="financial_file"
                    name="financial_file"
                    type="file"
                    accept=".docx"
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
              {loading ? 'Uploading...' : 'Upload Report'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
