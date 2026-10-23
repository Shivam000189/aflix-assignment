export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type LeadSource =
  | 'Website'
  | 'Referral'
  | 'LinkedIn'
  | 'Inbound Call'
  | 'Cold Outreach'
  | 'Event / Conference';

export type ServiceType =
  | 'Custom Web App'
  | 'Cloud Migration'
  | 'AI Integration'
  | 'Mobile App'
  | 'QA & DevOps'
  | 'Enterprise Consulting';

export type BudgetRange =
  | '₹50,000 - ₹1,50,000'
  | '₹1,50,000 - ₹5,00,000'
  | '₹5,00,000 - ₹15,00,000'
  | '₹15,00,000 - ₹50,00,000'
  | '₹50,00,000+'
  | (string & {});

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  service: ServiceType;
  budget: BudgetRange;
  status: LeadStatus;
  priority: LeadPriority;
  owner: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpType = 'Call' | 'Meeting' | 'Email' | 'Task';

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  company: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  type: FollowUpType;
  isCompleted: boolean;
  completedAt?: string;
  assignedTo: string;
  notes?: string;
  createdAt: string;
}

export type ActivityType =
  | 'status_change'
  | 'status_changed'
  | 'task_added'
  | 'task_completed'
  | 'task_reopened'
  | 'task_deleted'
  | 'followup_added'
  | 'followup_completed'
  | 'created'
  | 'lead_created'
  | 'field_update'
  | 'owner_change'
  | 'lead_updated'
  | 'lead_archived'
  | 'lead_unarchived'
  | 'note_added'
  | (string & {});

export interface ActivityLog {
  id: string;
  leadId: string;
  leadName: string;
  type: ActivityType;
  description: string;
  actor: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'sales_rep';
  avatarInitials: string;
}

export interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  overdueFollowUps: number;
  highPriorityLeads: number;
  wonDealsCount: number;
  statusCounts: Record<LeadStatus, number>;
  priorityCounts: Record<LeadPriority, number>;
}

export interface ImportPreviewRow {
  rowNumber: number;
  selected: boolean;
  status: 'valid' | 'duplicate' | 'invalid';
  data: {
    name: string;
    company: string;
    email: string;
    phone: string;
    source: string;
    status: LeadStatus;
    priority: LeadPriority;
    budget: string;
    serviceInterested: string;
    notes: string;
  };
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateReasons: string[];
  duplicateMatches: Array<{
    id: string;
    name: string;
    company: string;
    owner: string;
    reason: string;
  }>;
}

export interface ImportPreviewResponse {
  success: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  headers: string[];
  mapping: Record<string, string>;
  summary: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
  };
  rows: ImportPreviewRow[];
  warning?: string | null;
}

export interface ImportSummaryResponse {
  success: boolean;
  message: string;
  summary: {
    totalProcessed: number;
    importedCount: number;
    skippedCount: number;
    duplicateCount: number;
    failedCount: number;
  };
  importedLeads: Array<{ id: string; name: string; email: string; status: string }>;
  errors: Array<{ rowNumber: number; leadName: string; reason: string }>;
}
