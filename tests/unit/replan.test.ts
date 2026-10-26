import { describe, it, expect, beforeEach } from 'vitest';
import { eventStore } from '../../server/db/store.js';
import { PlanGenerationPayload } from '../../server/types.js';

describe('Replanning & Delta Preservation Logic', () => {
  const testOwner = 'test-replan-owner-101';
  let eventId: string;

  beforeEach(() => {
    // Create fresh test event
    const event = eventStore.createEvent(
      {
        type: 'wedding',
        name: 'Delta Test Celebration',
        date: '2026-10-30',
        guest_count: 100,
        location: 'Sonoma, CA',
        total_budget: 30000,
        vibe: 'Refined rustic',
      },
      testOwner
    );
    eventId = event.id;

    // Seed initial generated plan
    const initialPayload: PlanGenerationPayload = {
      budget: [
        { category: 'Venue', estimated_cost: 10000, notes: 'Estate fee' },
        { category: 'Catering', estimated_cost: 12000, notes: 'Dinner and drinks' },
        { category: 'Photography', estimated_cost: 4000, notes: 'Full day' },
        { category: 'Florals', estimated_cost: 4000, notes: 'Arrangements' },
      ],
      timeline: [
        { title: 'Sign Venue Contract', category: 'Venue', due_date: '2026-05-01', notes: 'Deposit due' },
        { title: 'Tasting Session', category: 'Catering', due_date: '2026-07-01', notes: 'Menu selection' },
      ],
      vendors: [
        { category: 'Photography', suggested_name_or_type: 'Elena Photography', estimated_cost: 4000, notes: 'Booked style' },
        { category: 'Florals', suggested_name_or_type: 'Bloom Workshop', estimated_cost: 4000, notes: 'Standard florals' },
      ],
      ideas: [{ theme: 'Sonoma Sunset', description: 'Candles and vineyard backdrop' }],
    };

    eventStore.saveGeneratedPlan(eventId, testOwner, initialPayload);
  });

  it('preserves user-edited budget items and paid items when AI replans', () => {
    const details = eventStore.getEvent(eventId, testOwner);
    const photoItem = details.budget.find((b) => b.category.toLowerCase() === 'photography')!;
    const venueItem = details.budget.find((b) => b.category.toLowerCase() === 'venue')!;

    // 1. Mark photography as user-edited with custom cost
    eventStore.updateBudgetItem(photoItem.id, testOwner, {
      estimated_cost: 4800,
      notes: 'Custom locked photography contract',
    });

    // 2. Mark venue item as paid
    eventStore.updateBudgetItem(venueItem.id, testOwner, {
      actual_cost: 10000,
      status: 'paid',
    });

    // 3. Perform AI Replan with a lower total budget
    const replanPayload: PlanGenerationPayload = {
      budget: [
        // AI suggests reducing Venue and Photography, but they are locked!
        { category: 'Venue', estimated_cost: 7000, notes: 'AI reduced' },
        { category: 'Photography', estimated_cost: 2500, notes: 'AI reduced' },
        { category: 'Catering', estimated_cost: 8000, notes: 'AI reduced' },
        { category: 'Florals', estimated_cost: 2500, notes: 'AI reduced' },
      ],
      timeline: [
        { title: 'Adjusted Tasting', category: 'Catering', due_date: '2026-08-01', notes: 'Adjusted' },
      ],
      vendors: [
        { category: 'Florals', suggested_name_or_type: 'Budget Florals', estimated_cost: 2500, notes: 'Scaled down' },
      ],
      ideas: [{ theme: 'Intimate Sonoma', description: 'Scaled back for intimate scale' }],
      replan_rationale: 'Preserved user-locked photography and paid venue deposits while rebalancing catering.',
    };

    const replanned = eventStore.applyReplan(eventId, testOwner, replanPayload, {
      old_budget: 30000,
      new_budget: 25000,
      old_guest_count: 100,
      new_guest_count: 75,
      rationale: replanPayload.replan_rationale!,
    });

    // Verify locked items retained their user values
    const finalPhoto = replanned.budget.find((b) => b.category.toLowerCase() === 'photography')!;
    expect(finalPhoto.estimated_cost).toBe(4800);
    expect(finalPhoto.notes).toBe('Custom locked photography contract');
    expect(finalPhoto.is_user_edited).toBe(true);

    const finalVenue = replanned.budget.find((b) => b.category.toLowerCase() === 'venue')!;
    expect(finalVenue.status).toBe('paid');
    expect(finalVenue.actual_cost).toBe(10000);

    // Verify non-locked items were updated by AI
    const finalCatering = replanned.budget.find((b) => b.category.toLowerCase() === 'catering')!;
    expect(finalCatering.estimated_cost).toBe(8000);
  });

  it('preserves completed and user-edited timeline tasks across replan', () => {
    const details = eventStore.getEvent(eventId, testOwner);
    const contractTask = details.timeline.find((t) => t.title === 'Sign Venue Contract')!;

    // Mark task as completed
    eventStore.updateTimelineTask(contractTask.id, testOwner, {
      status: 'completed',
    });

    // Replan with new timeline
    const replanPayload: PlanGenerationPayload = {
      budget: [{ category: 'Catering', estimated_cost: 10000, notes: 'New' }],
      timeline: [
        { title: 'Sign Venue Contract', category: 'Venue', due_date: '2026-09-01', notes: 'AI suggested different date' },
        { title: 'Final Linens Sign-off', category: 'Decor', due_date: '2026-09-20', notes: 'New task' },
      ],
      vendors: [],
      ideas: [],
    };

    const replanned = eventStore.applyReplan(eventId, testOwner, replanPayload, {
      old_budget: 30000,
      new_budget: 25000,
      old_guest_count: 100,
      new_guest_count: 80,
      rationale: 'Updated schedule.',
    });

    // Completed task must be preserved with original date and status
    const preserved = replanned.timeline.find((t) => t.title === 'Sign Venue Contract')!;
    expect(preserved.status).toBe('completed');
    expect(preserved.due_date).toBe('2026-05-01');

    // New task must be added
    const newTask = replanned.timeline.find((t) => t.title === 'Final Linens Sign-off');
    expect(newTask).toBeDefined();
  });

  it('preserves booked vendors and merges non-booked vendors', () => {
    const details = eventStore.getEvent(eventId, testOwner);
    const photoVendor = details.vendors.find((v) => v.category.toLowerCase() === 'photography')!;

    // Mark photo vendor as booked
    eventStore.updateVendor(photoVendor.id, testOwner, {
      status: 'booked',
      name: 'Irreplaceable Fine Art Photo',
    });

    const replanPayload: PlanGenerationPayload = {
      budget: [{ category: 'Venue', estimated_cost: 5000, notes: 'Budget' }],
      timeline: [{ title: 'Milestone', category: 'General', due_date: '2026-08-01', notes: 'Note' }],
      vendors: [
        { category: 'Photography', suggested_name_or_type: 'AI Cheaper Photo', estimated_cost: 1500, notes: 'Cheaper' },
        { category: 'Live Music', suggested_name_or_type: 'Acoustic Duo', estimated_cost: 1200, notes: 'New vendor' },
      ],
      ideas: [],
    };

    const replanned = eventStore.applyReplan(eventId, testOwner, replanPayload, {
      old_budget: 30000,
      new_budget: 20000,
      old_guest_count: 100,
      new_guest_count: 60,
      rationale: 'Replaced unbooked partners.',
    });

    const photo = replanned.vendors.find((v) => v.category.toLowerCase() === 'photography')!;
    expect(photo.name).toBe('Irreplaceable Fine Art Photo');
    expect(photo.status).toBe('booked');

    const music = replanned.vendors.find((v) => v.category.toLowerCase() === 'live music');
    expect(music).toBeDefined();
    expect(music?.estimated_cost).toBe(1200);
  });

  it('creates an immutable audit log entry in replan_history', () => {
    const replanPayload: PlanGenerationPayload = {
      budget: [{ category: 'Catering', estimated_cost: 10000, notes: 'Test' }],
      timeline: [{ title: 'Test', category: 'General', due_date: '2026-08-01', notes: 'Test' }],
      vendors: [],
      ideas: [],
      replan_rationale: 'Budget increased from $30,000 to $40,000 to support additional guest count.',
    };

    const replanned = eventStore.applyReplan(eventId, testOwner, replanPayload, {
      old_budget: 30000,
      new_budget: 40000,
      old_guest_count: 100,
      new_guest_count: 150,
      rationale: replanPayload.replan_rationale!,
    });

    expect(replanned.replan_history).toBeDefined();
    expect(replanned.replan_history!.length).toBeGreaterThanOrEqual(1);

    const latestLog = replanned.replan_history![0];
    expect(latestLog.old_budget).toBe(30000);
    expect(latestLog.new_budget).toBe(40000);
    expect(latestLog.old_guest_count).toBe(100);
    expect(latestLog.new_guest_count).toBe(150);
    expect(latestLog.rationale).toContain('Budget increased');
    expect(new Date(latestLog.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('enforces row-level security ownership verification during replan', () => {
    const unauthorizedUser = 'unauthorized-intruder-999';
    const dummyPayload: PlanGenerationPayload = {
      budget: [{ category: 'Catering', estimated_cost: 10000, notes: 'Test' }],
      timeline: [{ title: 'Test', category: 'General', due_date: '2026-08-01', notes: 'Test' }],
      vendors: [],
      ideas: [],
    };

    expect(() => {
      eventStore.applyReplan(eventId, unauthorizedUser, dummyPayload, {
        old_budget: 30000,
        new_budget: 20000,
        old_guest_count: 100,
        new_guest_count: 50,
        rationale: 'Unauthorized attempt',
      });
    }).toThrow(/Access denied/i);
  });
});
