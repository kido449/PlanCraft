import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

interface ClosingCtaBandProps {
  onOpenCreate: () => void;
}

export const ClosingCtaBand: React.FC<ClosingCtaBandProps> = ({
  onOpenCreate,
}) => {
  return (
    <section className="relative w-full bg-[#111111] text-[#EEEDEA] overflow-hidden py-24 sm:py-32 px-6 sm:px-10 lg:px-16 border-t border-[#262626]">
      {/* Background Terracotta Arch Silhouette & Scrim */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg
          viewBox="0 0 1600 600"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 200,600 L 200,200 C 200,100 350,20 800,20 C 1250,20 1400,100 1400,200 L 1400,600 Z"
            fill="#5A281A"
          />
          <path
            d="M 450,600 L 450,300 C 450,200 600,140 800,140 C 1000,140 1150,200 1150,300 L 1150,600 Z"
            fill="#803D27"
          />
        </svg>
      </div>
      <div className="absolute inset-0 footer-fade-scrim pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#DCD8D5] text-xs font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-[#E0A37E]" />
          <span>Bespoke Gathering Architecture</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-medium tracking-[-1.5px] text-[#EEEDEA] leading-[1.1] text-balance">
          Design your next <span className="accent-serif text-[#F2CBB2]">celebration</span> with mathematical certainty.
        </h2>

        <p className="text-sm sm:text-base text-[#DCD8D5] max-w-xl mx-auto font-normal leading-relaxed text-balance">
          No templates. No manual spreadsheets. Enter your guest count and hard budget to generate an interconnected plan in seconds.
        </p>

        {/* Action Button */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenCreate}
            className="h-[48px] px-7 rounded-full bg-[#E0A37E] hover:bg-[#F2CBB2] text-[#111111] font-semibold text-sm transition active:scale-95 flex items-center gap-2 shadow-lg shadow-[#E0A37E]/20"
          >
            <Plus className="w-4 h-4 text-[#111111]" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>
    </section>
  );
};
