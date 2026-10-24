import React, { useState } from 'react';
import { GuestRecord } from '../types';
import { withScrollLock } from '../utils/scrollStability';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Plus,
  Trash2,
  Mail,
  Utensils,
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react';

interface GuestListSectionProps {
  guests: GuestRecord[];
  targetGuestCount: number;
  onAddGuest: (guest: Omit<GuestRecord, 'id' | 'event_id'>) => Promise<void>;
  onUpdateGuest: (id: string, updates: Partial<GuestRecord>) => Promise<void>;
  onDeleteGuest: (id: string) => Promise<void>;
}

export const GuestListSection: React.FC<GuestListSectionProps> = React.memo(({
  guests = [],
  targetGuestCount,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'pending' | 'declined'>('all');

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'pending' | 'declined'>('pending');
  const [plusOnes, setPlusOnes] = useState(0);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [notes, setNotes] = useState('');

  // Calculations
  const attendingList = guests.filter((g) => g.rsvp_status === 'attending');
  const totalAttending = attendingList.reduce((sum, g) => sum + 1 + (g.plus_ones || 0), 0);
  const pendingCount = guests.filter((g) => g.rsvp_status === 'pending').length;
  const declinedCount = guests.filter((g) => g.rsvp_status === 'declined').length;

  const dietaryCount = guests.filter((g) => g.dietary_notes && g.dietary_notes.trim()).length;

  // Filtered list
  const filteredGuests = guests.filter((g) => {
    const matchesFilter = statusFilter === 'all' || g.rsvp_status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.dietary_notes.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await withScrollLock(async () => {
      await onAddGuest({
        name: name.trim(),
        email: email.trim(),
        rsvp_status: rsvpStatus,
        plus_ones: Number(plusOnes) || 0,
        dietary_notes: dietaryNotes.trim(),
        notes: notes.trim(),
      });

      setName('');
      setEmail('');
      setDietaryNotes('');
      setNotes('');
      setPlusOnes(0);
      setShowAddForm(false);
    });
  };

  return (
    <section className="bg-white border border-[#14372D]/15 rounded-[16px] shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#14372D]/10 bg-white/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E0A37E]/20 text-[#111111] text-[11px] font-semibold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>Attendance & Hospitality Roster</span>
          </div>
          <h3 className="text-xl font-medium text-[#111111] tracking-tight">
            Guest List & <span className="accent-serif">RSVP Manager</span>
          </h3>
          <p className="text-xs text-[#7A7571] mt-0.5">
            Confirmed headcounts and dietary restrictions directly synchronize with catering calculations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="px-4 py-2 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Guest</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-[#FAF9F6] border-b border-[#14372D]/10 text-xs">
        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Attending Headcount</span>
          <span className="text-lg font-bold text-emerald-800 tabular-nums mt-0.5 block">
            {totalAttending} guests
          </span>
          <span className="text-[10px] text-[#7A7571]">
            Target capacity: {targetGuestCount}
          </span>
        </div>

        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Pending Responses</span>
          <span className="text-lg font-bold text-amber-800 tabular-nums mt-0.5 block">
            {pendingCount} awaiting
          </span>
          <span className="text-[10px] text-[#7A7571]">Awaiting RSVP return</span>
        </div>

        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Declined</span>
          <span className="text-lg font-bold text-rose-800 tabular-nums mt-0.5 block">
            {declinedCount} guests
          </span>
          <span className="text-[10px] text-[#7A7571]">Cannot attend</span>
        </div>

        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Special Dietary</span>
          <span className="text-lg font-bold text-[#111111] tabular-nums mt-0.5 block">
            {dietaryCount} profiles
          </span>
          <span className="text-[10px] text-[#7A7571]">Vegan, GF, Allergies</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 border-b border-[#14372D]/10 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571]" />
          <input
            type="text"
            placeholder="Search guest or dietary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-[8px] border border-[#DCD8D5] text-xs focus:outline-none focus:border-[#111111]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {(['all', 'attending', 'pending', 'declined'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full capitalize text-xs font-medium transition cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#111111] text-[#EEEDEA]'
                  : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form and Guest Cards */}
      <div className="p-6 flex-1 space-y-4">
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-[12px] bg-[#EEEDEA]/60 border border-[#14372D]/20 space-y-3 animate-in fade-in"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Olivia Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g., olivia@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">RSVP Status</label>
                <select
                  value={rsvpStatus}
                  onChange={(e) => setRsvpStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                >
                  <option value="attending">Attending (Confirmed)</option>
                  <option value="pending">Pending</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Plus-Ones Count</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={plusOnes}
                  onChange={(e) => setPlusOnes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Dietary Requirements / Allergies</label>
                <input
                  type="text"
                  placeholder="e.g., Gluten-Free, Severe Peanut Allergy"
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-[#7A7571] hover:text-[#111111]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936]"
              >
                Save Guest
              </button>
            </div>
          </form>
        )}

        {filteredGuests.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#14372D]/20 rounded-[12px] space-y-2">
            <Users className="w-8 h-8 text-[#7A7571] mx-auto opacity-50" />
            <p className="text-xs text-[#7A7571]">
              {guests.length === 0
                ? 'No guests logged yet. Add your first guest to track RSVPs and dietary needs.'
                : 'No guests match your search filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#14372D]/10 border border-[#14372D]/15 rounded-[12px] overflow-hidden">
            {filteredGuests.map((g) => (
              <div
                key={g.id}
                className="p-4 bg-white hover:bg-[#FAF9F6] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#111111]">{g.name}</span>
                    {g.plus_ones > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#111111] text-[#EEEDEA] text-[10px] font-semibold">
                        +{g.plus_ones} guest
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        g.rsvp_status === 'attending'
                          ? 'bg-emerald-100 text-emerald-800'
                          : g.rsvp_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {g.rsvp_status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#7A7571]">
                    {g.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#E0A37E]" />
                        <span>{g.email}</span>
                      </span>
                    )}
                    {g.dietary_notes && (
                      <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
                        <Utensils className="w-3 h-3 text-amber-700" />
                        <span>{g.dietary_notes}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      withScrollLock(() =>
                        onUpdateGuest(g.id, {
                          rsvp_status:
                            g.rsvp_status === 'attending'
                              ? 'pending'
                              : g.rsvp_status === 'pending'
                              ? 'attending'
                              : 'attending',
                        })
                      )
                    }
                    className="px-2.5 py-1 text-xs font-medium rounded-full border border-[#DCD8D5] hover:bg-black/5 text-[#111111]"
                  >
                    {g.rsvp_status === 'attending' ? 'Mark Pending' : 'Mark Attending'}
                  </button>
                  <button
                    type="button"
                    onClick={() => withScrollLock(() => onDeleteGuest(g.id))}
                    className="p-1.5 text-rose-700 hover:text-rose-900 rounded-full hover:bg-rose-50"
                    title="Remove guest"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
