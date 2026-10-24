import React, { useState } from 'react';
import { IdeaRecord } from '../types';
import { Copy, Check, BookmarkCheck } from 'lucide-react';

interface IdeasSectionProps {
  ideas: IdeaRecord[];
  vibe: string;
  location: string;
}

export const IdeasSection: React.FC<IdeasSectionProps> = ({ ideas, vibe, location }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="bg-transparent border border-[#14372D]/20 rounded-[16px] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#14372D]/15 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#7A7571] font-medium block mb-1">
            04 // Creative Vision
          </span>
          <h3 className="text-2xl sm:text-3xl font-medium tracking-[-1.5px] text-[#111111]">
            Curated <span className="accent-serif">concepts</span> & atmosphere
          </h3>
          <p className="text-sm text-[#7A7571] mt-1 font-normal">
            Synthesized for vibe "{vibe || 'Curated'}" and setting ({location})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-[#7A7571]">
            No personalized concepts generated yet. Click "Synthesize Plan" to populate.
          </div>
        ) : (
          ideas.map((idea, index) => {
            const isPinned = pinnedIds.has(idea.id);
            const isCopied = copiedId === idea.id;

            return (
              <div
                key={idea.id}
                className="p-6 rounded-[12px] border border-[#14372D]/15 bg-white/50 hover:bg-white/90 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[#14372D]/10 pb-3">
                    <span className="text-xs uppercase tracking-wider text-[#7A7571] font-medium">
                      Concept #{index + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => togglePin(idea.id)}
                        className={`p-1 rounded transition ${
                          isPinned ? 'text-[#111111] font-bold' : 'text-[#7A7571] hover:text-[#111111]'
                        }`}
                        title={isPinned ? 'Unpin concept' : 'Pin to favorites'}
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(idea.id, `${idea.theme}: ${idea.description}`)}
                        className="p-1 text-[#7A7571] hover:text-[#111111] transition"
                        title="Copy concept"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-[#111111] tracking-tight mt-4">
                    {idea.theme}
                  </h4>

                  <p className="text-xs text-[#7A7571] mt-2 leading-relaxed">
                    {idea.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#14372D]/10 flex items-center justify-between text-[11px] text-[#7A7571]">
                  <span>Tactile Experience</span>
                  {isPinned && <span className="text-[#111111] font-medium">Adopted</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
