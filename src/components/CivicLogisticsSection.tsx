import React, { useState } from 'react';
import { VolunteerRecord, PermitRecord } from '../types';
import {
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  CheckCircle2,
  X,
} from 'lucide-react';

interface CivicLogisticsSectionProps {
  volunteers: VolunteerRecord[];
  permits: PermitRecord[];
  eventName: string;
  eventLocation: string;
  onAddVolunteer: (vol: Omit<VolunteerRecord, 'id' | 'event_id'>) => Promise<void>;
  onUpdateVolunteer: (id: string, updates: Partial<VolunteerRecord>) => Promise<void>;
  onDeleteVolunteer: (id: string) => Promise<void>;
  onAddPermit: (permit: Omit<PermitRecord, 'id' | 'event_id'>) => Promise<void>;
  onUpdatePermit: (id: string, updates: Partial<PermitRecord>) => Promise<void>;
  onDeletePermit: (id: string) => Promise<void>;
}

export const CivicLogisticsSection: React.FC<CivicLogisticsSectionProps> = ({
  volunteers,
  permits,
  eventName,
  eventLocation,
  onAddVolunteer,
  onUpdateVolunteer,
  onDeleteVolunteer,
  onAddPermit,
  onUpdatePermit,
  onDeletePermit,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'volunteers' | 'permits'>('volunteers');

  // Volunteer form state
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [volRole, setVolRole] = useState('');
  const [volContact, setVolContact] = useState('');
  const [volShift, setVolShift] = useState('09:00 AM - 01:00 PM');
  const [volCount, setVolCount] = useState(4);
  const [volNotes, setVolNotes] = useState('');

  // Permit form state
  const [showAddPermit, setShowAddPermit] = useState(false);
  const [permitType, setPermitType] = useState('');
  const [issuingAgency, setIssuingAgency] = useState('City / Municipal Authority');
  const [permitStatus, setPermitStatus] = useState<'required' | 'in_progress' | 'approved'>('required');
  const [permitFee, setPermitFee] = useState(0);
  const [permitDeadline, setPermitDeadline] = useState('');
  const [permitNotes, setPermitNotes] = useState('');

  // Editing state
  const [editingVolId, setEditingVolId] = useState<string | null>(null);
  const [editVolRole, setEditVolRole] = useState('');
  const [editVolConfirmed, setEditVolConfirmed] = useState(0);
  const [editVolNeeded, setEditVolNeeded] = useState(4);

  const [editingPermitId, setEditingPermitId] = useState<string | null>(null);
  const [editPermitStatus, setEditPermitStatus] = useState<'required' | 'in_progress' | 'approved'>('required');

  // Computed summary metrics
  const totalVolunteersNeeded = volunteers.reduce((acc, v) => acc + (v.count_needed || 0), 0);
  const totalVolunteersConfirmed = volunteers.reduce((acc, v) => acc + (v.count_confirmed || 0), 0);
  const totalPermitFees = permits.reduce((acc, p) => acc + (p.fee || 0), 0);
  const approvedPermitsCount = permits.filter((p) => p.status === 'approved').length;

  const handleCreateVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volRole.trim()) return;
    await onAddVolunteer({
      role: volRole.trim(),
      contact_name: volContact.trim() || 'Open Shift',
      shift_time: volShift.trim(),
      count_needed: Number(volCount) || 2,
      count_confirmed: 0,
      status: 'recruiting',
      notes: volNotes.trim(),
    });
    setVolRole('');
    setVolContact('');
    setShowAddVolunteer(false);
  };

  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitType.trim()) return;
    await onAddPermit({
      permit_type: permitType.trim(),
      issuing_agency: issuingAgency.trim(),
      status: permitStatus,
      fee: Number(permitFee) || 0,
      deadline: permitDeadline,
      notes: permitNotes.trim(),
    });
    setPermitType('');
    setShowAddPermit(false);
  };

  return (
    <section className="bg-white border border-[#14372D]/15 rounded-[16px] shadow-sm overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="p-6 border-b border-[#14372D]/10 bg-white/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#14372D]/10 text-[#14372D] text-[11px] font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Civic Operations & Compliance</span>
          </div>
          <h3 className="text-xl font-medium text-[#111111] tracking-tight">
            Volunteer Shifts & <span className="accent-serif">Municipal Permits</span>
          </h3>
          <p className="text-xs text-[#7A7571] mt-0.5">
            Dedicated community logistics for public gathering safety, staffing, and compliance.
          </p>
        </div>

        {/* Sub-tab Pill Switcher */}
        <div className="inline-flex p-1 bg-[#EEEDEA] rounded-full border border-[#14372D]/15 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('volunteers')}
            className={`px-4 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'volunteers'
                ? 'bg-[#111111] text-[#EEEDEA] shadow-sm'
                : 'text-[#7A7571] hover:text-[#111111]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Volunteers ({volunteers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('permits')}
            className={`px-4 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'permits'
                ? 'bg-[#111111] text-[#EEEDEA] shadow-sm'
                : 'text-[#7A7571] hover:text-[#111111]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Permits ({permits.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-[#FAF9F6] border-b border-[#14372D]/10 text-xs">
        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Staffing Target</span>
          <span className="text-lg font-bold text-[#111111] tabular-nums mt-0.5 block">
            {totalVolunteersConfirmed} / {totalVolunteersNeeded}
          </span>
          <span className="text-[10px] text-[#7A7571]">
            {totalVolunteersNeeded > 0
              ? `${Math.round((totalVolunteersConfirmed / totalVolunteersNeeded) * 100)}% filled`
              : 'Zero shifts'}
          </span>
        </div>

        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Volunteer Roles</span>
          <span className="text-lg font-bold text-[#111111] tabular-nums mt-0.5 block">
            {volunteers.length} active
          </span>
          <span className="text-[10px] text-[#7A7571]">Staffed stations</span>
        </div>

        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">City Permits</span>
          <span className="text-lg font-bold text-[#111111] tabular-nums mt-0.5 block">
            {approvedPermitsCount} / {permits.length}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">Approved / Cleared</span>
        </div>

        <div className="p-3 bg-white rounded-[10px] border border-[#14372D]/10">
          <span className="text-[#7A7571] block text-[11px] uppercase font-semibold">Permit Fees</span>
          <span className="text-lg font-bold text-[#111111] tabular-nums mt-0.5 block">
            ${totalPermitFees.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#7A7571]">Municipal filing cost</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex-1 space-y-6">
        {/* SUBTAB 1: VOLUNTEER ROSTER */}
        {activeSubTab === 'volunteers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#111111]">Volunteer Coordination Schedule</h4>
                <p className="text-xs text-[#7A7571]">Assign shifts, track headcount needed, and confirm coverage.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVolunteer((prev) => !prev)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Volunteer Role</span>
              </button>
            </div>

            {/* Add Volunteer Inline Form */}
            {showAddVolunteer && (
              <form
                onSubmit={handleCreateVolunteer}
                className="p-4 rounded-[12px] bg-[#EEEDEA]/60 border border-[#14372D]/20 space-y-3 animate-in fade-in"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Role Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Traffic & Parking Marshall"
                      value={volRole}
                      onChange={(e) => setVolRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Shift Time</label>
                    <input
                      type="text"
                      placeholder="e.g., 08:30 AM - 12:30 PM"
                      value={volShift}
                      onChange={(e) => setVolShift(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Volunteers Needed</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={volCount}
                      onChange={(e) => setVolCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g., Requires reflective safety vest & two-way radio"
                    value={volNotes}
                    onChange={(e) => setVolNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddVolunteer(false)}
                    className="px-3 py-1.5 text-xs text-[#7A7571] hover:text-[#111111]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936]"
                  >
                    Save Volunteer Shift
                  </button>
                </div>
              </form>
            )}

            {/* Volunteer List */}
            {volunteers.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#14372D]/20 rounded-[12px] space-y-2">
                <Users className="w-8 h-8 text-[#7A7571] mx-auto opacity-50" />
                <p className="text-xs text-[#7A7571]">No volunteer shifts defined yet. Click 'Generate Plan' to synthesize civic roles.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#14372D]/10 border border-[#14372D]/15 rounded-[12px] overflow-hidden">
                {volunteers.map((v) => (
                  <div key={v.id} className="p-4 bg-white hover:bg-[#FAF9F6] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#111111]">{v.role}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            v.count_confirmed >= v.count_needed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {v.count_confirmed >= v.count_needed ? 'Staffed' : 'Recruiting'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#7A7571]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#E0A37E]" />
                          <span>{v.shift_time}</span>
                        </span>
                        <span>
                          Headcount: <strong className="text-[#111111]">{v.count_confirmed} confirmed</strong> / {v.count_needed} needed
                        </span>
                      </div>
                      {v.notes && <p className="text-xs text-[#7A7571] italic mt-0.5">{v.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateVolunteer(v.id, {
                            count_confirmed: v.count_confirmed < v.count_needed ? v.count_confirmed + 1 : v.count_confirmed,
                            status: v.count_confirmed + 1 >= v.count_needed ? 'filled' : 'recruiting',
                          })
                        }
                        className="px-2.5 py-1 text-xs font-medium rounded-full border border-[#DCD8D5] hover:bg-black/5 text-[#111111]"
                        title="Quick confirm +1 volunteer"
                      >
                        +1 Volunteer
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVolunteer(v.id)}
                        className="p-1.5 text-rose-700 hover:text-rose-900 rounded-full hover:bg-rose-50"
                        title="Remove volunteer role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: MUNICIPAL PERMITS */}
        {activeSubTab === 'permits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#111111]">Municipal Permits & Public Authorizations</h4>
                <p className="text-xs text-[#7A7571]">Filing deadlines, issuing agencies, and regulatory compliance.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPermit((prev) => !prev)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Permit</span>
              </button>
            </div>

            {/* Add Permit Form */}
            {showAddPermit && (
              <form
                onSubmit={handleCreatePermit}
                className="p-4 rounded-[12px] bg-[#EEEDEA]/60 border border-[#14372D]/20 space-y-3 animate-in fade-in"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Permit Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., City Special Event Permit"
                      value={permitType}
                      onChange={(e) => setPermitType(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Issuing Agency</label>
                    <input
                      type="text"
                      placeholder="e.g., City Parks & Rec Dept"
                      value={issuingAgency}
                      onChange={(e) => setIssuingAgency(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Filing Fee ($)</label>
                    <input
                      type="number"
                      value={permitFee}
                      onChange={(e) => setPermitFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Filing Deadline</label>
                    <input
                      type="date"
                      value={permitDeadline}
                      onChange={(e) => setPermitDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A7571] uppercase mb-1">Status</label>
                    <select
                      value={permitStatus}
                      onChange={(e) => setPermitStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#DCD8D5] bg-white text-xs focus:outline-none focus:border-[#111111]"
                    >
                      <option value="required">Required / Not Started</option>
                      <option value="in_progress">Application Submitted</option>
                      <option value="approved">Approved & Cleared</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddPermit(false)}
                    className="px-3 py-1.5 text-xs text-[#7A7571] hover:text-[#111111]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936]"
                  >
                    Save Permit Requirement
                  </button>
                </div>
              </form>
            )}

            {/* Permit List */}
            {permits.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#14372D]/20 rounded-[12px] space-y-2">
                <FileText className="w-8 h-8 text-[#7A7571] mx-auto opacity-50" />
                <p className="text-xs text-[#7A7571]">No municipal permits logged. Click 'Generate Plan' to identify regulatory mandates.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#14372D]/10 border border-[#14372D]/15 rounded-[12px] overflow-hidden">
                {permits.map((p) => (
                  <div key={p.id} className="p-4 bg-white hover:bg-[#FAF9F6] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#111111]">{p.permit_type}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            p.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#7A7571]">
                        <span>Agency: <strong className="text-[#111111]">{p.issuing_agency}</strong></span>
                        {p.deadline && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#E0A37E]" />
                            <span>Deadline: {p.deadline}</span>
                          </span>
                        )}
                        <span>Filing Fee: <strong className="text-[#111111]">${p.fee.toLocaleString()}</strong></span>
                      </div>
                      {p.notes && <p className="text-xs text-[#7A7571] italic mt-0.5">{p.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePermit(p.id, {
                            status: p.status === 'approved' ? 'required' : p.status === 'in_progress' ? 'approved' : 'in_progress',
                          })
                        }
                        className="px-2.5 py-1 text-xs font-medium rounded-full border border-[#DCD8D5] hover:bg-black/5 text-[#111111]"
                      >
                        {p.status === 'approved' ? 'Mark In Progress' : p.status === 'in_progress' ? 'Mark Approved' : 'Mark In Progress'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePermit(p.id)}
                        className="p-1.5 text-rose-700 hover:text-rose-900 rounded-full hover:bg-rose-50"
                        title="Remove permit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
