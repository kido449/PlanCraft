export type EventType = 'wedding' | 'birthday' | 'community' | 'anniversary' | 'corporate';

export interface EventRecord {
  id: string;
  owner_id: string;
  type: EventType;
  name: string;
  date: string; // YYYY-MM-DD
  guest_count: number;
  location: string;
  total_budget: number;
  vibe: string;
  created_at: string;
  updated_at: string;
}

export type BudgetItemStatus = 'planned' | 'in_progress' | 'paid';

export interface BudgetItemRecord {
  id: string;
  event_id: string;
  category: string;
  estimated_cost: number;
  actual_cost: number | null;
  status: BudgetItemStatus;
  notes: string;
  is_user_edited?: boolean;
}

export type TimelineTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TimelineTaskRecord {
  id: string;
  event_id: string;
  title: string;
  category: string;
  due_date: string; // YYYY-MM-DD
  status: TimelineTaskStatus;
  notes: string;
  is_user_edited?: boolean;
}

export type VendorStatus = 'shortlisted' | 'contacted' | 'booked';

export interface VendorRecord {
  id: string;
  event_id: string;
  category: string;
  name: string; // suggested_name_or_type
  contact: string | null;
  estimated_cost: number;
  status: VendorStatus;
  notes: string;
  is_user_edited?: boolean;
}

export interface IdeaRecord {
  id: string;
  event_id: string;
  theme: string;
  description: string;
  is_fallback?: boolean;
}

export interface VolunteerRecord {
  id: string;
  event_id: string;
  role: string;
  contact_name: string;
  shift_time: string;
  count_needed: number;
  count_confirmed: number;
  status: 'recruiting' | 'filled';
  notes: string;
  is_user_edited?: boolean;
}

export interface PermitRecord {
  id: string;
  event_id: string;
  permit_type: string;
  issuing_agency: string;
  status: 'required' | 'in_progress' | 'approved';
  fee: number;
  deadline: string;
  notes: string;
  is_user_edited?: boolean;
}

export interface GuestRecord {
  id: string;
  event_id: string;
  name: string;
  email: string;
  rsvp_status: 'attending' | 'declined' | 'pending';
  plus_ones: number;
  dietary_notes: string;
  notes: string;
}

export interface EventWithDetails extends EventRecord {
  budget: BudgetItemRecord[];
  timeline: TimelineTaskRecord[];
  vendors: VendorRecord[];
  volunteers: VolunteerRecord[];
  permits: PermitRecord[];
  guests: GuestRecord[];
  ideas: IdeaRecord[];
  replan_history?: ReplanLogRecord[];
}

export interface ReplanLogRecord {
  id: string;
  event_id: string;
  timestamp: string;
  old_budget: number;
  new_budget: number;
  old_guest_count: number;
  new_guest_count: number;
  rationale: string;
}

// JSON Schema Contract for LLM Output
export interface GeneratedBudgetOutputItem {
  category: string;
  estimated_cost: number;
  notes: string;
}

export interface GeneratedTimelineOutputItem {
  title: string;
  category: string;
  due_date: string;
  notes: string;
}

export interface GeneratedVendorOutputItem {
  category: string;
  suggested_name_or_type: string;
  estimated_cost: number;
  notes: string;
}

export interface GeneratedVolunteerOutputItem {
  role: string;
  contact_name: string;
  shift_time: string;
  count_needed: number;
  notes: string;
}

export interface GeneratedPermitOutputItem {
  permit_type: string;
  issuing_agency: string;
  status: 'required' | 'in_progress' | 'approved';
  fee: number;
  deadline: string;
  notes: string;
}

export interface GeneratedIdeaOutputItem {
  theme: string;
  description: string;
  is_fallback?: boolean;
}

export interface PlanGenerationPayload {
  budget: GeneratedBudgetOutputItem[];
  timeline: GeneratedTimelineOutputItem[];
  vendors: GeneratedVendorOutputItem[];
  volunteers?: GeneratedVolunteerOutputItem[];
  permits?: GeneratedPermitOutputItem[];
  ideas: GeneratedIdeaOutputItem[];
  replan_rationale?: string;
}

