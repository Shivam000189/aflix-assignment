import React from 'react';
import type { DashboardStats, LeadStatus } from '../../types/crm';

interface PipelineChartProps {
  stats: DashboardStats;
  onFilterStage?: (status: LeadStatus) => void;
}

const STAGES: { status: LeadStatus; label: string; color: string; bg: string }[] = [
  { status: 'New', label: 'New', color: '#3b82f6', bg: 'bg-blue-500' },
  { status: 'Contacted', label: 'Contacted', color: '#f59e0b', bg: 'bg-amber-500' },
  { status: 'Qualified', label: 'Qualified', color: '#a855f7', bg: 'bg-purple-500' },
  { status: 'Proposal', label: 'Proposal', color: '#6366f1', bg: 'bg-indigo-500' },
  { status: 'Won', label: 'Won', color: '#10b981', bg: 'bg-emerald-500' },
  { status: 'Lost', label: 'Lost', color: '#64748b', bg: 'bg-slate-500' },
];

export const PipelineChart: React.FC<PipelineChartProps> = ({ stats, onFilterStage }) => {
  const total = stats.totalLeads || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Pipeline Distribution</h3>
          <p className="text-xs text-slate-500">Live breakdown of leads across sales stages</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
          {stats.totalLeads} Total Leads
        </span>
      </div>

      {/* Progress Funnel Bar */}
      <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex mb-6 p-0.5 gap-0.5">
        {STAGES.map((s) => {
          const count = stats.statusCounts[s.status] || 0;
          const percentage = ((count / total) * 100).toFixed(1);
          if (count === 0) return null;

          return (
            <div
              key={s.status}
              style={{ width: `${percentage}%` }}
              className={`${s.bg} h-full rounded-xs transition-all hover:opacity-85 cursor-pointer`}
              title={`${s.label}: ${count} (${percentage}%)`}
              onClick={() => onFilterStage?.(s.status)}
            />
          );
        })}
      </div>

      {/* Stage Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((s) => {
          const count = stats.statusCounts[s.status] || 0;
          const percentage = Math.round((count / total) * 100);

          return (
            <div
              key={s.status}
              onClick={() => onFilterStage?.(s.status)}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${s.bg}`} />
                <span className="text-xs font-medium text-slate-600 truncate">{s.label}</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-900">{count}</span>
                <span className="text-[11px] font-semibold text-slate-400">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
