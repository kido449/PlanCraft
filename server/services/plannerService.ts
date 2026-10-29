import { eventStore } from '../db/store.js';
import { buildGeneratePrompt, buildReplanPrompt } from '../ai/prompts.js';
import { executePlanGeneration } from '../ai/generator.js';
import { enforcePlanConstraints } from '../ai/constraints.js';
import { EventWithDetails } from '../types.js';

export async function executeGenerateFlow(
  eventId: string,
  ownerId: string
): Promise<{ event: EventWithDetails; promptUsed: string }> {
  const eventWithDetails = eventStore.getEvent(eventId, ownerId);
  const prompt = buildGeneratePrompt(eventWithDetails);
  const rawGeneratedPlan = await executePlanGeneration(prompt);

  // Programmatic code-level constraint enforcement & clamping
  const { payload: generatedPlan } = enforcePlanConstraints(rawGeneratedPlan, eventWithDetails);

  const updatedEvent = eventStore.saveGeneratedPlan(eventWithDetails.id, ownerId, generatedPlan);
  return {
    event: updatedEvent,
    promptUsed: prompt,
  };
}

export async function executeReplanFlow(
  eventId: string,
  ownerId: string,
  params: { new_budget?: number; new_guest_count?: number; reason?: string }
): Promise<{ event: EventWithDetails; promptUsed: string; rationale?: string }> {
  const currentEvent = eventStore.getEvent(eventId, ownerId);

  const targetBudget = params.new_budget !== undefined ? Number(params.new_budget) : currentEvent.total_budget;
  const targetGuests = params.new_guest_count !== undefined ? Number(params.new_guest_count) : currentEvent.guest_count;

  const oldBudget = currentEvent.total_budget;
  const oldGuests = currentEvent.guest_count;

  // 1. Update event constraints
  eventStore.updateEvent(eventId, ownerId, {
    total_budget: targetBudget,
    guest_count: targetGuests,
  });

  const refreshedEvent = eventStore.getEvent(eventId, ownerId);

  // 2. Build constraint-aware prompt with delta calculations and locked items
  const prompt = buildReplanPrompt(refreshedEvent, refreshedEvent, {
    oldBudget,
    newBudget: targetBudget,
    oldGuests,
    newGuests: targetGuests,
    reason: params.reason,
  });

  // 3. Execute LLM generation
  const rawReplanResult = await executePlanGeneration(prompt);

  // Find locked budget items that must be preserved
  const lockedBudgetItems = (refreshedEvent.budget || []).filter(
    (b) => b.is_user_edited || b.status === 'paid' || b.actual_cost !== null
  );

  // 4. Code-level programmatic constraint enforcement & clamping
  const { payload: replanResult } = enforcePlanConstraints(rawReplanResult, refreshedEvent, {
    lockedBudgetItems,
    isReplan: true,
  });

  // 5. Merge replan payload preserving user-edited/locked items
  const finalEvent = eventStore.applyReplan(eventId, ownerId, replanResult, {
    old_budget: oldBudget,
    new_budget: targetBudget,
    old_guest_count: oldGuests,
    new_guest_count: targetGuests,
    rationale: replanResult.replan_rationale || params.reason || 'Constraints rebalanced.',
  });

  return {
    event: finalEvent,
    promptUsed: prompt,
    rationale: replanResult.replan_rationale,
  };
}

