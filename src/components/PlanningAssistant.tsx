import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Plus,
  Check,
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign,
  Calendar,
  Store,
  Wine,
  CloudRain,
  ShieldAlert,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { EventWithDetails, AssistantMessage, AssistantAction } from '../types';
import { askAssistant } from '../api';

interface PlanningAssistantProps {
  event: EventWithDetails;
  onRefreshEvent: () => Promise<void>;
  onApplyAction: (action: AssistantAction) => Promise<void>;
  onOpenReplan?: () => void;
}

const QUICK_PROMPTS = [
  {
    icon: <DollarSign className="w-3.5 h-3.5 text-[#E0A37E]" />,
    label: 'Trim 10% from catering & venue',
    prompt: 'Analyze our current catering and venue allocations. Where can we safely trim 10% without harming the guest experience or vibe?',
  },
  {
    icon: <CloudRain className="w-3.5 h-3.5 text-[#E0A37E]" />,
    label: 'Generate rain contingency plan',
    prompt: 'Generate an emergency rain and cold-weather contingency plan for our outdoor location and timeline, including recommended rental costs.',
  },
  {
    icon: <Calendar className="w-3.5 h-3.5 text-[#E0A37E]" />,
    label: 'Optimize golden hour photo timeline',
    prompt: 'Optimize our wedding day timeline for sunset/golden hour photography. Provide exact time slots and milestones.',
  },
  {
    icon: <Wine className="w-3.5 h-3.5 text-[#E0A37E]" />,
    label: 'Curate wine & cocktail pairing menu',
    prompt: 'Suggest a bespoke seasonal wine and craft cocktail pairing menu for 120 guests matching our rustic elegance aesthetic within our beverage budget.',
  },
  {
    icon: <ShieldAlert className="w-3.5 h-3.5 text-[#E0A37E]" />,
    label: 'Audit budget risks & hidden fees',
    prompt: 'What are the top 5 commonly overlooked hidden fees (service charges, gratuity, permits, power generators) for this type of event?',
  },
  {
    icon: <FileText className="w-3.5 h-3.5 text-[#E0A37E]" />,
    label: 'Draft venue negotiation email',
    prompt: 'Draft a polite, high-leverage negotiation email to the venue requesting complimentary setup hours or waived corkage fees.',
  },
];

export const PlanningAssistant: React.FC<PlanningAssistantProps> = React.memo(({
  event,
  onRefreshEvent,
  onApplyAction,
  onOpenReplan,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize welcoming message on event load or change
  useEffect(() => {
    const totalAllocated = event.budget.reduce((sum, b) => sum + (b.estimated_cost || 0), 0);
    const buffer = event.total_budget - totalAllocated;

    const initialGreeting: AssistantMessage = {
      id: 'greeting-msg',
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: `Welcome to your **GenAI Planning Assistant** for **"${event.name}"**.

I am continuously synchronizing your event constraints:
- **Headcount:** ${event.guest_count} guests in ${event.location}
- **Budget Allocation:** $${totalAllocated.toLocaleString()} of $${event.total_budget.toLocaleString()} (${buffer >= 0 ? `$${buffer.toLocaleString()} remaining contingency cushion` : `⚠️ Over budget by $${Math.abs(buffer).toLocaleString()}`})
- **Active Milestones:** ${event.timeline.length} scheduled tasks
- **Vendor Partners:** ${event.vendors.length} curated partners

How would you like to refine your plan? You can ask me to reallocate funds, stress-test your timeline, suggest unique culinary experiences, or draft vendor contracts.`,
      suggested_actions: [
        {
          id: 'action-init-buffer',
          type: 'add_timeline_task',
          label: 'Add 60-Day Vendor Checkpoint',
          description: 'Establish vendor coordination & deposit review date.',
          data: {
            title: '60-Day Complete Vendor Checkpoint',
            category: 'Vendor Logistics',
            due_date: event.date,
            notes: 'Confirm arrival logistics, power requirements, and dietary headcounts.',
          },
        },
      ],
    };

    setMessages([initialGreeting]);
  }, [event.id]);

  // Scroll to bottom of chat container only (never triggers page window scrolling)
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askAssistant(event.id, textToSend, history);

      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: res.suggested_actions?.map((act, idx) => ({
          ...act,
          id: `act-${Date.now()}-${idx}`,
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: AssistantMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I ran into a temporary issue connecting to the AI: ${err.message || 'Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAction = async (action: AssistantAction) => {
    if (!action.id || appliedActions[action.id]) return;
    const scrollYBefore = window.scrollY;
    setApplyingId(action.id);
    try {
      await onApplyAction(action);
      setAppliedActions((prev) => ({ ...prev, [action.id!]: true }));
    } catch (err) {
      console.error('Failed to apply assistant action:', err);
    } finally {
      setApplyingId(null);
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollYBefore, behavior: 'instant' });
      });
    }
  };

  return (
    <section className="bg-white rounded-[20px] border border-[#14372D]/20 shadow-md overflow-hidden flex flex-col min-h-[680px]">
      {/* 1. Luxury Editorial Header */}
      <div className="bg-[#111111] text-[#EEEDEA] px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E0A37E] to-[#413936] flex items-center justify-center text-black shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium tracking-tight text-white">
                GenAI <span className="accent-serif text-[#F2CBB2]">Planning</span> Assistant
              </h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#E0A37E]/20 text-[#E0A37E] border border-[#E0A37E]/30">
                Groq AI Engine
              </span>
            </div>
            <p className="text-xs text-[#DCD8D5]/70 mt-0.5">
              Live context-aware conversational producer for <span className="text-white font-medium">{event.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReplan && (
            <button
              onClick={onOpenReplan}
              className="text-xs px-3.5 py-1.5 rounded-full border border-white/20 text-[#DCD8D5] hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-[#E0A37E]" />
              <span>Modify Constraints</span>
            </button>
          )}

          <button
            onClick={() => {
              setMessages([]);
              onRefreshEvent();
            }}
            title="Reset conversation"
            className="p-1.5 rounded-full text-[#DCD8D5]/60 hover:text-white hover:bg-white/10 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Quick-Prompt Inspiration Chips */}
      <div className="bg-[#FAF9F7] border-b border-[#14372D]/10 px-6 py-3 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[11px] font-medium text-[#7A7571] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-[#E0A37E]" /> Quick Prompts:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white border border-[#14372D]/15 text-[#111111] hover:border-[#111111] hover:bg-black/5 transition whitespace-nowrap shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {qp.icon}
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Messages Stream */}
      <div
        ref={chatScrollContainerRef}
        className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[520px] bg-[#EEEDEA]/30"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-sm ${
                  isUser
                    ? 'bg-[#111111] text-[#EEEDEA]'
                    : 'bg-[#413936] text-[#F2CBB2] border border-[#E0A37E]/30'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#F2CBB2]" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-[18px] p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#111111] text-[#EEEDEA] rounded-tr-none'
                    : 'bg-white border border-[#14372D]/15 text-[#111111] shadow-sm rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.content.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className="text-balance leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Suggested Action Cards inside Assistant Response */}
                {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#14372D]/10 space-y-2">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A7571] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#E0A37E]" /> Actionable Recommendations:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.suggested_actions.map((act) => {
                        const isApplied = act.id ? appliedActions[act.id] : false;
                        const isThisApplying = act.id === applyingId;

                        return (
                          <div
                            key={act.id || act.label}
                            className="p-2.5 rounded-[12px] bg-[#FAF9F7] border border-[#14372D]/15 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[#111111] flex items-center gap-1.5 truncate">
                                {act.type === 'add_budget_item' && <DollarSign className="w-3.5 h-3.5 text-[#E0A37E] shrink-0" />}
                                {act.type === 'add_timeline_task' && <Calendar className="w-3.5 h-3.5 text-[#E0A37E] shrink-0" />}
                                {act.type === 'add_vendor' && <Store className="w-3.5 h-3.5 text-[#E0A37E] shrink-0" />}
                                <span>{act.label}</span>
                              </div>
                              <p className="text-[11px] text-[#7A7571] truncate mt-0.5">{act.description}</p>
                            </div>

                            <button
                              onClick={() => handleApplyAction(act)}
                              disabled={isApplied || isThisApplying}
                              className={`px-3 py-1.5 rounded-full font-medium text-xs transition flex items-center gap-1 shrink-0 ${
                                isApplied
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] active:scale-95 cursor-pointer'
                              }`}
                            >
                              {isApplied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Applied</span>
                                </>
                              ) : isThisApplying ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Applying...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5 text-[#E0A37E]" />
                                  <span>Apply to Plan</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 font-mono ${
                    isUser ? 'text-[#DCD8D5]/60 text-right' : 'text-[#7A7571]'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#413936] text-[#F2CBB2] flex items-center justify-center text-xs border border-[#E0A37E]/30 animate-pulse">
              <Bot className="w-4 h-4 text-[#F2CBB2]" />
            </div>
            <div className="p-3.5 rounded-[18px] rounded-tl-none bg-white border border-[#14372D]/15 shadow-sm text-xs flex items-center gap-2 text-[#7A7571]">
              <div className="w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing event constraints with Groq GenAI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Input Command Bar */}
      <div className="p-4 bg-white border-t border-[#14372D]/15">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask your AI Assistant (e.g. "Add $2,000 for lighting and adjust catering", "What rain contingencies do we need?")`}
            readOnly={isLoading}
            className={`w-full pl-4 pr-24 py-3 bg-[#EEEDEA]/40 hover:bg-[#EEEDEA]/60 focus:bg-white text-xs sm:text-sm text-[#111111] rounded-full border border-[#14372D]/20 focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all ${
              isLoading ? 'opacity-70 cursor-wait' : ''
            }`}
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 px-4 py-2 rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Ask AI</span>
            <Send className="w-3 h-3 text-[#E0A37E]" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 px-2 text-[10px] text-[#7A7571]">
          <span>Tip: Ask for specific budget cuts, run-of-show suggestions, or vendor inquiry drafts.</span>
          <span className="font-mono">Press Enter to send</span>
        </div>
      </div>
    </section>
  );
});
