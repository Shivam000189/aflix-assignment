import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { crmApi, isOverdue, isDueToday } from '../services/api';
import type { DashboardStats, FollowUp, ActivityLog, LeadStatus } from '../types/crm';
import { PipelineChart } from '../components/dashboard/PipelineChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface OutletContextType {
  onOpenLead: (id: string) => void;
  onNewLead: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const DashboardPage: React.FC = () => {
  const { onOpenLead, onNewLead, refreshTrigger, triggerRefresh } =
    useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [urgentTasks, setUrgentTasks] = useState<FollowUp[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [dashStats, allTasks, activities] = await Promise.all([
        crmApi.getDashboardStats(),
        crmApi.getFollowUps({ completed: false }),
        crmApi.getActivityLogs(),
      ]);

      setStats(dashStats);
      // Filter tasks that are overdue or due today
      const urgent = allTasks
        .filter(
          (t) => !t.isCompleted && (isOverdue(t.dueDate, t.isCompleted) || isDueToday(t.dueDate))
        )
        .slice(0, 5);
      setUrgentTasks(urgent);
      setRecentActivities(activities.slice(0, 6));
    } catch (e) {
      console.error(e);
      showToast('Error loading dashboard stats', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [refreshTrigger]);

  const handleToggleTask = async (taskId: string) => {
    try {
      await crmApi.toggleFollowUp(taskId);
      showToast('Follow-up task marked completed', 'success');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (isLoading && !stats) {
    return <LoadingSpinner label="Loading CRM dashboard..." />;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales Pipeline Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time overview of active opportunities, pipeline velocity, and follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pipeline')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            Pipeline Board
          </button>
          <button
            onClick={onNewLead}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg btn-gradient cursor-pointer"
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Leads */}
        <div
          onClick={() => navigate('/leads')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Active Leads
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-slate-900">{stats.activeLeads}</span>
            <span className="text-xs text-slate-400">of {stats.totalLeads} total</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-medium">View all leads →</div>
        </div>

        {/* Overdue Follow-ups */}
        <div
          onClick={() => navigate('/followups')}
          className={`p-4 rounded-xl border shadow-2xs cursor-pointer transition-colors ${
            stats.overdueFollowUps > 0
              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                stats.overdueFollowUps > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
              }`}
            >
              Overdue Follow-ups
            </span>
            {stats.overdueFollowUps > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span
              className={`text-2xl font-bold ${
                stats.overdueFollowUps > 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {stats.overdueFollowUps}
            </span>
            <span className="text-xs text-slate-400">Action required</span>
          </div>
          <div
            className={`mt-2 text-[11px] font-medium ${
              stats.overdueFollowUps > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}
          >
            Review tasks →
          </div>
        </div>

        {/* High Priority Leads */}
        <div
          onClick={() => navigate('/leads?priority=Urgent')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-amber-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            High Priority / Urgent
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-slate-900">{stats.highPriorityLeads}</span>
            <span className="text-xs text-amber-600 font-medium">Fast-track deals</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">Filter priority →</div>
        </div>

        {/* Won Deals */}
        <div
          onClick={() => navigate('/leads?status=Won')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Closed Won Deals
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-emerald-700">{stats.wonDealsCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Closed</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">View won leads →</div>
        </div>
      </div>

      {/* Pipeline Summary Chart */}
      <PipelineChart
        stats={stats}
        onFilterStage={(stage: LeadStatus) => navigate(`/leads?status=${stage}`)}
      />

      {/* Bottom 2 Columns: Action Agenda & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Urgent Follow-ups Agenda */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Follow-ups Requiring Attention</h3>
              <p className="text-xs text-slate-500">Overdue and tasks due today</p>
            </div>
            <button
              onClick={() => navigate('/followups')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              All Tasks →
            </button>
          </div>

          <div className="space-y-2">
            {urgentTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                All caught up! No overdue or due today tasks.
              </p>
            ) : (
              urgentTasks.map((t) => {
                const overdue = isOverdue(t.dueDate, t.isCompleted);
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                      overdue ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => handleToggleTask(t.id)}
                      className="mt-0.5 rounded text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          onClick={() => onOpenLead(t.leadId)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate"
                        >
                          {t.title}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-500 flex-shrink-0">
                          {t.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span
                          className="text-blue-600 font-medium hover:underline cursor-pointer"
                          onClick={() => onOpenLead(t.leadId)}
                        >
                          {t.company}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`font-semibold ${
                            overdue ? 'text-rose-600' : 'text-slate-600'
                          }`}
                        >
                          {overdue ? 'Overdue: ' : 'Due: '}
                          {t.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Real-time Activity History Log */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent CRM Activities</h3>
              <p className="text-xs text-slate-500">Live timestamped log of pipeline events</p>
            </div>
            <button
              onClick={() => navigate('/activities')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Full Log →
            </button>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No recent activity recorded.
              </p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 leading-snug">
                      <span
                        onClick={() => onOpenLead(act.leadId)}
                        className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer mr-1"
                      >
                        {act.leadName}:
                      </span>
                      {act.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span>{act.actor}</span>
                      <span>•</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
