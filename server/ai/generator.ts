import { PlanGenerationPayload } from '../types.js';
import { callLLM } from './client.js';

/**
 * Strict validator for JSON Schema Contract:
 * Supports both:
 * 1. Social events: budget + timeline + vendors + ideas
 * 2. Community events: budget + timeline + volunteers + permits + ideas
 */
export function validatePlanPayload(obj: any): {
  isValid: boolean;
  error?: string;
  cleanPayload?: PlanGenerationPayload;
} {
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, error: 'Output is not a valid JSON object.' };
  }

  // Budget validation
  if (!Array.isArray(obj.budget) || obj.budget.length === 0) {
    return { isValid: false, error: 'Missing or empty "budget" array.' };
  }
  for (let i = 0; i < obj.budget.length; i++) {
    const b = obj.budget[i];
    if (
      !b ||
      typeof b.category !== 'string' ||
      typeof b.estimated_cost !== 'number' ||
      isNaN(b.estimated_cost)
    ) {
      return {
        isValid: false,
        error: `Invalid budget item at index ${i}: category must be string, estimated_cost must be number.`,
      };
    }
  }

  // Timeline validation
  if (!Array.isArray(obj.timeline) || obj.timeline.length === 0) {
    return { isValid: false, error: 'Missing or empty "timeline" array.' };
  }
  for (let i = 0; i < obj.timeline.length; i++) {
    const t = obj.timeline[i];
    if (
      !t ||
      typeof t.title !== 'string' ||
      typeof t.category !== 'string' ||
      typeof t.due_date !== 'string'
    ) {
      return {
        isValid: false,
        error: `Invalid timeline task at index ${i}: title, category, and due_date must be strings.`,
      };
    }
  }

  // Ideas validation (graceful fallback if omitted or empty)
  if (!Array.isArray(obj.ideas) || obj.ideas.length === 0) {
    obj.ideas = [
      { theme: 'Atmosphere & Design', description: 'Curated styling and ambient lighting tailored to the theme.' },
      { theme: 'Guest Experience', description: 'Personalized welcomes and interactive celebration elements.' },
    ];
  } else {
    obj.ideas = obj.ideas.filter(
      (item: any) => item && typeof item.theme === 'string' && typeof item.description === 'string'
    );
    if (obj.ideas.length === 0) {
      obj.ideas = [
        { theme: 'Atmosphere & Design', description: 'Curated styling and ambient lighting tailored to the theme.' },
        { theme: 'Guest Experience', description: 'Personalized welcomes and interactive celebration elements.' },
      ];
    }
  }

  // Check if community structure (volunteers + permits) or commercial structure (vendors)
  const hasVendors = Array.isArray(obj.vendors) && obj.vendors.length > 0;
  const hasVolunteers = Array.isArray(obj.volunteers) && obj.volunteers.length > 0;
  const hasPermits = Array.isArray(obj.permits) && obj.permits.length > 0;

  if (!hasVendors && !hasVolunteers && !hasPermits) {
    return {
      isValid: false,
      error: 'Plan must contain either "vendors" (for weddings/socials) or "volunteers" and "permits" (for community events).',
    };
  }

  const cleanPayload: PlanGenerationPayload = {
    budget: obj.budget.map((b: any) => ({
      category: String(b.category).trim(),
      estimated_cost: Math.round(Number(b.estimated_cost)),
      notes: String(b.notes || ''),
    })),
    timeline: obj.timeline.map((t: any) => ({
      title: String(t.title).trim(),
      category: String(t.category).trim(),
      due_date: String(t.due_date).trim(),
      notes: String(t.notes || ''),
    })),
    vendors: hasVendors
      ? obj.vendors.map((v: any) => ({
          category: String(v.category).trim(),
          suggested_name_or_type: String(v.suggested_name_or_type || v.name || 'Vendor Partner').trim(),
          estimated_cost: Math.round(Number(v.estimated_cost || 0)),
          notes: String(v.notes || ''),
        }))
      : [],
    volunteers: hasVolunteers
      ? obj.volunteers.map((vol: any) => ({
          role: String(vol.role).trim(),
          contact_name: String(vol.contact_name || 'Open Shift').trim(),
          shift_time: String(vol.shift_time || 'Event Day').trim(),
          count_needed: Math.max(1, Math.round(Number(vol.count_needed || 4))),
          notes: String(vol.notes || ''),
        }))
      : undefined,
    permits: hasPermits
      ? obj.permits.map((p: any) => ({
          permit_type: String(p.permit_type).trim(),
          issuing_agency: String(p.issuing_agency || 'City / County Authority').trim(),
          status: p.status === 'approved' || p.status === 'in_progress' ? p.status : 'required',
          fee: Math.round(Number(p.fee || 0)),
          deadline: String(p.deadline || ''),
          notes: String(p.notes || ''),
        }))
      : undefined,
    ideas: obj.ideas.map((item: any) => ({
      theme: String(item.theme).trim(),
      description: String(item.description).trim(),
    })),
    replan_rationale: obj.replan_rationale ? String(obj.replan_rationale) : undefined,
  };

  return { isValid: true, cleanPayload };
}

/**
 * Execute LLM call with live prompt and JSON parsing.
 * On validation failure, re-prompts once with precise feedback.
 */
export async function executePlanGeneration(prompt: string): Promise<PlanGenerationPayload> {
  const systemInstruction = `You are PlanCraft AI, an uncompromising, constraint-aware event planning intelligence engine.
Always produce strict JSON matching the requested schema. Ensure arithmetic mutual consistency across all sections.
Do not output markdown codeblocks, provide raw JSON only.`;

  try {
    const rawText = await callLLM(systemInstruction, prompt, { temperature: 0.4 });

    let parsed: any;
    try {
      parsed = JSON.parse(
        rawText
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()
      );
    } catch (parseErr) {
      console.warn('Initial JSON parse failed, initiating retry prompt...', parseErr);
      return await retryOnceWithCorrection(prompt, `Invalid JSON syntax: ${String(parseErr)}`);
    }

    const validation = validatePlanPayload(parsed);
    if (!validation.isValid || !validation.cleanPayload) {
      console.warn('Initial validation failed, initiating retry prompt:', validation.error);
      return await retryOnceWithCorrection(prompt, validation.error || 'Schema validation failure');
    }

    return validation.cleanPayload;
  } catch (err: any) {
    console.error('Error during LLM execution:', err);
    throw new Error(`AI Generation failed: ${err.message || 'Unknown LLM error'}`);
  }
}

/**
 * Self-healing single retry if LLM returns unexpected structure
 */
async function retryOnceWithCorrection(
  originalPrompt: string,
  errorReason: string
): Promise<PlanGenerationPayload> {
  const retryPrompt = `${originalPrompt}

CRITICAL CORRECTION REQUIRED:
Your previous attempt failed schema validation with this reason: "${errorReason}".
Return ONLY pure JSON matching the exact schema without deviations.
Ensure every category, estimated_cost (number), and due_date (YYYY-MM-DD) are present.`;

  const systemInstruction = `You are PlanCraft AI. Produce valid, strictly formatted JSON matching the requested schema.`;
  const rawText = await callLLM(systemInstruction, retryPrompt, { temperature: 0.2 });

  const parsed = JSON.parse(
    rawText
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  );
  const validation = validatePlanPayload(parsed);

  if (!validation.isValid || !validation.cleanPayload) {
    throw new Error(`AI Generation failed after schema retry: ${validation.error}`);
  }

  return validation.cleanPayload;
}
