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
    if (filterType === 'status') return act.type === 'status_changed';
    if (filterType === 'followup')
      return act.type === 'followup_added' || act.type === 'followup_completed';
    if (filterType === 'lead') return act.type === 'lead_created' || act.type === 'lead_updated';
    return true;
  });

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
          >
            <option value="All">All Activities</option>
            <option value="status">Stage Changes</option>
            <option value="followup">Follow-ups</option>
            <option value="lead">Lead Creation & Edits</option>
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
              let dotBg = 'bg-blue-500';
              if (log.type === 'status_changed') dotBg = 'bg-purple-500';
              if (log.type === 'followup_completed') dotBg = 'bg-emerald-500';
              if (log.type === 'followup_added') dotBg = 'bg-amber-500';
              if (log.type === 'lead_archived') dotBg = 'bg-slate-400';

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node */}
                  <span
                    className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${dotBg} ring-4 ring-white shadow-2xs`}
                  />

                  <div className="text-xs space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-900 leading-snug">
                        <span
                          onClick={() => onOpenLead(log.leadId)}
                          className="font-bold text-blue-600 hover:underline cursor-pointer mr-1"
                        >
                          {log.leadName}
                        </span>
                        — {log.description}
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleDateString()} at{' '}
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Logged by: <strong className="text-slate-600">{log.actor}</strong></span>
                      <span>•</span>
                      <span className="capitalize">{log.type.replace('_', ' ')}</span>
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
