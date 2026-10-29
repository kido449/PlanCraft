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

// Multi-tenant user session management
let currentUserId = localStorage.getItem('plancraft_user_id') || 'default-user-101';
let currentSessionToken = localStorage.getItem('plancraft_session_token') || '';

export function getUserId(): string {
  return currentUserId;
}

export async function setUserId(id: string): Promise<string> {
  currentUserId = id;
  localStorage.setItem('plancraft_user_id', id);
  currentSessionToken = '';
  localStorage.removeItem('plancraft_session_token');
  return await ensureSession();
}

export async function ensureSession(): Promise<string> {
  if (currentSessionToken) return currentSessionToken;
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn('Session endpoint returned non-JSON response. Ensure PlanCraft server is running.');
      return '';
    }
    const data = await res.json();
    if (data && data.token) {
      currentSessionToken = data.token;
      localStorage.setItem('plancraft_session_token', data.token);
      return data.token;
    }
  } catch (err) {
    console.warn('Failed to initialize session token (server may be offline):', err);
  }
  return '';
}

async function getHeaders(): Promise<HeadersInit> {
  if (!currentSessionToken) {
    await ensureSession();
  }
  return {
    'Content-Type': 'application/json',
    ...(currentSessionToken ? { Authorization: `Bearer ${currentSessionToken}` } : {}),
  };
}

/**
 * Universal safe API request runner with content-type checking and graceful error parsing
 */
async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getHeaders();
  let res: Response;

  try {
    res = await fetch(endpoint, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });
  } catch (networkErr: any) {
    throw new Error(
      `Cannot connect to PlanCraft server (${networkErr.message}). Please ensure the server is running on http://localhost:3000.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    const cleanSnippet = rawText.trim().slice(0, 120);
    throw new Error(
      `Server returned ${res.status} ${res.statusText || 'Error'} (non-JSON): ${cleanSnippet || 'Please ensure the server is running.'}`
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (jsonErr: any) {
    throw new Error(`Failed to parse JSON response: ${jsonErr.message}`);
  }

  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const data = await apiFetch<{ success: boolean; events: EventRecord[] }>('/api/events');
  return data.events;
}

export async function fetchEvent(id: string): Promise<EventWithDetails> {
  const data = await apiFetch<{ success: boolean; event: EventWithDetails }>(`/api/events/${id}`);
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
  const data = await apiFetch<{ success: boolean; event: EventRecord }>('/api/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.event;
}

export async function updateEvent(
  id: string,
  updates: Partial<Pick<EventRecord, 'name' | 'type' | 'date' | 'guest_count' | 'location' | 'total_budget' | 'vibe'>>
): Promise<EventRecord> {
  const data = await apiFetch<{ success: boolean; event: EventRecord }>(`/api/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/api/events/${id}`, {
    method: 'DELETE',
  });
}

export async function generateEventPlan(id: string): Promise<{ event: EventWithDetails; promptUsed: string }> {
  const data = await apiFetch<{ success: boolean; event: EventWithDetails; promptUsed: string }>(
    `/api/events/${id}/generate`,
    { method: 'POST' }
  );
  return { event: data.event, promptUsed: data.promptUsed };
}

export async function replanEvent(
  id: string,
  payload: { new_budget?: number; new_guest_count?: number; reason?: string }
): Promise<{ event: EventWithDetails; promptUsed: string; rationale?: string }> {
  const data = await apiFetch<{ success: boolean; event: EventWithDetails; promptUsed: string; rationale?: string }>(
    `/api/events/${id}/replan`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return { event: data.event, promptUsed: data.promptUsed, rationale: data.rationale };
}

// Budget Items API
export async function updateBudgetItem(
  id: string,
  updates: Partial<Pick<BudgetItemRecord, 'category' | 'estimated_cost' | 'actual_cost' | 'status' | 'notes'>>
): Promise<BudgetItemRecord> {
  const data = await apiFetch<{ success: boolean; item: BudgetItemRecord }>(`/api/budget-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.item;
}

export async function addBudgetItem(
  eventId: string,
  item: Omit<BudgetItemRecord, 'id' | 'event_id'>
): Promise<BudgetItemRecord> {
  const data = await apiFetch<{ success: boolean; item: BudgetItemRecord }>(`/api/events/${eventId}/budget-items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return data.item;
}

export async function deleteBudgetItem(id: string): Promise<void> {
  await apiFetch(`/api/budget-items/${id}`, {
    method: 'DELETE',
  });
}

// Timeline Tasks API
export async function updateTimelineTask(
  id: string,
  updates: Partial<Pick<TimelineTaskRecord, 'title' | 'category' | 'due_date' | 'status' | 'notes'>>
): Promise<TimelineTaskRecord> {
  const data = await apiFetch<{ success: boolean; task: TimelineTaskRecord }>(`/api/timeline-tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.task;
}

export async function addTimelineTask(
  eventId: string,
  task: Omit<TimelineTaskRecord, 'id' | 'event_id'>
): Promise<TimelineTaskRecord> {
  const data = await apiFetch<{ success: boolean; task: TimelineTaskRecord }>(`/api/events/${eventId}/timeline-tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
  return data.task;
}

export async function deleteTimelineTask(id: string): Promise<void> {
  await apiFetch(`/api/timeline-tasks/${id}`, {
    method: 'DELETE',
  });
}

// Vendors API
export async function updateVendor(
  id: string,
  updates: Partial<Pick<VendorRecord, 'category' | 'name' | 'contact' | 'estimated_cost' | 'status' | 'notes'>>
): Promise<VendorRecord> {
  const data = await apiFetch<{ success: boolean; vendor: VendorRecord }>(`/api/vendors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.vendor;
}

export async function addVendor(
  eventId: string,
  vendor: Omit<VendorRecord, 'id' | 'event_id'>
): Promise<VendorRecord> {
  const data = await apiFetch<{ success: boolean; vendor: VendorRecord }>(`/api/events/${eventId}/vendors`, {
    method: 'POST',
    body: JSON.stringify(vendor),
  });
  return data.vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  await apiFetch(`/api/vendors/${id}`, {
    method: 'DELETE',
  });
}

// Volunteer API (Community Events)
export async function addVolunteer(
  eventId: string,
  volunteer: Omit<VolunteerRecord, 'id' | 'event_id'>
): Promise<VolunteerRecord> {
  const data = await apiFetch<{ success: boolean; volunteer: VolunteerRecord }>(`/api/events/${eventId}/volunteers`, {
    method: 'POST',
    body: JSON.stringify(volunteer),
  });
  return data.volunteer;
}

export async function updateVolunteer(
  id: string,
  updates: Partial<Pick<VolunteerRecord, 'role' | 'contact_name' | 'shift_time' | 'count_needed' | 'count_confirmed' | 'status' | 'notes'>>
): Promise<VolunteerRecord> {
  const data = await apiFetch<{ success: boolean; volunteer: VolunteerRecord }>(`/api/volunteers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.volunteer;
}

export async function deleteVolunteer(id: string): Promise<void> {
  await apiFetch(`/api/volunteers/${id}`, {
    method: 'DELETE',
  });
}

// Permit API (Community Events)
export async function addPermit(
  eventId: string,
  permit: Omit<PermitRecord, 'id' | 'event_id'>
): Promise<PermitRecord> {
  const data = await apiFetch<{ success: boolean; permit: PermitRecord }>(`/api/events/${eventId}/permits`, {
    method: 'POST',
    body: JSON.stringify(permit),
  });
  return data.permit;
}

export async function updatePermit(
  id: string,
  updates: Partial<Pick<PermitRecord, 'permit_type' | 'issuing_agency' | 'status' | 'fee' | 'deadline' | 'notes'>>
): Promise<PermitRecord> {
  const data = await apiFetch<{ success: boolean; permit: PermitRecord }>(`/api/permits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.permit;
}

export async function deletePermit(id: string): Promise<void> {
  await apiFetch(`/api/permits/${id}`, {
    method: 'DELETE',
  });
}

// Guest List API
export async function fetchGuests(eventId: string): Promise<GuestRecord[]> {
  const data = await apiFetch<{ success: boolean; guests: GuestRecord[] }>(`/api/events/${eventId}/guests`);
  return data.guests;
}

export async function addGuest(
  eventId: string,
  guest: Omit<GuestRecord, 'id' | 'event_id'>
): Promise<GuestRecord> {
  const data = await apiFetch<{ success: boolean; guest: GuestRecord }>(`/api/events/${eventId}/guests`, {
    method: 'POST',
    body: JSON.stringify(guest),
  });
  return data.guest;
}

export async function updateGuest(
  id: string,
  updates: Partial<Pick<GuestRecord, 'name' | 'email' | 'rsvp_status' | 'plus_ones' | 'dietary_notes' | 'notes'>>
): Promise<GuestRecord> {
  const data = await apiFetch<{ success: boolean; guest: GuestRecord }>(`/api/guests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.guest;
}

export async function deleteGuest(id: string): Promise<void> {
  await apiFetch(`/api/guests/${id}`, {
    method: 'DELETE',
  });
}

// Traceability preview
export async function getPromptPreview(eventId: string): Promise<{ prompt: string; event: EventWithDetails }> {
  const data = await apiFetch<{ success: boolean; prompt: string; event: EventWithDetails }>(
    `/api/events/${eventId}/prompt-preview`
  );
  return { prompt: data.prompt, event: data.event };
}

export async function getHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
  const data = await apiFetch<{ status: string; geminiConfigured: boolean }>('/api/health');
  return data;
}

// GenAI Planning Assistant API
export async function askAssistant(
  eventId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ reply: string; suggested_actions: any[]; is_fallback?: boolean; fallback_reason?: string }> {
  const data = await apiFetch<{
    success: boolean;
    reply: string;
    suggested_actions: any[];
    is_fallback?: boolean;
    fallback_reason?: string;
  }>(`/api/events/${eventId}/assistant`, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });

  return {
    reply: data.reply,
    suggested_actions: data.suggested_actions || [],
    is_fallback: Boolean(data.is_fallback),
    fallback_reason: data.fallback_reason,
  };
}
