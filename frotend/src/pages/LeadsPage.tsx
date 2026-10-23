import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { crmApi } from '../services/api';
import type { Lead, LeadStatus, LeadPriority } from '../types/crm';
import { PriorityBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PipelineKanban } from '../components/pipeline/PipelineKanban';
import { useToast } from '../context/ToastContext';
import { LeadImportModal } from '../components/leads/LeadImportModal';

interface OutletContextType {
  onOpenLead: (id: string) => void;
  onEditLead: (lead: Lead) => void;
  onNewLead: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const STATUS_OPTIONS: (LeadStatus | 'All')[] = [
  'All',
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Won',
  'Lost',
];

const PRIORITY_OPTIONS: (LeadPriority | 'All')[] = [
  'All',
  'Urgent',
  'High',
  'Medium',
  'Low',
];

export const LeadsPage: React.FC = () => {
  const { onOpenLead, onEditLead, onNewLead, refreshTrigger, triggerRefresh } =
    useOutletContext<OutletContextType>();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'company' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sync with URL query params
  useEffect(() => {
    const urlStatus = searchParams.get('status') as LeadStatus | null;
    const urlPriority = searchParams.get('priority') as LeadPriority | null;
    if (urlStatus && STATUS_OPTIONS.includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
    if (urlPriority && PRIORITY_OPTIONS.includes(urlPriority)) {
      setPriorityFilter(urlPriority);
    }
  }, [searchParams]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await crmApi.getLeads({
        search,
        status: statusFilter,
        priority: priorityFilter,
        showArchived,
        page,
        limit: 10,
        sortBy,
        sortOrder,
      });

      setLeads(res.leads);
      setTotalLeads(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
      showToast('Error loading leads', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, priorityFilter, showArchived, page, sortBy, sortOrder, refreshTrigger]);

  const handleToggleArchive = async (lead: Lead) => {
    try {
      await crmApi.toggleArchive(lead.id);
      showToast(lead.isArchived ? 'Lead restored from archive' : 'Lead archived', 'info');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleMoveStage = async (leadId: string, newStage: LeadStatus) => {
    try {
      await crmApi.updateLead(leadId, { status: newStage });
      showToast(`Moved to ${newStage}`, 'success');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleQuickStatusUpdate = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await crmApi.updateLead(leadId, { status: newStatus });
      showToast(`Status updated to ${newStatus}`, 'success');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {showArchived ? 'Archived Leads' : 'Lead Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalLeads} {showArchived ? 'archived' : 'active'} business records found
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Table View
            </button>
            
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Import leads from CSV or PDF"
          >
            <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Import Leads</span>
          </button>

          <button
            onClick={onNewLead}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg btn-gradient cursor-pointer"
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by contact name, company, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-3 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Stage:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as any);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {PRIORITY_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Contact Name</option>
              <option value="company">Company</option>
              <option value="priority">Priority</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title="Toggle sort direction"
            >
              {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
            </button>
          </div>

          {/* Archive Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none pl-1">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setPage(1);
              }}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Show Archived</span>
          </label>
        </div>

        {/* Active Filters Bar */}
        {(statusFilter !== 'All' || priorityFilter !== 'All' || search || showArchived) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">Filters applied:</span>
            {statusFilter !== 'All' && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium text-[11px]">
                Stage: {statusFilter}
              </span>
            )}
            {priorityFilter !== 'All' && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium text-[11px]">
                Priority: {priorityFilter}
              </span>
            )}
            {search && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                Query: "{search}"
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter('All');
                setPriorityFilter('All');
                setSearch('');
                setShowArchived(false);
              }}
              className="text-blue-600 hover:underline text-[11px] ml-auto font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSpinner label="Loading lead records..." />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads match your criteria"
          description="Try modifying search keywords or removing filters to view records."
          actionText="+ Create New Lead"
          onAction={onNewLead}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <PipelineKanban
          leads={leads}
          onSelectLead={onOpenLead}
          onMoveStage={handleMoveStage}
        />
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Contact & Company</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Service & Budget</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onOpenLead(lead.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Contact & Company */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {lead.name}
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium">{lead.company}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">{lead.email}</div>
                    </td>

                    {/* Pipeline Stage */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) =>
                          handleQuickStatusUpdate(lead.id, e.target.value as LeadStatus)
                        }
                        className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {STATUS_OPTIONS.filter((s) => s !== 'All').map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <PriorityBadge priority={lead.priority} size="sm" />
                    </td>

                    {/* Service & Budget */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{lead.budget}</div>
                      <div className="text-slate-400 text-[11px] truncate max-w-[150px]">
                        {lead.service}
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3 px-4 text-slate-600 font-medium">{lead.owner}</td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-4 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onOpenLead(lead.id)}
                        className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded text-xs font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onEditLead(lead)}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleArchive(lead)}
                        className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-xs"
                        title={lead.isArchived ? 'Restore' : 'Archive'}
                      >
                        {lead.isArchived ? 'Restore' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-700">{leads.length}</span> of{' '}
              <span className="font-bold text-slate-700">{totalLeads}</span> leads
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium"
              >
                Previous
              </button>
              <span className="px-2 text-slate-600 font-semibold">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV and PDF Lead Import Modal */}
      <LeadImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          triggerRefresh();
          fetchLeads();
        }}
      />
    </div>
  );
};
