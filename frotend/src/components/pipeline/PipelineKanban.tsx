import React from 'react';
import type { Lead, LeadStatus } from '../../types/crm';
import { PriorityBadge } from '../common/Badge';

interface PipelineKanbanProps {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
  onMoveStage: (leadId: string, newStage: LeadStatus) => void;
}

const STAGES: { key: LeadStatus; label: string; color: string; border: string }[] = [
  { key: 'New', label: 'New', color: 'bg-blue-50 text-blue-700', border: 'border-t-blue-500' },
  { key: 'Contacted', label: 'Contacted', color: 'bg-amber-50 text-amber-700', border: 'border-t-amber-500' },
  { key: 'Qualified', label: 'Qualified', color: 'bg-purple-50 text-purple-700', border: 'border-t-purple-500' },
  { key: 'Proposal', label: 'Proposal', color: 'bg-indigo-50 text-indigo-700', border: 'border-t-indigo-500' },
  { key: 'Won', label: 'Won Deal', color: 'bg-emerald-50 text-emerald-700', border: 'border-t-emerald-500' },
  { key: 'Lost', label: 'Lost', color: 'bg-slate-100 text-slate-700', border: 'border-t-slate-400' },
];

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  leads,
  onSelectLead,
  onMoveStage,
}) => {
  const getStageLeads = (stage: LeadStatus) => {
    return leads.filter((l) => l.status === stage && !l.isArchived);
  };

  const getAdjacentStages = (current: LeadStatus) => {
    const stageKeys: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
    const idx = stageKeys.indexOf(current);
    const prev = idx > 0 ? stageKeys[idx - 1] : null;
    const next = idx < stageKeys.length - 1 ? stageKeys[idx + 1] : null;
    return { prev, next };
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
      {STAGES.map((stage) => {
        const stageLeads = getStageLeads(stage.key);

        return (
          <div
            key={stage.key}
            className={`flex-shrink-0 w-72 sm:w-80 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-12rem)] border-t-4 ${stage.border}`}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{stage.label}</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-white border border-slate-200 text-slate-600">
                  {stageLeads.length}
                </span>
              </div>
            </div>

            {/* Column Cards */}
            <div className="p-2 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
              {stageLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No leads in {stage.label}
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const { prev, next } = getAdjacentStages(lead.status);

                  return (
                    <div
                      key={lead.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
                      onClick={() => onSelectLead(lead.id)}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {lead.name}
                        </h4>
                        <PriorityBadge priority={lead.priority} size="sm" />
                      </div>

                      <p className="text-[11px] font-medium text-slate-600 mb-2 truncate">
                        {lead.company}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="font-semibold text-slate-800">{lead.budget}</span>
                        <span className="truncate max-w-[110px] text-slate-400">
                          {lead.service}
                        </span>
                      </div>

                      {/* Quick stage advance/regress buttons */}
                      <div
                        className="flex items-center justify-between pt-2 mt-2 border-t border-slate-50 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {prev ? (
                          <button
                            onClick={() => onMoveStage(lead.id, prev)}
                            className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title={`Move back to ${prev}`}
                          >
                            ← {prev}
                          </button>
                        ) : (
                          <span />
                        )}

                        {next && (
                          <button
                            onClick={() => onMoveStage(lead.id, next)}
                            className="px-2 py-0.5 font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title={`Advance to ${next}`}
                          >
                            {next} →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
