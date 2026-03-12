'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreHorizontal, FileText, UploadCloud } from 'lucide-react';
import { Button, Input, Modal, ModalContent, Select } from '@/components/ui';

interface Report {
  id: string;
  title: string | null;
  property_name: string;
  location: string | null;
  address_1?: string | null;
  city?: string | null;
  state?: string | null;
  market_type: string | null;
  total_sites: number | null;
  status: string | null;
  created_at: string;
  dropbox_url: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_company?: string | null;
  study_id?: string | null;
  executive_summary?: string | null;
  has_docx?: boolean;
  service?: string | null;
  has_comparables?: boolean;
  report_date?: string | null;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  draft: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300',
  'in-review': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  processing: 'bg-blue-100 dark:bg-blue-900/40 text-gray-500 dark:text-blue-300',
};

const MARKET_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'rv', label: 'RV' },
  { value: 'rv_glamping', label: 'RV & Glamping' },
  { value: 'glamping', label: 'Glamping' },
  { value: 'marina', label: 'Marina' },
  { value: 'landscape_hotel', label: 'Landscape Hotel' },
];

const DATE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'last-30', label: 'Last 30 Days' },
  { value: 'last-90', label: 'Last 90 Days' },
  { value: 'last-year', label: 'Last Year' },
];

const REPORTS_PER_PAGE = 25;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/** Parse date string as local midnight to avoid timezone shift */
function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr + 'T00:00:00');
}

function isDisplayableReportDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  if (year < 2015 || year > 2035) return false;
  return true;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMarketType(type: string | null | undefined) {
  const map: Record<string, string> = {
    rv: 'RV',
    rv_glamping: 'RV & Glamping',
    glamping: 'Glamping',
    marina: 'Marina',
    landscape_hotel: 'Landscape Hotel',
  };
  return map[(type || '').toLowerCase()] || type || '-';
}

function formatService(service: string | null | undefined) {
  const map: Record<string, string> = {
    feasibility_study: 'Feasibility Study',
    appraisal: 'Appraisal',
    revenue_projection: 'Revenue Projection',
    market_study: 'Market Study',
    update: 'Update',
  };
  return map[(service || '').toLowerCase()] || service || '-';
}

function formatStatus(status: string | null | undefined) {
  const map: Record<string, string> = {
    completed: 'Completed',
    draft: 'Draft',
    'in-review': 'In Review',
    processing: 'Processing',
  };
  return map[(status || '').toLowerCase()] || status || 'Draft';
}

export default function PastReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editForm, setEditForm] = useState<Partial<Report>>({});
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setReports(data.uploads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

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

  const filteredReports = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return reports.filter((r) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          (r.title || '').toLowerCase().includes(q) ||
          (r.property_name || '').toLowerCase().includes(q) ||
          (r.location || '').toLowerCase().includes(q) ||
          ([r.city, r.state].filter(Boolean).join(', ') || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (marketFilter && (r.market_type || '').toLowerCase() !== marketFilter) return false;
      if (dateFilter) {
        const created = new Date(r.created_at).getTime();
        const daysAgo = Math.floor((now - created) / dayMs);
        if (dateFilter === 'last-30' && daysAgo > 30) return false;
        if (dateFilter === 'last-90' && daysAgo > 90) return false;
        if (dateFilter === 'last-year' && daysAgo > 365) return false;
      }
      return true;
    });
  }, [reports, debouncedSearch, marketFilter, dateFilter]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * REPORTS_PER_PAGE;
    return filteredReports.slice(start, start + REPORTS_PER_PAGE);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / REPORTS_PER_PAGE);
  const showPagination = filteredReports.length > REPORTS_PER_PAGE;
  const showingStart = (currentPage - 1) * REPORTS_PER_PAGE + 1;
  const showingEnd = Math.min(currentPage * REPORTS_PER_PAGE, filteredReports.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredReports.length]);

  const clearFilters = () => {
    setSearch('');
    setMarketFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const openEdit = (report: Report) => {
    setSelectedReport(report);
    setEditForm({
      title: report.title || '',
      property_name: report.property_name || '',
      location: report.location || '',
      market_type: report.market_type || 'glamping',
      total_sites: report.total_sites ?? undefined,
      status: report.status || 'draft',
      dropbox_url: report.dropbox_url || '',
      client_id: report.client_id || '',
      service: report.service || 'feasibility_study',
    });
    setEditModalOpen(true);
    setOpenDropdown(null);
  };

  const openDelete = (report: Report) => {
    setSelectedReport(report);
    setDeleteModalOpen(true);
    setOpenDropdown(null);
  };

  const openDropdownMenu = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) setOpenDropdown(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const saveReport = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title || null,
          property_name: editForm.property_name || '',
          location: editForm.location || null,
          market_type: editForm.market_type || null,
          total_sites: editForm.total_sites ?? null,
          status: editForm.status || null,
          dropbox_url: editForm.dropbox_url || null,
          client_id: editForm.client_id || null,
          service: editForm.service || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setEditModalOpen(false);
      setSelectedReport(null);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteModalOpen(false);
      setSelectedReport(null);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string | null) =>
    STATUS_STYLES[(status || '').toLowerCase()] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300';

  if (loading) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div id="loadingState" className="py-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-[#4a624a] rounded-full animate-spin mb-4" />
            Loading reports...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Past Reports</h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your uploaded feasibility study reports
            </p>
          </div>
          <Link
            href="/admin/upload-reports"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sage-600 text-white hover:bg-sage-700 focus:ring-2 focus:ring-sage-600 focus:ring-offset-2 transition-colors shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Report
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="searchInput" className="sr-only">
              Search
            </label>
            <input
              id="searchInput"
              type="text"
              placeholder="Search reports by property, location, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-sage-600 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="marketFilter" className="sr-only">
              Market Type
            </label>
            <select
              id="marketFilter"
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent"
            >
              {MARKET_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dateFilter" className="sr-only">
              Date
            </label>
            <select
              id="dateFilter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent"
            >
              {DATE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>

        {/* Report count */}
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Showing <span id="filteredCount" className="font-medium">{filteredReports.length}</span> of{' '}
          <span id="totalReports" className="font-medium">{reports.length}</span> reports
        </p>

        {/* Empty state */}
        {filteredReports.length === 0 && (
          <div id="emptyState" className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">No reports found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Table */}
        {filteredReports.length > 0 && (
          <div id="reportsTable">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Report Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Property Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {paginatedReports.map((report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('a') || target.closest('.dropdown-container')) return;
                          if (report.study_id) {
                            router.push(`/admin/reports/${report.study_id}`);
                          }
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {report.title || 'Untitled'}
                          </div>
                          {report.study_id && (
                            <div className="text-xs text-sage-600 dark:text-sage-400 font-mono mt-0.5">
                              {report.study_id}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {formatService(report.service)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {report.total_sites ?? 'N/A'} sites • {formatMarketType(report.market_type)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {[report.city, report.state].filter(Boolean).join(', ') || report.location || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {isDisplayableReportDate(report.report_date) ? formatDate(report.report_date!) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="dropdown-container relative inline-block">
                            <button
                              onClick={() => openDropdownMenu(report.id)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                            {openDropdown === report.id && (
                              <div
                                className="dropdown-menu absolute right-0 top-full mt-1 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10 min-w-[120px]"
                                role="menu"
                              >
                                <button
                                  onClick={() => openEdit(report)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => openDelete(report)}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {showPagination && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span id="showingStart">{showingStart}</span> to{' '}
                  <span id="showingEnd">{showingEnd}</span> of{' '}
                  <span id="totalCount">{filteredReports.length}</span> reports
                </p>
                <div className="flex gap-2">
                  <Button
                    id="prevPage"
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    id="nextPage"
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen && !!selectedReport}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedReport(null);
        }}
      >
        <ModalContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Report</h2>
          {selectedReport && (
            <>
              <input type="hidden" id="editReportId" value={selectedReport.id} />
              <div className="space-y-4">
                <Input
                  id="editTitle"
                  label="Report Title"
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
                <Input
                  id="editPropertyName"
                  label="Property Name"
                  type="text"
                  value={editForm.property_name || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, property_name: e.target.value }))}
                />
                <Input
                  id="editLocation"
                  label="Location"
                  type="text"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                />
                <Select
                  id="editMarketType"
                  label="Type"
                  value={editForm.market_type || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, market_type: e.target.value }))}
                >
                  <option value="rv">RV</option>
                  <option value="rv_glamping">RV & Glamping</option>
                  <option value="glamping">Glamping</option>
                  <option value="marina">Marina</option>
                  <option value="landscape_hotel">Landscape Hotel</option>
                </Select>
                <Input
                  id="editTotalSites"
                  label="Total Sites"
                  type="number"
                  min={0}
                  value={editForm.total_sites ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      total_sites: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    }))
                  }
                />
                <Select
                  id="editStatus"
                  label="Status"
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="in-review">In Review</option>
                  <option value="completed">Completed</option>
                </Select>
                <Select
                  id="editService"
                  label="Service"
                  value={editForm.service || 'feasibility_study'}
                  onChange={(e) => setEditForm((f) => ({ ...f, service: e.target.value }))}
                >
                  <option value="feasibility_study">Feasibility Study</option>
                  <option value="appraisal">Appraisal</option>
                  <option value="revenue_projection">Revenue Projection</option>
                  <option value="market_study">Market Study</option>
                  <option value="update">Update</option>
                </Select>
                <Input
                  id="editDropboxUrl"
                  label="Dropbox URL"
                  type="url"
                  placeholder="https://www.dropbox.com/s/..."
                  value={editForm.dropbox_url || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, dropbox_url: e.target.value }))}
                />
                <Select
                  id="editClient"
                  label="Client"
                  value={editForm.client_id || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, client_id: e.target.value || null }))}
                >
                  <option value="">No client assigned</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedReport(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveReport} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModalOpen && !!selectedReport}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedReport(null);
        }}
      >
        <ModalContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Report</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Are you sure you want to delete this report? This action cannot be undone.
              </p>
            </div>
          </div>
          {selectedReport && (
            <>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p id="deleteReportTitle" className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedReport.title || 'Untitled'}
                </p>
                <p id="deleteReportProperty" className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedReport.property_name}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedReport(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete} disabled={saving}>
                  {saving ? 'Deleting...' : 'Delete Report'}
                </Button>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
