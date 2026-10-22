import React from 'react';
import type { LeadStatus, LeadPriority } from '../../types/crm';

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<LeadStatus, string> = {
    New: 'bg-blue-50 text-blue-700 border-blue-200',
    Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    Qualified: 'bg-purple-50 text-purple-700 border-purple-200',
    Proposal: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Lost: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const dotColors: Record<LeadStatus, string> = {
    New: 'bg-blue-500',
    Contacted: 'bg-amber-500',
    Qualified: 'bg-purple-500',
    Proposal: 'bg-indigo-500',
    Won: 'bg-emerald-500',
    Lost: 'bg-slate-400',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles[status]} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      {status}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: LeadPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const styles: Record<LeadPriority, string> = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-sky-50 text-sky-700 border-sky-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${styles[priority]} ${sizeClass}`}
    >
      {priority}
    </span>
  );
};
