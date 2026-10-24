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
} from './types';

// Multi-tenant user simulation key
let currentUserId = localStorage.getItem('plancraft_user_id') || 'default-user-101';

export function getUserId(): string {
  return currentUserId;
}

export function setUserId(id: string): void {
  currentUserId = id;
  localStorage.setItem('plancraft_user_id', id);
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
  };
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const res = await fetch('/api/events', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch events');
  return data.events;
}

export async function fetchEvent(id: string): Promise<EventWithDetails> {
  const res = await fetch(`/api/events/${id}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch event');
  return data.event;
}

export async function createEvent(payload: {
  type: EventType;
  name: string;
  date: string;
  guest_count: number;
  location: string;
  total_budget: number;
  vibe: string;
}): Promise<EventRecord> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create event');
  return data.event;
}

export async function updateEvent(
  id: string,
  updates: Partial<Pick<EventRecord, 'name' | 'type' | 'date' | 'guest_count' | 'location' | 'total_budget' | 'vibe'>>
): Promise<EventRecord> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update event');
  return data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete event');
}

export async function generateEventPlan(id: string): Promise<{ event: EventWithDetails; promptUsed: string }> {
  const res = await fetch(`/api/events/${id}/generate`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate plan');
  return { event: data.event, promptUsed: data.promptUsed };
}

export async function replanEvent(
  id: string,
  payload: { new_budget?: number; new_guest_count?: number; reason?: string }
): Promise<{ event: EventWithDetails; promptUsed: string; rationale?: string }> {
  const res = await fetch(`/api/events/${id}/replan`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to replan event');
  return { event: data.event, promptUsed: data.promptUsed, rationale: data.rationale };
}

// Budget Items API
export async function updateBudgetItem(
  id: string,
  updates: Partial<Pick<BudgetItemRecord, 'category' | 'estimated_cost' | 'actual_cost' | 'status' | 'notes'>>
): Promise<BudgetItemRecord> {
  const res = await fetch(`/api/budget-items/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update budget item');
  return data.item;
}

export async function addBudgetItem(
  eventId: string,
  item: Omit<BudgetItemRecord, 'id' | 'event_id'>
): Promise<BudgetItemRecord> {
  const res = await fetch(`/api/events/${eventId}/budget-items`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add budget item');
  return data.item;
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const res = await fetch(`/api/budget-items/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete budget item');
}

// Timeline Tasks API
export async function updateTimelineTask(
  id: string,
  updates: Partial<Pick<TimelineTaskRecord, 'title' | 'category' | 'due_date' | 'status' | 'notes'>>
): Promise<TimelineTaskRecord> {
  const res = await fetch(`/api/timeline-tasks/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update timeline task');
  return data.task;
}

export async function addTimelineTask(
  eventId: string,
  task: Omit<TimelineTaskRecord, 'id' | 'event_id'>
): Promise<TimelineTaskRecord> {
  const res = await fetch(`/api/events/${eventId}/timeline-tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(task),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add timeline task');
  return data.task;
}

export async function deleteTimelineTask(id: string): Promise<void> {
  const res = await fetch(`/api/timeline-tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete timeline task');
}

// Vendors API
export async function updateVendor(
  id: string,
  updates: Partial<Pick<VendorRecord, 'category' | 'name' | 'contact' | 'estimated_cost' | 'status' | 'notes'>>
): Promise<VendorRecord> {
  const res = await fetch(`/api/vendors/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update vendor');
  return data.vendor;
}

export async function addVendor(
  eventId: string,
  vendor: Omit<VendorRecord, 'id' | 'event_id'>
): Promise<VendorRecord> {
  const res = await fetch(`/api/events/${eventId}/vendors`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(vendor),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add vendor');
  return data.vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const res = await fetch(`/api/vendors/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete vendor');
}

// Volunteer API (Community Events)
export async function addVolunteer(
  eventId: string,
  volunteer: Omit<VolunteerRecord, 'id' | 'event_id'>
): Promise<VolunteerRecord> {
  const res = await fetch(`/api/events/${eventId}/volunteers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(volunteer),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add volunteer role');
  return data.volunteer;
}

export async function updateVolunteer(
  id: string,
  updates: Partial<Pick<VolunteerRecord, 'role' | 'contact_name' | 'shift_time' | 'count_needed' | 'count_confirmed' | 'status' | 'notes'>>
): Promise<VolunteerRecord> {
  const res = await fetch(`/api/volunteers/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update volunteer role');
  return data.volunteer;
}

export async function deleteVolunteer(id: string): Promise<void> {
  const res = await fetch(`/api/volunteers/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete volunteer role');
}

// Permit API (Community Events)
export async function addPermit(
  eventId: string,
  permit: Omit<PermitRecord, 'id' | 'event_id'>
): Promise<PermitRecord> {
  const res = await fetch(`/api/events/${eventId}/permits`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(permit),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add municipal permit');
  return data.permit;
}

export async function updatePermit(
  id: string,
  updates: Partial<Pick<PermitRecord, 'permit_type' | 'issuing_agency' | 'status' | 'fee' | 'deadline' | 'notes'>>
): Promise<PermitRecord> {
  const res = await fetch(`/api/permits/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update permit');
  return data.permit;
}

export async function deletePermit(id: string): Promise<void> {
  const res = await fetch(`/api/permits/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete permit');
}

// Guest List API
export async function fetchGuests(eventId: string): Promise<GuestRecord[]> {
  const res = await fetch(`/api/events/${eventId}/guests`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch guests');
  return data.guests;
}

export async function addGuest(
  eventId: string,
  guest: Omit<GuestRecord, 'id' | 'event_id'>
): Promise<GuestRecord> {
  const res = await fetch(`/api/events/${eventId}/guests`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(guest),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add guest');
  return data.guest;
}

export async function updateGuest(
  id: string,
  updates: Partial<Pick<GuestRecord, 'name' | 'email' | 'rsvp_status' | 'plus_ones' | 'dietary_notes' | 'notes'>>
): Promise<GuestRecord> {
  const res = await fetch(`/api/guests/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update guest');
  return data.guest;
}

export async function deleteGuest(id: string): Promise<void> {
  const res = await fetch(`/api/guests/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete guest');
}


// Traceability preview
export async function getPromptPreview(eventId: string): Promise<{ prompt: string; event: EventWithDetails }> {
  const res = await fetch(`/api/events/${eventId}/prompt-preview`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch prompt preview');
  return { prompt: data.prompt, event: data.event };
}

export async function getHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
  const res = await fetch('/api/health');
  return await res.json();
}

// GenAI Planning Assistant API
export async function askAssistant(
  eventId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ reply: string; suggested_actions: any[] }> {
  const res = await fetch(`/api/events/${eventId}/assistant`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message, history }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Assistant failed to respond');
  return { reply: data.reply, suggested_actions: data.suggested_actions || [] };
}

