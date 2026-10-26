import React from 'react';
import { EventWithDetails } from '../types';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';

interface EventOverviewBannerProps {
  event: EventWithDetails;
  onOpenEditConstraints: () => void;
  onRegenerate: () => void;
  onOpenExport: () => void;
  onOpenAssistant?: () => void;
  onOpenPromptInspector?: () => void;
  isGenerating: boolean;
  replanRationale?: string | null;
  onDismissRationale?: () => void;
}

export const EventOverviewBanner: React.FC<EventOverviewBannerProps> = ({
  event,
  onOpenEditConstraints,
  onRegenerate,
  onOpenExport,
  onOpenAssistant,
  onOpenPromptInspector,
  isGenerating,
  replanRationale,
  onDismissRationale,
}) => {
  const totalAllocated = event.budget.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  const totalSpent = event.budget.reduce((sum, item) => sum + (item.actual_cost || 0), 0);
  const budgetUtilization = event.total_budget > 0 ? (totalAllocated / event.total_budget) * 100 : 0;
  const costPerGuest = event.guest_count > 0 ? Math.round(event.total_budget / event.guest_count) : 0;

  const targetDate = new Date(event.date);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isOverBudget = totalAllocated > event.total_budget * 1.05;

  return (
    <section className="bg-[#111111] text-[#EEEDEA] rounded-[16px] p-8 sm:p-10 border border-[#262626] transition-all">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        {/* Left column: Event Headline & Metadata */}
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            {/* Eyebrow chip */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium tracking-wide text-[#EEEDEA] border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E0A37E]" />
              <span className="capitalize">{event.type} Architecture</span>
            </span>

            <span className="text-xs text-[#DCD8D5] font-medium tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#E0A37E]" />
              <span>{diffDays > 0 ? `${diffDays} days away` : diffDays === 0 ? 'Today' : 'Completed'}</span>
            </span>

            {event.vibe && (
              <span className="text-xs text-[#DCD8D5]/80 font-normal border-l border-white/20 pl-3 italic">
                "{event.vibe}"
              </span>
            )}
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-1.5px] text-[#EEEDEA] leading-[1.15] text-balance">
            {event.name}
          </h2>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[#DCD8D5] font-medium pt-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E0A37E]" />
              <span>
                {new Date(event.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E0A37E]" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E0A37E]" />
              <span className="tabular-nums">{event.guest_count} Attendees</span>
            </div>
          </div>
        </div>

        {/* Right column: Action Pair */}
        <div className="flex flex-wrap items-center gap-3 lg:self-start">
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              className="h-[43px] px-5 rounded-full bg-[#E0A37E] hover:bg-[#F2CBB2] text-black font-semibold text-sm transition active:scale-95 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black animate-pulse" />
              <span>AI Assistant</span>
            </button>
          )}

          <button
            onClick={onOpenExport}
            className="h-[43px] px-4 rounded-full bg-white/10 hover:bg-white/15 text-[#EEEDEA] border border-white/20 text-sm font-medium transition active:scale-95 flex items-center gap-2 cursor-pointer"
            title="Download CSV, Run-of-Show or Print"
          >
            <Download className="w-4 h-4 text-[#E0A37E]" />
            <span>Export Dossier</span>
          </button>

          {onOpenPromptInspector && (
            <button
              onClick={onOpenPromptInspector}
              className="h-[43px] px-4 rounded-full bg-white/10 hover:bg-white/15 text-[#EEEDEA] border border-white/20 text-sm font-medium transition active:scale-95 flex items-center gap-2 cursor-pointer"
              title="Inspect Live AI Prompt Synthesized for this Event"
            >
              <Sparkles className="w-4 h-4 text-[#E0A37E]" />
              <span>Inspect Prompt</span>
            </button>
          )}

          <button
            onClick={onOpenEditConstraints}
            className="h-[43px] px-5 rounded-full bg-white/10 hover:bg-white/15 text-[#EEEDEA] border border-white/20 text-sm font-medium transition active:scale-95 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#E0A37E]" />
            <span>Edit Constraints</span>
          </button>

          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="h-[43px] px-5 rounded-[16px] bg-[#413936] hover:bg-black text-[#EEEDEA] border border-[#594E4A] text-sm font-medium transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 text-[#E0A37E] ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : event.budget.length === 0 ? 'Synthesize Plan' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards inside Dark Panel */}
      <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#DCD8D5]/70 block font-medium">
            Total Hard Budget
          </span>
          <div className="text-2xl sm:text-3xl font-medium tracking-tight text-[#EEEDEA] mt-1 tabular-nums">
            ${event.total_budget.toLocaleString()}
          </div>
          <span className="text-xs text-[#DCD8D5]/60 mt-0.5 block tabular-nums">
            ${costPerGuest} / attendee benchmark
          </span>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-[#DCD8D5]/70 block font-medium">
            Allocated Estimate
          </span>
          <div className="text-2xl sm:text-3xl font-medium tracking-tight text-[#E0A37E] mt-1 tabular-nums">
            ${totalAllocated.toLocaleString()}
          </div>
          <span className="text-xs text-[#DCD8D5]/60 mt-0.5 block">
            {event.budget.length} categorized allocations
          </span>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-[#DCD8D5]/70 block font-medium">
            Actual Committed
          </span>
          <div className="text-2xl sm:text-3xl font-medium tracking-tight text-[#EEEDEA] mt-1 tabular-nums">
            ${totalSpent.toLocaleString()}
          </div>
          <span className="text-xs text-[#DCD8D5]/60 mt-0.5 block">
            {event.budget.filter((b) => b.status === 'paid').length} lines locked/paid
          </span>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-[#DCD8D5]/70 block font-medium">
            Milestones & Vendors
          </span>
          <div className="text-2xl sm:text-3xl font-medium tracking-tight text-[#EEEDEA] mt-1 tabular-nums">
            {event.timeline.filter((t) => t.status === 'completed').length}/{event.timeline.length}
          </div>
          <span className="text-xs text-[#DCD8D5]/60 mt-0.5 block">
            {event.vendors.filter((v) => v.status === 'booked').length} booked vendors
          </span>
        </div>
      </div>

      {/* Integrated Constraint-Aware Replan Rationale Callout */}
      {replanRationale && (
        <div className="mt-6 p-4 rounded-xl bg-white/10 border border-[#E0A37E]/30 text-xs shadow-inner flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#E0A37E] text-black flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-white block text-xs">
              Live Constraint-Aware Replanning Rationale:
            </span>
            <p className="text-[#DCD8D5] mt-1 leading-relaxed text-xs">{replanRationale}</p>
          </div>
          {onDismissRationale && (
            <button
              onClick={onDismissRationale}
              className="text-[#DCD8D5]/70 hover:text-white p-1"
              title="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Slim hairline progress bar */}
      <div className="mt-6 pt-2">
        <div className="flex items-center justify-between text-xs text-[#DCD8D5] mb-2 font-medium">
          <span>Budget Allocation Math</span>
          <span className={isOverBudget ? 'text-rose-300 font-semibold' : 'text-[#DCD8D5]'}>
            {Math.round(budgetUtilization)}% of ${event.total_budget.toLocaleString()} allocated
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isOverBudget ? 'bg-rose-400' : 'bg-[#E0A37E]'
            }`}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
};
