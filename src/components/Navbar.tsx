import React from 'react';
import { EventRecord, PlannerTab } from '../types';
import {
  Sparkles,
  ShieldCheck,
  Plus,
  Download,
  Bot,
} from 'lucide-react';

interface NavbarProps {
  events: EventRecord[];
  activeEvent: EventRecord | null;
  onSelectEvent: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenExportModal: () => void;
  onOpenPromptInspector?: () => void;
  currentUserId: string;
  onChangeUser: (newId: string) => void;
  activeTab: PlannerTab;
  onTabChange: (tab: PlannerTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  onOpenCreateModal,
  onOpenExportModal,
  onOpenPromptInspector,
  currentUserId,
  onChangeUser,
  activeTab,
  onTabChange,
}) => {
  const isCommunity = activeEvent?.type === 'community';

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#111111]/70 backdrop-blur-[16px] border-b border-[#EEEDEA]/10 transition-colors duration-200">
      <div className="max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between gap-6">
        {/* Left: Brand mark */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className="flex items-center gap-2 group bg-transparent border-0 p-0 text-left cursor-pointer"
          >
            <span className="text-xl font-medium tracking-[-1px] text-[#EEEDEA]">
              Plan<span className="accent-serif text-[#E0A37E]">Craft</span>
            </span>
            <span className="text-[10px] font-medium tracking-wider uppercase text-[#DCD8D5]/60 px-2 py-0.5 rounded-full border border-[#DCD8D5]/20 hidden sm:inline">
              GenAI Editorial OS
            </span>
          </button>

        {/* Center-Left: Text Links with clean hover */}
        <nav className="flex items-center gap-2 sm:gap-4 md:gap-5 text-xs sm:text-sm font-medium text-[#DCD8D5] overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => onTabChange('assistant')}
            className={`transition-all duration-150 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-[#E0A37E] text-black font-semibold shadow-md'
                : 'text-[#F2CBB2] hover:text-white bg-white/10 hover:bg-white/15'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={() => onTabChange('all')}
            className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
              activeTab === 'all' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('budget')}
            className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
              activeTab === 'budget' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
            }`}
          >
            Budget Breakdown
          </button>
          <button
            onClick={() => onTabChange('timeline')}
            className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
              activeTab === 'timeline' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
            }`}
          >
            Milestone Timeline
          </button>
          {isCommunity ? (
            <button
              onClick={() => onTabChange('civic')}
              className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
                activeTab === 'civic' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
              }`}
            >
              Civic Logistics
            </button>
          ) : (
            <button
              onClick={() => onTabChange('vendors')}
              className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
                activeTab === 'vendors' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
              }`}
            >
              Vendors
            </button>
          )}
          <button
            onClick={() => onTabChange('guests')}
            className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
              activeTab === 'guests' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
            }`}
          >
            Guests
          </button>
          <button
            onClick={() => onTabChange('ideas')}
            className={`transition-colors duration-100 hover:text-white shrink-0 cursor-pointer px-2 py-1 ${
              activeTab === 'ideas' ? 'text-white border-b-2 border-[#E0A37E] font-semibold' : 'text-[#DCD8D5]/80'
            }`}
          >
            Concepts
          </button>
        </nav>


        {/* Right: Event Switcher + Inspector + Brown CTA Pill */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Event Selector (Ghost Nav Style) */}
          <div className="relative hidden sm:block">
            <select
              aria-label="Active Event"
              value={activeEvent?.id || ''}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="h-[37px] px-3 bg-white/5 hover:bg-white/10 text-[#EEEDEA] text-xs font-medium rounded-full border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#E0A37E] cursor-pointer max-w-[180px] lg:max-w-[220px] truncate transition-colors"
            >
              {events.length === 0 ? (
                <option value="" className="bg-[#111111] text-white">No events</option>
              ) : (
                events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#111111] text-white">
                    {e.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* AI Prompt Inspector Ghost Button */}
          {onOpenPromptInspector && (
            <button
              onClick={onOpenPromptInspector}
              className="h-[37px] px-3 bg-white/5 hover:bg-white/10 text-[#EAEEED] text-xs font-medium rounded-full border border-white/15 transition-colors flex items-center gap-1.5"
              title="Inspect Live AI Prompt Synthesized for this Event"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E0A37E]" />
              <span className="hidden md:inline">Inspect Prompt</span>
            </button>
          )}

          {/* Export Dossier Ghost Button */}
          <button
            onClick={onOpenExportModal}
            className="h-[37px] px-3.5 bg-transparent hover:bg-white/10 text-[#EAEEED] text-xs font-medium rounded-full border border-white/15 transition-colors flex items-center gap-1.5"
            title="Export Budget CSV, Timeline Itinerary, or Printable Brief"
          >
            <Download className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span className="hidden sm:inline">Export Dossier</span>
          </button>

          {/* RLS User Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 h-[37px] px-3 bg-white/5 text-[#DCD8D5] text-xs font-medium rounded-full border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <select
              aria-label="User row-level security identity"
              value={currentUserId}
              onChange={(e) => onChangeUser(e.target.value)}
              className="bg-transparent text-[#EEEDEA] text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="default-user-101" className="bg-[#111111] text-white">Host (101)</option>
              <option value="test-planner-202" className="bg-[#111111] text-white">Planner (202)</option>
            </select>
          </div>

          {/* Spec CTA: button-nav-cta -> #413936 fill, text #EEEDEA, radius 1600px, height 48px, padding 14px 20px, hover -> #111111 */}
          <button
            onClick={onOpenCreateModal}
            className="h-[48px] px-5 bg-[#413936] hover:bg-[#111111] text-[#EEEDEA] font-medium text-sm rounded-[1600px] border border-[#524945] hover:border-[#EEEDEA]/30 transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#EEEDEA]" />
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>
      </div>
    </header>
  );
};
