import React, { useEffect, useState, useCallback } from 'react';
import {
  EventRecord,
  EventWithDetails,
  BudgetItemRecord,
  TimelineTaskRecord,
  VendorRecord,
  VolunteerRecord,
  PermitRecord,
  GuestRecord,
  EventType,
  PlannerTab,
  AssistantAction,
} from './types';
import {
  fetchEvents,
  fetchEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  generateEventPlan,
  replanEvent,
  updateBudgetItem,
  addBudgetItem,
  deleteBudgetItem,
  updateTimelineTask,
  addTimelineTask,
  deleteTimelineTask,
  updateVendor,
  addVendor,
  deleteVendor,
  addVolunteer,
  updateVolunteer,
  deleteVolunteer,
  addPermit,
  updatePermit,
  deletePermit,
  fetchGuests,
  addGuest,
  updateGuest,
  deleteGuest,
  getUserId,
  setUserId,
} from './api';

import { Navbar } from './components/Navbar';
import { TerracottaArchwaysHero } from './components/TerracottaArchwaysHero';
import { EventOverviewBanner } from './components/EventOverviewBanner';
import { BudgetSection } from './components/BudgetSection';
import { TimelineSection } from './components/TimelineSection';
import { VendorSection } from './components/VendorSection';
import { CivicLogisticsSection } from './components/CivicLogisticsSection';
import { GuestListSection } from './components/GuestListSection';
import { IdeasSection } from './components/IdeasSection';
import { PlanningAssistant } from './components/PlanningAssistant';
import { EditorialQuotePanel } from './components/EditorialQuotePanel';
import { TestimonialRail } from './components/TestimonialRail';
import { ClosingCtaBand } from './components/ClosingCtaBand';
import { EditorialFooter } from './components/EditorialFooter';
import { CreateEventModal } from './components/CreateEventModal';
import { ConstraintEditModal } from './components/ConstraintEditModal';
import { ExportModal } from './components/ExportModal';

import {
  DollarSign,
  Calendar,
  Store,
  Lightbulb,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  Bot,
  MessageSquare,
  Users,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventWithDetails | null>(null);

  const [activeTab, setActiveTab] = useState<PlannerTab>('all');
  const [currentUserId, setCurrentUserIdState] = useState<string>(getUserId());

  // Modals & Display
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditConstraintsOpen, setIsEditConstraintsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showEditorialStory, setShowEditorialStory] = useState(false);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Feedback banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replanRationale, setReplanRationale] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Load events
  const loadEventsList = useCallback(
    async (selectId?: string, silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        const list = await fetchEvents();
        setEvents(list);

        if (list.length > 0) {
          const targetId = selectId || activeEventId || list[0].id;
          const exists = list.some((e) => e.id === targetId);
          const resolvedId = exists ? targetId : list[0].id;
          setActiveEventId(resolvedId);
          if (!activeEvent || activeEvent.id !== resolvedId) {
            const details = await fetchEvent(resolvedId);
            setActiveEvent(details);
          }
        } else {
          setActiveEventId(null);
          setActiveEvent(null);
        }
      } catch (err: any) {
        showError(err.message || 'Failed to load events');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [activeEventId, activeEvent]
  );

  useEffect(() => {
    loadEventsList();
  }, [currentUserId]);

  const handleSelectEvent = async (id: string) => {
    try {
      setActiveEventId(id);
      setIsLoading(true);
      const details = await fetchEvent(id);
      setActiveEvent(details);
      setReplanRationale(null);
    } catch (err: any) {
      showError(err.message || 'Failed to switch event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeUser = (newId: string) => {
    setUserId(newId);
    setCurrentUserIdState(newId);
    showSuccess(`Switched to user: ${newId} (RLS data scoped)`);
  };

  const handleTabChange = (tab: PlannerTab) => {
    setActiveTab(tab);
  };

  const handleScrollToWorkspace = () => {
    const el = document.getElementById('planner-workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Apply suggestions from GenAI Planning Assistant
  const handleApplyAssistantAction = async (action: AssistantAction) => {
    if (!activeEvent) return;

    try {
      if (action.type === 'add_budget_item' && action.data.category && action.data.estimated_cost !== undefined) {
        await handleAddBudgetItem({
          category: action.data.category,
          estimated_cost: Number(action.data.estimated_cost),
          actual_cost: null,
          status: 'planned',
          notes: action.data.notes || 'Added by GenAI Assistant',
        });
      } else if (action.type === 'add_timeline_task' && action.data.title) {
        await handleAddTimelineTask({
          title: action.data.title,
          category: action.data.category || 'Milestone',
          due_date: action.data.due_date || activeEvent.date,
          status: 'pending',
          notes: action.data.notes || 'Added by GenAI Assistant',
        });
      } else if (action.type === 'add_vendor' && (action.data.name || action.data.category)) {
        await handleAddVendor({
          category: action.data.category || 'General',
          name: action.data.name || 'Partner',
          contact: null,
          estimated_cost: Number(action.data.estimated_cost) || 0,
          status: 'shortlisted',
          notes: action.data.notes || 'Added by GenAI Assistant',
        });
      }
    } catch (err: any) {
      showError(err.message || 'Failed to apply recommendation');
      throw err;
    }
  };

  // 1. Create Event
  const handleCreateEvent = async (payload: {
    type: EventType;
    name: string;
    date: string;
    guest_count: number;
    location: string;
    total_budget: number;
    vibe: string;
    autoGenerate: boolean;
  }) => {
    try {
      setIsCreating(true);
      const created = await createEvent({
        type: payload.type,
        name: payload.name,
        date: payload.date,
        guest_count: payload.guest_count,
        location: payload.location,
        total_budget: payload.total_budget,
        vibe: payload.vibe,
      });

      setIsCreateModalOpen(false);

      if (payload.autoGenerate) {
        showSuccess(`Event "${created.name}" created. Invoking live AI generation...`);
        setIsGenerating(true);
        const genResult = await generateEventPlan(created.id);
        setActiveEvent(genResult.event);
        setActiveEventId(created.id);
        setIsGenerating(false);
        showSuccess('Live plan generated with mutual budget/timeline consistency!');
      } else {
        showSuccess(`Event "${created.name}" created.`);
      }

      await loadEventsList(created.id);
    } catch (err: any) {
      showError(err.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
      setIsGenerating(false);
    }
  };

  // 2. Delete Event
  const handleDeleteActiveEvent = async () => {
    if (!activeEvent) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${activeEvent.name}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      await deleteEvent(activeEvent.id);
      showSuccess(`Deleted event "${activeEvent.name}"`);
      await loadEventsList();
    } catch (err: any) {
      showError(err.message || 'Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Generate Full Plan
  const handleGeneratePlan = async () => {
    if (!activeEvent) return;
    try {
      setIsGenerating(true);
      setReplanRationale(null);
      const result = await generateEventPlan(activeEvent.id);
      setActiveEvent(result.event);
      showSuccess('Live GenAI plan generated! Budget, tasks, and vendors mutually aligned.');
    } catch (err: any) {
      showError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Save Constraints Only
  const handleSaveConstraintsOnly = async (newBudget: number, newGuestCount: number) => {
    if (!activeEvent) return;
    try {
      await updateEvent(activeEvent.id, {
        total_budget: newBudget,
        guest_count: newGuestCount,
      });
      const refreshed = await fetchEvent(activeEvent.id);
      setActiveEvent(refreshed);
      setIsEditConstraintsOpen(false);
      showSuccess('Constraints updated. You can trigger a Replan whenever ready.');
      await loadEventsList(activeEvent.id, true);
    } catch (err: any) {
      showError(err.message || 'Failed to update constraints');
    }
  };

  // 5. Replan Event with AI
  const handleSaveAndReplan = async (newBudget: number, newGuestCount: number, reason: string) => {
    if (!activeEvent) return;
    try {
      setIsReplanning(true);
      const res = await replanEvent(activeEvent.id, {
        new_budget: newBudget,
        new_guest_count: newGuestCount,
        reason,
      });

      setActiveEvent(res.event);
      setReplanRationale(res.rationale || 'Constraints recalculated and rebalanced.');
      setIsEditConstraintsOpen(false);
      showSuccess('Replanning complete! Preserved custom items and re-distributed flexible lines.');
      await loadEventsList(activeEvent.id, true);
    } catch (err: any) {
      showError(err.message || 'Replanning failed');
    } finally {
      setIsReplanning(false);
    }
  };

  // 6. Budget item mutations
  const handleUpdateBudgetItem = async (id: string, updates: Partial<BudgetItemRecord>) => {
    try {
      const updated = await updateBudgetItem(id, updates);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          budget: prev.budget.map((b) => (b.id === id ? updated : b)),
        };
      });
      showSuccess(`Updated allocation: ${updated.category}`);
    } catch (err: any) {
      showError(err.message || 'Failed to update allocation');
    }
  };

  const handleAddBudgetItem = async (item: Omit<BudgetItemRecord, 'id' | 'event_id'>) => {
    if (!activeEvent) return;
    try {
      const created = await addBudgetItem(activeEvent.id, item);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          budget: [created, ...prev.budget],
        };
      });
      showSuccess(`Added allocation line: ${created.category}`);
    } catch (err: any) {
      showError(err.message || 'Failed to add budget line');
    }
  };

  const handleDeleteBudgetItem = async (id: string) => {
    try {
      await deleteBudgetItem(id);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          budget: prev.budget.filter((b) => b.id !== id),
        };
      });
      showSuccess('Allocation line removed');
    } catch (err: any) {
      showError(err.message || 'Failed to delete line');
    }
  };

  // 7. Timeline task mutations
  const handleUpdateTimelineTask = async (id: string, updates: Partial<TimelineTaskRecord>) => {
    try {
      const updated = await updateTimelineTask(id, updates);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeline: prev.timeline.map((t) => (t.id === id ? updated : t)),
        };
      });
    } catch (err: any) {
      showError(err.message || 'Failed to update task');
    }
  };

  const handleAddTimelineTask = async (task: Omit<TimelineTaskRecord, 'id' | 'event_id'>) => {
    if (!activeEvent) return;
    try {
      const created = await addTimelineTask(activeEvent.id, task);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeline: [created, ...prev.timeline],
        };
      });
      showSuccess(`Added milestone: ${created.title}`);
    } catch (err: any) {
      showError(err.message || 'Failed to add milestone');
    }
  };

  const handleDeleteTimelineTask = async (id: string) => {
    try {
      await deleteTimelineTask(id);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeline: prev.timeline.filter((t) => t.id !== id),
        };
      });
      showSuccess('Milestone removed');
    } catch (err: any) {
      showError(err.message || 'Failed to delete milestone');
    }
  };

  // 8. Vendor mutations
  const handleUpdateVendor = async (id: string, updates: Partial<VendorRecord>) => {
    try {
      const updated = await updateVendor(id, updates);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          vendors: prev.vendors.map((v) => (v.id === id ? updated : v)),
        };
      });
    } catch (err: any) {
      showError(err.message || 'Failed to update vendor');
    }
  };

  const handleAddVendor = async (vendor: Omit<VendorRecord, 'id' | 'event_id'>) => {
    if (!activeEvent) return;
    try {
      const created = await addVendor(activeEvent.id, vendor);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          vendors: [created, ...prev.vendors],
        };
      });
      showSuccess(`Added vendor partner: ${created.name}`);
    } catch (err: any) {
      showError(err.message || 'Failed to add vendor');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      await deleteVendor(id);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          vendors: prev.vendors.filter((v) => v.id !== id),
        };
      });
      showSuccess('Vendor partner removed');
    } catch (err: any) {
      showError(err.message || 'Failed to delete vendor');
    }
  };

  // 9. Volunteer mutations (Community Events)
  const handleUpdateVolunteer = async (id: string, updates: Partial<VolunteerRecord>) => {
    try {
      const updated = await updateVolunteer(id, updates);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          volunteers: (prev.volunteers || []).map((v) => (v.id === id ? updated : v)),
        };
      });
    } catch (err: any) {
      showError(err.message || 'Failed to update volunteer role');
    }
  };

  const handleAddVolunteer = async (volunteer: Omit<VolunteerRecord, 'id' | 'event_id'>) => {
    if (!activeEvent) return;
    try {
      const created = await addVolunteer(activeEvent.id, volunteer);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          volunteers: [created, ...(prev.volunteers || [])],
        };
      });
      showSuccess(`Added volunteer role: ${created.role}`);
    } catch (err: any) {
      showError(err.message || 'Failed to add volunteer role');
    }
  };

  const handleDeleteVolunteer = async (id: string) => {
    try {
      await deleteVolunteer(id);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          volunteers: (prev.volunteers || []).filter((v) => v.id !== id),
        };
      });
      showSuccess('Volunteer role removed');
    } catch (err: any) {
      showError(err.message || 'Failed to delete volunteer role');
    }
  };

  // 10. Permit mutations (Community Events)
  const handleUpdatePermit = async (id: string, updates: Partial<PermitRecord>) => {
    try {
      const updated = await updatePermit(id, updates);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          permits: (prev.permits || []).map((p) => (p.id === id ? updated : p)),
        };
      });
    } catch (err: any) {
      showError(err.message || 'Failed to update permit');
    }
  };

  const handleAddPermit = async (permit: Omit<PermitRecord, 'id' | 'event_id'>) => {
    if (!activeEvent) return;
    try {
      const created = await addPermit(activeEvent.id, permit);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          permits: [created, ...(prev.permits || [])],
        };
      });
      showSuccess(`Added permit: ${created.permit_type}`);
    } catch (err: any) {
      showError(err.message || 'Failed to add permit');
    }
  };

  const handleDeletePermit = async (id: string) => {
    try {
      await deletePermit(id);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          permits: (prev.permits || []).filter((p) => p.id !== id),
        };
      });
      showSuccess('Permit removed');
    } catch (err: any) {
      showError(err.message || 'Failed to delete permit');
    }
  };

  // 11. Guest mutations
  const handleUpdateGuest = async (id: string, updates: Partial<GuestRecord>) => {
    try {
      const updated = await updateGuest(id, updates);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          guests: (prev.guests || []).map((g) => (g.id === id ? updated : g)),
        };
      });
    } catch (err: any) {
      showError(err.message || 'Failed to update guest');
    }
  };

  const handleAddGuest = async (guest: Omit<GuestRecord, 'id' | 'event_id'>) => {
    if (!activeEvent) return;
    try {
      const created = await addGuest(activeEvent.id, guest);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          guests: [created, ...(prev.guests || [])],
        };
      });
      showSuccess(`Added guest: ${created.name}`);
    } catch (err: any) {
      showError(err.message || 'Failed to add guest');
    }
  };

  const handleDeleteGuest = async (id: string) => {
    try {
      await deleteGuest(id);
      setActiveEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          guests: (prev.guests || []).filter((g) => g.id !== id),
        };
      });
      showSuccess('Guest removed');
    } catch (err: any) {
      showError(err.message || 'Failed to delete guest');
    }
  };


  return (
    <div className="min-h-screen min-h-[100dvh] full-page-container bg-[#EEEDEA] text-[#111111] flex flex-col font-sans selection:bg-[#E0A37E]/40">
      {/* 1. Terracotta Arch Editorial Glass Navbar */}
      <Navbar
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        currentUserId={currentUserId}
        onChangeUser={handleChangeUser}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* 2. Saturated Screen-One Architectural Hero */}
      <TerracottaArchwaysHero
        onOpenCreate={() => setIsCreateModalOpen(true)}
        onOpenReplan={() => setIsEditConstraintsOpen(true)}
        onSelectTab={handleTabChange}
        onScrollToWorkspace={handleScrollToWorkspace}
        hasActiveEvent={Boolean(activeEvent)}
        activeEventName={activeEvent?.name}
        isCollapsed={isHeroCollapsed}
        onToggleCollapse={() => setIsHeroCollapsed((prev) => !prev)}
      />

      {/* 3. Stone-Grey Canvas Workspace */}
      <main id="planner-workspace" className="flex-1 max-w-[1560px] w-full mx-auto px-6 sm:px-10 lg:px-16 py-16 space-y-12">

        {/* Loading Spinner */}
        {isLoading && !activeEvent ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#7A7571] font-medium tracking-wide">Synthesizing architectural data...</p>
          </div>
        ) : activeEvent ? (
          <div className="space-y-12">
            {/* Section Eyebrow + Headline Module */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#14372D]/20 text-xs text-[#7A7571] font-medium tracking-wide bg-white/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E0A37E]" />
                <span>Interconnected Constraint Workspace</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-[-1.5px] text-[#111111] leading-tight">
                Harmonized <span className="accent-serif">architecture</span> across budget and time.
              </h2>
              <p className="text-sm text-[#7A7571] font-normal leading-relaxed">
                Click any line to edit. Changing core constraints immediately triggers a partial replan of affected sections.
              </p>
            </div>

            {/* Dark Inverted Event Overview Banner */}
            <EventOverviewBanner
              event={activeEvent}
              onOpenEditConstraints={() => setIsEditConstraintsOpen(true)}
              onRegenerate={handleGeneratePlan}
              onOpenExport={() => setIsExportModalOpen(true)}
              onOpenAssistant={() => handleTabChange('assistant')}
              isGenerating={isGenerating}
              replanRationale={replanRationale}
              onDismissRationale={() => setReplanRationale(null)}
            />

            {/* View Selector Tabs & Delete Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#14372D]/15 pb-4">
              <nav className="flex items-center gap-2 overflow-x-auto text-xs" aria-label="Planner sections">
                <button
                  onClick={() => handleTabChange('assistant')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    activeTab === 'assistant'
                      ? 'bg-[#E0A37E] text-black font-semibold shadow-md'
                      : 'bg-[#111111] text-[#F2CBB2] hover:bg-[#413936]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>✦ AI Planning Assistant</span>
                </button>

                <button
                  onClick={() => handleTabChange('all')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#111111] text-[#EEEDEA]'
                      : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Unified Overview</span>
                </button>

                <button
                  onClick={() => handleTabChange('budget')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    activeTab === 'budget'
                      ? 'bg-[#111111] text-[#EEEDEA]'
                      : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Allocations ({activeEvent.budget.length})</span>
                </button>

                <button
                  onClick={() => handleTabChange('timeline')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    activeTab === 'timeline'
                      ? 'bg-[#111111] text-[#EEEDEA]'
                      : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timeline Tasks ({activeEvent.timeline.length})</span>
                </button>

                {activeEvent.type === 'community' ? (
                  <button
                    onClick={() => handleTabChange('civic')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                      activeTab === 'civic'
                        ? 'bg-[#111111] text-[#EEEDEA]'
                        : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E0A37E]" />
                    <span>Volunteers & Permits ({(activeEvent.volunteers?.length || 0) + (activeEvent.permits?.length || 0)})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleTabChange('vendors')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                      activeTab === 'vendors'
                        ? 'bg-[#111111] text-[#EEEDEA]'
                        : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Vendors ({activeEvent.vendors.length})</span>
                  </button>
                )}

                <button
                  onClick={() => handleTabChange('guests')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    activeTab === 'guests'
                      ? 'bg-[#111111] text-[#EEEDEA]'
                      : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Guests & RSVPs ({activeEvent.guests?.length || 0})</span>
                </button>

                <button
                  onClick={() => handleTabChange('ideas')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    activeTab === 'ideas'
                      ? 'bg-[#111111] text-[#EEEDEA]'
                      : 'text-[#7A7571] hover:text-[#111111] hover:bg-black/5'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Concepts ({activeEvent.ideas.length})</span>
                </button>
              </nav>

              <div className="flex items-center justify-end">
                <button
                  onClick={handleDeleteActiveEvent}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-rose-800 hover:text-rose-950 font-medium rounded-full border border-rose-300 hover:bg-rose-50 transition"
                  title="Delete event and all linked data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Gathering</span>
                </button>
              </div>
            </div>

            {/* Asymmetric / Tabbed Sections */}
            {activeTab === 'assistant' && (
              <div className="space-y-6">
                <PlanningAssistant
                  event={activeEvent}
                  onRefreshEvent={async () => {
                    const refreshed = await fetchEvent(activeEvent.id);
                    setActiveEvent(refreshed);
                  }}
                  onApplyAction={handleApplyAssistantAction}
                  onOpenReplan={() => setIsEditConstraintsOpen(true)}
                />
              </div>
            )}

            {activeTab === 'all' && (
              <div className="space-y-12">
                {/* GenAI Planning Assistant Concierge at top of Unified Overview */}
                <PlanningAssistant
                  event={activeEvent}
                  onRefreshEvent={async () => {
                    const refreshed = await fetchEvent(activeEvent.id);
                    setActiveEvent(refreshed);
                  }}
                  onApplyAction={handleApplyAssistantAction}
                  onOpenReplan={() => setIsEditConstraintsOpen(true)}
                />

                {/* Full-width Row: Budget Breakdown */}
                <BudgetSection
                  items={activeEvent.budget}
                  totalBudget={activeEvent.total_budget}
                  onUpdateItem={handleUpdateBudgetItem}
                  onAddItem={handleAddBudgetItem}
                  onDeleteItem={handleDeleteBudgetItem}
                  onTriggerReplan={() => setIsEditConstraintsOpen(true)}
                />

                {/* 2-Column Split: Timeline & (Vendors or Civic Logistics) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <TimelineSection
                    tasks={activeEvent.timeline}
                    eventDate={activeEvent.date}
                    onUpdateTask={handleUpdateTimelineTask}
                    onAddTask={handleAddTimelineTask}
                    onDeleteTask={handleDeleteTimelineTask}
                  />

                  {activeEvent.type === 'community' ? (
                    <CivicLogisticsSection
                      volunteers={activeEvent.volunteers || []}
                      permits={activeEvent.permits || []}
                      eventName={activeEvent.name}
                      eventLocation={activeEvent.location}
                      onAddVolunteer={handleAddVolunteer}
                      onUpdateVolunteer={handleUpdateVolunteer}
                      onDeleteVolunteer={handleDeleteVolunteer}
                      onAddPermit={handleAddPermit}
                      onUpdatePermit={handleUpdatePermit}
                      onDeletePermit={handleDeletePermit}
                    />
                  ) : (
                    <VendorSection
                      vendors={activeEvent.vendors}
                      eventName={activeEvent.name}
                      eventDate={activeEvent.date}
                      eventLocation={activeEvent.location}
                      guestCount={activeEvent.guest_count}
                      onUpdateVendor={handleUpdateVendor}
                      onAddVendor={handleAddVendor}
                      onDeleteVendor={handleDeleteVendor}
                    />
                  )}
                </div>

                {/* Full-width Row: Guest List & RSVP Manager */}
                <GuestListSection
                  guests={activeEvent.guests || []}
                  targetGuestCount={activeEvent.guest_count}
                  onAddGuest={handleAddGuest}
                  onUpdateGuest={handleUpdateGuest}
                  onDeleteGuest={handleDeleteGuest}
                />

                {/* Concept Notes Mosaic */}
                <IdeasSection
                  ideas={activeEvent.ideas}
                  vibe={activeEvent.vibe}
                  location={activeEvent.location}
                />
              </div>
            )}

            {activeTab === 'budget' && (
              <BudgetSection
                items={activeEvent.budget}
                totalBudget={activeEvent.total_budget}
                onUpdateItem={handleUpdateBudgetItem}
                onAddItem={handleAddBudgetItem}
                onDeleteItem={handleDeleteBudgetItem}
                onTriggerReplan={() => setIsEditConstraintsOpen(true)}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineSection
                tasks={activeEvent.timeline}
                eventDate={activeEvent.date}
                onUpdateTask={handleUpdateTimelineTask}
                onAddTask={handleAddTimelineTask}
                onDeleteTask={handleDeleteTimelineTask}
              />
            )}

            {activeTab === 'vendors' && activeEvent.type !== 'community' && (
              <VendorSection
                vendors={activeEvent.vendors}
                eventName={activeEvent.name}
                eventDate={activeEvent.date}
                eventLocation={activeEvent.location}
                guestCount={activeEvent.guest_count}
                onUpdateVendor={handleUpdateVendor}
                onAddVendor={handleAddVendor}
                onDeleteVendor={handleDeleteVendor}
              />
            )}

            {activeTab === 'civic' && (
              <CivicLogisticsSection
                volunteers={activeEvent.volunteers || []}
                permits={activeEvent.permits || []}
                eventName={activeEvent.name}
                eventLocation={activeEvent.location}
                onAddVolunteer={handleAddVolunteer}
                onUpdateVolunteer={handleUpdateVolunteer}
                onDeleteVolunteer={handleDeleteVolunteer}
                onAddPermit={handleAddPermit}
                onUpdatePermit={handleUpdatePermit}
                onDeletePermit={handleDeletePermit}
              />
            )}

            {activeTab === 'guests' && (
              <GuestListSection
                guests={activeEvent.guests || []}
                targetGuestCount={activeEvent.guest_count}
                onAddGuest={handleAddGuest}
                onUpdateGuest={handleUpdateGuest}
                onDeleteGuest={handleDeleteGuest}
              />
            )}

            {activeTab === 'ideas' && (
              <IdeasSection
                ideas={activeEvent.ideas}
                vibe={activeEvent.vibe}
                location={activeEvent.location}
              />
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="py-24 text-center max-w-md mx-auto space-y-4">
            <h3 className="text-2xl font-medium text-[#111111]">No Gatherings Recorded</h3>
            <p className="text-xs text-[#7A7571] leading-relaxed">
              Create an event with your desired date, guest headcount, and hard budget to generate a mutually consistent event plan powered by Groq GenAI.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] font-medium text-xs shadow-sm transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E0A37E]" />
              <span>Create Your First Gathering</span>
            </button>
          </div>
        )}
      </main>

      {/* 4. Collapsible Editorial Showcase & Manifesto */}
      <div className="border-t border-[#14372D]/15 bg-[#111111] text-[#EEEDEA] py-3.5">
        <div className="max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E0A37E]" />
            <span className="text-xs uppercase tracking-wider text-[#DCD8D5]/70 font-medium">
              Editorial Showcase, Quotes & Testimonials
            </span>
          </div>
          <button
            onClick={() => setShowEditorialStory((prev) => !prev)}
            className="text-xs text-[#E0A37E] hover:text-white font-medium flex items-center gap-1.5 transition px-3 py-1 rounded-full bg-white/5 hover:bg-white/10"
          >
            {showEditorialStory || !activeEvent ? 'Hide Showcase ▴' : 'View Editorial Showcase ▾'}
          </button>
        </div>
      </div>

      {(showEditorialStory || !activeEvent) && (
        <>
          <EditorialQuotePanel
            onOpenReplan={() => setIsEditConstraintsOpen(true)}
          />
          <TestimonialRail />
          <ClosingCtaBand
            onOpenCreate={() => setIsCreateModalOpen(true)}
          />
        </>
      )}

      {/* 7. Comprehensive Dark Footer */}
      <EditorialFooter />

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateEvent}
        isCreating={isCreating}
      />

      {activeEvent && (
        <ConstraintEditModal
          event={activeEvent}
          isOpen={isEditConstraintsOpen}
          onClose={() => setIsEditConstraintsOpen(false)}
          onSaveAndReplan={handleSaveAndReplan}
          onSaveOnly={handleSaveConstraintsOnly}
          isReplanning={isReplanning}
        />
      )}

      <ExportModal
        event={activeEvent}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Floating Quick GenAI Planning Assistant Trigger */}
      {activeEvent && activeTab !== 'assistant' && (
        <button
          onClick={() => handleTabChange('assistant')}
          className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-full bg-[#111111] text-[#EEEDEA] border border-[#E0A37E]/50 hover:border-[#E0A37E] shadow-2xl flex items-center gap-2.5 text-xs font-semibold hover:bg-black hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="Open GenAI Planning Assistant"
        >
          <Sparkles className="w-4 h-4 text-[#E0A37E] group-hover:rotate-12 transition-transform" />
          <span>Ask AI Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Floating Overlay Toasts (Zero Layout Shift / No Page Jumping) */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-2">
        {errorMessage && (
          <div className="pointer-events-auto p-4 rounded-xl bg-[#2A1010]/95 backdrop-blur-md border border-rose-500/40 text-rose-200 text-xs shadow-2xl flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-semibold p-1 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="pointer-events-auto p-4 rounded-xl bg-[#0F2417]/95 backdrop-blur-md border border-emerald-500/40 text-emerald-200 text-xs shadow-2xl flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white font-semibold p-1 ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

