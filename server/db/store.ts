import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  EventRecord,
  BudgetItemRecord,
  TimelineTaskRecord,
  VendorRecord,
  VolunteerRecord,
  PermitRecord,
  GuestRecord,
  IdeaRecord,
  EventWithDetails,
  PlanGenerationPayload,
  ReplanLogRecord,
  EventType,
} from '../types.js';

interface DatabaseSchema {
  events: Record<string, EventRecord>;
  budget_items: Record<string, BudgetItemRecord>;
  timeline_tasks: Record<string, TimelineTaskRecord>;
  vendors: Record<string, VendorRecord>;
  volunteers: Record<string, VolunteerRecord>;
  permits: Record<string, PermitRecord>;
  guests: Record<string, GuestRecord>;
  ideas: Record<string, IdeaRecord>;
  replan_logs: Record<string, ReplanLogRecord>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'events-store.json');

class EventStore {
  private data: DatabaseSchema = {
    events: {},
    budget_items: {},
    timeline_tasks: {},
    vendors: {},
    volunteers: {},
    permits: {},
    guests: {},
    ideas: {},
    replan_logs: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          events: parsed.events || {},
          budget_items: parsed.budget_items || {},
          timeline_tasks: parsed.timeline_tasks || {},
          vendors: parsed.vendors || {},
          volunteers: parsed.volunteers || {},
          permits: parsed.permits || {},
          guests: parsed.guests || {},
          ideas: parsed.ideas || {},
          replan_logs: parsed.replan_logs || {},
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('Error initializing store:', err);
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  // Row-Level Security verification helper
  private verifyEventOwnership(eventId: string, ownerId: string): EventRecord {
    const event = this.data.events[eventId];
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }
    if (event.owner_id !== ownerId) {
      throw new Error(`Access denied: User ${ownerId} is not the owner of event ${eventId}`);
    }
    return event;
  }

  // Events CRUD
  public listEvents(ownerId: string): EventRecord[] {
    return Object.values(this.data.events)
      .filter((e) => e.owner_id === ownerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getEvent(eventId: string, ownerId: string): EventWithDetails {
    const event = this.verifyEventOwnership(eventId, ownerId);

    const budget = Object.values(this.data.budget_items)
      .filter((b) => b.event_id === eventId)
      .sort((a, b) => b.estimated_cost - a.estimated_cost);

    const timeline = Object.values(this.data.timeline_tasks)
      .filter((t) => t.event_id === eventId)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const vendors = Object.values(this.data.vendors)
      .filter((v) => v.event_id === eventId)
      .sort((a, b) => b.estimated_cost - a.estimated_cost);

    const volunteers = Object.values(this.data.volunteers || {})
      .filter((v) => v.event_id === eventId)
      .sort((a, b) => b.count_needed - a.count_needed);

    const permits = Object.values(this.data.permits || {})
      .filter((p) => p.event_id === eventId)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    const guests = Object.values(this.data.guests || {})
      .filter((g) => g.event_id === eventId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const ideas = Object.values(this.data.ideas).filter((i) => i.event_id === eventId);

    const replan_history = Object.values(this.data.replan_logs)
      .filter((r) => r.event_id === eventId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      ...event,
      budget,
      timeline,
      vendors,
      volunteers,
      permits,
      guests,
      ideas,
      replan_history,
    };
  }

  public createEvent(
    params: {
      type: EventType;
      name: string;
      date: string;
      guest_count: number;
      location: string;
      total_budget: number;
      vibe: string;
    },
    ownerId: string
  ): EventRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newEvent: EventRecord = {
      id,
      owner_id: ownerId,
      type: params.type,
      name: params.name,
      date: params.date,
      guest_count: Number(params.guest_count),
      location: params.location,
      total_budget: Number(params.total_budget),
      vibe: params.vibe || '',
      created_at: now,
      updated_at: now,
    };

    this.data.events[id] = newEvent;
    this.persist();
    return newEvent;
  }

  public updateEvent(
    eventId: string,
    ownerId: string,
    updates: Partial<Pick<EventRecord, 'name' | 'type' | 'date' | 'guest_count' | 'location' | 'total_budget' | 'vibe'>>
  ): EventRecord {
    const event = this.verifyEventOwnership(eventId, ownerId);

    if (updates.name !== undefined) event.name = updates.name;
    if (updates.type !== undefined) event.type = updates.type;
    if (updates.date !== undefined) event.date = updates.date;
    if (updates.guest_count !== undefined) event.guest_count = Number(updates.guest_count);
    if (updates.location !== undefined) event.location = updates.location;
    if (updates.total_budget !== undefined) event.total_budget = Number(updates.total_budget);
    if (updates.vibe !== undefined) event.vibe = updates.vibe;

    event.updated_at = new Date().toISOString();
    this.data.events[eventId] = event;
    this.persist();
    return event;
  }

  public deleteEvent(eventId: string, ownerId: string): void {
    this.verifyEventOwnership(eventId, ownerId);

    delete this.data.events[eventId];

    for (const [id, item] of Object.entries(this.data.budget_items)) {
      if (item.event_id === eventId) delete this.data.budget_items[id];
    }
    for (const [id, item] of Object.entries(this.data.timeline_tasks)) {
      if (item.event_id === eventId) delete this.data.timeline_tasks[id];
    }
    for (const [id, item] of Object.entries(this.data.vendors)) {
      if (item.event_id === eventId) delete this.data.vendors[id];
    }
    for (const [id, item] of Object.entries(this.data.volunteers || {})) {
      if (item.event_id === eventId) delete this.data.volunteers[id];
    }
    for (const [id, item] of Object.entries(this.data.permits || {})) {
      if (item.event_id === eventId) delete this.data.permits[id];
    }
    for (const [id, item] of Object.entries(this.data.guests || {})) {
      if (item.event_id === eventId) delete this.data.guests[id];
    }
    for (const [id, item] of Object.entries(this.data.ideas)) {
      if (item.event_id === eventId) delete this.data.ideas[id];
    }
    for (const [id, item] of Object.entries(this.data.replan_logs)) {
      if (item.event_id === eventId) delete this.data.replan_logs[id];
    }

    this.persist();
  }

  // Save full generated plan
  public saveGeneratedPlan(eventId: string, ownerId: string, payload: PlanGenerationPayload): EventWithDetails {
    this.verifyEventOwnership(eventId, ownerId);

    // Clear previous unedited items for fresh generation
    for (const [id, item] of Object.entries(this.data.budget_items)) {
      if (item.event_id === eventId) delete this.data.budget_items[id];
    }
    for (const [id, item] of Object.entries(this.data.timeline_tasks)) {
      if (item.event_id === eventId) delete this.data.timeline_tasks[id];
    }
    for (const [id, item] of Object.entries(this.data.vendors)) {
      if (item.event_id === eventId) delete this.data.vendors[id];
    }
    for (const [id, item] of Object.entries(this.data.volunteers || {})) {
      if (item.event_id === eventId) delete this.data.volunteers[id];
    }
    for (const [id, item] of Object.entries(this.data.permits || {})) {
      if (item.event_id === eventId) delete this.data.permits[id];
    }
    for (const [id, item] of Object.entries(this.data.ideas)) {
      if (item.event_id === eventId) delete this.data.ideas[id];
    }

    // Insert Budget items
    for (const item of payload.budget || []) {
      const id = crypto.randomUUID();
      this.data.budget_items[id] = {
        id,
        event_id: eventId,
        category: item.category,
        estimated_cost: Number(item.estimated_cost),
        actual_cost: null,
        status: 'planned',
        notes: item.notes || '',
      };
    }

    // Insert Timeline tasks
    for (const task of payload.timeline || []) {
      const id = crypto.randomUUID();
      this.data.timeline_tasks[id] = {
        id,
        event_id: eventId,
        title: task.title,
        category: task.category,
        due_date: task.due_date,
        status: 'pending',
        notes: task.notes || '',
      };
    }

    // Insert Vendors (for wedding/birthday/social events)
    if (Array.isArray(payload.vendors)) {
      for (const vendor of payload.vendors) {
        const id = crypto.randomUUID();
        this.data.vendors[id] = {
          id,
          event_id: eventId,
          category: vendor.category,
          name: vendor.suggested_name_or_type,
          contact: null,
          estimated_cost: Number(vendor.estimated_cost),
          status: 'shortlisted',
          notes: vendor.notes || '',
        };
      }
    }

    // Insert Volunteers (for community events)
    if (Array.isArray(payload.volunteers)) {
      for (const vol of payload.volunteers) {
        const id = crypto.randomUUID();
        this.data.volunteers[id] = {
          id,
          event_id: eventId,
          role: vol.role,
          contact_name: vol.contact_name || 'Open Shift',
          shift_time: vol.shift_time || 'Event Day (4 hrs)',
          count_needed: Number(vol.count_needed) || 5,
          count_confirmed: 0,
          status: 'recruiting',
          notes: vol.notes || '',
        };
      }
    }

    // Insert Permits (for community events)
    if (Array.isArray(payload.permits)) {
      for (const permit of payload.permits) {
        const id = crypto.randomUUID();
        this.data.permits[id] = {
          id,
          event_id: eventId,
          permit_type: permit.permit_type,
          issuing_agency: permit.issuing_agency || 'City / County Authority',
          status: permit.status || 'required',
          fee: Number(permit.fee) || 0,
          deadline: permit.deadline || '',
          notes: permit.notes || '',
        };
      }
    }

    // Insert Ideas
    for (const idea of payload.ideas || []) {
      const id = crypto.randomUUID();
      this.data.ideas[id] = {
        id,
        event_id: eventId,
        theme: idea.theme,
        description: idea.description,
      };
    }

    this.persist();
    return this.getEvent(eventId, ownerId);
  }

  // Replan: Merge AI replanning into existing plan, preserving user-locked/edited items
  public applyReplan(
    eventId: string,
    ownerId: string,
    payload: PlanGenerationPayload,
    logData: {
      old_budget: number;
      new_budget: number;
      old_guest_count: number;
      new_guest_count: number;
      rationale: string;
    }
  ): EventWithDetails {
    this.verifyEventOwnership(eventId, ownerId);

    // 1. Budget: Retain user-edited or paid items; update or replace rest
    const existingBudget = Object.values(this.data.budget_items).filter((b) => b.event_id === eventId);
    const userEditedBudget = existingBudget.filter((b) => b.is_user_edited || b.status === 'paid' || b.actual_cost !== null);
    const preservedCategories = new Set(userEditedBudget.map((b) => b.category.toLowerCase()));

    // Remove unedited budget items
    for (const b of existingBudget) {
      if (!userEditedBudget.some((p) => p.id === b.id)) {
        delete this.data.budget_items[b.id];
      }
    }

    // Add generated budget items that don't overwrite locked categories
    for (const item of payload.budget) {
      if (!preservedCategories.has(item.category.toLowerCase())) {
        const id = crypto.randomUUID();
        this.data.budget_items[id] = {
          id,
          event_id: eventId,
          category: item.category,
          estimated_cost: Number(item.estimated_cost),
          actual_cost: null,
          status: 'planned',
          notes: item.notes || '',
        };
      }
    }

    // 2. Timeline: Retain completed or user-edited tasks
    const existingTimeline = Object.values(this.data.timeline_tasks).filter((t) => t.event_id === eventId);
    const userEditedTimeline = existingTimeline.filter((t) => t.is_user_edited || t.status === 'completed');
    const preservedTitles = new Set(userEditedTimeline.map((t) => t.title.toLowerCase()));

    for (const t of existingTimeline) {
      if (!userEditedTimeline.some((p) => p.id === t.id)) {
        delete this.data.timeline_tasks[t.id];
      }
    }

    for (const task of payload.timeline) {
      if (!preservedTitles.has(task.title.toLowerCase())) {
        const id = crypto.randomUUID();
        this.data.timeline_tasks[id] = {
          id,
          event_id: eventId,
          title: task.title,
          category: task.category,
          due_date: task.due_date,
          status: 'pending',
          notes: task.notes || '',
        };
      }
    }

    // 3. Vendors: Retain booked or user-edited vendors
    const existingVendors = Object.values(this.data.vendors).filter((v) => v.event_id === eventId);
    const userEditedVendors = existingVendors.filter((v) => v.is_user_edited || v.status === 'booked' || v.contact !== null);
    const preservedVendorCategories = new Set(userEditedVendors.map((v) => v.category.toLowerCase()));

    for (const v of existingVendors) {
      if (!userEditedVendors.some((p) => p.id === v.id)) {
        delete this.data.vendors[v.id];
      }
    }

    if (Array.isArray(payload.vendors) && payload.vendors.length > 0) {
      for (const vendor of payload.vendors) {
        if (!preservedVendorCategories.has(vendor.category.toLowerCase())) {
          const id = crypto.randomUUID();
          this.data.vendors[id] = {
            id,
            event_id: eventId,
            category: vendor.category,
            name: vendor.suggested_name_or_type,
            contact: null,
            estimated_cost: Number(vendor.estimated_cost),
            status: 'shortlisted',
            notes: vendor.notes || '',
          };
        }
      }
    }

    // 4. Volunteers: Retain user-edited or confirmed volunteers
    if (Array.isArray(payload.volunteers)) {
      const existingVolunteers = Object.values(this.data.volunteers || {}).filter((v) => v.event_id === eventId);
      const userEditedVolunteers = existingVolunteers.filter((v) => v.is_user_edited || v.status === 'filled' || v.count_confirmed > 0);
      const preservedRoles = new Set(userEditedVolunteers.map((v) => v.role.toLowerCase()));

      for (const v of existingVolunteers) {
        if (!userEditedVolunteers.some((p) => p.id === v.id)) {
          delete this.data.volunteers[v.id];
        }
      }

      for (const vol of payload.volunteers) {
        if (!preservedRoles.has(vol.role.toLowerCase())) {
          const id = crypto.randomUUID();
          this.data.volunteers[id] = {
            id,
            event_id: eventId,
            role: vol.role,
            contact_name: vol.contact_name || 'Open Shift',
            shift_time: vol.shift_time || 'Event Day (4 hrs)',
            count_needed: Number(vol.count_needed) || 5,
            count_confirmed: 0,
            status: 'recruiting',
            notes: vol.notes || '',
          };
        }
      }
    }

    // 5. Permits: Retain user-edited or approved permits
    if (Array.isArray(payload.permits)) {
      const existingPermits = Object.values(this.data.permits || {}).filter((p) => p.event_id === eventId);
      const userEditedPermits = existingPermits.filter((p) => p.is_user_edited || p.status === 'approved' || p.status === 'in_progress');
      const preservedPermitTypes = new Set(userEditedPermits.map((p) => p.permit_type.toLowerCase()));

      for (const p of existingPermits) {
        if (!userEditedPermits.some((ep) => ep.id === p.id)) {
          delete this.data.permits[p.id];
        }
      }

      for (const permit of payload.permits) {
        if (!preservedPermitTypes.has(permit.permit_type.toLowerCase())) {
          const id = crypto.randomUUID();
          this.data.permits[id] = {
            id,
            event_id: eventId,
            permit_type: permit.permit_type,
            issuing_agency: permit.issuing_agency || 'City / County Authority',
            status: permit.status || 'required',
            fee: Number(permit.fee) || 0,
            deadline: permit.deadline || '',
            notes: permit.notes || '',
          };
        }
      }
    }


    // 4. Update ideas if provided
    if (payload.ideas && payload.ideas.length > 0) {
      for (const [id, item] of Object.entries(this.data.ideas)) {
        if (item.event_id === eventId) delete this.data.ideas[id];
      }
      for (const idea of payload.ideas) {
        const id = crypto.randomUUID();
        this.data.ideas[id] = {
          id,
          event_id: eventId,
          theme: idea.theme,
          description: idea.description,
        };
      }
    }

    // Record replan log for traceability
    const logId = crypto.randomUUID();
    this.data.replan_logs[logId] = {
      id: logId,
      event_id: eventId,
      timestamp: new Date().toISOString(),
      old_budget: logData.old_budget,
      new_budget: logData.new_budget,
      old_guest_count: logData.old_guest_count,
      new_guest_count: logData.new_guest_count,
      rationale: logData.rationale || payload.replan_rationale || 'Constraints updated and sections rebalanced.',
    };

    this.persist();
    return this.getEvent(eventId, ownerId);
  }

  // Budget item operations
  public updateBudgetItem(
    itemId: string,
    ownerId: string,
    updates: Partial<Pick<BudgetItemRecord, 'category' | 'estimated_cost' | 'actual_cost' | 'status' | 'notes'>>
  ): BudgetItemRecord {
    const item = this.data.budget_items[itemId];
    if (!item) throw new Error(`Budget item ${itemId} not found`);
    this.verifyEventOwnership(item.event_id, ownerId);

    if (updates.category !== undefined) item.category = updates.category;
    if (updates.estimated_cost !== undefined) item.estimated_cost = Number(updates.estimated_cost);
    if (updates.actual_cost !== undefined) item.actual_cost = updates.actual_cost !== null ? Number(updates.actual_cost) : null;
    if (updates.status !== undefined) item.status = updates.status;
    if (updates.notes !== undefined) item.notes = updates.notes;
    item.is_user_edited = true;

    this.data.budget_items[itemId] = item;
    this.persist();
    return item;
  }

  public addBudgetItem(
    eventId: string,
    ownerId: string,
    item: Omit<BudgetItemRecord, 'id' | 'event_id'>
  ): BudgetItemRecord {
    this.verifyEventOwnership(eventId, ownerId);
    const id = crypto.randomUUID();
    const record: BudgetItemRecord = {
      ...item,
      id,
      event_id: eventId,
      is_user_edited: true,
    };
    this.data.budget_items[id] = record;
    this.persist();
    return record;
  }

  public deleteBudgetItem(itemId: string, ownerId: string): void {
    const item = this.data.budget_items[itemId];
    if (!item) throw new Error(`Budget item ${itemId} not found`);
    this.verifyEventOwnership(item.event_id, ownerId);
    delete this.data.budget_items[itemId];
    this.persist();
  }

  // Timeline task operations
  public updateTimelineTask(
    taskId: string,
    ownerId: string,
    updates: Partial<Pick<TimelineTaskRecord, 'title' | 'category' | 'due_date' | 'status' | 'notes'>>
  ): TimelineTaskRecord {
    const task = this.data.timeline_tasks[taskId];
    if (!task) throw new Error(`Timeline task ${taskId} not found`);
    this.verifyEventOwnership(task.event_id, ownerId);

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.category !== undefined) task.category = updates.category;
    if (updates.due_date !== undefined) task.due_date = updates.due_date;
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.notes !== undefined) task.notes = updates.notes;
    task.is_user_edited = true;

    this.data.timeline_tasks[taskId] = task;
    this.persist();
    return task;
  }

  public addTimelineTask(
    eventId: string,
    ownerId: string,
    task: Omit<TimelineTaskRecord, 'id' | 'event_id'>
  ): TimelineTaskRecord {
    this.verifyEventOwnership(eventId, ownerId);
    const id = crypto.randomUUID();
    const record: TimelineTaskRecord = {
      ...task,
      id,
      event_id: eventId,
      is_user_edited: true,
    };
    this.data.timeline_tasks[id] = record;
    this.persist();
    return record;
  }

  public deleteTimelineTask(taskId: string, ownerId: string): void {
    const task = this.data.timeline_tasks[taskId];
    if (!task) throw new Error(`Timeline task ${taskId} not found`);
    this.verifyEventOwnership(task.event_id, ownerId);
    delete this.data.timeline_tasks[taskId];
    this.persist();
  }

  // Vendor operations
  public updateVendor(
    vendorId: string,
    ownerId: string,
    updates: Partial<Pick<VendorRecord, 'category' | 'name' | 'contact' | 'estimated_cost' | 'status' | 'notes'>>
  ): VendorRecord {
    const vendor = this.data.vendors[vendorId];
    if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
    this.verifyEventOwnership(vendor.event_id, ownerId);

    if (updates.category !== undefined) vendor.category = updates.category;
    if (updates.name !== undefined) vendor.name = updates.name;
    if (updates.contact !== undefined) vendor.contact = updates.contact;
    if (updates.estimated_cost !== undefined) vendor.estimated_cost = Number(updates.estimated_cost);
    if (updates.status !== undefined) vendor.status = updates.status;
    if (updates.notes !== undefined) vendor.notes = updates.notes;
    vendor.is_user_edited = true;

    this.data.vendors[vendorId] = vendor;
    this.persist();
    return vendor;
  }

  public addVendor(
    eventId: string,
    ownerId: string,
    vendor: Omit<VendorRecord, 'id' | 'event_id'>
  ): VendorRecord {
    this.verifyEventOwnership(eventId, ownerId);
    const id = crypto.randomUUID();
    const record: VendorRecord = {
      ...vendor,
      id,
      event_id: eventId,
      is_user_edited: true,
    };
    this.data.vendors[id] = record;
    this.persist();
    return record;
  }

  public deleteVendor(vendorId: string, ownerId: string): void {
    const vendor = this.data.vendors[vendorId];
    if (!vendor) throw new Error(`Vendor ${vendorId} not found`);
    this.verifyEventOwnership(vendor.event_id, ownerId);
    delete this.data.vendors[vendorId];
    this.persist();
  }

  // Volunteer operations (Community Events)
  public updateVolunteer(
    volunteerId: string,
    ownerId: string,
    updates: Partial<Pick<VolunteerRecord, 'role' | 'contact_name' | 'shift_time' | 'count_needed' | 'count_confirmed' | 'status' | 'notes'>>
  ): VolunteerRecord {
    const vol = (this.data.volunteers || {})[volunteerId];
    if (!vol) throw new Error(`Volunteer role ${volunteerId} not found`);
    this.verifyEventOwnership(vol.event_id, ownerId);

    if (updates.role !== undefined) vol.role = updates.role;
    if (updates.contact_name !== undefined) vol.contact_name = updates.contact_name;
    if (updates.shift_time !== undefined) vol.shift_time = updates.shift_time;
    if (updates.count_needed !== undefined) vol.count_needed = Number(updates.count_needed);
    if (updates.count_confirmed !== undefined) vol.count_confirmed = Number(updates.count_confirmed);
    if (updates.status !== undefined) vol.status = updates.status;
    if (updates.notes !== undefined) vol.notes = updates.notes;
    vol.is_user_edited = true;

    this.data.volunteers[volunteerId] = vol;
    this.persist();
    return vol;
  }

  public addVolunteer(
    eventId: string,
    ownerId: string,
    volunteer: Omit<VolunteerRecord, 'id' | 'event_id'>
  ): VolunteerRecord {
    this.verifyEventOwnership(eventId, ownerId);
    if (!this.data.volunteers) this.data.volunteers = {};
    const id = crypto.randomUUID();
    const record: VolunteerRecord = {
      ...volunteer,
      id,
      event_id: eventId,
      is_user_edited: true,
    };
    this.data.volunteers[id] = record;
    this.persist();
    return record;
  }

  public deleteVolunteer(volunteerId: string, ownerId: string): void {
    const vol = (this.data.volunteers || {})[volunteerId];
    if (!vol) throw new Error(`Volunteer role ${volunteerId} not found`);
    this.verifyEventOwnership(vol.event_id, ownerId);
    delete this.data.volunteers[volunteerId];
    this.persist();
  }

  // Permit operations (Community Events)
  public updatePermit(
    permitId: string,
    ownerId: string,
    updates: Partial<Pick<PermitRecord, 'permit_type' | 'issuing_agency' | 'status' | 'fee' | 'deadline' | 'notes'>>
  ): PermitRecord {
    const permit = (this.data.permits || {})[permitId];
    if (!permit) throw new Error(`Permit ${permitId} not found`);
    this.verifyEventOwnership(permit.event_id, ownerId);

    if (updates.permit_type !== undefined) permit.permit_type = updates.permit_type;
    if (updates.issuing_agency !== undefined) permit.issuing_agency = updates.issuing_agency;
    if (updates.status !== undefined) permit.status = updates.status;
    if (updates.fee !== undefined) permit.fee = Number(updates.fee);
    if (updates.deadline !== undefined) permit.deadline = updates.deadline;
    if (updates.notes !== undefined) permit.notes = updates.notes;
    permit.is_user_edited = true;

    this.data.permits[permitId] = permit;
    this.persist();
    return permit;
  }

  public addPermit(
    eventId: string,
    ownerId: string,
    permit: Omit<PermitRecord, 'id' | 'event_id'>
  ): PermitRecord {
    this.verifyEventOwnership(eventId, ownerId);
    if (!this.data.permits) this.data.permits = {};
    const id = crypto.randomUUID();
    const record: PermitRecord = {
      ...permit,
      id,
      event_id: eventId,
      is_user_edited: true,
    };
    this.data.permits[id] = record;
    this.persist();
    return record;
  }

  public deletePermit(permitId: string, ownerId: string): void {
    const permit = (this.data.permits || {})[permitId];
    if (!permit) throw new Error(`Permit ${permitId} not found`);
    this.verifyEventOwnership(permit.event_id, ownerId);
    delete this.data.permits[permitId];
    this.persist();
  }

  // Guest list operations
  public listGuests(eventId: string, ownerId: string): GuestRecord[] {
    this.verifyEventOwnership(eventId, ownerId);
    return Object.values(this.data.guests || {}).filter((g) => g.event_id === eventId);
  }

  public addGuest(
    eventId: string,
    ownerId: string,
    guest: Omit<GuestRecord, 'id' | 'event_id'>
  ): GuestRecord {
    this.verifyEventOwnership(eventId, ownerId);
    if (!this.data.guests) this.data.guests = {};
    const id = crypto.randomUUID();
    const record: GuestRecord = {
      ...guest,
      id,
      event_id: eventId,
    };
    this.data.guests[id] = record;
    this.persist();
    return record;
  }

  public updateGuest(
    guestId: string,
    ownerId: string,
    updates: Partial<Pick<GuestRecord, 'name' | 'email' | 'rsvp_status' | 'plus_ones' | 'dietary_notes' | 'notes'>>
  ): GuestRecord {
    const guest = (this.data.guests || {})[guestId];
    if (!guest) throw new Error(`Guest ${guestId} not found`);
    this.verifyEventOwnership(guest.event_id, ownerId);

    if (updates.name !== undefined) guest.name = updates.name;
    if (updates.email !== undefined) guest.email = updates.email;
    if (updates.rsvp_status !== undefined) guest.rsvp_status = updates.rsvp_status;
    if (updates.plus_ones !== undefined) guest.plus_ones = Number(updates.plus_ones);
    if (updates.dietary_notes !== undefined) guest.dietary_notes = updates.dietary_notes;
    if (updates.notes !== undefined) guest.notes = updates.notes;

    this.data.guests[guestId] = guest;
    this.persist();
    return guest;
  }

  public deleteGuest(guestId: string, ownerId: string): void {
    const guest = (this.data.guests || {})[guestId];
    if (!guest) throw new Error(`Guest ${guestId} not found`);
    this.verifyEventOwnership(guest.event_id, ownerId);
    delete this.data.guests[guestId];
    this.persist();
  }
}


export const eventStore = new EventStore();
