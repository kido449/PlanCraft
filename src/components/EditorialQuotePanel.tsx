import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface EditorialQuotePanelProps {
  onOpenReplan: () => void;
}

export const EditorialQuotePanel: React.FC<EditorialQuotePanelProps> = ({
  onOpenReplan,
}) => {
  return (
    <section className="w-full bg-[#111111] text-[#EEEDEA] py-16 sm:py-24 px-6 sm:px-10 lg:px-16 my-8">
      <div className="max-w-[1560px] mx-auto">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#DCD8D5]/70 mb-6 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#E0A37E]" />
          <span>The Constraint Constitution</span>
        </div>

        {/* 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-baseline">
          {/* Left: Large Quote */}
          <div className="lg:col-span-8">
            <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-[-1.5px] leading-[1.2] text-[#EEEDEA] text-balance">
              "Event planning is not an assortment of disconnected templates. When guest count or capital fluctuates, every vendor tier and milestone must <span className="accent-serif text-[#F2CBB2]">harmonize</span> mathematically in a single inference pass."
            </blockquote>
          </div>

          {/* Right: Caption & CTA */}
          <div className="lg:col-span-4 space-y-5 lg:pl-6 lg:border-l border-white/10">
            <p className="text-sm text-[#DCD8D5] font-normal leading-relaxed">
              PlanCraft’s differentiator is mutual consistency and constraint-aware regeneration on edit. No faked static lookup tables, zero hallucinated templates.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenReplan}
                className="h-[43px] px-5 rounded-full bg-[#413936] hover:bg-white/20 text-[#EEEDEA] text-xs font-medium transition active:scale-95 flex items-center gap-2"
              >
                <span>Test Live Replan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
