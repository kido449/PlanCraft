import { EventRecord, PlanGenerationPayload, BudgetItemRecord } from '../types.js';

export interface ConstraintEnforcementResult {
  payload: PlanGenerationPayload;
  adjustmentsMade: string[];
}

/**
 * Code-level programmatic constraint validator & clamp engine.
 * Guarantees that hard constraints (budget ceiling, non-negative costs,
 * temporal task boundaries, and logistics limits) are strictly enforced in code,
 * never relying solely on LLM prompt compliance.
 */
export function enforcePlanConstraints(
  payload: PlanGenerationPayload,
  event: EventRecord,
  options: {
    lockedBudgetItems?: BudgetItemRecord[];
    isReplan?: boolean;
  } = {}
): ConstraintEnforcementResult {
  const adjustmentsMade: string[] = [];
  const maxBudget = Number(event.total_budget);
  const eventDateStr = event.date; // YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const creationDateStr = (event.created_at || todayStr).split('T')[0];
  const minDateStr = creationDateStr < todayStr ? creationDateStr : todayStr;

  // 1. BUDGET CONSTRAINTS CLAMP
  const lockedItems = options.lockedBudgetItems || [];
  const lockedSum = lockedItems.reduce((acc, b) => acc + (b.actual_cost ?? b.estimated_cost ?? 0), 0);
  const preservedCategories = new Set(lockedItems.map((b) => b.category.toLowerCase()));

  // Sanitize individual costs: non-negative and finite
  for (const b of payload.budget) {
    if (isNaN(b.estimated_cost) || b.estimated_cost < 0) {
      adjustmentsMade.push(`Corrected negative/NaN cost for budget item "${b.category}" to $0`);
      b.estimated_cost = 0;
    }
  }

  // Calculate flexible sum
  const flexibleItems = payload.budget.filter((b) => !preservedCategories.has(b.category.toLowerCase()));
  const flexibleSum = flexibleItems.reduce((acc, b) => acc + b.estimated_cost, 0);
  const currentTotalSum = lockedSum + flexibleSum;

  // If budget ceiling is exceeded, clamp and scale flexible items
  if (currentTotalSum > maxBudget && flexibleItems.length > 0) {
    const allowedFlexibleBudget = Math.max(0, maxBudget - lockedSum);
    if (flexibleSum > 0 && allowedFlexibleBudget > 0) {
      const scaleFactor = allowedFlexibleBudget / flexibleSum;
      let runningSum = 0;

      for (let i = 0; i < flexibleItems.length; i++) {
        const item = flexibleItems[i];
        if (i === flexibleItems.length - 1) {
          // Assign remainder to last item to ensure exact match without rounding drift
          item.estimated_cost = Math.max(0, allowedFlexibleBudget - runningSum);
        } else {
          item.estimated_cost = Math.round(item.estimated_cost * scaleFactor);
          runningSum += item.estimated_cost;
        }
      }
      adjustmentsMade.push(
        `Clamped budget: LLM proposed $${currentTotalSum.toLocaleString()} which violated hard ceiling $${maxBudget.toLocaleString()}. Scaled flexible categories by ${scaleFactor.toFixed(3)}x to fit ceiling exactly.`
      );
    } else {
      for (const item of flexibleItems) {
        item.estimated_cost = 0;
      }
      adjustmentsMade.push(
        `Locked items total $${lockedSum.toLocaleString()} consumes entire $${maxBudget.toLocaleString()} ceiling; set all flexible items to $0.`
      );
    }
  }

  // 2. TIMELINE TEMPORAL CONSTRAINTS CLAMP
  // All tasks must occur on or before event.date and on or after minDateStr
  const eventDateTime = new Date(eventDateStr).getTime();
  const minDateTime = new Date(minDateStr).getTime();

  for (const t of payload.timeline) {
    let taskTime = new Date(t.due_date).getTime();

    // Check if task date is invalid
    if (isNaN(taskTime)) {
      t.due_date = eventDateStr;
      adjustmentsMade.push(`Fixed malformed date on task "${t.title}" to ${eventDateStr}`);
      taskTime = eventDateTime;
    }

    // Hard constraint: Cannot occur after the event has already taken place
    if (taskTime > eventDateTime) {
      adjustmentsMade.push(
        `Clamped task "${t.title}": LLM scheduled due_date (${t.due_date}) after event date (${eventDateStr}). Clamped to ${eventDateStr}.`
      );
      t.due_date = eventDateStr;
    }

    // Cannot occur before creation / today
    if (taskTime < minDateTime) {
      t.due_date = minDateStr;
      adjustmentsMade.push(
        `Clamped task "${t.title}": date (${t.due_date}) prior to plan creation. Set to ${minDateStr}.`
      );
    }
  }

  // Sort timeline chronologically
  payload.timeline.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // 3. CIVIC PERMITS & VOLUNTEERS CONSTRAINTS CLAMP
  if (Array.isArray(payload.permits)) {
    for (const p of payload.permits) {
      if (isNaN(p.fee) || p.fee < 0) {
        p.fee = 0;
      }
      if (p.deadline) {
        const deadlineTime = new Date(p.deadline).getTime();
        if (isNaN(deadlineTime) || deadlineTime > eventDateTime) {
          adjustmentsMade.push(`Clamped permit "${p.permit_type}" deadline to ${eventDateStr}`);
          p.deadline = eventDateStr;
        }
      }
    }
  }

  if (Array.isArray(payload.volunteers)) {
    for (const v of payload.volunteers) {
      if (isNaN(v.count_needed) || v.count_needed < 1) {
        v.count_needed = 1;
      } else if (v.count_needed > 500) {
        v.count_needed = 500;
        adjustmentsMade.push(`Capped volunteer count for "${v.role}" at 500`);
      }
    }
  }

  // 4. VENDOR ESTIMATES SANITIZATION
  if (Array.isArray(payload.vendors)) {
    for (const v of payload.vendors) {
      if (isNaN(v.estimated_cost) || v.estimated_cost < 0) {
        v.estimated_cost = 0;
      }
    }
  }

  // 5. UPDATE RATIONALE IF ADJUSTMENTS OCCURRED
  if (adjustmentsMade.length > 0) {
    const notice = `[Code-Level Constraint Guard]: Enforced ${adjustmentsMade.length} programmatic boundary rule(s).`;
    payload.replan_rationale = payload.replan_rationale
      ? `${payload.replan_rationale} ${notice}`
      : notice;
  }

  return { payload, adjustmentsMade };
}
