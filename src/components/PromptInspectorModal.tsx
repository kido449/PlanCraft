import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Terminal, Sparkles, RefreshCw } from 'lucide-react';
import { getPromptPreview } from '../api';

interface PromptInspectorModalProps {
  eventId: string | null;
  eventName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PromptInspectorModal: React.FC<PromptInspectorModalProps> = ({
  eventId,
  eventName = 'Active Gathering',
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrompt = async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPromptPreview(eventId);
      setPrompt(data.prompt);
    } catch (err: any) {
      setError(err.message || 'Failed to load prompt preview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventId) {
      loadPrompt();
    }
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="prompt-inspector-title">
      <div className="bg-[#111111] text-[#EEEDEA] border border-[#333333] rounded-[16px] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E0A37E]/20 text-[#E0A37E] flex items-center justify-center" aria-hidden="true">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 id="prompt-inspector-title" className="text-base sm:text-lg font-medium tracking-tight text-[#EEEDEA]">
                Live AI Prompt <span className="accent-serif text-[#F2CBB2]">Inspector</span>
              </h2>
              <p className="text-xs text-[#DCD8D5]/70 mt-0.5">
                Exact dynamically synthesized prompt sent to LLM for "{eventName}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inspector modal"
            className="p-1 rounded-full text-[#DCD8D5]/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between text-[11px] text-[#DCD8D5]/70 border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5 text-[#E0A37E]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero Hardcoded Templates · Dynamic Context Feed</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={loadPrompt}
                disabled={isLoading}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-1"
                title="Refresh prompt preview"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleCopy}
                disabled={!prompt || isLoading}
                className="px-2.5 py-1 rounded bg-[#E0A37E] text-black hover:bg-[#F2CBB2] font-semibold transition flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-400">
              <div className="w-6 h-6 border-2 border-[#E0A37E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Synthesizing prompt context...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-800 text-red-200 rounded">
              {error}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap leading-relaxed text-[#DCD8D5] bg-black/60 p-4 rounded-[8px] border border-white/10 select-all">
              {prompt}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-[#DCD8D5]/70">
          <span>Verifiable transparency for hackathon evaluation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition font-sans text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
