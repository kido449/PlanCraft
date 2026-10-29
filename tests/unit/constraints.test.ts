import { describe, it, expect } from 'vitest';
import { enforcePlanConstraints } from '../../server/ai/constraints.js';
import { EventRecord, PlanGenerationPayload, BudgetItemRecord } from '../../server/types.js';

describe('Code-Level Constraint Enforcement & Clamping Engine', () => {
  const baseEvent: EventRecord = {
    id: 'event-uuid-101',
    owner_id: 'user-101',
    type: 'wedding',
    name: 'Constraints Guard Gala',
    date: '2026-10-30',
    guest_count: 100,
    location: 'Napa Valley, CA',
    total_budget: 30000,
    vibe: 'Modern vineyard',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  };

  it('clamps budget items exceeding hard ceiling down to total_budget', () => {
    // LLM returns total budget of $50,000 when ceiling is $30,000
    const rawPayload: PlanGenerationPayload = {
      budget: [
        { category: 'Venue Grounds', estimated_cost: 25000, notes: 'Overpriced' },
        { category: 'Fine Catering', estimated_cost: 25000, notes: 'Overpriced' },
      ],
      timeline: [
        { title: 'Tasting', category: 'Catering', due_date: '2026-08-01', notes: 'Valid' },
      ],
      vendors: [
        { category: 'Catering', suggested_name_or_type: 'Caterer', estimated_cost: 25000, notes: 'Notes' },
      ],
      ideas: [{ theme: 'Rustic Luxe', description: 'Festoon lights' }],
    };

    const { payload, adjustmentsMade } = enforcePlanConstraints(rawPayload, baseEvent);

    const totalSum = payload.budget.reduce((acc, b) => acc + b.estimated_cost, 0);
    expect(totalSum).toBeLessThanOrEqual(30000);
    expect(totalSum).toBe(30000);
    expect(adjustmentsMade.some((a) => a.includes('Clamped budget'))).toBe(true);
    expect(payload.replan_rationale).toContain('[Code-Level Constraint Guard]');
  });

  it('clamps negative or NaN budget item costs to zero', () => {
    const rawPayload: PlanGenerationPayload = {
      budget: [
        { category: 'Venue', estimated_cost: -5000, notes: 'Negative' },
        { category: 'Catering', estimated_cost: NaN, notes: 'NaN' },
        { category: 'Decor', estimated_cost: 15000, notes: 'Valid' },
      ],
      timeline: [],
      vendors: [],
      ideas: [],
    };

    const { payload, adjustmentsMade } = enforcePlanConstraints(rawPayload, baseEvent);
    expect(payload.budget[0].estimated_cost).toBe(0);
    expect(payload.budget[1].estimated_cost).toBe(0);
    expect(adjustmentsMade.some((a) => a.includes('negative/NaN'))).toBe(true);
  });

  it('clamps timeline tasks scheduled after event.date to event.date', () => {
    // Event date is 2026-10-30; LLM proposes dates in 2028 and 2030
    const rawPayload: PlanGenerationPayload = {
      budget: [{ category: 'Venue', estimated_cost: 20000, notes: 'Valid' }],
      timeline: [
        { title: 'Post-Event Cleanup Review', category: 'Logistics', due_date: '2028-12-15', notes: 'Scheduled way too late' },
        { title: 'Valid Rehearsal', category: 'Rehearsal', due_date: '2026-10-25', notes: 'Valid' },
      ],
      vendors: [],
      ideas: [],
    };

    const { payload, adjustmentsMade } = enforcePlanConstraints(rawPayload, baseEvent);
    expect(payload.timeline.find((t) => t.title.includes('Post-Event'))?.due_date).toBe('2026-10-30');
    expect(adjustmentsMade.some((a) => a.includes('after event date'))).toBe(true);
  });

  it('preserves locked items during replan and only scales flexible items within remaining budget', () => {
    // Locked venue item: $18,000 paid / user edited
    const lockedItems: BudgetItemRecord[] = [
      {
        id: 'locked-1',
        event_id: baseEvent.id,
        category: 'Estate Venue',
        estimated_cost: 18000,
        actual_cost: 18000,
        status: 'paid',
        notes: 'Deposit paid',
        is_user_edited: true,
      },
    ];

    // LLM proposes flexible lines totaling $24,000 (total would be 18k + 24k = 42k, exceeding 30k)
    const replanPayload: PlanGenerationPayload = {
      budget: [
        { category: 'Estate Venue', estimated_cost: 18000, notes: 'Preserved' },
        { category: 'Catering', estimated_cost: 16000, notes: 'Flexible' },
        { category: 'Photography', estimated_cost: 8000, notes: 'Flexible' },
      ],
      timeline: [],
      vendors: [],
      ideas: [],
    };

    const { payload } = enforcePlanConstraints(replanPayload, baseEvent, {
      lockedBudgetItems: lockedItems,
      isReplan: true,
    });

    // Flexible items should sum to exactly 30,000 - 18,000 = 12,000
    const catering = payload.budget.find((b) => b.category === 'Catering')!;
    const photo = payload.budget.find((b) => b.category === 'Photography')!;
    expect(catering.estimated_cost + photo.estimated_cost).toBe(12000);
  });

  it('clamps civic permit deadlines and volunteer counts for community events', () => {
    const rawPayload: PlanGenerationPayload = {
      budget: [{ category: 'Permits', estimated_cost: 1000, notes: 'Permits' }],
      timeline: [],
      volunteers: [
        { role: 'Safety Point', contact_name: 'Lead', shift_time: 'AM', count_needed: -2, notes: 'Invalid count' },
      ],
      permits: [
        { permit_type: 'Park Closure', issuing_agency: 'Parks Board', status: 'required', fee: -50, deadline: '2030-01-01', notes: 'Late' },
      ],
      vendors: [],
      ideas: [],
    };

    const { payload } = enforcePlanConstraints(rawPayload, baseEvent);
    expect(payload.volunteers![0].count_needed).toBe(1);
    expect(payload.permits![0].fee).toBe(0);
    expect(payload.permits![0].deadline).toBe('2026-10-30');
  });
});
