import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { crmApi, isOverdue, isDueToday, getLocalTodayDateString } from '../services/api';
import type { FollowUp, FollowUpType, Lead } from '../types/crm';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

interface OutletContextType {
  onOpenLead: (id: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const FollowupsPage: React.FC = () => {
  const { onOpenLead, refreshTrigger, triggerRefresh } =
    useOutletContext<OutletContextType>();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<FollowUp[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<FollowUpType | 'All'>('All');
  const [showCompleted, setShowCompleted] = useState(false);

  // New task modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => getLocalTodayDateString());
  const [taskType, setTaskType] = useState<FollowUpType>('Call');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allTasks, leads] = await Promise.all([
        crmApi.getFollowUps(),
        crmApi.getAllLeadsList(),
      ]);
      setTasks(allTasks);
      setLeadsList(leads.filter((l) => !l.isArchived));
      if (leads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(leads[0].id);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading follow-up tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleToggleTask = async (taskId: string) => {
    try {
      await crmApi.toggleFollowUp(taskId);
      showToast('Task updated', 'success');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Delete this follow-up task?')) {
      try {
        await crmApi.deleteFollowUp(taskId);
        showToast('Task deleted', 'info');
        triggerRefresh();
      } catch (e: any) {
        showToast(e.message, 'error');
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedLeadId) return;

    const lead = leadsList.find((l) => l.id === selectedLeadId);
    if (!lead) return;

    try {
      await crmApi.addFollowUp({
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        title: title.trim(),
        dueDate,
        type: taskType,
        assignedTo: lead.owner,
        notes: notes.trim() || undefined,
      });

      setTitle('');
      setNotes('');
      setIsModalOpen(false);
      showToast('Follow-up scheduled successfully', 'success');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (typeFilter !== 'All' && t.type !== typeFilter) return false;
    if (!showCompleted && t.isCompleted) return false;
    return true;
  });

  const overdueTasks = filteredTasks.filter((t) => isOverdue(t.dueDate, t.isCompleted));
  const dueTodayTasks = filteredTasks.filter(
    (t) => !t.isCompleted && isDueToday(t.dueDate)
  );
  const upcomingTasks = filteredTasks.filter(
    (t) => !t.isCompleted && !isOverdue(t.dueDate, t.isCompleted) && !isDueToday(t.dueDate)
  );
  const completedTasks = tasks.filter((t) => t.isCompleted);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Follow-up & Activity Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track pending tasks, calls, demos, and critical overdue touchpoints.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          + Add Follow-up Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Activity Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white"
          >
            <option value="All">All Types</option>
            <option value="Call">Calls</option>
            <option value="Email">Emails</option>
            <option value="Meeting">Meetings</option>
            <option value="Task">General Tasks</option>
          </select>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Show Completed Tasks</span>
        </label>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading follow-up tasks..." />
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: OVERDUE (Critical alert) */}
          {overdueTasks.length > 0 && (
            <div className="bg-rose-50/60 rounded-xl border border-rose-200 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <h2 className="text-sm font-bold text-rose-900">
                  Overdue Follow-ups ({overdueTasks.length})
                </h2>
                <span className="text-xs text-rose-600 font-medium ml-auto">
                  Immediate attention required
                </span>
              </div>

              <div className="space-y-2">
                {overdueTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-white rounded-lg border border-rose-200 shadow-2xs flex items-start gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => handleToggleTask(t.id)}
                      className="mt-1 rounded text-rose-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                        >
                          {t.title}
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                          Overdue ({t.dueDate})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-blue-600 font-semibold hover:underline cursor-pointer"
                        >
                          {t.leadName} • {t.company}
                        </span>
                        <span>Assignee: {t.assignedTo}</span>
                        <span className="font-medium text-slate-400">Type: {t.type}</span>
                      </div>
                      {t.notes && (
                        <p className="mt-1.5 text-xs text-slate-600 italic bg-slate-50 p-1.5 rounded">
                          "{t.notes}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="text-slate-300 hover:text-rose-600 text-xs px-1"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: DUE TODAY */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Due Today ({dueTodayTasks.length})
              </h2>
            </div>

            {dueTodayTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No follow-ups due today.</p>
            ) : (
              <div className="space-y-2">
                {dueTodayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-amber-50/30 rounded-lg border border-amber-200 flex items-start gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => handleToggleTask(t.id)}
                      className="mt-1 rounded text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                        >
                          {t.title}
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">
                          Due Today
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-blue-600 font-semibold hover:underline cursor-pointer"
                        >
                          {t.company}
                        </span>
                        <span>Owner: {t.assignedTo}</span>
                        <span>Type: {t.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: UPCOMING */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Upcoming Follow-ups ({upcomingTasks.length})
              </h2>
            </div>

            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No upcoming follow-ups scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white rounded-lg border border-slate-200 flex items-start gap-3 hover:border-slate-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => handleToggleTask(t.id)}
                      className="mt-1 rounded text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                        >
                          {t.title}
                        </h4>
                        <span className="text-xs font-semibold text-slate-600">{t.dueDate}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-blue-600 font-semibold hover:underline cursor-pointer"
                        >
                          {t.company}
                        </span>
                        <span>Owner: {t.assignedTo}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                          {t.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="text-slate-300 hover:text-rose-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: COMPLETED */}
          {showCompleted && completedTasks.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-200">
                Completed Tasks ({completedTasks.length})
              </h2>
              <div className="space-y-2 opacity-75">
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => handleToggleTask(t.id)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 line-through flex-1">{t.title}</span>
                    <span className="text-[11px] text-slate-400">
                      {t.company} • {t.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Follow-up Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Follow-up Task"
        subtitle="Set a reminder or action item for a lead"
      >
        <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Lead / Prospect <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {leadsList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.company} ({l.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Task Title / Action <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Call to discuss pricing tier and project start date"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as FollowUpType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Call">Call</option>
                <option value="Meeting">Meeting</option>
                <option value="Email">Email</option>
                <option value="Task">Task</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Key agenda points or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Schedule Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
