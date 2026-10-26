import React, { useState } from 'react';
import { EventWithDetails } from '../types';
import { X, Download, FileSpreadsheet, FileText, Printer, Check, Copy } from 'lucide-react';

interface ExportModalProps {
  event: EventWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ event, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const totalAllocated = event.budget.reduce((s, b) => s + (b.estimated_cost || 0), 0);
  const totalActual = event.budget.reduce((s, b) => s + (b.actual_cost || 0), 0);

  // Generate CSV data for Budget
  const handleDownloadBudgetCSV = () => {
    const headers = ['Category', 'Estimated Cost (USD)', 'Actual Cost (USD)', 'Variance (USD)', 'Status', 'Notes'];
    const rows = event.budget.map((b) => {
      const variance = b.actual_cost !== null ? b.estimated_cost - b.actual_cost : 0;
      return [
        `"${b.category.replace(/"/g, '""')}"`,
        b.estimated_cost,
        b.actual_cost !== null ? b.actual_cost : '',
        variance,
        b.status,
        `"${(b.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_budget.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Run-of-Show Timeline text
  const handleDownloadTimelineText = () => {
    let content = `# RUN-OF-SHOW & TIMELINE: ${event.name.toUpperCase()}\n`;
    content += `Date: ${event.date} | Location: ${event.location} | Headcount: ${event.guest_count} Guests\n`;
    content += `Total Budget: $${event.total_budget.toLocaleString()} USD | Vibe: "${event.vibe}"\n`;
    content += `--------------------------------------------------------\n\n`;

    content += `## MILESTONE SCHEDULE\n`;
    event.timeline.forEach((t, i) => {
      content += `${i + 1}. [${t.due_date}] ${t.title.toUpperCase()} (${t.category})\n`;
      content += `   Status: ${t.status.toUpperCase()} | Notes: ${t.notes || 'None'}\n\n`;
    });

    content += `\n## VENDOR DIRECTORY & CONTACTS\n`;
    event.vendors.forEach((v, i) => {
      content += `${i + 1}. ${v.name} (${v.category}) - Est: $${v.estimated_cost.toLocaleString()}\n`;
      content += `   Contact: ${v.contact || 'Pending'} | Status: ${v.status.toUpperCase()}\n`;
      content += `   Scope: ${v.notes || 'None'}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_timeline.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateFullBriefText = () => {
    let brief = `PLANCRAFT AI EXECUTIVE EVENT DOSSIER\n`;
    brief += `=====================================\n`;
    brief += `Event: ${event.name}\n`;
    brief += `Format: ${event.type.toUpperCase()} | Date: ${event.date}\n`;
    brief += `Location: ${event.location} | Headcount: ${event.guest_count} Attendees\n`;
    brief += `Hard Budget Ceiling: $${event.total_budget.toLocaleString()} USD\n`;
    brief += `Total Allocated (Est): $${totalAllocated.toLocaleString()} USD\n`;
    brief += `Actual Committed: $${totalActual.toLocaleString()} USD\n`;
    brief += `Stylistic Vibe: "${event.vibe}"\n\n`;

    brief += `BUDGET ALLOCATIONS (${event.budget.length} Line Items):\n`;
    event.budget.forEach((b) => {
      brief += `- ${b.category}: $${b.estimated_cost.toLocaleString()} (Actual: ${b.actual_cost !== null ? `$${b.actual_cost.toLocaleString()}` : 'Pending'}, Status: ${b.status}) - ${b.notes}\n`;
    });

    brief += `\nVENDOR TEAM (${event.vendors.length} Partners):\n`;
    event.vendors.forEach((v) => {
      brief += `- [${v.status.toUpperCase()}] ${v.name} (${v.category}) - $${v.estimated_cost.toLocaleString()} | Contact: ${v.contact || 'N/A'}\n`;
    });

    brief += `\nMILESTONE TIMELINE (${event.timeline.length} Milestones):\n`;
    event.timeline.forEach((t) => {
      brief += `- [${t.due_date}] ${t.title} (${t.status}) - ${t.notes}\n`;
    });

    return brief;
  };

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(generateFullBriefText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm print:p-0 print:bg-white" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
      <div className="bg-[#EEEDEA] text-[#111111] border border-[#14372D]/30 rounded-[16px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh] modal-viewport-container-90 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#14372D]/15 flex items-center justify-between bg-white/40 print:hidden">
          <div>
            <h2 id="export-modal-title" className="text-xl font-medium tracking-tight text-[#111111]">
              Export Event <span className="accent-serif">Dossier</span>
            </h2>
            <p className="text-xs text-[#7A7571] mt-0.5">Download spreadsheets, day-of timeline, or print executive brief</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export dossier dialog"
            className="p-1 rounded-full text-[#7A7571] hover:text-[#111111] hover:bg-black/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tiles */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            {/* Download Budget CSV */}
            <button
              onClick={handleDownloadBudgetCSV}
              className="p-4 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] text-left transition group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-[#111111] text-[#EEEDEA] flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-4 h-4 text-[#E0A37E]" />
              </div>
              <span className="font-medium text-sm text-[#111111] block">Budget Spreadsheet</span>
              <span className="text-[11px] text-[#7A7571] mt-1 block">Download .CSV with line costs, status, and variance.</span>
            </button>

            {/* Download Timeline TXT */}
            <button
              onClick={handleDownloadTimelineText}
              className="p-4 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] text-left transition group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-[#111111] text-[#EEEDEA] flex items-center justify-center mb-3">
                <FileText className="w-4 h-4 text-[#E0A37E]" />
              </div>
              <span className="font-medium text-sm text-[#111111] block">Run-of-Show Timeline</span>
              <span className="text-[11px] text-[#7A7571] mt-1 block">Export formatted schedule & vendor directory for coordinator.</span>
            </button>

            {/* Print / Copy Brief */}
            <button
              onClick={handleCopyBrief}
              className="p-4 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] text-left transition group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-[#111111] text-[#EEEDEA] flex items-center justify-center mb-3">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#E0A37E]" />}
              </div>
              <span className="font-medium text-sm text-[#111111] block">{copied ? 'Copied to Clipboard' : 'Copy Full Brief'}</span>
              <span className="text-[11px] text-[#7A7571] mt-1 block">Copy formatted executive briefing to clipboard.</span>
            </button>
          </div>

          {/* Dossier Preview */}
          <div className="border border-[#14372D]/20 rounded-[12px] p-5 bg-white/70 space-y-4">
            <div className="flex items-center justify-between border-b border-[#14372D]/10 pb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                Executive Briefing Preview: {event.name}
              </span>
              <button
                onClick={handlePrint}
                className="print:hidden text-xs text-[#7A7571] hover:text-[#111111] flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dossier</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[#7A7571] block">Hard Budget:</span>
                <span className="font-medium text-[#111111] tabular-nums">${event.total_budget.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#7A7571] block">Estimated:</span>
                <span className="font-medium text-[#111111] tabular-nums">${totalAllocated.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#7A7571] block">Date:</span>
                <span className="font-medium text-[#111111]">{event.date}</span>
              </div>
              <div>
                <span className="text-[#7A7571] block">Headcount:</span>
                <span className="font-medium text-[#111111] tabular-nums">{event.guest_count} Guests</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-[#7A7571]">
              <span className="font-medium text-[#111111] block mb-1">Key Production Stats:</span>
              <p>
                {event.budget.length} budget line items · {event.timeline.length} milestone deadlines · {event.vendors.length} curated vendor partners.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#14372D]/15 bg-white/40 flex items-center justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
