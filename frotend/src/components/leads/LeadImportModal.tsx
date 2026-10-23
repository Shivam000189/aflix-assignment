import React, { useState, useRef, useId } from 'react';
import { crmApi } from '../../services/api';
import type { ImportPreviewResponse, ImportPreviewRow, ImportSummaryResponse } from '../../types/crm';
import { useToast } from '../../context/ToastContext';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CRM_FIELD_OPTIONS = [
  { value: 'name', label: 'Full Name (Required)' },
  { value: 'email', label: 'Work Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'company', label: 'Company Name' },
  { value: 'status', label: 'Stage / Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'source', label: 'Lead Source' },
  { value: 'budget', label: 'Budget Range' },
  { value: 'serviceInterested', label: 'Service Interested' },
  { value: 'notes', label: 'Notes / Remarks' },
  { value: 'ignore', label: '— Do Not Import —' },
];

export const LeadImportModal: React.FC<LeadImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipDuplicatesId = useId();

  // Wizard Step: 'upload' -> 'preview' -> 'summary'
  const [step, setStep] = useState<'upload' | 'preview' | 'summary'>('upload');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview & Mapping state
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [showMappingDrawer, setShowMappingDrawer] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Import Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummaryResponse | null>(null);

  if (!isOpen) return null;

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setParseError(null);
    const validExtensions = ['.csv', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setParseError('Unsupported file type. Please upload a .csv or .pdf file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setParseError('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }

    setSelectedFile(file);
  };

  // Upload & Parse File
  const handleParseFile = async (customMap?: Record<string, string>) => {
    if (!selectedFile) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const data = await crmApi.previewImportLeads(selectedFile, customMap);
      setPreviewData(data);
      setRows(data.rows || []);
      setMapping(data.mapping || {});
      setStep('preview');
      showToast(`Parsed ${data.summary.total} candidate leads from ${data.fileName}`, 'info');
    } catch (err: any) {
      setParseError(err.message || 'Failed to process file');
      showToast(err.message || 'Error parsing file', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Re-apply column mapping
  const handleReapplyMapping = () => {
    handleParseFile(mapping);
    setShowMappingDrawer(false);
  };

  // Row selection helpers
  const handleToggleRow = (rowNumber: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowNumber === rowNumber ? { ...r, selected: !r.selected } : r
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const handleSelectValidOnly = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.status === 'valid',
      }))
    );
  };

  // Inline editable cell updater
  const handleUpdateRowData = (
    rowNumber: number,
    field: keyof ImportPreviewRow['data'],
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowNumber !== rowNumber) return r;
        const updatedData = { ...r.data, [field]: value };
        // Recalculate basic validation
        const errors = [...r.errors];
        if (field === 'name') {
          const hasName = value.trim().length > 0;
          const nameErrIdx = errors.indexOf('Lead name is required');
          if (hasName && nameErrIdx !== -1) {
            errors.splice(nameErrIdx, 1);
          } else if (!hasName && nameErrIdx === -1) {
            errors.push('Lead name is required');
          }
        }
        return {
          ...r,
          data: updatedData,
          errors,
          status: errors.length > 0 ? 'invalid' : r.isDuplicate ? 'duplicate' : 'valid',
        };
      })
    );
  };

  // Submit confirmed batch import
  const handleConfirmImport = async () => {
    const selectedRows = rows.filter((r) => r.selected);

    if (selectedRows.length === 0) {
      showToast('No leads selected for import. Please select at least one row.', 'warning');
      return;
    }

    setIsImporting(true);

    try {
      const summary = await crmApi.confirmImportLeads(selectedRows, {
        skipDuplicates,
        allowDuplicates: !skipDuplicates,
      });

      setImportSummary(summary);
      setStep('summary');
      showToast(summary.message || 'Import completed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to complete import', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Download error report as CSV
  const handleDownloadErrorReport = () => {
    if (!importSummary || importSummary.errors.length === 0) return;

    const headers = ['Row Number', 'Contact Name', 'Error Reason'];
    const rowsCsv = importSummary.errors.map((e) =>
      [e.rowNumber, `"${e.leadName.replace(/"/g, '""')}"`, `"${e.reason.replace(/"/g, '""')}"`].join(',')
    );

    const csvContent = [headers.join(','), ...rowsCsv].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset modal state
  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setRows([]);
    setMapping({});
    setParseError(null);
    setImportSummary(null);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  // Filtered rows for preview table
  const filteredRows = rows.filter((r) => {
    if (statusFilter === 'valid') return r.status === 'valid';
    if (statusFilter === 'duplicate') return r.status === 'duplicate';
    if (statusFilter === 'invalid') return r.status === 'invalid';
    return true;
  });

  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Accent Gradient Line */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{
            background: 'linear-gradient(90deg, #e12634 0%, #4a3cdb 50%, #169bf2 100%)',
          }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Import Leads from CSV or PDF
              </h2>
              <p className="text-[11px] text-slate-500">
                Bulk ingest contacts with column mapping, duplicate protection, and audit logging
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Wizard Step Progress Pills */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 border-b border-slate-200/80 flex-shrink-0 text-xs">
          <span
            className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              step === 'upload'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            Upload File
          </span>

          <span className="text-slate-300">→</span>

          <span
            className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              step === 'preview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            Preview & Mapping
          </span>

          <span className="text-slate-300">→</span>

          <span
            className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              step === 'summary'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            Summary
          </span>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {/* ========================================================================= */}
          {/* STEP 1: UPLOAD FILE */}
          {/* ========================================================================= */}
          {step === 'upload' && (
            <div className="max-w-xl mx-auto space-y-4">
              {/* Drag and drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-2.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                      selectedFile ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {selectedFile ? (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    )}
                  </div>

                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB •{' '}
                        {selectedFile.name.endsWith('.csv') ? 'CSV Spreadsheet' : 'PDF Document'}
                      </p>
                      <span className="inline-block mt-2 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        Click or drag to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Drop your CSV or PDF file here, or{' '}
                        <span className="text-indigo-600 hover:underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports .csv spreadsheets & text-based .pdf contact lists (Max 5MB, up to 500 rows)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error notification banner */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{parseError}</span>
                </div>
              )}

              {/* Capabilities & Specifications Info Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-indigo-600">✓</span> Production Features & Format Support:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11.5px] text-slate-600">
                  <li>
                    <strong>CSV:</strong> First-row headers, quoted values, commas inside quotes, UTF-8 BOM auto-stripped.
                  </li>
                  <li>
                    <strong>PDF:</strong> Text-based contact tables, label-value pairs (Name:, Email:), and lead listings.
                  </li>
                  <li>
                    <strong>Safety:</strong> Automatic duplicate detection, spreadsheet formula injection protection.
                  </li>
                  <li>
                    <strong>Scanned PDFs:</strong> Requires OCR or text-based documents; purely scanned images are detected and flagged.
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedFile || isParsing}
                  onClick={() => handleParseFile()}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(90deg, #e12634 0%, #4a3cdb 50%, #169bf2 100%)',
                  }}
                >
                  {isParsing ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span>Parsing File Content...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Preview & Mapping</span>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PREVIEW & COLUMN MAPPING */}
          {/* ========================================================================= */}
          {step === 'preview' && previewData && (
            <div className="space-y-3.5">
              {/* Summary Stats Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">File: {previewData.fileName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{previewData.summary.total} Records Found</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All ({previewData.summary.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('valid')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'valid'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Valid ({previewData.summary.valid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('duplicate')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'duplicate'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Duplicates ({previewData.summary.duplicate})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('invalid')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === 'invalid'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    Invalid ({previewData.summary.invalid})
                  </button>
                </div>
              </div>

              {/* Warning banner if extraction was ambiguous or incomplete */}
              {previewData.warning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{previewData.warning}</span>
                </div>
              )}

              {/* Column Mapping Accordion (Especially useful for CSV files) */}
              {previewData.fileType === 'CSV' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowMappingDrawer(!showMappingDrawer)}
                    className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      Column Mapping Configuration ({previewData.headers.length} Columns)
                    </span>
                    <span className="text-slate-400">{showMappingDrawer ? '▲ Hide' : '▼ Adjust Mapping'}</span>
                  </button>

                  {showMappingDrawer && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
                      <p className="text-[11px] text-slate-500">
                        Map source CSV headers to CRM fields. Unmatched columns can be mapped manually or ignored.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {previewData.headers.map((header) => (
                          <div key={header} className="flex flex-col bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-700 truncate mb-1" title={header}>
                              CSV: "{header}"
                            </span>
                            <select
                              value={mapping[header] || 'ignore'}
                              onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                              className="text-xs p-1 rounded border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {CRM_FIELD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleReapplyMapping}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Re-apply Mapping
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selection Bar & Duplicate Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectValidOnly()}
                    className="font-semibold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Select Valid Only
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="font-semibold text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <span className="ml-2 font-bold text-slate-700">({selectedCount} selected)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id={skipDuplicatesId}
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor={skipDuplicatesId} className="font-semibold text-slate-700 cursor-pointer">
                    Skip duplicates during import (Recommended)
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={filteredRows.length > 0 && filteredRows.every((r) => r.selected)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRows((prev) =>
                                prev.map((r) =>
                                  filteredRows.some((fr) => fr.rowNumber === r.rowNumber)
                                    ? { ...r, selected: checked }
                                    : r
                                )
                              );
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-2 w-12 text-center">Row</th>
                        <th className="py-2.5 px-2 w-24">Status</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Contact Name *</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Email</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Phone</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Company</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Validation & Duplicate Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !row.selected ? 'opacity-60 bg-slate-50/30' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => handleToggleRow(row.rowNumber)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                          </td>

                          <td className="py-2 px-2 text-center font-mono text-slate-400 text-[11px]">
                            {row.rowNumber}
                          </td>

                          <td className="py-2 px-2">
                            {row.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Valid
                              </span>
                            )}
                            {row.status === 'duplicate' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Duplicate
                              </span>
                            )}
                            {row.status === 'invalid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Invalid
                              </span>
                            )}
                          </td>

                          {/* Editable Name */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={row.data.name}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'name', e.target.value)}
                              placeholder="Name required"
                              className={`w-full px-2 py-1 text-xs rounded border outline-none font-medium ${
                                !row.data.name
                                  ? 'border-rose-300 bg-rose-50 focus:border-rose-500'
                                  : 'border-slate-200 bg-white focus:border-indigo-500'
                              }`}
                            />
                          </td>

                          {/* Editable Email */}
                          <td className="py-1.5 px-3">
                            <input
                              type="email"
                              value={row.data.email}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'email', e.target.value)}
                              placeholder="name@company.com"
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white focus:border-indigo-500 outline-none"
                            />
                          </td>

                          {/* Editable Phone */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={row.data.phone}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'phone', e.target.value)}
                              placeholder="Phone"
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white focus:border-indigo-500 outline-none"
                            />
                          </td>

                          {/* Editable Company */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={row.data.company}
                              onChange={(e) => handleUpdateRowData(row.rowNumber, 'company', e.target.value)}
                              placeholder="Company"
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white focus:border-indigo-500 outline-none"
                            />
                          </td>

                          {/* Validation notes & duplicate reasons */}
                          <td className="py-1.5 px-3 text-[11px]">
                            {row.errors.length > 0 && (
                              <p className="text-rose-600 font-semibold leading-tight">
                                ✗ {row.errors.join(', ')}
                              </p>
                            )}
                            {row.duplicateReasons.length > 0 && (
                              <p className="text-amber-700 font-medium leading-tight">
                                ⚠ {row.duplicateReasons.join(', ')}
                              </p>
                            )}
                            {row.warnings.length > 0 && row.errors.length === 0 && (
                              <p className="text-slate-500 text-[10.5px]">
                                ℹ {row.warnings.join(', ')}
                              </p>
                            )}
                            {row.status === 'valid' && row.warnings.length === 0 && (
                              <span className="text-emerald-600 font-medium">Ready to import</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ← Choose Different File
                </button>

                <button
                  type="button"
                  disabled={selectedCount === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 font-bold text-white text-xs sm:text-sm rounded-xl shadow-xs hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(90deg, #e12634 0%, #4a3cdb 50%, #169bf2 100%)',
                  }}
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span>Importing Leads...</span>
                    </>
                  ) : (
                    <>
                      <span>Import {selectedCount} Selected Leads</span>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUMMARY */}
          {/* ========================================================================= */}
          {step === 'summary' && importSummary && (
            <div className="max-w-xl mx-auto space-y-5 py-2">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Lead Import Completed</h3>
                <p className="text-xs text-slate-500">
                  Records have been committed to PostgreSQL with audit activity tracking
                </p>
              </div>

              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-slate-400 text-[11px] font-semibold block uppercase">Processed</span>
                  <span className="text-lg font-black text-slate-800">{importSummary.summary.totalProcessed}</span>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center">
                  <span className="text-emerald-700 text-[11px] font-semibold block uppercase">Imported</span>
                  <span className="text-lg font-black text-emerald-700">{importSummary.summary.importedCount}</span>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-center">
                  <span className="text-amber-700 text-[11px] font-semibold block uppercase">Duplicates Skipped</span>
                  <span className="text-lg font-black text-amber-700">{importSummary.summary.skippedCount}</span>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-center">
                  <span className="text-rose-700 text-[11px] font-semibold block uppercase">Failed</span>
                  <span className="text-lg font-black text-rose-700">{importSummary.summary.failedCount}</span>
                </div>
              </div>

              {/* Error report section if any failures occurred */}
              {importSummary.errors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-800">
                      {importSummary.errors.length} rows encountered issues:
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadErrorReport}
                      className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100/50 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Download Error CSV
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-rose-700 custom-scrollbar">
                    {importSummary.errors.slice(0, 5).map((e) => (
                      <p key={`${e.rowNumber}-${e.reason}`}>
                        Row {e.rowNumber} ({e.leadName}): {e.reason}
                      </p>
                    ))}
                    {importSummary.errors.length > 5 && (
                      <p className="font-semibold italic">...and {importSummary.errors.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Import Another File
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Done & View Leads Table
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
