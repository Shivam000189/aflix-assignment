import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { LeadFormModal } from '../leads/LeadFormModal';
import { LeadDetailDrawer } from '../leads/LeadDetailDrawer';
import { crmApi, isOverdue } from '../../services/api';
import type { Lead } from '../../types/crm';
import { useToast } from '../../context/ToastContext';

export const AppLayout: React.FC = () => {
  const { showToast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadOverdueCount = async () => {
    try {
      const tasks = await crmApi.getFollowUps({ completed: false });
      const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.isCompleted));
      setOverdueCount(overdue.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOverdueCount();
  }, [refreshTrigger]);

  const handleLeadSaved = () => {
    showToast(leadToEdit ? 'Lead updated successfully' : 'New lead created successfully', 'success');
    setRefreshTrigger((prev) => prev + 1);
    setLeadToEdit(null);
  };

  const handleOpenLeadDetails = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleEditFromDrawer = (lead: Lead) => {
    setSelectedLeadId(null);
    setLeadToEdit(lead);
    setIsNewLeadOpen(true);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Navbar
        onMenuToggle={() => setIsMobileMenuOpen(true)}
        overdueCount={overdueCount}
        onNewLeadClick={() => {
          setLeadToEdit(null);
          setIsNewLeadOpen(true);
        }}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          overdueCount={overdueCount}
        />

        <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet
              context={{
                onOpenLead: handleOpenLeadDetails,
                onEditLead: (lead: Lead) => {
                  setLeadToEdit(lead);
                  setIsNewLeadOpen(true);
                },
                onNewLead: () => {
                  setLeadToEdit(null);
                  setIsNewLeadOpen(true);
                },
                refreshTrigger,
                triggerRefresh: () => setRefreshTrigger((p) => p + 1),
              }}
            />
          </div>
        </main>
      </div>

      {/* Global Lead Form Modal */}
      <LeadFormModal
        isOpen={isNewLeadOpen}
        onClose={() => {
          setIsNewLeadOpen(false);
          setLeadToEdit(null);
        }}
        leadToEdit={leadToEdit}
        onSaved={handleLeadSaved}
      />

      {/* Global Lead Detail Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onEdit={handleEditFromDrawer}
        onLeadUpdated={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
};
