import React, { useState, useEffect } from 'react';
import type {
  Lead,
  FollowUp,
  ActivityLog,
  LeadStatus,
  FollowUpType,
} from '../../types/crm';
import { crmApi, isOverdue } from '../../services/api';
import { PriorityBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onLeadUpdated: () => void;
}

const STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Won',
  'Lost',
];

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  leadId,
  onClose,
  onEdit,
  onLeadUpdated,
}) => {
  const { showToast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'followups' | 'timeline'>('details');
  const [isLoading, setIsLoading] = useState(false);

  // New follow-up task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskType, setTaskType] = useState<FollowUpType>('Call');
  const [taskNotes, setTaskNotes] = useState('');

  const loadData = async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const currentLead = await crmApi.getLeadById(leadId);
      setLead(currentLead);
      if (currentLead) {
        const tasks = await crmApi.getFollowUps({ leadId: currentLead.id });
        setFollowUps(tasks);
        const logs = await crmApi.getActivityLogs(currentLead.id);
        setActivities(logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadData();
      setShowTaskForm(false);
      setActiveTab('details');
    } else {
      setLead(null);
    }
  }, [leadId]);

  if (!leadId) return null;

  if (isLoading && !lead) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={onClose} />
        <div className="relative w-full sm:w-[500px] bg-white h-full shadow-2xl flex items-center justify-center z-10">
          <LoadingSpinner label="Loading lead details..." />
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead || lead.status === newStatus) return;
    try {
      const updated = await crmApi.updateLead(lead.id, { status: newStatus });
      setLead(updated);
      showToast(`Status updated to ${newStatus}`, 'success');
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleToggleArchive = async () => {
    if (!lead) return;
    try {
      const updated = await crmApi.toggleArchive(lead.id);
      setLead(updated);
      showToast(
        updated.isArchived ? 'Lead archived' : 'Lead unarchived',
        'info'
      );
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !lead) return;

    try {
      await crmApi.addFollowUp({
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        title: taskTitle.trim(),
        dueDate: taskDueDate,
        type: taskType,
        assignedTo: lead.owner,
        notes: taskNotes.trim() || undefined,
      });

      setTaskTitle('');
      setTaskNotes('');
      setShowTaskForm(false);
      showToast('Follow-up scheduled', 'success');
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await crmApi.toggleFollowUp(taskId);
      showToast('Task updated', 'success');
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const pendingTasks = followUps.filter((t) => !t.isCompleted);
  const completedTasks = followUps.filter((t) => t.isCompleted);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full sm:w-[500px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {lead.name}
                </h2>
                {lead.isArchived && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium">{lead.company}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition-colors"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Stage:</span>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="text-xs font-medium px-2 py-1 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <PriorityBadge priority={lead.priority} size="sm" />
              <button
                onClick={() => onEdit(lead)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Edit
              </button>
              <button
                onClick={handleToggleArchive}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-200/50"
                title={lead.isArchived ? 'Restore' : 'Archive'}
              >
                {lead.isArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 bg-white">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'followups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Follow-ups</span>
            {pendingTasks.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                {pendingTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Activity History</span>
            <span className="text-[10px] text-slate-400">({activities.length})</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Email</span>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-xs font-semibold text-blue-600 hover:underline break-all"
                  >
                    {lead.email}
                  </a>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Phone</span>
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-xs font-semibold text-slate-800 hover:text-blue-600"
                  >
                    {lead.phone}
                  </a>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Service Interested In</span>
                  <span className="text-xs font-semibold text-slate-800">{lead.service}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Budget Range</span>
                  <span className="text-xs font-semibold text-slate-800">{lead.budget}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Lead Source</span>
                  <span className="text-xs font-semibold text-slate-800">{lead.source}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Assigned Owner</span>
                  <span className="text-xs font-semibold text-slate-800">{lead.owner}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-1.5">Notes & Requirements</h4>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                  {lead.notes || <span className="text-slate-400 italic">No notes recorded yet.</span>}
                </div>
              </div>

              {/* System Metadata */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                <p>Created: {new Date(lead.createdAt).toLocaleString()}</p>
                <p>Last modified: {new Date(lead.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* TAB 2: FOLLOW-UPS */}
          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Follow-up Tasks
                </h4>
                {!showTaskForm && (
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    + Schedule Follow-up
                  </button>
                )}
              </div>

              {/* New task form */}
              {showTaskForm && (
                <form
                  onSubmit={handleCreateFollowUp}
                  className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">New Task</span>
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. Call regarding quotation and scope demo"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        required
                        className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">Type</label>
                      <select
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value as FollowUpType)}
                        className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white"
                      >
                        <option value="Call">Call</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Email">Email</option>
                        <option value="Task">Task</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-200/50 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-2xs"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}

              {/* Pending tasks list */}
              <div className="space-y-2">
                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No pending follow-ups.</p>
                ) : (
                  pendingTasks.map((t) => {
                    const overdue = isOverdue(t.dueDate, t.isCompleted);
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          overdue
                            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={t.isCompleted}
                            onChange={() => handleToggleTask(t.id)}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-900 leading-tight">
                                {t.title}
                              </p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                                {t.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[11px] font-medium ${
                                  overdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                                }`}
                              >
                                {overdue ? '⚠️ Overdue: ' : 'Due: '}
                                {t.dueDate}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] text-slate-500">{t.assignedTo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Completed tasks list */}
              {completedTasks.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Completed ({completedTasks.length})
                  </span>
                  <div className="space-y-1.5 opacity-70">
                    {completedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={t.isCompleted}
                          onChange={() => handleToggleTask(t.id)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                        <span className="text-xs text-slate-600 line-through flex-1 truncate">
                          {t.title}
                        </span>
                        <span className="text-[10px] text-slate-400">{t.dueDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY HISTORY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Audit Trail & History
              </h4>
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No activity recorded yet.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800 leading-snug">
                          {act.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span>By {act.actor}</span>
                          <span>•</span>
                          <span>{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
