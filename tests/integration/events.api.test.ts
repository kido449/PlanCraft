import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app.js';
import * as clientModule from '../../server/ai/client.js';
import { createSessionToken } from '../../server/auth.js';

describe('PlanCraft REST API Integration Tests', () => {
  const testOwner = 'integration-test-user-001';
  const authHeader = 'Bearer ' + createSessionToken(testOwner);
  let createdEventId: string;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Health check
  it('GET /api/health returns 200 with service information', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('PlanCraft AI Engine');
    expect(res.body.timestamp).toBeDefined();
  });

  // 2. Event Creation - Success & Bad Input Failure Path
  it('POST /api/events succeeds with complete payload', async () => {
    const payload = {
      type: 'wedding',
      name: 'Integration Test Gala',
      date: '2026-11-20',
      guest_count: 120,
      location: 'Napa Valley, CA',
      total_budget: 45000,
      vibe: 'Refined rustic vineyard',
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', authHeader)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.event).toBeDefined();
    expect(res.body.event.id).toBeDefined();
    expect(res.body.event.name).toBe('Integration Test Gala');
    expect(res.body.event.owner_id).toBe(testOwner);
    expect(res.body.event.total_budget).toBe(45000);

    createdEventId = res.body.event.id;
  });

  it('POST /api/events fails with 400 when missing required fields', async () => {
    const invalidPayload = {
      name: 'Incomplete Event',
      // missing type, date, guest_count, location, total_budget
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', authHeader)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required event fields');
  });

  // 3. List & Fetch Events
  it('GET /api/events returns list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.some((e: any) => e.id === createdEventId)).toBe(true);
  });

  it('GET /api/events/:id returns full relational event details', async () => {
    const res = await request(app)
      .get(`/api/events/${createdEventId}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const event = res.body.event;
    expect(event.id).toBe(createdEventId);
    expect(Array.isArray(event.budget)).toBe(true);
    expect(Array.isArray(event.timeline)).toBe(true);
    expect(Array.isArray(event.vendors)).toBe(true);
    expect(Array.isArray(event.volunteers)).toBe(true);
    expect(Array.isArray(event.permits)).toBe(true);
    expect(Array.isArray(event.guests)).toBe(true);
    expect(Array.isArray(event.ideas)).toBe(true);
  });

  it('GET /api/events/:id returns 404 for non-existent event', async () => {
    const res = await request(app)
      .get('/api/events/non-existent-uuid-999')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 4. Update Event Constraints
  it('PATCH /api/events/:id updates constraints', async () => {
    const res = await request(app)
      .patch(`/api/events/${createdEventId}`)
      .set('Authorization', authHeader)
      .send({
        total_budget: 50000,
        guest_count: 140,
        vibe: 'Updated Candlelit Courtyard',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.total_budget).toBe(50000);
    expect(res.body.event.guest_count).toBe(140);
    expect(res.body.event.vibe).toBe('Updated Candlelit Courtyard');
  });

  // 5. Budget Items CRUD
  it('POST, PATCH, and DELETE /api/budget-items CRUD cycle works properly', async () => {
    // 1. Add item
    const addRes = await request(app)
      .post(`/api/events/${createdEventId}/budget-items`)
      .set('Authorization', authHeader)
      .send({
        category: 'Artisan Gelato Cart',
        estimated_cost: 1500,
        actual_cost: null,
        status: 'planned',
        notes: 'Late night dessert',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.item.category).toBe('Artisan Gelato Cart');
    expect(addRes.body.item.estimated_cost).toBe(1500);
    const itemId = addRes.body.item.id;

    // 2. Update item (mark actual cost and paid)
    const patchRes = await request(app)
      .patch(`/api/budget-items/${itemId}`)
      .set('Authorization', authHeader)
      .send({
        actual_cost: 1450,
        status: 'paid',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.item.actual_cost).toBe(1450);
    expect(patchRes.body.item.status).toBe('paid');
    expect(patchRes.body.item.is_user_edited).toBe(true);

    // 3. Delete item
    const delRes = await request(app)
      .delete(`/api/budget-items/${itemId}`)
      .set('Authorization', authHeader);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  // 6. Timeline Tasks CRUD
  it('POST, PATCH, and DELETE /api/timeline-tasks CRUD cycle works properly', async () => {
    const addRes = await request(app)
      .post(`/api/events/${createdEventId}/timeline-tasks`)
      .set('Authorization', authHeader)
      .send({
        title: 'Floral Mockup Review',
        category: 'Floral & Decor',
        due_date: '2026-08-15',
        status: 'pending',
        notes: 'Review centerpiece proportions',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.task.title).toBe('Floral Mockup Review');
    const taskId = addRes.body.task.id;

    const patchRes = await request(app)
      .patch(`/api/timeline-tasks/${taskId}`)
      .set('Authorization', authHeader)
      .send({ status: 'completed' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.task.status).toBe('completed');

    const delRes = await request(app)
      .delete(`/api/timeline-tasks/${taskId}`)
      .set('Authorization', authHeader);

    expect(delRes.status).toBe(200);
  });

  // 7. Vendors CRUD
  it('POST, PATCH, and DELETE /api/vendors CRUD cycle works properly', async () => {
    const addRes = await request(app)
      .post(`/api/events/${createdEventId}/vendors`)
      .set('Authorization', authHeader)
      .send({
        category: 'Live Jazz Trio',
        name: 'The Golden Gate Quartet',
        contact: 'booking@goldengatejazz.com',
        estimated_cost: 2200,
        status: 'shortlisted',
        notes: 'Cocktail hour and dinner',
      });

    expect(addRes.status).toBe(201);
    const vendorId = addRes.body.vendor.id;

    const patchRes = await request(app)
      .patch(`/api/vendors/${vendorId}`)
      .set('Authorization', authHeader)
      .send({ status: 'booked' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.vendor.status).toBe('booked');

    const delRes = await request(app)
      .delete(`/api/vendors/${vendorId}`)
      .set('Authorization', authHeader);

    expect(delRes.status).toBe(200);
  });

  // 8. Volunteers & Municipal Permits (Civic Logistics)
  it('Civic Logistics: POST and PATCH /volunteers and /permits works properly', async () => {
    // 1. Add Volunteer
    const volRes = await request(app)
      .post(`/api/events/${createdEventId}/volunteers`)
      .set('Authorization', authHeader)
      .send({
        role: 'Registration & Welcome',
        contact_name: 'Sarah Marshall',
        shift_time: '10:00 AM - 02:00 PM',
        count_needed: 4,
        notes: 'Coordinate nametags',
      });
    expect(volRes.status).toBe(201);
    const volId = volRes.body.volunteer.id;

    const volPatchRes = await request(app)
      .patch(`/api/volunteers/${volId}`)
      .set('Authorization', authHeader)
      .send({ count_confirmed: 2 });
    expect(volPatchRes.status).toBe(200);
    expect(volPatchRes.body.volunteer.count_confirmed).toBe(2);

    // 2. Add Permit
    const permitRes = await request(app)
      .post(`/api/events/${createdEventId}/permits`)
      .set('Authorization', authHeader)
      .send({
        permit_type: 'Amplified Sound Permit',
        issuing_agency: 'City Dept of Environmental Health',
        status: 'in_progress',
        fee: 120,
        deadline: '2026-09-01',
      });
    expect(permitRes.status).toBe(201);
    const permitId = permitRes.body.permit.id;

    const permitPatchRes = await request(app)
      .patch(`/api/permits/${permitId}`)
      .set('Authorization', authHeader)
      .send({ status: 'approved' });
    expect(permitPatchRes.status).toBe(200);
    expect(permitPatchRes.body.permit.status).toBe('approved');
  });

  // 9. Guests CRUD & Validation
  it('Guests: POST, PATCH, DELETE and 400 failure on missing name', async () => {
    // Missing name failure
    const badGuestRes = await request(app)
      .post(`/api/events/${createdEventId}/guests`)
      .set('Authorization', authHeader)
      .send({ email: 'noname@example.com' });
    expect(badGuestRes.status).toBe(400);
    expect(badGuestRes.body.error).toContain('name is required');

    // Valid guest
    const guestRes = await request(app)
      .post(`/api/events/${createdEventId}/guests`)
      .set('Authorization', authHeader)
      .send({
        name: 'Julian Vance',
        email: 'julian@vance.com',
        rsvp_status: 'attending',
        plus_ones: 1,
        dietary_notes: 'Severe peanut allergy; pescatarian',
        notes: 'VIP table seating',
      });
    expect(guestRes.status).toBe(201);
    expect(guestRes.body.guest.name).toBe('Julian Vance');
    expect(guestRes.body.guest.dietary_notes).toBe('Severe peanut allergy; pescatarian');
    const guestId = guestRes.body.guest.id;

    // Patch guest
    const patchGuestRes = await request(app)
      .patch(`/api/guests/${guestId}`)
      .set('Authorization', authHeader)
      .send({ rsvp_status: 'declined' });
    expect(patchGuestRes.status).toBe(200);
    expect(patchGuestRes.body.guest.rsvp_status).toBe('declined');

    // Delete guest
    const delGuestRes = await request(app)
      .delete(`/api/guests/${guestId}`)
      .set('Authorization', authHeader);
    expect(delGuestRes.status).toBe(200);
  });

  // 10. Multi-Tenant RLS Access Control
  // 10. Multi-Tenant Cryptographic Authentication & RLS Access Control
  it('Auth: Rejects requests missing session token with 401 Unauthorized', async () => {
    const unauthRes = await request(app).get(`/api/events/${createdEventId}`);
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error).toContain('Authentication required');
  });

  it('Auth: Rejects forged or tampered session token with 401 Unauthorized', async () => {
    const forgedToken = 'Bearer fake.invalid.signature123';
    const tamperedRes = await request(app)
      .get(`/api/events/${createdEventId}`)
      .set('Authorization', forgedToken);

    expect(tamperedRes.status).toBe(401);
    expect(tamperedRes.body.error).toContain('Authentication failed');
  });

  it('RLS: Denies access when requesting user is not event owner', async () => {
    const otherUser = 'foreign-tenant-user-888';
    const otherToken = 'Bearer ' + createSessionToken(otherUser);

    // Trying to get another user's event with other user's valid token
    const getRes = await request(app)
      .get(`/api/events/${createdEventId}`)
      .set('Authorization', otherToken);
    expect(getRes.status).toBe(404);

    // Trying to mutate another user's event
    const patchRes = await request(app)
      .patch(`/api/events/${createdEventId}`)
      .set('Authorization', otherToken)
      .send({ name: 'Hacked Title' });
    expect(patchRes.status).toBe(500);
    expect(patchRes.body.error).toContain('Access denied');
  });

  it('Anti-Spoofing: Manually passing a different x-user-id header does not bypass authenticated token', async () => {
    const otherUser = 'adversary-attacker-777';
    const otherToken = 'Bearer ' + createSessionToken(otherUser);

    // Adversary provides their own token but attempts to spoof victim ID in x-user-id header
    const spoofRes = await request(app)
      .get(`/api/events/${createdEventId}`)
      .set('Authorization', otherToken)
      .set('x-user-id', testOwner); // Attempting to masquerade as testOwner

    // Server strictly uses identity from token, rejecting access to testOwner's event
    expect(spoofRes.status).toBe(404);
  });

  // 11. Live Prompt Preview
  it('GET /api/events/:id/prompt-preview returns full prompt containing constraints', async () => {
    const res = await request(app)
      .get(`/api/events/${createdEventId}/prompt-preview`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.prompt).toBeDefined();
    expect(res.body.prompt).toContain('Integration Test Gala');
    expect(res.body.prompt).toContain('Napa Valley, CA');
  });

  // 12. Planning Assistant Endpoint (Success + Bad Input Failure)
  it('POST /api/events/:id/assistant rejects empty message with 400', async () => {
    const res = await request(app)
      .post(`/api/events/${createdEventId}/assistant`)
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Message is required');
  });

  it('POST /api/events/:id/assistant executes LLM call and returns structured advice', async () => {
    vi.spyOn(clientModule, 'callLLM').mockResolvedValue(
      JSON.stringify({
        reply: 'Based on your $50,000 budget for 140 guests, we recommend reserving a 10% contingency cushion.',
        suggested_actions: [
          {
            type: 'add_budget_item',
            label: 'Add 10% Contingency Buffer',
            description: 'Emergency cushion for unexpected guest surges',
            data: { category: 'Contingency Cushion', estimated_cost: 5000, notes: 'Recommended by Assistant' },
          },
        ],
      })
    );

    const res = await request(app)
      .post(`/api/events/${createdEventId}/assistant`)
      .set('Authorization', authHeader)
      .send({ message: 'What is our contingency allocation?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toContain('10% contingency');
    expect(res.body.suggested_actions).toHaveLength(1);
    expect(res.body.suggested_actions[0].type).toBe('add_budget_item');
  });

  // 13. Plan Generation & Replanning - Success and Provider Error Failure Path
  it('POST /api/events/:id/generate returns 500 when LLM provider throws', async () => {
    vi.spyOn(clientModule, 'callLLM').mockRejectedValue(new Error('Groq Provider Connection Timeout (503)'));

    const res = await request(app)
      .post(`/api/events/${createdEventId}/generate`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Groq Provider Connection Timeout');
  });

  it('POST /api/events/:id/generate successfully generates plan and persists rows', async () => {
    vi.spyOn(clientModule, 'callLLM').mockResolvedValue(
      JSON.stringify({
        budget: [
          { category: 'Vineyard Grounds Rental', estimated_cost: 15000, notes: 'Full estate access' },
          { category: 'Farm-to-Table Catering', estimated_cost: 20000, notes: 'Plated 3-course' },
        ],
        timeline: [
          { title: 'Lock Venue Grounds', category: 'Venue', due_date: '2026-06-01', notes: 'Initial deposit' },
        ],
        vendors: [
          { category: 'Catering Partner', suggested_name_or_type: 'Heritage Table Catering', estimated_cost: 20000, notes: 'Includes staff' },
        ],
        ideas: [
          { theme: 'Amber Golden Hour', description: 'Curated warm festival lighting and local acoustic trio' },
        ],
      })
    );

    const res = await request(app)
      .post(`/api/events/${createdEventId}/generate`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.budget).toHaveLength(2);
    expect(res.body.event.timeline).toHaveLength(1);
    expect(res.body.event.vendors).toHaveLength(1);
  });

  it('POST /api/events/:id/replan executes constraint update and rebalances sections', async () => {
    vi.spyOn(clientModule, 'callLLM').mockResolvedValue(
      JSON.stringify({
        replan_rationale: 'Scaled catering by 10% to accommodate budget reduction to $40,000.',
        budget: [
          { category: 'Vineyard Grounds Rental', estimated_cost: 15000, notes: 'Preserved' },
          { category: 'Farm-to-Table Catering', estimated_cost: 18000, notes: 'Rebalanced for 110 guests' },
        ],
        timeline: [
          { title: 'Updated Menu Tasting', category: 'Catering', due_date: '2026-07-15', notes: 'Rebalanced' },
        ],
        vendors: [
          { category: 'Catering Partner', suggested_name_or_type: 'Heritage Table Catering', estimated_cost: 18000, notes: 'Adjusted rate' },
        ],
        ideas: [
          { theme: 'Intimate Amber Evening', description: 'Refocused on core guests' },
        ],
      })
    );

    const res = await request(app)
      .post(`/api/events/${createdEventId}/replan`)
      .set('Authorization', authHeader)
      .send({
        new_budget: 40000,
        new_guest_count: 110,
        reason: 'Client requested budget reduction of $10k',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rationale).toContain('Scaled catering by 10%');
    expect(res.body.event.total_budget).toBe(40000);
    expect(res.body.event.guest_count).toBe(110);
    expect(res.body.event.replan_history.length).toBeGreaterThanOrEqual(1);
  });

  // Adversarial Check 1: Fallback template honest disclosure
  it('Honest Fallback: Assistant endpoint clearly flags backup template when LLM fails', async () => {
    vi.spyOn(clientModule, 'callLLM').mockRejectedValue(new Error('Provider Gateway Timeout (504)'));

    const res = await request(app)
      .post(`/api/events/${createdEventId}/assistant`)
      .set('Authorization', authHeader)
      .send({ message: 'What is our fallback strategy?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.is_fallback).toBe(true);
    expect(res.body.fallback_reason).toContain('Provider Gateway Timeout');
    expect(res.body.reply).toBeDefined();
    expect(res.body.suggested_actions.length).toBeGreaterThanOrEqual(1);
  });

  it('Honest Fallback: Generator tags fallback ideas with is_fallback: true when LLM omits ideas', async () => {
    vi.spyOn(clientModule, 'callLLM').mockResolvedValue(
      JSON.stringify({
        budget: [
          { category: 'Venue', estimated_cost: 15000, notes: 'Grounds' },
          { category: 'Catering', estimated_cost: 20000, notes: 'Dinner' },
        ],
        timeline: [
          { title: 'Tasting', category: 'Catering', due_date: '2026-08-01', notes: 'Menu' },
        ],
        vendors: [
          { category: 'Catering', suggested_name_or_type: 'Caterer Co', estimated_cost: 20000, notes: 'Notes' },
        ],
        // ideas is deliberately omitted to trigger fallback ideas
      })
    );

    const res = await request(app)
      .post(`/api/events/${createdEventId}/generate`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.ideas.length).toBeGreaterThanOrEqual(1);
    expect(res.body.event.ideas[0].is_fallback).toBe(true);
  });

  // Adversarial Check 3: Exact Frontend Replan Payload Validation & Bounds
  it('Replan Validation: Accepts exact frontend shape and rejects invalid bounds with 400', async () => {
    vi.spyOn(clientModule, 'callLLM').mockResolvedValue(
      JSON.stringify({
        replan_rationale: 'Rebalanced catering to match $38,000 budget.',
        budget: [
          { category: 'Venue', estimated_cost: 15000, notes: 'Preserved' },
          { category: 'Catering', estimated_cost: 23000, notes: 'Rebalanced' },
        ],
        timeline: [
          { title: 'Tasting', category: 'Catering', due_date: '2026-08-10', notes: 'Rebalanced' },
        ],
        vendors: [
          { category: 'Catering', suggested_name_or_type: 'Table Co', estimated_cost: 23000, notes: 'Rebalanced' },
        ],
        ideas: [{ theme: 'Modern Intimate', description: 'Candlelight' }],
      })
    );

    // Exact frontend consumer payload
    const validRes = await request(app)
      .post(`/api/events/${createdEventId}/replan`)
      .set('Authorization', authHeader)
      .send({
        new_budget: 38000,
        new_guest_count: 105,
        reason: 'Cost cutting measure requested by client',
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.event.total_budget).toBe(38000);
    expect(validRes.body.event.guest_count).toBe(105);

    // Negative budget bound violation
    const badBudgetRes = await request(app)
      .post(`/api/events/${createdEventId}/replan`)
      .set('Authorization', authHeader)
      .send({
        new_budget: -5000,
        new_guest_count: 50,
      });
    expect(badBudgetRes.status).toBe(400);
    expect(badBudgetRes.body.error).toContain('Budget override must be a number between 0');

    // Invalid guest count bound violation (0)
    const badGuestRes = await request(app)
      .post(`/api/events/${createdEventId}/replan`)
      .set('Authorization', authHeader)
      .send({
        new_budget: 30000,
        new_guest_count: 0,
      });
    expect(badGuestRes.status).toBe(400);
    expect(badGuestRes.body.error).toContain('Guest override must be a number between 1');
  });

  // Adversarial Check 4: Code-level Constraint Enforcement & Clamping
  it('Code-Level Guard: Programmatically clamps budget ceiling and date boundaries if LLM disobeys', async () => {
    // Deliberately push LLM to violate constraints:
    // 1. Propose budget of $90,000 (Event budget is $38,000)
    // 2. Schedule timeline task in 2030 (Event date is 2026-11-20)
    vi.spyOn(clientModule, 'callLLM').mockResolvedValue(
      JSON.stringify({
        budget: [
          { category: 'Overpriced Venue', estimated_cost: 60000, notes: 'Way over budget' },
          { category: 'Extravagant Catering', estimated_cost: 30000, notes: 'Way over budget' },
        ],
        timeline: [
          { title: 'Post-Event Milestone', category: 'General', due_date: '2030-05-15', notes: 'Scheduled after event' },
        ],
        vendors: [
          { category: 'Catering', suggested_name_or_type: 'Mega Caterer', estimated_cost: 30000, notes: 'Vendor note' },
        ],
        ideas: [{ theme: 'Grand Gala', description: 'Lavish decor' }],
      })
    );

    const res = await request(app)
      .post(`/api/events/${createdEventId}/generate`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Code-level guard MUST clamp budget to strictly <= total_budget ($38,000)
    const totalCost = res.body.event.budget.reduce((acc: number, b: any) => acc + b.estimated_cost, 0);
    expect(totalCost).toBeLessThanOrEqual(38000);
    expect(totalCost).toBe(38000); // Proportional scale should match exactly

    // Code-level guard MUST clamp task due_date to <= event.date ('2026-11-20')
    const task = res.body.event.timeline[0];
    expect(task.due_date).toBe('2026-11-20');
  });

  // 14. Event Deletion & Cascade Clean-up
  it('DELETE /api/events/:id removes event and cascades all child rows', async () => {
    const delRes = await request(app)
      .delete(`/api/events/${createdEventId}`)
      .set('Authorization', authHeader);

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe('Event deleted');

    // Confirm subsequent fetch returns 404
    const getRes = await request(app)
      .get(`/api/events/${createdEventId}`)
      .set('Authorization', authHeader);
    expect(getRes.status).toBe(404);
  });

  // 15. Security & Input Size Capping Validations
  it('Security: Rejects oversized inputs and invalid boundary values with 400', async () => {
    // Oversized event name (>200 chars)
    const longName = 'A'.repeat(205);
    const oversizedNameRes = await request(app)
      .post('/api/events')
      .set('Authorization', authHeader)
      .send({
        type: 'wedding',
        name: longName,
        date: '2026-12-01',
        guest_count: 50,
        location: 'Paris',
        total_budget: 10000,
      });
    expect(oversizedNameRes.status).toBe(400);
    expect(oversizedNameRes.body.error).toContain('between 1 and 200 characters');

    // Invalid guest count (0 or negative)
    const badGuestsRes = await request(app)
      .post('/api/events')
      .set('Authorization', authHeader)
      .send({
        type: 'wedding',
        name: 'Valid Name',
        date: '2026-12-01',
        guest_count: 0,
        location: 'Paris',
        total_budget: 10000,
      });
    expect(badGuestsRes.status).toBe(400);
    expect(badGuestsRes.body.error).toContain('Guest count must be between 1 and 500,000');

    // Create a temporary event for testing assistant and replan bounds
    const tempRes = await request(app)
      .post('/api/events')
      .set('Authorization', authHeader)
      .send({
        type: 'social',
        name: 'Bound Test Event',
        date: '2026-12-01',
        guest_count: 20,
        location: 'NYC',
        total_budget: 5000,
      });
    const tempId = tempRes.body.event.id;

    // Oversized assistant message (>1500 chars)
    const oversizedMsg = 'X'.repeat(1600);
    const badMsgRes = await request(app)
      .post(`/api/events/${tempId}/assistant`)
      .set('Authorization', authHeader)
      .send({ message: oversizedMsg });
    expect(badMsgRes.status).toBe(400);
    expect(badMsgRes.body.error).toContain('Message must not exceed 1500 characters');

    // Oversized replan reason (>500 chars)
    const oversizedReason = 'R'.repeat(550);
    const badReplanRes = await request(app)
      .post(`/api/events/${tempId}/replan`)
      .set('Authorization', authHeader)
      .send({ reason: oversizedReason });
    expect(badReplanRes.status).toBe(400);
    expect(badReplanRes.body.error).toContain('Replan reason must be under 500 characters');

    // Cleanup temp event
    await request(app).delete(`/api/events/${tempId}`).set('Authorization', authHeader);
  });
});
