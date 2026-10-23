import type {
  Lead,
  FollowUp,
  ActivityLog,
  DashboardStats,
  LeadStatus,
  LeadPriority,
  ImportPreviewResponse,
  ImportSummaryResponse,
} from '../types/crm';

const TOKEN_KEY = 'aflix_crm_token';

export const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.BACKEND_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

// Headers helper to authenticate with PostgreSQL backend
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Returns today's calendar date in the client's local timezone as 'YYYY-MM-DD'.
 */
export function getLocalTodayDateString(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes an arbitrary date input into a local calendar 'YYYY-MM-DD' string.
 * - Extracts date portion from 'YYYY-MM-DD' or 'YYYY-MM-DDT...'
 * - Normalizes Date objects using local year/month/day
 * - Returns empty string for invalid, missing, or malformed inputs
 */
export function normalizeDateString(dateInput?: string | Date | number | null): string {
  if (!dateInput && dateInput !== 0) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';

    // Match ISO/calendar YYYY-MM-DD pattern
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      const mNum = parseInt(month, 10);
      const dNum = parseInt(day, 10);
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return '';
    return getLocalTodayDateString(parsed);
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    return getLocalTodayDateString(dateInput);
  }

  if (typeof dateInput === 'number') {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) return '';
    return getLocalTodayDateString(parsed);
  }

  return '';
}

/**
 * Checks if a task due date is overdue in the client's local timezone.
 * Completed tasks and invalid/empty dates are never marked overdue.
 */
export function isOverdue(
  dueDateInput?: string | Date | null,
  isCompleted: boolean = false,
  referenceDate: Date = new Date()
): boolean {
  if (isCompleted) return false;
  const dateOnly = normalizeDateString(dueDateInput);
  if (!dateOnly) return false;

  const today = getLocalTodayDateString(referenceDate);
  return dateOnly < today;
}

/**
 * Checks if a task is due today in the client's local timezone.
 */
export function isDueToday(
  dueDateInput?: string | Date | null,
  referenceDate: Date = new Date()
): boolean {
  const dateOnly = normalizeDateString(dueDateInput);
  if (!dateOnly) return false;

  const today = getLocalTodayDateString(referenceDate);
  return dateOnly === today;
}

export function formatBudgetInr(budget?: string): string {
  if (!budget) return '₹1,00,000 - ₹5,00,000';
  const trimmed = String(budget).trim();
  if (trimmed.includes('₹') || trimmed.toUpperCase().includes('INR')) {
    return trimmed;
  }
  if (trimmed.includes('$')) {
    if (trimmed.includes('1k') || trimmed.includes('1,000')) {
      if (trimmed.includes('5k') || trimmed.includes('5,000')) return '₹1,00,000 - ₹5,00,000';
    }
    if (trimmed.includes('5k') || trimmed.includes('5,000')) {
      if (trimmed.includes('10k') || trimmed.includes('10,000')) return '₹5,00,000 - ₹10,00,000';
      if (trimmed.includes('15k') || trimmed.includes('15,000')) return '₹5,00,000 - ₹15,00,000';
    }
    if (trimmed.includes('10,000') && trimmed.includes('25,000')) return '₹10,00,000 - ₹25,00,000';
    if (trimmed.includes('15k') || trimmed.includes('15,000')) {
      if (trimmed.includes('30,000')) return '₹15,00,000 - ₹30,00,000';
      if (trimmed.includes('50k') || trimmed.includes('50,000')) return '₹15,00,000 - ₹50,00,000';
    }
    if (trimmed.includes('25,000') && trimmed.includes('50,000')) return '₹25,00,000 - ₹50,00,000';
    if (trimmed.includes('50k') || trimmed.includes('50,000')) {
      if (trimmed.includes('100k') || trimmed.includes('100,000')) return '₹50,00,000 - ₹1,00,00,000';
      if (trimmed.includes('+')) return '₹50,00,000+';
    }
    if (trimmed.includes('100k+')) return '₹1,00,00,000+';
    return trimmed.replace(/\$/g, '₹');
  }
  return trimmed;
}

function formatLeadFromApi(raw: any): Lead {
  return {
    id: raw.id || raw._id,
    name: raw.name || '',
    company: raw.company || '',
    email: raw.email || '',
    phone: raw.phone || '',
    source: raw.source || 'Website',
    service: raw.service || raw.serviceInterested || 'Web Development',
    budget: formatBudgetInr(raw.budget),
    status: raw.status || 'New',
    priority: raw.priority || 'Medium',
    owner: raw.owner || 'Unassigned',
    notes: raw.notes || '',
    isArchived: Boolean(raw.isArchived),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(raw.updatedAt).toISOString(),
  };
}

function formatTaskFromApi(raw: any): FollowUp {
  const dueDateStr = normalizeDateString(raw.dueDate);
  return {
    id: raw.id || raw._id,
    leadId: raw.leadId || raw.lead?.id || raw.lead?._id || '',
    leadName: raw.leadName || raw.lead?.name || '',
    company: raw.company || raw.lead?.company || '',
    title: raw.title || '',
    dueDate: dueDateStr,
    type: raw.type || 'Follow Up',
    isCompleted: Boolean(raw.isCompleted),
    completedAt: raw.completedAt
      ? typeof raw.completedAt === 'string'
        ? raw.completedAt
        : new Date(raw.completedAt).toISOString()
      : undefined,
    assignedTo: raw.assignedTo || raw.assignedToName || 'Unassigned',
    notes: raw.notes || '',
    createdAt: raw.createdAt
      ? typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date(raw.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

function formatActivityFromApi(raw: any): ActivityLog {
  return {
    id: raw.id || raw._id,
    leadId: raw.leadId || raw.lead?.id || '',
    leadName: raw.leadName || raw.lead?.name || '',
    type: raw.type || 'lead_updated',
    description: raw.description || '',
    actor: raw.actor || raw.performedByName || 'Agent',
    timestamp: raw.timestamp
      ? typeof raw.timestamp === 'string'
        ? raw.timestamp
        : new Date(raw.timestamp).toISOString()
      : new Date().toISOString(),
  };
}

export const crmApi = {
  // --- LEADS ---
  async getLeads(params?: {
    search?: string;
    status?: LeadStatus | 'All';
    priority?: LeadPriority | 'All';
    owner?: string;
    showArchived?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'name' | 'company' | 'priority' | 'budget';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    leads: Lead[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'All') query.set('status', params.status);
    if (params?.priority && params.priority !== 'All') query.set('priority', params.priority);
    if (params?.owner && params.owner !== 'All') query.set('owner', params.owner);
    if (params?.showArchived !== undefined) query.set('archived', String(params.showArchived));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const res = await fetch(`${API_BASE_URL}/leads?${query.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load leads from database (${res.status})`);
    }

    const data = await res.json();
    const leads = (data.leads || []).map(formatLeadFromApi);
    return {
      leads,
      total: data.pagination?.totalLeads ?? leads.length,
      page: data.pagination?.page ?? 1,
      totalPages: data.pagination?.totalPages ?? 1,
    };
  },

  async getAllLeadsList(): Promise<Lead[]> {
    const res = await fetch(`${API_BASE_URL}/leads?limit=500&archived=false`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch leads list');
    const data = await res.json();
    return (data.leads || []).map(formatLeadFromApi);
  },

  async getLeadById(id: string): Promise<Lead | null> {
    const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch lead');
    const data = await res.json();
    return data.lead ? formatLeadFromApi(data.lead) : null;
  },

  // Check for duplicate lead by email or phone
  async checkDuplicate(
    email: string,
    phone: string,
    excludeId?: string
  ): Promise<{ isDuplicate: boolean; existingLead?: Lead; field?: 'email' | 'phone' }> {
    const query = new URLSearchParams();
    if (email) query.set('email', email);
    if (phone) query.set('phone', phone);
    if (excludeId) query.set('excludeId', excludeId);

    const res = await fetch(`${API_BASE_URL}/leads/check-duplicate?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { isDuplicate: false };
    const data = await res.json();
    const matches = data.matches || [];
    return {
      isDuplicate: Boolean(data.isDuplicate),
      existingLead: matches[0] ? formatLeadFromApi(matches[0]) : undefined,
      field: data.reasons?.[0] as 'email' | 'phone' | undefined,
    };
  },

  async createLead(
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>,
    currentUser = 'You'
  ): Promise<Lead> {
    const res = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...leadData,
        serviceInterested: leadData.service,
        owner: leadData.owner || currentUser,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create lead');
    }
    const data = await res.json();
    return formatLeadFromApi(data.lead);
  },

  async updateLead(
    id: string,
    updates: Partial<Omit<Lead, 'id' | 'createdAt'>>,
    currentUser = 'You'
  ): Promise<Lead> {
    const body: any = { ...updates };
    if (updates.service) {
      body.serviceInterested = updates.service;
    }
    body.updatedBy = currentUser;

    const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update lead');
    }
    const data = await res.json();
    return formatLeadFromApi(data.lead);
  },

  async toggleArchive(id: string, _currentUser = 'You'): Promise<Lead> {
    const current = await this.getLeadById(id);
    const action = current?.isArchived ? 'unarchive' : 'archive';
    const res = await fetch(`${API_BASE_URL}/leads/${id}/${action}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to toggle archive');
    }
    const data = await res.json();
    return formatLeadFromApi(data.lead);
  },

  // --- FOLLOW-UPS ---
  async getFollowUps(params?: {
    leadId?: string;
    completed?: boolean;
  }): Promise<FollowUp[]> {
    if (params?.leadId) {
      const res = await fetch(`${API_BASE_URL}/leads/${params.leadId}/follow-ups`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      let tasks = (data.followUps || []).map(formatTaskFromApi);
      if (params.completed !== undefined) {
        tasks = tasks.filter((t: FollowUp) => t.isCompleted === params.completed);
      }
      return tasks;
    }

    const res = await fetch(`${API_BASE_URL}/leads/follow-ups/overview`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawTasks = [
      ...(data.tasks?.overdue || []),
      ...(data.tasks?.today || []),
      ...(data.tasks?.upcoming || []),
    ];
    let tasks = rawTasks.map(formatTaskFromApi);
    if (params?.completed !== undefined) {
      tasks = tasks.filter((t) => t.isCompleted === params.completed);
    }
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async addFollowUp(
    taskData: Omit<FollowUp, 'id' | 'isCompleted' | 'createdAt' | 'completedAt'>,
    currentUser = 'You'
  ): Promise<FollowUp> {
    const res = await fetch(`${API_BASE_URL}/leads/${taskData.leadId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: taskData.title,
        type: taskData.type,
        dueDate: taskData.dueDate,
        notes: taskData.notes || '',
        priority: 'Medium',
        assignedTo: taskData.assignedTo || currentUser,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to add follow-up task');
    }
    const data = await res.json();
    return formatTaskFromApi(data.task);
  },

  async toggleFollowUp(
    id: string,
    leadId?: string,
    isCompleted?: boolean,
    currentUser = 'You'
  ): Promise<FollowUp> {
    let resolvedLeadId = leadId;
    let targetCompleted = isCompleted;

    if (!resolvedLeadId || targetCompleted === undefined) {
      const all = await this.getFollowUps();
      const existing = all.find((t) => t.id === id);
      if (existing) {
        resolvedLeadId = resolvedLeadId || existing.leadId;
        if (targetCompleted === undefined) {
          targetCompleted = !existing.isCompleted;
        }
      }
    }

    const endpoint = resolvedLeadId
      ? `${API_BASE_URL}/leads/${resolvedLeadId}/tasks/${id}`
      : `${API_BASE_URL}/leads/tasks/${id}`;

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        isCompleted: targetCompleted !== undefined ? targetCompleted : true,
        assignedTo: currentUser,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update follow-up task');
    }
    const data = await res.json();
    return formatTaskFromApi(data.task);
  },

  async deleteFollowUp(id: string): Promise<void> {
    const all = await this.getFollowUps();
    const existing = all.find((t) => t.id === id);
    if (!existing) return;

    const res = await fetch(`${API_BASE_URL}/leads/${existing.leadId}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete task');
    }
  },

  // --- ACTIVITY LOGS ---
  async getActivityLogs(leadId?: string): Promise<ActivityLog[]> {
    if (leadId) {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/activity-logs`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.activities || []).map(formatActivityFromApi);
    }

    const res = await fetch(`${API_BASE_URL}/leads?limit=50`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const activities: ActivityLog[] = [];
    (data.leads || []).forEach((lead: any) => {
      (lead.activities || []).forEach((act: any) => {
        activities.push({
          ...formatActivityFromApi(act),
          leadId: lead.id,
          leadName: lead.name,
        });
      });
    });
    return activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  async logActivity(data: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const res = await fetch(`${API_BASE_URL}/leads/${data.leadId}/activities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: data.type,
        description: data.description,
        performedBy: data.actor,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record activity');
    }
    const resData = await res.json();
    return formatActivityFromApi(resData.activity);
  },

  // --- DASHBOARD STATS ---
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE_URL}/leads/stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load dashboard stats');
    }
    const data = await res.json();
    const s = data.stats || {};

    return {
      totalLeads: s.total ?? 0,
      activeLeads: s.active ?? 0,
      overdueFollowUps: s.overdueTasks ?? 0,
      highPriorityLeads: s.highPriority ?? 0,
      wonDealsCount: s.byStatus?.Won ?? 0,
      statusCounts: {
        New: s.byStatus?.New ?? 0,
        Contacted: s.byStatus?.Contacted ?? 0,
        Qualified: s.byStatus?.Qualified ?? 0,
        Proposal: s.byStatus?.Proposal ?? 0,
        Won: s.byStatus?.Won ?? 0,
        Lost: s.byStatus?.Lost ?? 0,
      },
      priorityCounts: {
        Low: s.byPriority?.Low ?? 0,
        Medium: s.byPriority?.Medium ?? 0,
        High: s.byPriority?.High ?? 0,
        Urgent: s.byPriority?.Urgent ?? 0,
      },
    };
  },

  // --- LEAD IMPORT (CSV & PDF) ---
  async previewImportLeads(file: File, customMapping?: Record<string, string>): Promise<ImportPreviewResponse> {
    const token = localStorage.getItem(TOKEN_KEY);
    const formData = new FormData();
    formData.append('file', file);
    if (customMapping) {
      formData.append('mapping', JSON.stringify(customMapping));
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/leads/import/preview`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to preview file');
    }
    return data;
  },

  async confirmImportLeads(
    leads: any[],
    options?: {
      skipDuplicates?: boolean;
      allowDuplicates?: boolean;
      defaultStatus?: string;
      defaultPriority?: string;
      defaultSource?: string;
    }
  ): Promise<ImportSummaryResponse> {
    const res = await fetch(`${API_BASE_URL}/leads/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ leads, options }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to import leads');
    }
    return data;
  },

  // Reset demo data helper
  resetDemoData(): void {
    localStorage.removeItem('aflix_crm_leads');
    localStorage.removeItem('aflix_crm_followups');
    localStorage.removeItem('aflix_crm_activities');
  },
};
