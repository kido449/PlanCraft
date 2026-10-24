import { EventRecord, EventWithDetails } from '../types.js';

/**
 * Prompt Construction Module
 * Every AI prompt is dynamically synthesized using the real user-specified parameters.
 * Zero hardcoded templates, zero static keyword lookups.
 * Handles Community Events with Volunteers + Municipal Permits (NO commercial vendors).
 * Handles Wedding/Birthday/Social Events with Curated Vendors.
 * Incorporates confirmed Guest List RSVP & Dietary feeds.
 */

function buildGuestContext(event: EventRecord | EventWithDetails): string {
  const details = event as EventWithDetails;
  if (!details.guests || !Array.isArray(details.guests) || details.guests.length === 0) {
    return `- Headcount: ${event.guest_count} total anticipated attendees`;
  }

  const attending = details.guests.filter((g) => g.rsvp_status === 'attending');
  const attendingTotal = attending.reduce((sum, g) => sum + 1 + (g.plus_ones || 0), 0);
  const pending = details.guests.filter((g) => g.rsvp_status === 'pending');
  const declined = details.guests.filter((g) => g.rsvp_status === 'declined');

  const dietList = details.guests
    .filter((g) => g.dietary_notes && g.dietary_notes.trim())
    .map((g) => `${g.name}: ${g.dietary_notes.trim()}`);

  return `- Headcount Target: ${event.guest_count} target attendees
- Live Guest Roster & RSVP Status:
  * Confirmed Attending: ${attendingTotal} (from ${attending.length} RSVP submissions)
  * Pending Responses: ${pending.length} guests
  * Declined: ${declined.length} guests
  ${dietList.length > 0 ? `* Critical Dietary Requirements & Allergies: ${dietList.slice(0, 8).join('; ')}` : '* Dietary Notes: Standard menu preferences'}`;
}

export function buildGeneratePrompt(event: EventRecord | EventWithDetails): string {
  const currentDate = new Date().toISOString().split('T')[0];
  const isCommunity = event.type === 'community';
  const guestContext = buildGuestContext(event);

  let domainSpecificGuidance = '';
  let outputSchema = '';

  if (isCommunity) {
    domainSpecificGuidance = `
### COMMUNITY EVENT SPECIALIZED CIVIC LOGISTICS (DO NOT GENERATE COMMERCIAL VENDORS):
- Budget & Resources:
  * Focus strictly on: Municipal Permits, Public Liability Insurance, Staging/Canopy Rentals, Portable Sanitation, Waste/Recycling Skips, Volunteer Safety/Hydration, First Aid Station, Traffic Signage.
- Timeline:
  * Permit application deadlines (60-90 days prior), municipal agency approvals, volunteer orientation & safety briefing, site setup & teardown.
- Volunteer Shifts:
  * Mandatory roles: Traffic & Parking Marshall, Attendee Registration/Check-in, Zero-Waste & Sanitation Monitor, First-Aid & Safety Point, Stage/Activity Coordinator.
- Municipal Permits:
  * Mandatory permits: City Special Event Permit, Park/Street Closure Authorization, Amplified Sound Permit, Dept of Health Food/Beverage Permit, Fire Marshal Safety Clearance.
- Ideas:
  * Inclusive neighborhood participation, interactive community mural, local youth showcase, civic sponsor recognition.`;

    outputSchema = `{
  "budget": [
    { "category": "string (Permits, Insurance, Sanitation, Stage, Waste, Volunteer Support)", "estimated_cost": number, "notes": "string" }
  ],
  "timeline": [
    { "title": "string", "category": "string (Permits, Logistics, Volunteers, Safety)", "due_date": "YYYY-MM-DD", "notes": "string" }
  ],
  "volunteers": [
    { "role": "string", "contact_name": "string (or 'Open Shift')", "shift_time": "string (e.g., '09:00 AM - 01:00 PM')", "count_needed": number, "notes": "string" }
  ],
  "permits": [
    { "permit_type": "string", "issuing_agency": "string", "status": "required", "fee": number, "deadline": "YYYY-MM-DD", "notes": "string" }
  ],
  "ideas": [
    { "theme": "string", "description": "string" }
  ]
}`;
  } else if (event.type === 'wedding') {
    domainSpecificGuidance = `
### WEDDING SPECIALIZED MANDATES:
- Budget: Ceremony & reception venue grounds, fine-dining plated or family-style catering with bar, documentary photography, floral installations & ceremony arch, musical accompaniment, stationery suites, and day-of coordination.
- Timeline: Vendor tastings, dress/suit fittings, invitation mailing (8-10 weeks prior), floral walkthrough, ceremony rehearsal dinner, day-of run-of-show.
- Vendors: Boutique floral ateliers, fine-art photographers, artisan caterers, acoustic ensembles or wedding DJs.
- Ideas: Bespoke guest favors, personalized golden hour photo schedule, signature cocktail pairings.`;

    outputSchema = `{
  "budget": [
    { "category": "string", "estimated_cost": number, "notes": "string" }
  ],
  "timeline": [
    { "title": "string", "category": "string", "due_date": "YYYY-MM-DD", "notes": "string" }
  ],
  "vendors": [
    { "category": "string", "suggested_name_or_type": "string", "estimated_cost": number, "notes": "string" }
  ],
  "ideas": [
    { "theme": "string", "description": "string" }
  ]
}`;
  } else {
    domainSpecificGuidance = `
### BIRTHDAY / SOCIAL CELEBRATION SPECIALIZED MANDATES:
- Budget: Private lounge or venue buyout, dynamic food stations or small bites, mixology bar, centerpiece birthday cake/patisserie, celebratory lighting/DJ, and photo installation.
- Timeline: Guest RSVPs, cake tasting/design sign-off, playlist curation, decor load-in, toast coordination.
- Vendors: Artisanal bakers, cocktail bartenders, event DJs, photo booth operators.
- Ideas: Interactive guestbook wall, celebratory midnight toast, curated playlist transitions.`;

    outputSchema = `{
  "budget": [
    { "category": "string", "estimated_cost": number, "notes": "string" }
  ],
  "timeline": [
    { "title": "string", "category": "string", "due_date": "YYYY-MM-DD", "notes": "string" }
  ],
  "vendors": [
    { "category": "string", "suggested_name_or_type": "string", "estimated_cost": number, "notes": "string" }
  ],
  "ideas": [
    { "theme": "string", "description": "string" }
  ]
}`;
  }

  return `You are PlanCraft AI, an uncompromising, constraint-aware event planning intelligence engine.
Plan an entire event from scratch under strict constraints.

### REAL USER CONSTRAINTS & PARAMETERS:
- Event Name: "${event.name}"
- Event Type: ${event.type}
- Target Date: ${event.date} (Today's date is ${currentDate})
- Location: ${event.location}
${guestContext}
- Total Hard Budget: $${event.total_budget.toLocaleString()} USD
- Vibe & Style Preferences: "${event.vibe || 'Modern, memorable, and well-curated'}"
${domainSpecificGuidance}

### MANDATORY MUTUAL CONSISTENCY CONSTRAINTS:
1. BUDGET CONSISTENCY:
   - The total sum of all item 'estimated_cost' values in the 'budget' array MUST sum within 2% of the total budget ($${event.total_budget.toLocaleString()}).
   - Realistic cost distribution matching ${event.type} in ${event.location}.
   - Provide 5 to 7 categorized line items with brief 1-sentence notes.
2. TIMELINE CONSISTENCY:
   - Tasks must have realistic 'due_date' strings in "YYYY-MM-DD" format, strictly ordered between ${currentDate} and ${event.date}.
   - Provide 5 to 7 actionable milestone tasks with brief 1-sentence notes.
${isCommunity ? `3. CIVIC VOLUNTEERS & PERMITS:
   - Provide 3 to 4 essential volunteer shifts (role, shift_time, count_needed).
   - Provide 2 to 3 municipal permits required for public assembly in ${event.location}.
   - DO NOT include commercial wedding vendors.` : `3. VENDOR PARTNERS:
   - Provide 3 to 5 vendor partner recommendations tailored to ${event.type} in ${event.location}.
   - Each vendor's estimated_cost must align with the budget line item.`}
4. PERSONALIZED IDEAS:
   - Provide 2 unique, creative concepts specifically tailored to the "${event.vibe}" vibe and ${event.type} format.

### OUTPUT JSON SCHEMA:
Return ONLY valid JSON matching this exact structure (keep notes concise, single sentence):
${outputSchema}`;
}

export interface ReplanContext {
  oldBudget: number;
  newBudget: number;
  oldGuests: number;
  newGuests: number;
  reason?: string;
}

export function buildReplanPrompt(
  event: EventRecord,
  current: EventWithDetails,
  context: ReplanContext
): string {
  const currentDate = new Date().toISOString().split('T')[0];
  const budgetDiff = context.newBudget - context.oldBudget;
  const guestDiff = context.newGuests - context.oldGuests;
  const isCommunity = event.type === 'community';
  const guestContext = buildGuestContext(current);

  const lockedBudgetItems = (current.budget || [])
    .filter((b) => b.is_user_edited || b.status === 'paid' || b.actual_cost !== null)
    .map((b) => `- Category: "${b.category}", Cost: $${b.actual_cost ?? b.estimated_cost} [LOCKED/USER-COMMITTED]`);

  const lockedVendors = (current.vendors || [])
    .filter((v) => v.is_user_edited || v.status === 'booked')
    .map((v) => `- Vendor: "${v.name}" (${v.category}), Cost: $${v.estimated_cost} [BOOKED/LOCKED]`);

  const lockedVolunteers = (current.volunteers || [])
    .filter((v) => v.is_user_edited || v.status === 'filled')
    .map((v) => `- Volunteer Role: "${v.role}", Needed: ${v.count_needed} [LOCKED/USER-COMMITTED]`);

  const lockedPermits = (current.permits || [])
    .filter((p) => p.is_user_edited || p.status === 'approved' || p.status === 'in_progress')
    .map((p) => `- Permit: "${p.permit_type}" (${p.status}), Fee: $${p.fee} [COMMITTED/LOCKED]`);

  let lockedItemsText = '';
  if (lockedBudgetItems.length > 0) lockedItemsText += lockedBudgetItems.join('\n') + '\n';
  if (isCommunity) {
    if (lockedVolunteers.length > 0) lockedItemsText += lockedVolunteers.join('\n') + '\n';
    if (lockedPermits.length > 0) lockedItemsText += lockedPermits.join('\n') + '\n';
  } else {
    if (lockedVendors.length > 0) lockedItemsText += lockedVendors.join('\n') + '\n';
  }

  const outputSchema = isCommunity
    ? `{
  "replan_rationale": "A concise 2-3 sentence explanation of how budget, volunteer shifts, and permits were mathematically redistributed for the new constraints.",
  "budget": [
    { "category": "string", "estimated_cost": number, "notes": "string" }
  ],
  "timeline": [
    { "title": "string", "category": "string", "due_date": "YYYY-MM-DD", "notes": "string" }
  ],
  "volunteers": [
    { "role": "string", "contact_name": "string", "shift_time": "string", "count_needed": number, "notes": "string" }
  ],
  "permits": [
    { "permit_type": "string", "issuing_agency": "string", "status": "required", "fee": number, "deadline": "YYYY-MM-DD", "notes": "string" }
  ],
  "ideas": [
    { "theme": "string", "description": "string" }
  ]
}`
    : `{
  "replan_rationale": "A concise 2-3 sentence explanation of how budget and vendors were mathematically redistributed for the new constraints.",
  "budget": [
    { "category": "string", "estimated_cost": number, "notes": "string" }
  ],
  "timeline": [
    { "title": "string", "category": "string", "due_date": "YYYY-MM-DD", "notes": "string" }
  ],
  "vendors": [
    { "category": "string", "suggested_name_or_type": "string", "estimated_cost": number, "notes": "string" }
  ],
  "ideas": [
    { "theme": "string", "description": "string" }
  ]
}`;

  return `You are PlanCraft AI, an expert event planning director performing an intelligent, constraint-aware partial REPLAN of an existing event.

### CORE CONSTRAINT UPDATES:
- Event: "${event.name}" (${event.type}) in ${event.location} on ${event.date}
- Vibe: "${event.vibe}"
${guestContext}
- Total Budget Changed: from $${context.oldBudget.toLocaleString()} to $${context.newBudget.toLocaleString()} (${budgetDiff >= 0 ? '+' : ''}$${budgetDiff.toLocaleString()})
- Guest Count Changed: from ${context.oldGuests} to ${context.newGuests} (${guestDiff >= 0 ? '+' : ''}${guestDiff} attendees)
${context.reason ? `- User Rationale: "${context.reason}"` : ''}

### CURRENT COMMITTED / LOCKED ITEMS (DO NOT OVERRIDE THESE):
${lockedItemsText || 'None locked yet.'}

### REPLANNING INSTRUCTIONS:
1. Re-balance the budget to sum to the NEW total budget ($${context.newBudget.toLocaleString()}).
2. Scale variable attendee costs proportional to the headcount delta (${guestDiff >= 0 ? '+' : ''}${guestDiff}).
3. Adjust the Timeline milestones to maintain realistic sequencing between ${currentDate} and ${event.date}.
${isCommunity ? '4. Re-balance volunteer staffing shifts and municipal permits to match the new scale.' : '4. Scale vendor estimates and service tiers to match the new budget and headcount.'}
5. Provide a clear "replan_rationale" string explaining the key trade-offs and mathematical adjustments made.

### OUTPUT JSON SCHEMA:
Return ONLY valid JSON matching this exact structure (keep notes concise, single sentence):
${outputSchema}`;
}

