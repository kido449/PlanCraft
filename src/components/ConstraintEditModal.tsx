import React, { useState } from 'react';
import { EventWithDetails } from '../types';
import { X, Sparkles, DollarSign, Users, ShieldCheck } from 'lucide-react';

interface ConstraintEditModalProps {
  event: EventWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSaveAndReplan: (newBudget: number, newGuestCount: number, reason: string) => Promise<void>;
  onSaveOnly: (newBudget: number, newGuestCount: number) => Promise<void>;
  isReplanning: boolean;
}

export const ConstraintEditModal: React.FC<ConstraintEditModalProps> = ({
  event,
  isOpen,
  onClose,
  onSaveAndReplan,
  onSaveOnly,
  isReplanning,
}) => {
  const [budget, setBudget] = useState<number>(event.total_budget);
  const [guestCount, setGuestCount] = useState<number>(event.guest_count);
  const [reason, setReason] = useState<string>('');

  if (!isOpen) return null;

  const budgetDelta = budget - event.total_budget;
  const guestDelta = guestCount - event.guest_count;
  const isBudgetChanged = budgetDelta !== 0;
  const isGuestsChanged = guestDelta !== 0;
  const hasChanges = isBudgetChanged || isGuestsChanged;

  const lockedBudgetItems = event.budget.filter(
    (b) => b.is_user_edited || b.status === 'paid' || b.actual_cost !== null
  );
  const lockedVendors = event.vendors.filter((v) => v.is_user_edited || v.status === 'booked');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="constraint-modal-title">
      <div className="bg-[#EEEDEA] text-[#111111] border border-[#14372D]/30 rounded-[16px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh] modal-viewport-container-90">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#14372D]/15 flex items-center justify-between bg-white/40">
          <div>
            <h2 id="constraint-modal-title" className="text-xl font-medium tracking-tight text-[#111111]">
              Edit Constraints & <span className="accent-serif">Rebalance</span>
            </h2>
            <p className="text-xs text-[#7A7571] mt-0.5">Constraint-aware replanning with locked item preservation</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close edit constraints dialog"
            className="p-1 rounded-full text-[#7A7571] hover:text-[#111111] hover:bg-black/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Budget Constraint */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-2">
              Total Hard Budget (USD)
            </label>
            <div className="relative rounded-[8px] border border-[#DCD8D5] bg-white focus-within:border-[#111111] overflow-hidden">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A7571]">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="500"
                step="500"
                value={budget}
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (hasChanges && !isReplanning) {
                      onSaveOnly(budget, guestCount);
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#111111] font-medium text-sm focus:outline-none tabular-nums"
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5 px-1">
              <span className="text-[#7A7571] tabular-nums">Previous: ${event.total_budget.toLocaleString()}</span>
              {isBudgetChanged && (
                <span className="font-semibold text-[#111111] tabular-nums">
                  {budgetDelta > 0
                    ? `+$${budgetDelta.toLocaleString()} (+${Math.round((budgetDelta / event.total_budget) * 100)}%)`
                    : `-$${Math.abs(budgetDelta).toLocaleString()} (${Math.round((budgetDelta / event.total_budget) * 100)}%)`}
                </span>
              )}
            </div>
          </div>

          {/* Guest Count Constraint */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-2">
              Guest Count (Headcount)
            </label>
            <div className="relative rounded-[8px] border border-[#DCD8D5] bg-white focus-within:border-[#111111] overflow-hidden">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A7571]">
                <Users className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(0, Number(e.target.value)))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (hasChanges && !isReplanning) {
                      onSaveOnly(budget, guestCount);
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#111111] font-medium text-sm focus:outline-none tabular-nums"
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5 px-1">
              <span className="text-[#7A7571] tabular-nums">Previous: {event.guest_count} attendees</span>
              {isGuestsChanged && (
                <span className="font-semibold text-[#111111] tabular-nums">
                  {guestDelta > 0 ? `+${guestDelta} guests` : `${guestDelta} guests`}
                </span>
              )}
            </div>
          </div>

          {/* Rationale Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-2">
              Context for AI Replan (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Secured family sponsor funding; upgrade catering and live band, but keep photographer."
              className="w-full px-3.5 py-2.5 rounded-[8px] border border-[#DCD8D5] bg-white text-[#111111] text-xs focus:outline-none focus:border-[#111111]"
            />
          </div>

          {/* Locked items notice */}
          {(lockedBudgetItems.length > 0 || lockedVendors.length > 0) && (
            <div className="p-4 rounded-[12px] bg-white/70 border border-[#14372D]/20 text-xs text-[#111111] space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-[#111111]">
                <ShieldCheck className="w-4 h-4 text-[#413936]" />
                <span>Protected User Edits:</span>
              </div>
              <p className="text-[#7A7571] leading-relaxed">
                Replanning will preserve {lockedBudgetItems.length} custom/paid budget lines and {lockedVendors.length} booked vendors. Only flexible line items will be mathematically redistributed.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#14372D]/15 bg-white/40 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-[#7A7571] hover:text-[#111111] rounded-full transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onSaveOnly(budget, guestCount)}
            disabled={!hasChanges || isReplanning}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-full bg-transparent hover:bg-black/5 text-[#111111] border border-[#DCD8D5] transition disabled:opacity-40"
          >
            Save Constraints Only
          </button>

          <button
            type="button"
            onClick={() => onSaveAndReplan(budget, guestCount, reason)}
            disabled={isReplanning}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-medium rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:outline-none"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isReplanning ? 'animate-spin' : ''}`} />
            <span>{isReplanning ? 'Replanning with AI Engine...' : '⚡ Replan Live with AI'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
