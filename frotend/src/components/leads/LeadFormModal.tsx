import React, { useState, useEffect } from 'react';
import type {
  Lead,
  LeadStatus,
  LeadPriority,
  LeadSource,
  ServiceType,
  BudgetRange,
} from '../../types/crm';
import { crmApi } from '../../services/api';
import { Modal } from '../common/Modal';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
  onSaved: (lead: Lead) => void;
}

const SOURCES: LeadSource[] = [
  'Website',
  'Referral',
  'LinkedIn',
  'Inbound Call',
  'Cold Outreach',
  'Event / Conference',
];

const SERVICES: ServiceType[] = [
  'Custom Web App',
  'Cloud Migration',
  'AI Integration',
  'Mobile App',
  'QA & DevOps',
  'Enterprise Consulting',
];

const BUDGETS: BudgetRange[] = [
  '₹50,00,000+',
  '₹15,00,000 - ₹50,00,000',
  '₹5,00,000 - ₹15,00,000',
  '₹1,50,000 - ₹5,00,000',
  '₹50,000 - ₹1,50,000',
].reverse();

const STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Won',
  'Lost',
];

const PRIORITIES: LeadPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

const OWNERS = ['Alex Chen', 'Shivam Sharma', 'Priya Patel'];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  leadToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('Website');
  const [service, setService] = useState<ServiceType>('Custom Web App');
  const [budget, setBudget] = useState<BudgetRange>('₹5,00,000 - ₹15,00,000');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [priority, setPriority] = useState<LeadPriority>('Medium');
  const [owner, setOwner] = useState(OWNERS[0]);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leadToEdit) {
      setName(leadToEdit.name);
      setCompany(leadToEdit.company);
      setEmail(leadToEdit.email);
      setPhone(leadToEdit.phone);
      setSource(leadToEdit.source);
      setService(leadToEdit.service);
      setBudget(leadToEdit.budget);
      setStatus(leadToEdit.status);
      setPriority(leadToEdit.priority);
      setOwner(leadToEdit.owner);
      setNotes(leadToEdit.notes || '');
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setSource('Website');
      setService('Custom Web App');
      setBudget('₹5,00,000 - ₹15,00,000');
      setStatus('New');
      setPriority('Medium');
      setOwner(OWNERS[0]);
      setNotes('');
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [leadToEdit, isOpen]);

  // Real-time duplicate checking on email or phone change
  useEffect(() => {
    let active = true;
    const check = async () => {
      if ((email.trim().length > 4 && email.includes('@')) || phone.trim().length >= 7) {
        const res = await crmApi.checkDuplicate(email, phone, leadToEdit?.id);
        if (active) {
          if (res.isDuplicate && res.existingLead) {
            setDuplicateWarning(
              `Possible duplicate: "${res.existingLead.name}" at "${res.existingLead.company}" already uses this ${res.field}.`
            );
          } else {
            setDuplicateWarning(null);
          }
        }
      } else {
        setDuplicateWarning(null);
      }
    };

    const timer = setTimeout(check, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [email, phone, leadToEdit]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Contact name is required';
    if (!company.trim()) errs.company = 'Company name is required';
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email is required';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (leadToEdit) {
        const updated = await crmApi.updateLead(leadToEdit.id, {
          name,
          company,
          email,
          phone,
          source,
          service,
          budget,
          status,
          priority,
          owner,
          notes,
        });
        onSaved(updated);
      } else {
        const created = await crmApi.createLead({
          name,
          company,
          email,
          phone,
          source,
          service,
          budget,
          status,
          priority,
          owner,
          notes,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Error saving lead' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={leadToEdit ? 'Edit Lead' : 'Create New Lead'}
      subtitle={leadToEdit ? `Updating lead for ${leadToEdit.company}` : 'Record a new incoming business prospect'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {errors.form}
          </div>
        )}

        {/* Duplicate warning notification banner */}
        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
            <span className="font-bold">⚠️</span>
            <div>
              <p className="font-semibold">Duplicate Lead Detected</p>
              <p className="mt-0.5">{duplicateWarning}</p>
            </div>
          </div>
        )}

        {/* Name and Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                errors.name
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Apex Retail Group"
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                errors.company
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.company && <p className="text-[11px] text-rose-500 mt-1">{errors.company}</p>}
          </div>
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@apexretail.io"
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                errors.email
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 382-9912"
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                errors.phone
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
          </div>
        </div>

        {/* Service and Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Interested In
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value as ServiceType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Budget Range (₹ INR)
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value as BudgetRange)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {BUDGETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              {budget && !BUDGETS.includes(budget) && (
                <option value={budget}>{budget}</option>
              )}
            </select>
          </div>
        </div>

        {/* Status, Priority, Owner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pipeline Stage
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as LeadPriority)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lead Owner
            </label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lead Source */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lead Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes & Context
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add relevant notes, project scope, client requirements..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-lg btn-gradient cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : leadToEdit ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
