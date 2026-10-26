import React, { useState } from 'react';
import { EventType } from '../types';
import { X, Sparkles, Heart, Cake, Users, Briefcase, AlertTriangle } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    type: EventType;
    name: string;
    date: string;
    guest_count: number;
    location: string;
    total_budget: number;
    vibe: string;
    autoGenerate: boolean;
  }) => Promise<void>;
  isCreating: boolean;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}) => {
  const [type, setType] = useState<EventType>('wedding');
  const [name, setName] = useState('');
  const [date, setDate] = useState('2026-11-15');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [location, setLocation] = useState('San Francisco, CA');
  const [totalBudget, setTotalBudget] = useState<number>(25000);
  const [vibe, setVibe] = useState('Modern minimal, warm candlelight, organic florals');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: {
    type: EventType;
    name: string;
    date: string;
    guest_count: number;
    location: string;
    total_budget: number;
    vibe: string;
  }) => {
    setFormError(null);
    setType(preset.type);
    setName(preset.name);
    setDate(preset.date);
    setGuestCount(preset.guest_count);
    setLocation(preset.location);
    setTotalBudget(preset.total_budget);
    setVibe(preset.vibe);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter an event title.');
      return;
    }
    if (!date) {
      setFormError('Please select a target event date.');
      return;
    }
    if (guestCount < 0 || isNaN(guestCount)) {
      setFormError('Guest count cannot be negative.');
      return;
    }
    if (totalBudget < 0 || isNaN(totalBudget)) {
      setFormError('Total budget cannot be negative.');
      return;
    }
    if (!location.trim()) {
      setFormError('Please specify an event location.');
      return;
    }

    try {
      await onCreate({
        type,
        name: name.trim(),
        date,
        guest_count: guestCount,
        location: location.trim(),
        total_budget: totalBudget,
        vibe: vibe.trim(),
        autoGenerate,
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to create gathering');
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-event-title">
      <div className="bg-[#EEEDEA] text-[#111111] border border-[#14372D]/30 rounded-[16px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-h-[92dvh] modal-viewport-container-92">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#14372D]/15 flex items-center justify-between bg-white/40">
          <div>
            <h2 id="create-event-title" className="text-xl font-medium tracking-tight text-[#111111]">
              Create New <span className="accent-serif">Gathering</span>
            </h2>
            <p className="text-xs text-[#7A7571] mt-0.5">Initialize constraints for live GenAI synthesis</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close create gathering dialog"
            className="p-1 rounded-full text-[#7A7571] hover:text-[#111111] hover:bg-black/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Presets */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7A7571] block mb-2">
              Curated Starting Blueprints:
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    type: 'wedding',
                    name: 'Napa Valley Vineyard Wedding',
                    date: '2026-10-24',
                    guest_count: 120,
                    location: 'Napa Valley, CA',
                    total_budget: 35000,
                    vibe: 'Rustic elegance, warm amber lighting, farm-to-table dining, acoustic jazz',
                  })
                }
                className="text-left p-3 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] transition group"
              >
                <div className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-[#E0A37E]" />
                  <span>Vineyard Wedding</span>
                </div>
                <div className="text-[11px] text-[#7A7571] mt-0.5 tabular-nums">120 guests · $35,000</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    type: 'birthday',
                    name: 'Retro Neon 30th Rooftop Bash',
                    date: '2026-11-07',
                    guest_count: 45,
                    location: 'Austin, TX',
                    total_budget: 4500,
                    vibe: '80s synthwave neon, craft cocktail bar, gourmet slider station, vinyl DJ',
                  })
                }
                className="text-left p-3 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] transition group"
              >
                <div className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-[#E0A37E]" />
                  <span>30th Rooftop Bash</span>
                </div>
                <div className="text-[11px] text-[#7A7571] mt-0.5 tabular-nums">45 guests · $4,500</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    type: 'community',
                    name: 'Earth Day Community Eco-Fair',
                    date: '2026-09-19',
                    guest_count: 300,
                    location: 'Portland, OR',
                    total_budget: 8000,
                    vibe: 'Zero-waste workshops, local artisan booths, acoustic bluegrass, food trucks',
                  })
                }
                className="text-left p-3 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] transition group"
              >
                <div className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#E0A37E]" />
                  <span>Community Eco-Fair</span>
                </div>
                <div className="text-[11px] text-[#7A7571] mt-0.5 tabular-nums">300 guests · $8,000</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    type: 'corporate',
                    name: 'AI Innovators Summit & Gala',
                    date: '2026-12-04',
                    guest_count: 180,
                    location: 'Seattle, WA',
                    total_budget: 40000,
                    vibe: 'Futuristic ambient lighting, interactive demo stations, keynote AV, premium networking reception',
                  })
                }
                className="text-left p-3 rounded-[12px] bg-white border border-[#14372D]/15 hover:border-[#111111] transition group"
              >
                <div className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#E0A37E]" />
                  <span>AI Innovators Gala</span>
                </div>
                <div className="text-[11px] text-[#7A7571] mt-0.5 tabular-nums">180 guests · $40,000</div>
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3.5 rounded-[12px] bg-rose-900/10 border border-rose-700/30 text-rose-900 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-700 hover:text-black font-semibold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Event Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-2">
                Event Format
              </label>
              <div role="radiogroup" aria-label="Event Format" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['wedding', 'birthday', 'community', 'corporate'] as EventType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-full text-xs font-medium capitalize border transition flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:outline-none ${
                      type === t
                        ? 'bg-[#111111] border-[#111111] text-[#EEEDEA]'
                        : 'bg-white/60 border-[#DCD8D5] text-[#7A7571] hover:text-[#111111] hover:border-[#111111]'
                    }`}
                  >
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Event Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Liam & Sophie's Coastal Wedding"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[8px] border border-[#DCD8D5] bg-white text-[#111111] text-sm focus:outline-none focus:border-[#111111]"
              />
            </div>

            {/* Date, Guests, Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">
                  Event Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">
                  Guest Count
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">
                  Total Budget ($)
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  required
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            {/* Location & Vibe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">
                  Location (City, State/Country)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">
                  Stylistic Vibe & Aesthetic
                </label>
                <input
                  type="text"
                  placeholder="e.g., Autumn rustic elegance, candlelight, live jazz"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            {/* Auto Generate Toggle */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="auto-gen"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="w-4 h-4 rounded text-[#111111] bg-white border-[#DCD8D5]"
              />
              <label htmlFor="auto-gen" className="text-xs text-[#7A7571] cursor-pointer">
                Immediately trigger AI to synthesize mutually consistent budget, timeline, and logistics.
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#14372D]/15 bg-white/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#7A7571] hover:text-[#111111] rounded-full transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="create-event-form"
            disabled={isCreating}
            className="px-6 py-2.5 text-xs font-medium rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] transition flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
            <span>{isCreating ? 'Synthesizing Plan...' : 'Create Gathering'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
