import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { crmApi } from '../services/api';
import type { Lead, LeadStatus } from '../types/crm';
import { PipelineKanban } from '../components/pipeline/PipelineKanban';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface OutletContextType {
  onOpenLead: (id: string) => void;
  onNewLead: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const PipelinePage: React.FC = () => {
  const { onOpenLead, onNewLead, refreshTrigger, triggerRefresh } =
    useOutletContext<OutletContextType>();
  const { showToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const all = await crmApi.getAllLeadsList();
      setLeads(all);
    } catch (e) {
      console.error(e);
      showToast('Error loading pipeline leads', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [refreshTrigger]);

  const handleMoveStage = async (leadId: string, newStage: LeadStatus) => {
    try {
      await crmApi.updateLead(leadId, { status: newStage });
      showToast(`Updated deal to ${newStage}`, 'success');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Visual Sales Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage stage progression from New lead to Closed Won or Lost.
          </p>
        </div>
        <button
          onClick={onNewLead}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          + Add Opportunity
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading pipeline board..." />
      ) : (
        <PipelineKanban
          leads={leads}
          onSelectLead={onOpenLead}
          onMoveStage={handleMoveStage}
        />
      )}
    </div>
  );
};
