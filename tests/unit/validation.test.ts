import { describe, it, expect } from 'vitest';
import { validatePlanPayload } from '../../server/ai/generator.js';

describe('Plan Payload Schema Validation', () => {
  it('validates a complete social/wedding payload', () => {
    const raw = {
      budget: [
        { category: 'Venue Rental', estimated_cost: 8500, notes: 'Historic estate' },
        { category: 'Catering & Bar', estimated_cost: 12000, notes: 'Plated 3-course' },
      ],
      timeline: [
        { title: 'Lock Venue Deposit', category: 'Venue', due_date: '2026-06-01', notes: 'Sign contract' },
        { title: 'Final RSVP Headcount', category: 'Guests', due_date: '2026-09-15', notes: 'Lock dietary counts' },
      ],
      vendors: [
        { category: 'Photography', suggested_name_or_type: 'Artisan Lens Studio', estimated_cost: 3500, notes: '8 hours coverage' },
        { category: 'Floral Atelier', suggested_name_or_type: 'Botanical Craft Co', estimated_cost: 2500, notes: 'Arbor & tables' },
      ],
      ideas: [
        { theme: 'Amber Courtyard', description: 'Warm festoon lighting and rustic wooden tables' },
      ],
      replan_rationale: 'Balanced within $35,000 target budget.',
    };

    const result = validatePlanPayload(raw);
    expect(result.isValid).toBe(true);
    expect(result.cleanPayload).toBeDefined();
    expect(result.cleanPayload?.budget).toHaveLength(2);
    expect(result.cleanPayload?.timeline).toHaveLength(2);
    expect(result.cleanPayload?.vendors).toHaveLength(2);
    expect(result.cleanPayload?.ideas).toHaveLength(1);
    expect(result.cleanPayload?.replan_rationale).toBe('Balanced within $35,000 target budget.');
  });

  it('validates a community gathering payload with volunteers and permits', () => {
    const raw = {
      budget: [
        { category: 'Public Sanitation & Bins', estimated_cost: 1500, notes: 'City waste contract' },
        { category: 'Stage & Canopy Rentals', estimated_cost: 2500, notes: 'Park pavilion setup' },
      ],
      timeline: [
        { title: 'Submit Park Special Event Permit', category: 'Permits', due_date: '2026-05-01', notes: 'City parks board' },
      ],
      volunteers: [
        { role: 'Sanitation Marshall', contact_name: 'Open Shift', shift_time: '08:00 AM - 12:00 PM', count_needed: 6, notes: 'Provide vests' },
      ],
      permits: [
        { permit_type: 'City Assembly Authorization', issuing_agency: 'Municipal Parks Dept', status: 'required', fee: 175, deadline: '2026-06-15', notes: 'Public notice required' },
      ],
      ideas: [
        { theme: 'Community Resilience', description: 'Interactive neighborhood mural and local music showcase' },
      ],
    };

    const result = validatePlanPayload(raw);
    expect(result.isValid).toBe(true);
    expect(result.cleanPayload?.volunteers).toHaveLength(1);
    expect(result.cleanPayload?.permits).toHaveLength(1);
    expect(result.cleanPayload?.volunteers?.[0].count_needed).toBe(6);
    expect(result.cleanPayload?.permits?.[0].fee).toBe(175);
  });

  it('rejects non-object root payloads', () => {
    expect(validatePlanPayload(null).isValid).toBe(false);
    expect(validatePlanPayload('invalid-string').isValid).toBe(false);
    expect(validatePlanPayload(42).isValid).toBe(false);
    expect(validatePlanPayload([]).isValid).toBe(false);
  });

  it('rejects missing or empty budget array', () => {
    const missingBudget = {
      timeline: [{ title: 'Task', category: 'General', due_date: '2026-06-01' }],
      vendors: [{ category: 'Catering', name: 'Chef', estimated_cost: 1000 }],
    };
    const emptyBudget = {
      budget: [],
      timeline: [{ title: 'Task', category: 'General', due_date: '2026-06-01' }],
      vendors: [{ category: 'Catering', name: 'Chef', estimated_cost: 1000 }],
    };

    expect(validatePlanPayload(missingBudget).isValid).toBe(false);
    expect(validatePlanPayload(missingBudget).error).toContain('budget');
    expect(validatePlanPayload(emptyBudget).isValid).toBe(false);
  });

  it('rejects invalid budget items with non-numeric costs', () => {
    const badCost = {
      budget: [{ category: 'Venue', estimated_cost: 'ten thousand dollars' }],
      timeline: [{ title: 'Task', category: 'General', due_date: '2026-06-01' }],
      vendors: [{ category: 'Catering', name: 'Chef', estimated_cost: 1000 }],
    };
    const missingCategory = {
      budget: [{ estimated_cost: 5000 }],
      timeline: [{ title: 'Task', category: 'General', due_date: '2026-06-01' }],
      vendors: [{ category: 'Catering', name: 'Chef', estimated_cost: 1000 }],
    };

    expect(validatePlanPayload(badCost).isValid).toBe(false);
    expect(validatePlanPayload(badCost).error).toContain('estimated_cost must be number');
    expect(validatePlanPayload(missingCategory).isValid).toBe(false);
  });

  it('rejects missing or empty timeline array', () => {
    const missingTimeline = {
      budget: [{ category: 'Venue', estimated_cost: 5000 }],
      vendors: [{ category: 'Catering', name: 'Chef', estimated_cost: 1000 }],
    };
    expect(validatePlanPayload(missingTimeline).isValid).toBe(false);
    expect(validatePlanPayload(missingTimeline).error).toContain('timeline');
  });

  it('rejects payloads missing both vendors and civic logistics', () => {
    const missingLogistics = {
      budget: [{ category: 'Venue', estimated_cost: 5000 }],
      timeline: [{ title: 'Task', category: 'General', due_date: '2026-06-01' }],
    };
    const res = validatePlanPayload(missingLogistics);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('vendors');
  });

  it('provides graceful fallback when ideas are omitted', () => {
    const noIdeas = {
      budget: [{ category: 'Venue', estimated_cost: 5000 }],
      timeline: [{ title: 'Task', category: 'General', due_date: '2026-06-01' }],
      vendors: [{ category: 'Catering', suggested_name_or_type: 'Chef Partner', estimated_cost: 2000 }],
    };
    const res = validatePlanPayload(noIdeas);
    expect(res.isValid).toBe(true);
    expect(res.cleanPayload?.ideas.length).toBeGreaterThanOrEqual(1);
    expect(res.cleanPayload?.ideas[0].theme).toBeDefined();
  });

  it('rounds estimated_cost to integers and trims strings', () => {
    const raw = {
      budget: [{ category: '  Floral & Decor  ', estimated_cost: 3499.75, notes: '  Candles  ' }],
      timeline: [{ title: ' Book Florist ', category: ' Decor ', due_date: ' 2026-07-01 ' }],
      vendors: [{ category: ' Floral ', suggested_name_or_type: ' Atelier ', estimated_cost: 3500.2 }],
    };
    const res = validatePlanPayload(raw);
    expect(res.isValid).toBe(true);
    expect(res.cleanPayload?.budget[0].category).toBe('Floral & Decor');
    expect(res.cleanPayload?.budget[0].estimated_cost).toBe(3500);
    expect(res.cleanPayload?.timeline[0].title).toBe('Book Florist');
    expect(res.cleanPayload?.vendors[0].suggested_name_or_type).toBe('Atelier');
  });
});
