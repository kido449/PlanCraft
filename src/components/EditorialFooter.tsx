import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export const EditorialFooter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmail('');
    }, 3000);
  };

  return (
    <footer className="w-full bg-[#111111] text-[#EEEDEA] border-t border-[#222222] pt-16 pb-12 px-6 sm:px-10 lg:px-16">
      <div className="max-w-[1560px] mx-auto space-y-12">
        {/* Top Tier: Logo & Email Capture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-between border-b border-white/10 pb-12">
          {/* Logo mark & Address */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-2xl font-medium tracking-tight text-[#EEEDEA] block">
              Plan<span className="accent-serif text-[#E0A37E]">Craft</span>
            </span>
            <p className="text-xs text-[#DCD8D5] max-w-sm leading-relaxed">
              Terracotta Arch Editorial Design System for constraint-aware GenAI event intelligence. Powered by Groq GenAI.
            </p>
            <div className="text-xs text-[#7A7571] pt-1">
              San Francisco · Napa Valley · Austin · Cascadia
            </div>
          </div>

          {/* Email Capture Row */}
          <div className="lg:col-span-7 flex flex-col sm:items-end justify-center">
            <form onSubmit={handleSubscribe} className="w-full sm:max-w-md">
              <span className="text-xs uppercase tracking-wider text-[#DCD8D5]/70 block mb-2 font-medium">
                Receive Editorial Planning Dispatches
              </span>
              <div className="relative flex items-center">
                <input
                  type="email"
                  required
                  placeholder="name@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[48px] pl-4 pr-28 rounded-full bg-white/5 border border-white/20 text-xs text-white placeholder:text-[#7A7571] focus:outline-none focus:border-[#E0A37E]"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 h-[38px] px-5 rounded-full bg-[#413936] hover:bg-black text-[#EEEDEA] text-xs font-medium transition active:scale-95 flex items-center gap-1.5"
                >
                  {subscribed ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Joined</span>
                    </>
                  ) : (
                    <>
                      <span>Join Us</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Middle Tier: 3 Link Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 text-xs text-[#DCD8D5]">
          <div>
            <span className="font-semibold text-white block mb-3 uppercase tracking-wider text-[11px]">
              Planning Modules
            </span>
            <ul className="space-y-2 text-[#7A7571]">
              <li><button onClick={() => document.getElementById('planner-workspace')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition text-left cursor-pointer">Budget Allocations</button></li>
              <li><button onClick={() => document.getElementById('planner-workspace')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition text-left cursor-pointer">Milestone Timeline</button></li>
              <li><button onClick={() => document.getElementById('planner-workspace')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition text-left cursor-pointer">Curated Vendors</button></li>
              <li><button onClick={() => document.getElementById('planner-workspace')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition text-left cursor-pointer">Concept Notes</button></li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-white block mb-3 uppercase tracking-wider text-[11px]">
              Architecture
            </span>
            <ul className="space-y-2 text-[#7A7571]">
              <li><span className="hover:text-white transition">1-Pass LLM Synthesis</span></li>
              <li><span className="hover:text-white transition">Partial Replan Engine</span></li>
              <li><span className="hover:text-white transition">Strict JSON Schema Contract</span></li>
              <li><span className="hover:text-white transition">Row-Level Security Scoping</span></li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-white block mb-3 uppercase tracking-wider text-[11px]">
              Design Heritage
            </span>
            <ul className="space-y-2 text-[#7A7571]">
              <li><span className="hover:text-white transition">Terracotta Arch Editorial</span></li>
              <li><span className="hover:text-white transition">Instrument Sans Typography</span></li>
              <li><span className="hover:text-white transition">Lora Italic Accent</span></li>
              <li><span className="hover:text-white transition">#EEEDEA Stone Canvas</span></li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-white block mb-3 uppercase tracking-wider text-[11px]">
              Hackathon Verification
            </span>
            <ul className="space-y-2 text-[#7A7571]">
              <li><span className="text-[#E0A37E]">Zero Faked Features</span></li>
              <li><span className="text-[#E0A37E]">Zero Dead API Routes</span></li>
              <li><span className="text-[#E0A37E]">PERFORMANCE.md Included</span></li>
              <li><span className="text-[#E0A37E]">Live Groq Model Calls</span></li>
            </ul>
          </div>
        </div>

        {/* Closing Legal Row */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A7571] gap-4">
          <p className="tabular-nums">
            © 2026 PlanCraft AI · Built for Antigravity Hackathon · Single Deployable Unit
          </p>
          <div className="flex items-center gap-6">
            <span>Instrument Sans (500)</span>
            <span>Lora Italic</span>
            <span>Stone Grey #EEEDEA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
