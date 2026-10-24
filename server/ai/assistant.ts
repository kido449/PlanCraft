import { EventWithDetails } from '../types.js';

export interface AssistantAction {
  id?: string;
  type: 'add_budget_item' | 'add_timeline_task' | 'add_vendor' | 'rebalance_budget';
  label: string;
  description: string;
  data: {
    category?: string;
    estimated_cost?: number;
    notes?: string;
    title?: string;
    due_date?: string;
    name?: string;
    from_category?: string;
    to_category?: string;
    amount?: number;
  };
}

export interface AssistantResponse {
  reply: string;
  suggested_actions: AssistantAction[];
}

async function callAssistantLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const groqKey =
    process.env.GROQ_API_KEY ||
    (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : '');
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  if (groqKey) {
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
          max_tokens: 650,
        }),
      });

      if (res.status === 429 && attempts < 3) {
        const err = await res.text();
        console.warn(`[Assistant Groq 429 rate limit - backing off attempt ${attempts}/3]:`, err);
        let waitMs = 1500 * attempts;
        const matchMs = err.match(/try again in ([0-9.]+)ms/i);
        const matchSec = err.match(/try again in ([0-9.]+)s/i);
        if (matchMs && matchMs[1]) {
          waitMs = Math.ceil(parseFloat(matchMs[1])) + 300;
        } else if (matchSec && matchSec[1]) {
          waitMs = Math.ceil(parseFloat(matchSec[1]) * 1000) + 300;
        }
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('gsk_')) {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });
    return response.text || '';
  }

  throw new Error('No LLM API key configured.');
}

export async function askEventAssistant(
  event: EventWithDetails,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AssistantResponse> {
  const budgetSum = (event.budget || []).reduce((acc, b) => acc + (b.estimated_cost || 0), 0);
  const remainingBudget = event.total_budget - budgetSum;

  const budgetSummary = (event.budget || [])
    .map((b) => `- ${b.category}: $${b.estimated_cost.toLocaleString()} (${b.status}) ${b.notes ? `[${b.notes}]` : ''}`)
    .join('\n');

  const timelineSummary = (event.timeline || [])
    .map((t) => `- ${t.due_date}: ${t.title} [${t.category}] (${t.status})`)
    .join('\n');

  const vendorSummary = (event.vendors || [])
    .map((v) => `- ${v.category}: ${v.name} ($${v.estimated_cost.toLocaleString()}, ${v.status})`)
    .join('\n');

  const volunteerSummary = (event.volunteers || [])
    .map((v) => `- ${v.role}: ${v.count_confirmed}/${v.count_needed} confirmed (${v.shift_time})`)
    .join('\n');

  const permitSummary = (event.permits || [])
    .map((p) => `- ${p.permit_type}: ${p.status} (Fee: $${p.fee})`)
    .join('\n');

  const ideasSummary = (event.ideas || [])
    .map((i) => `- ${i.theme}: ${i.description}`)
    .join('\n');

  const systemInstruction = `You are PlanCraft AI, an elite GenAI Event Planning Concierge and Architectural Producer.
You coordinate gatherings with uncompromising taste, mathematical precision, and logistical mastery.

Current Active Gathering Context:
- Name: "${event.name}"
- Type: ${event.type}
- Target Date: ${event.date}
- Headcount: ${event.guest_count} guests
- Location: ${event.location}
- Hard Total Budget: $${event.total_budget.toLocaleString()}
- Current Allocated Sum: $${budgetSum.toLocaleString()} (${remainingBudget >= 0 ? `$${remainingBudget.toLocaleString()} buffer unallocated` : `$${Math.abs(remainingBudget).toLocaleString()} OVER BUDGET`})
- Aesthetic & Vibe: "${event.vibe || 'Curated, warm, intentional'}"

Current Budget Allocations:
${budgetSummary || 'None currently defined'}

Current Timeline Milestones:
${timelineSummary || 'None currently defined'}

${event.type === 'community' ? `Volunteer Roster:
${volunteerSummary || 'None currently defined'}

Municipal Permits:
${permitSummary || 'None currently defined'}` : `Vendors Roster:
${vendorSummary || 'None currently defined'}`}

Design Concepts:
${ideasSummary || 'None'}

Your Task:
Respond to the user's inquiry or command as their proactive, intelligent event producer.
- Provide sharp, contextual advice with specific numbers, trade-offs, and creative recommendations tailored to their exact location, guest count, and vibe.
- Avoid robotic preamble. Start directly with high-value analysis or action.
- When your advice involves adding new line items, milestones, or reallocating budget, populate the "suggested_actions" array with concrete, one-click executable actions!

Return strict JSON matching this schema:
{
  "reply": "string (clear markdown response with concise rationale, bullet points, and creative direction)",
  "suggested_actions": [
    {
      "type": "add_budget_item" | "add_timeline_task" | "add_vendor" | "rebalance_budget",
      "label": "short button label (e.g. 'Add $1,200 Audio Milestone')",
      "description": "brief 1-sentence explanation of this change",
      "data": {
        // For add_budget_item: category, estimated_cost (number), notes
        // For add_timeline_task: title, category, due_date (YYYY-MM-DD), notes
        // For add_vendor: category, name, estimated_cost (number), notes
        // For rebalance_budget: from_category, to_category, amount (number)
      }
    }
  ]
}`;

  const conversationHistory = history
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
    .join('\n\n');

  const prompt = `${conversationHistory ? `Conversation History:\n${conversationHistory}\n\n` : ''}User Question / Request: "${userMessage}"

Analyze and formulate your response in JSON:`;

  try {
    const raw = await callAssistantLLM(systemInstruction, prompt);
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    return {
      reply: parsed.reply || 'Analysis completed.',
      suggested_actions: Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions : [],
    };
  } catch (err: any) {
    console.error('Error in askEventAssistant:', err);
    return {
      reply: `I analyzed your gathering "${event.name}" for ${event.guest_count} guests with $${event.total_budget.toLocaleString()} total budget. Based on current allocations ($${budgetSum.toLocaleString()}), you have ${remainingBudget >= 0 ? `a $${remainingBudget.toLocaleString()} buffer cushion` : `a deficit of $${Math.abs(remainingBudget).toLocaleString()}`}.`,
      suggested_actions: [
        {
          type: 'add_timeline_task',
          label: 'Add 30-Day Final Headcount Checkpoint',
          description: 'Lock RSVP dietary counts and venue layout.',
          data: {
            title: 'Final RSVP & Dietary Lock',
            category: 'RSVP & Guest Services',
            due_date: event.date,
            notes: 'Coordinate exact allergen counts.',
          },
        },
      ],
    };
  }
}
