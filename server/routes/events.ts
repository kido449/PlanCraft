import { Router, Request, Response } from 'express';
import { eventStore } from '../db/store.js';
import { buildGeneratePrompt } from '../ai/prompts.js';
import { askEventAssistant } from '../ai/assistant.js';
import { executeGenerateFlow, executeReplanFlow } from '../services/plannerService.js';

export const eventsRouter = Router();

// Helper to extract owner ID from request header
function getOwnerId(req: Request): string {
  const header = req.headers['x-user-id'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return 'default-user-101';
}

// 1. GET /api/events - List events for user
eventsRouter.get('/events', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const events = eventStore.listEvents(ownerId);
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/events - Create new event
eventsRouter.post('/events', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { type, name, date, guest_count, location, total_budget, vibe } = req.body;

    if (!type || !name || !date || guest_count === undefined || guest_count === null || !location || total_budget === undefined || total_budget === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required event fields: type, name, date, guest_count, location, total_budget',
      });
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
      return res.status(400).json({ success: false, error: 'Event name must be between 1 and 200 characters.' });
    }
    if (typeof location !== 'string' || location.length > 200) {
      return res.status(400).json({ success: false, error: 'Location must be under 200 characters.' });
    }
    if (vibe && (typeof vibe !== 'string' || vibe.length > 1000)) {
      return res.status(400).json({ success: false, error: 'Vibe must be under 1000 characters.' });
    }
    const numGuests = Number(guest_count);
    if (isNaN(numGuests) || numGuests < 1 || numGuests > 500000) {
      return res.status(400).json({ success: false, error: 'Guest count must be between 1 and 500,000.' });
    }
    const numBudget = Number(total_budget);
    if (isNaN(numBudget) || numBudget < 0 || numBudget > 1000000000) {
      return res.status(400).json({ success: false, error: 'Total budget must be a positive number under 1,000,000,000.' });
    }

    const event = eventStore.createEvent(
      {
        type,
        name: name.trim(),
        date,
        guest_count: numGuests,
        location: location.trim(),
        total_budget: numBudget,
        vibe: (vibe || '').trim(),
      },
      ownerId
    );

    res.status(201).json({ success: true, event });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/events/:id - Fetch event with all related rows
eventsRouter.get('/events/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const event = eventStore.getEvent(req.params.id, ownerId);
    res.json({ success: true, event });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// 4. PATCH /api/events/:id - Update event metadata or constraints
eventsRouter.patch('/events/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updateEvent(req.params.id, ownerId, req.body);
    res.json({ success: true, event: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE /api/events/:id - Delete event
eventsRouter.delete('/events/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deleteEvent(req.params.id, ownerId);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/events/:id/generate - Live LLM generation of budget, timeline, vendors, ideas
eventsRouter.post('/events/:id/generate', async (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const result = await executeGenerateFlow(req.params.id, ownerId);
    res.json({
      success: true,
      event: result.event,
      promptUsed: result.promptUsed,
    });
  } catch (err: any) {
    console.error('Error generating event plan:', err);
    res.status(500).json({ success: false, error: err.message || 'Generation failed' });
  }
});

// 7. POST /api/events/:id/replan - Constraint-aware regeneration on budget or guest count edit
eventsRouter.post('/events/:id/replan', async (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { reason, budget_override, guest_override, constraints } = req.body || {};
    if (reason && (typeof reason !== 'string' || reason.length > 500)) {
      return res.status(400).json({ success: false, error: 'Replan reason must be under 500 characters.' });
    }
    if (constraints && (!Array.isArray(constraints) || constraints.length > 20)) {
      return res.status(400).json({ success: false, error: 'Constraints must be an array of at most 20 items.' });
    }
    if (budget_override !== undefined && (isNaN(Number(budget_override)) || Number(budget_override) < 0 || Number(budget_override) > 1000000000)) {
      return res.status(400).json({ success: false, error: 'Budget override must be a number between 0 and 1,000,000,000.' });
    }
    if (guest_override !== undefined && (isNaN(Number(guest_override)) || Number(guest_override) < 1 || Number(guest_override) > 500000)) {
      return res.status(400).json({ success: false, error: 'Guest override must be a number between 1 and 500,000.' });
    }

    const result = await executeReplanFlow(req.params.id, ownerId, req.body);
    res.json({
      success: true,
      event: result.event,
      promptUsed: result.promptUsed,
      rationale: result.rationale,
    });
  } catch (err: any) {
    console.error('Error replanning event:', err);
    res.status(500).json({ success: false, error: err.message || 'Replanning failed' });
  }
});

// 8. PATCH /api/budget-items/:id - User edit to individual budget item
eventsRouter.patch('/budget-items/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updateBudgetItem(req.params.id, ownerId, req.body);
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/budget-items - Add custom budget item
eventsRouter.post('/events/:id/budget-items', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { category, estimated_cost, actual_cost, status, notes } = req.body;
    const item = eventStore.addBudgetItem(req.params.id, ownerId, {
      category: category || 'Custom Category',
      estimated_cost: Number(estimated_cost) || 0,
      actual_cost: actual_cost ? Number(actual_cost) : null,
      status: status || 'planned',
      notes: notes || '',
    });
    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/budget-items/:id - Delete budget item
eventsRouter.delete('/budget-items/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deleteBudgetItem(req.params.id, ownerId);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. PATCH /api/timeline-tasks/:id - User edit to timeline task
eventsRouter.patch('/timeline-tasks/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updateTimelineTask(req.params.id, ownerId, req.body);
    res.json({ success: true, task: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/timeline-tasks - Add custom task
eventsRouter.post('/events/:id/timeline-tasks', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { title, category, due_date, status, notes } = req.body;
    const task = eventStore.addTimelineTask(req.params.id, ownerId, {
      title: title || 'New Task',
      category: category || 'General',
      due_date: due_date || new Date().toISOString().split('T')[0],
      status: status || 'pending',
      notes: notes || '',
    });
    res.status(201).json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/timeline-tasks/:id - Delete task
eventsRouter.delete('/timeline-tasks/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deleteTimelineTask(req.params.id, ownerId);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. PATCH /api/vendors/:id - User edit to vendor item
eventsRouter.patch('/vendors/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updateVendor(req.params.id, ownerId, req.body);
    res.json({ success: true, vendor: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/vendors - Add custom vendor
eventsRouter.post('/events/:id/vendors', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { category, name, contact, estimated_cost, status, notes } = req.body;
    const vendor = eventStore.addVendor(req.params.id, ownerId, {
      category: category || 'General',
      name: name || 'Vendor Name',
      contact: contact || null,
      estimated_cost: Number(estimated_cost) || 0,
      status: status || 'shortlisted',
      notes: notes || '',
    });
    res.status(201).json({ success: true, vendor });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vendors/:id - Delete vendor
eventsRouter.delete('/vendors/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deleteVendor(req.params.id, ownerId);
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Volunteer routes (Community Events)
eventsRouter.post('/events/:id/volunteers', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { role, contact_name, shift_time, count_needed, notes } = req.body;
    const volunteer = eventStore.addVolunteer(req.params.id, ownerId, {
      role: role || 'Event Support Volunteer',
      contact_name: contact_name || 'Open Shift',
      shift_time: shift_time || 'Event Day (4 hrs)',
      count_needed: Number(count_needed) || 5,
      count_confirmed: 0,
      status: 'recruiting',
      notes: notes || '',
    });
    res.status(201).json({ success: true, volunteer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.patch('/volunteers/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updateVolunteer(req.params.id, ownerId, req.body);
    res.json({ success: true, volunteer: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.delete('/volunteers/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deleteVolunteer(req.params.id, ownerId);
    res.json({ success: true, message: 'Volunteer role deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Permit routes (Community Events)
eventsRouter.post('/events/:id/permits', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { permit_type, issuing_agency, status, fee, deadline, notes } = req.body;
    const permit = eventStore.addPermit(req.params.id, ownerId, {
      permit_type: permit_type || 'Municipal Permit',
      issuing_agency: issuing_agency || 'City / County Authority',
      status: status || 'required',
      fee: Number(fee) || 0,
      deadline: deadline || '',
      notes: notes || '',
    });
    res.status(201).json({ success: true, permit });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.patch('/permits/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updatePermit(req.params.id, ownerId, req.body);
    res.json({ success: true, permit: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.delete('/permits/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deletePermit(req.params.id, ownerId);
    res.json({ success: true, message: 'Permit deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Guest List routes
eventsRouter.get('/events/:id/guests', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const guests = eventStore.listGuests(req.params.id, ownerId);
    res.json({ success: true, guests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.post('/events/:id/guests', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const { name, email, rsvp_status, plus_ones, dietary_notes, notes } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Guest name is required.' });
    }
    const guest = eventStore.addGuest(req.params.id, ownerId, {
      name: name.trim(),
      email: email ? String(email).trim() : '',
      rsvp_status: rsvp_status || 'pending',
      plus_ones: Number(plus_ones) || 0,
      dietary_notes: dietary_notes ? String(dietary_notes).trim() : '',
      notes: notes ? String(notes).trim() : '',
    });
    res.status(201).json({ success: true, guest });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.patch('/guests/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const updated = eventStore.updateGuest(req.params.id, ownerId, req.body);
    res.json({ success: true, guest: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

eventsRouter.delete('/guests/:id', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    eventStore.deleteGuest(req.params.id, ownerId);
    res.json({ success: true, message: 'Guest deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Live prompt preview for transparency / inspector
eventsRouter.get('/events/:id/prompt-preview', (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const event = eventStore.getEvent(req.params.id, ownerId);
    const prompt = buildGeneratePrompt(event);
    res.json({ success: true, prompt, event });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Interactive GenAI Planning Assistant
eventsRouter.post('/events/:id/assistant', async (req: Request, res: Response) => {
  try {
    const ownerId = getOwnerId(req);
    const event = eventStore.getEvent(req.params.id, ownerId);
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }
    if (message.length > 1500) {
      return res.status(400).json({ success: false, error: 'Message must not exceed 1500 characters.' });
    }
    if (history && !Array.isArray(history)) {
      return res.status(400).json({ success: false, error: 'History must be an array.' });
    }

    const assistantResult = await askEventAssistant(event, message, history || []);
    res.json({
      success: true,
      reply: assistantResult.reply,
      suggested_actions: assistantResult.suggested_actions,
    });
  } catch (err: any) {
    console.error('Error in /api/events/:id/assistant:', err);
    res.status(500).json({ success: false, error: err.message || 'Assistant failed to respond.' });
  }
});

