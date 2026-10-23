import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { crmApi } from '../services/api';
import type { ActivityLog } from '../types/crm';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface OutletContextType {
  onOpenLead: (id: string) => void;
  refreshTrigger: number;
}

export const ActivityPage: React.FC = () => {
  const { onOpenLead, refreshTrigger } = useOutletContext<OutletContextType>();
  const { showToast } = useToast();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filterType, setFilterType] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const logs = await crmApi.getActivityLogs();
      setActivities(logs);
    } catch (e) {
      console.error(e);
      showToast('Error loading activity logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [refreshTrigger]);

  const filteredLogs = activities.filter((act) => {
    if (filterType === 'All') return true;
    if (filterType === 'status') {
      return act.type === 'status_change' || act.type === 'status_changed';
    }
    if (filterType === 'followup') {
      return (
        act.type === 'task_added' ||
        act.type === 'task_completed' ||
        act.type === 'task_updated' ||
        act.type === 'task_deleted' ||
        act.type === 'task_reopened' ||
        act.type === 'followup_added' ||
        act.type === 'followup_completed'
      );
    }
    if (filterType === 'field_update') {
      return (
        act.type === 'field_update' ||
        act.type === 'priority_change' ||
        act.type === 'owner_change'
      );
    }
    if (filterType === 'lead') {
      return (
        act.type === 'created' ||
        act.type === 'lead_created' ||
        act.type === 'lead_updated' ||
        act.type === 'field_update' ||
        act.type === 'priority_change' ||
        act.type === 'owner_change' ||
        act.type === 'archived' ||
        act.type === 'lead_archived' ||
        act.type === 'restored' ||
        act.type === 'lead_unarchived' ||
        act.type === 'note_added'
      );
    }
    return true;
  });

  const getActivityBadgeColor = (type?: string) => {
    switch (type) {
      case 'status_change':
      case 'status_changed':
        return 'bg-purple-500';
      case 'task_completed':
      case 'followup_completed':
        return 'bg-emerald-500';
      case 'task_added':
      case 'followup_added':
        return 'bg-amber-500';
      case 'task_updated':
      case 'task_reopened':
        return 'bg-cyan-500';
      case 'task_deleted':
        return 'bg-rose-500';
      case 'field_update':
      case 'priority_change':
      case 'owner_change':
        return 'bg-indigo-500';
      case 'created':
      case 'lead_created':
        return 'bg-blue-500';
      case 'archived':
      case 'lead_archived':
        return 'bg-slate-400';
      case 'restored':
      case 'lead_unarchived':
        return 'bg-teal-500';
      case 'note_added':
        return 'bg-amber-600';
      default:
        return 'bg-slate-500';
    }
  };

  const formatActivityTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'Recently';
      return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Activity & Audit History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete chronological audit trail of all changes across leads and opportunities.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter Event:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            aria-label="Filter activity events"
          >
            <option value="All">All Activities</option>
            <option value="status">Stage Changes</option>
            <option value="followup">Follow-ups & Tasks</option>
            <option value="field_update">Field Updates</option>
            <option value="lead">Lead Lifecycle & Edits</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading activity stream..." />
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
          No activity logs match the selected filter.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6">
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {filteredLogs.map((log) => {
              const dotBg = getActivityBadgeColor(log.type);

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node */}
                  <span
                    className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${dotBg} ring-4 ring-white shadow-2xs`}
                  />

                  <div className="text-xs space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-900 leading-snug">
                        {log.leadName ? (
                          <span
                            onClick={() => log.leadId && onOpenLead(log.leadId)}
                            className={
                              log.leadId
                                ? 'font-bold text-blue-600 hover:underline cursor-pointer mr-1'
                                : 'font-bold text-slate-800 mr-1'
                            }
                          >
                            {log.leadName}
                          </span>
                        ) : null}
                        {log.leadName ? '— ' : ''}{log.description || 'Activity recorded'}
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatActivityTimestamp(log.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Logged by: <strong className="text-slate-600">{log.actor || 'System'}</strong></span>
                      <span>•</span>
                      <span className="capitalize">
                        {(log.type || 'activity').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
