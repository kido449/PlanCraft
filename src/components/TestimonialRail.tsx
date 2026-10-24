import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  eventType: string;
  stat: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote:
      'We had an unexpected 35-guest surge 6 weeks before our Sonoma vineyard wedding. PlanCraft rebalanced our catering lines, increased staff ratios, and kept us within $45k without breaking a sweat.',
    author: 'Clara & Julian Vance',
    role: 'Private Clients',
    eventType: 'Sonoma Vineyard Wedding',
    stat: '165 Guests · $45,000 Total',
  },
  {
    id: '2',
    quote:
      'The single-call generation ensures the photographer budget matches our visual ideas, and the timeline tasks align directly with vendor booking cutoffs. Zero hallucinations.',
    author: 'Mateo Rossi',
    role: 'Creative Director, Atelier North',
    eventType: 'Milestone 40th Architectural Gala',
    stat: '85 Guests · $22,000 Total',
  },
  {
    id: '3',
    quote:
      'For our municipal Earth Day gathering, our sponsor grant arrived late. One click on PlanCraft replanned discretionary staging while protecting local waste mitigation teams.',
    author: 'Sarah Lin',
    role: 'Community Outreach Chair',
    eventType: 'Cascadia Eco-Fair',
    stat: '400 Attendees · $12,500 Total',
  },
];

export const TestimonialRail: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () => {
    setCurrentIndex((c) => (c === 0 ? TESTIMONIALS.length - 1 : c - 1));
  };

  const next = () => {
    setCurrentIndex((c) => (c === TESTIMONIALS.length - 1 ? 0 : c + 1));
  };

  return (
    <section className="max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-16 py-12">
      {/* Header with Circular Arrows floating top-right */}
      <div className="flex items-baseline justify-between border-b border-[#14372D]/15 pb-4 mb-8">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#7A7571] font-medium block mb-1">
            05 // Field Verification
          </span>
          <h3 className="text-2xl sm:text-3xl font-medium tracking-[-1.5px] text-[#111111]">
            Real-world <span className="accent-serif">production</span> proof
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full border border-[#14372D]/30 flex items-center justify-center hover:bg-[#111111] hover:text-[#EEEDEA] text-[#111111] transition"
            title="Previous testimonial"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="w-9 h-9 rounded-full border border-[#14372D]/30 flex items-center justify-center hover:bg-[#111111] hover:text-[#EEEDEA] text-[#111111] transition"
            title="Next testimonial"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, idx) => (
          <div
            key={t.id}
            className={`p-6 rounded-[16px] border transition-all flex flex-col justify-between ${
              idx === currentIndex
                ? 'bg-[#111111] text-[#EEEDEA] border-[#111111]'
                : 'bg-white/60 text-[#111111] border-[#14372D]/15'
            }`}
          >
            <div>
              <span className={`text-[11px] uppercase tracking-wider font-medium block mb-3 ${
                idx === currentIndex ? 'text-[#E0A37E]' : 'text-[#7A7571]'
              }`}>
                {t.eventType} · {t.stat}
              </span>

              <blockquote className="text-sm font-normal leading-relaxed text-balance">
                "{t.quote}"
              </blockquote>
            </div>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
              idx === currentIndex ? 'border-white/10 text-[#DCD8D5]' : 'border-[#14372D]/10 text-[#7A7571]'
            }`}>
              <div>
                <span className={`font-semibold block ${idx === currentIndex ? 'text-white' : 'text-[#111111]'}`}>
                  {t.author}
                </span>
                <span className="text-[11px]">{t.role}</span>
              </div>
              <Quote className="w-4 h-4 opacity-30" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
