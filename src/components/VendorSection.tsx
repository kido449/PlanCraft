import React, { useState } from 'react';
import { VendorRecord, VendorStatus } from '../types';
import { withScrollLock } from '../utils/scrollStability';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  Mail,
  Lock,
  Search,
  Send,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';

interface VendorSectionProps {
  vendors: VendorRecord[];
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  guestCount?: number;
  onUpdateVendor: (id: string, updates: Partial<VendorRecord>) => Promise<void>;
  onAddVendor: (vendor: Omit<VendorRecord, 'id' | 'event_id'>) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
}

export const VendorSection: React.FC<VendorSectionProps> = ({
  vendors,
  eventName = 'Our Upcoming Gathering',
  eventDate = 'Target Date',
  eventLocation = 'Local Area',
  guestCount = 50,
  onUpdateVendor,
  onAddVendor,
  onDeleteVendor,
}) => {
  const [inquiryVendor, setInquiryVendor] = useState<VendorRecord | null>(null);
  const [copiedInquiry, setCopiedInquiry] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEstimatedCost, setEditEstimatedCost] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<VendorStatus>('shortlisted');
  const [editNotes, setEditNotes] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'booked' | 'shortlisted'>('all');

  const bookedCount = vendors.filter((v) => v.status === 'booked').length;
  const totalBookedCost = vendors
    .filter((v) => v.status === 'booked')
    .reduce((sum, v) => sum + (v.estimated_cost || 0), 0);

  const startEditing = (vendor: VendorRecord) => {
    setEditingId(vendor.id);
    setEditCategory(vendor.category);
    setEditName(vendor.name);
    setEditContact(vendor.contact || '');
    setEditEstimatedCost(vendor.estimated_cost);
    setEditStatus(vendor.status);
    setEditNotes(vendor.notes || '');
  };

  const handleSaveEdit = async (id: string) => {
    await withScrollLock(async () => {
      await onUpdateVendor(id, {
        category: editCategory,
        name: editName,
        contact: editContact.trim() || null,
        estimated_cost: Number(editEstimatedCost),
        status: editStatus,
        notes: editNotes,
      });
      setEditingId(null);
    });
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await withScrollLock(async () => {
      await onAddVendor({
        category: newCategory.trim() || 'Vendor',
        name: newName.trim(),
        contact: newContact.trim() || null,
        estimated_cost: Number(newEstimatedCost) || 0,
        status: 'shortlisted',
        notes: newNotes.trim(),
      });

      setNewCategory('');
      setNewName('');
      setNewContact('');
      setNewEstimatedCost('');
      setNewNotes('');
      setShowAddForm(false);
    });
  };

  const cycleStatus = async (vendor: VendorRecord) => {
    let next: VendorStatus = 'shortlisted';
    if (vendor.status === 'shortlisted') next = 'contacted';
    else if (vendor.status === 'contacted') next = 'booked';
    else next = 'shortlisted';

    await withScrollLock(() => onUpdateVendor(vendor.id, { status: next }));
  };

  const filteredVendors = vendors.filter((v) => {
    if (statusFilter === 'booked' && v.status !== 'booked') return false;
    if (statusFilter === 'shortlisted' && v.status === 'booked') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.contact && v.contact.toLowerCase().includes(q)) ||
        (v.notes && v.notes.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <section className="bg-transparent border border-[#14372D]/20 rounded-[16px] p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#14372D]/15 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#7A7571] font-medium block mb-1">
            03 // Production Partners
          </span>
          <h3 className="text-2xl sm:text-3xl font-medium tracking-[-1.5px] text-[#111111]">
            Curated <span className="accent-serif">vendors</span> & artisans
          </h3>
          <p className="text-sm text-[#7A7571] mt-1 font-normal">
            {bookedCount} of {vendors.length} partners booked (${totalBookedCost.toLocaleString()} committed). Booked partners are locked during replans.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-[36px] px-3.5 rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] text-xs font-medium transition active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571]" />
          <input
            type="text"
            aria-label="Search partners and contacts"
            placeholder="Search partners & contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[34px] pl-9 pr-3 text-xs bg-white/70 border border-[#14372D]/20 rounded-full text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>

        <div className="inline-flex items-center border border-[#14372D]/20 rounded-full p-0.5 text-xs bg-white/40">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full transition-colors ${
              statusFilter === 'all' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
            }`}
          >
            All ({vendors.length})
          </button>
          <button
            onClick={() => setStatusFilter('booked')}
            className={`px-3 py-1 rounded-full transition-colors ${
              statusFilter === 'booked' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
            }`}
          >
            Booked ({bookedCount})
          </button>
          <button
            onClick={() => setStatusFilter('shortlisted')}
            className={`px-3 py-1 rounded-full transition-colors ${
              statusFilter === 'shortlisted' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
            }`}
          >
            Shortlisted ({vendors.length - bookedCount})
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateVendor}
          className="p-5 rounded-[12px] bg-white/70 border border-[#14372D]/20 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
              Add Vendor Profile
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#7A7571] hover:text-[#111111]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g., Live Music & Sound"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Suggested Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Napa Valley Strings Quartet"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Est. Cost ($)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 2800"
                value={newEstimatedCost}
                onChange={(e) => setNewEstimatedCost(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Contact</label>
              <input
                type="text"
                placeholder="e.g., booking@napastrings.com"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">Service Scope</label>
            <input
              type="text"
              placeholder="e.g., Ceremony prelude, processional, and cocktail hour set"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition"
            >
              Add Vendor
            </button>
          </div>
        </form>
      )}

      {/* Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-xs text-[#7A7571]">
            {searchQuery ? 'No partners match your search.' : 'No vendors generated yet. Click "Synthesize Plan" to populate.'}
          </div>
        ) : (
          filteredVendors.map((vendor) => {
            const isEditing = editingId === vendor.id;
            const isBooked = vendor.status === 'booked';

            if (isEditing) {
              return (
                <div key={vendor.id} className="p-4 bg-white/80 rounded-[8px] border border-[#111111] space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                      placeholder="Category"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                      placeholder="Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editEstimatedCost}
                      onChange={(e) => setEditEstimatedCost(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                      placeholder="Est Cost"
                    />
                    <select
                      aria-label="Edit vendor status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as VendorStatus)}
                      className="px-2 py-1 bg-white border border-[#111111] rounded text-xs text-[#111111]"
                    >
                      <option value="shortlisted">Shortlisted</option>
                      <option value="contacted">Contacted</option>
                      <option value="booked">Booked</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                    placeholder="Contact info"
                  />

                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                    placeholder="Notes"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-[#DCD8D5] text-[#111111] rounded hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(vendor.id)}
                      className="px-3 py-1 bg-[#111111] text-[#EEEDEA] rounded hover:bg-[#413936] font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={vendor.id}
                className="p-5 rounded-[12px] border border-[#14372D]/15 bg-white/40 hover:bg-white/80 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-[#7A7571] font-medium">
                      {vendor.category}
                    </span>

                    <button
                      onClick={() => cycleStatus(vendor)}
                      className="text-xs uppercase tracking-wider font-semibold cursor-pointer text-[#413936] hover:text-[#111111] transition"
                      title="Click to toggle status: Shortlisted → Contacted → Booked"
                    >
                      {vendor.status === 'booked' ? '✓ Booked' : vendor.status === 'contacted' ? 'Contacted' : 'Shortlisted'}
                    </button>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2">
                    <h4 className="text-base font-medium text-[#111111]">
                      {vendor.name}
                    </h4>
                    {(vendor.is_user_edited || isBooked) && (
                      <span title="Locked vendor (Protected during replan)">
                        <Lock className="w-3.5 h-3.5 text-[#413936]" />
                      </span>
                    )}
                  </div>

                  {vendor.notes && (
                    <p className="text-xs text-[#7A7571] mt-1.5 line-clamp-2 leading-relaxed">
                      {vendor.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#14372D]/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#7A7571]">Allocation: </span>
                    <span className="font-semibold text-[#111111] tabular-nums">
                      ${vendor.estimated_cost.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {vendor.contact && (
                      <span className="text-[#7A7571] flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3" />
                        <span className="max-w-[120px] truncate">{vendor.contact}</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setInquiryVendor(vendor);
                          setCopiedInquiry(false);
                        }}
                        className="px-2 py-0.5 text-[11px] font-medium text-[#413936] hover:text-[#111111] bg-black/5 hover:bg-black/10 rounded-full flex items-center gap-1 transition"
                        title="Draft customized outreach inquiry email"
                      >
                        <Send className="w-3 h-3 text-[#E0A37E]" />
                        <span>Inquire</span>
                      </button>
                      <button
                        onClick={() => startEditing(vendor)}
                        className="p-1 text-[#7A7571] hover:text-[#111111]"
                        title="Edit vendor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => withScrollLock(() => onDeleteVendor(vendor.id))}
                        className="p-1 text-[#7A7571] hover:text-rose-700"
                        title="Delete vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tailored Vendor Inquiry / RFP Generator Modal */}
      {inquiryVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#EEEDEA] text-[#111111] rounded-[16px] border border-[#14372D]/20 max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            <button
              onClick={() => setInquiryVendor(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-[#7A7571] hover:text-[#111111] hover:bg-black/5 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs uppercase tracking-wider text-[#7A7571] font-semibold block mb-1">
                Vendor Outreach Assistant
              </span>
              <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-[#111111]">
                Draft Inquiry: <span className="accent-serif">{inquiryVendor.name}</span>
              </h3>
              <p className="text-xs text-[#7A7571] mt-1">
                Customized for {eventName} with live date, location, headcount, and budget allocation.
              </p>
            </div>

            {/* Email Preview Card */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 bg-white/70 rounded-[8px] border border-[#14372D]/15 font-mono">
                <span className="text-[#7A7571] font-sans font-semibold">Subject:</span>
                <span className="text-[#111111] truncate">
                  Inquiry: {inquiryVendor.category} for {eventName} ({eventDate})
                </span>
              </div>

              <div className="p-4 bg-white rounded-[10px] border border-[#14372D]/15 font-sans leading-relaxed text-[#111111] text-xs whitespace-pre-line max-h-[220px] overflow-y-auto">
{`Dear ${inquiryVendor.name} Team,

I hope this message finds you well.

We are organizing "${eventName}" scheduled for ${eventDate} in ${eventLocation}, with approximately ${guestCount} attendees.

We have admired your work in ${inquiryVendor.category} and would love to inquire about your availability for our date. We have reserved an estimated allocation of $${inquiryVendor.estimated_cost.toLocaleString()} USD for this scope.

${inquiryVendor.notes ? `Specific notes for our vision: "${inquiryVendor.notes}"\n` : ''}Could you please let us know if you have availability and share your current packaging details?

Warm regards,
Event Host / Planning Team`}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-[#7A7571]">
                {inquiryVendor.contact ? `Contact: ${inquiryVendor.contact}` : 'Direct outreach copy'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Subject: Inquiry: ${inquiryVendor.category} for ${eventName} (${eventDate})\n\nDear ${inquiryVendor.name} Team,\n\nI hope this message finds you well.\n\nWe are organizing "${eventName}" scheduled for ${eventDate} in ${eventLocation}, with approximately ${guestCount} attendees.\n\nWe have admired your work in ${inquiryVendor.category} and would love to inquire about your availability for our date. We have reserved an estimated allocation of $${inquiryVendor.estimated_cost.toLocaleString()} USD for this scope.\n\n${inquiryVendor.notes ? `Specific notes for our vision: "${inquiryVendor.notes}"\n\n` : ''}Could you please let us know if you have availability and share your current packaging details?\n\nWarm regards,\nEvent Host / Planning Team`;
                    navigator.clipboard.writeText(text);
                    setCopiedInquiry(true);
                    setTimeout(() => setCopiedInquiry(false), 3000);
                  }}
                  className="px-4 py-2 rounded-full bg-white hover:bg-white/80 text-[#111111] border border-[#14372D]/20 text-xs font-medium transition flex items-center gap-1.5"
                >
                  {copiedInquiry ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Letter</span>
                    </>
                  )}
                </button>

                {inquiryVendor.contact && inquiryVendor.contact.includes('@') && (
                  <a
                    href={`mailto:${inquiryVendor.contact}?subject=${encodeURIComponent(
                      `Inquiry: ${inquiryVendor.category} for ${eventName} (${eventDate})`
                    )}&body=${encodeURIComponent(
                      `Dear ${inquiryVendor.name} Team,\n\nWe are organizing "${eventName}" scheduled for ${eventDate} in ${eventLocation}, with approximately ${guestCount} attendees.\n\nWe have admired your work in ${inquiryVendor.category} and would love to check your availability. We have an allocated budget of $${inquiryVendor.estimated_cost.toLocaleString()} USD.\n\nWarm regards,\nEvent Host / Planning Team`
                    )}`}
                    className="px-4 py-2 rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#E0A37E]" />
                    <span>Send Email</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
