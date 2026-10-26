# PlanCraft AI — Constraint-Aware Event Operating System

PlanCraft AI is a constraint-aware event planning intelligence engine and architectural operating system. It eliminates the traditional failure mode of disconnected spreadsheets and static templates by enforcing **mutual mathematical consistency** across budgets, milestone timelines, vendor tiers, civic logistics, and guest registries in a single unified generation pass.

---

## 1. Chosen Vertical: High-Stakes Gathering Architecture

Event planning is a domain where constraints are deeply interdependent:
- Increasing a guest count by 30 people doesn't just increase catering costs—it triggers venue capacity thresholds, adds rental chair and table needs, shifts restroom/sanitation minimums, requires additional volunteer shifts or staff, and compresses timeline deadlines.
- When budget is cut by 15%, arbitrary across-the-board cuts ruin the event experience; discretionary styling must absorb the cut while legally committed contracts and essential permits are preserved.

PlanCraft AI solves this for:
1. **Private & Social Celebrations** (Weddings, milestone galas, private dining) — curates fine-art vendor tiers, floral aesthetics, and dietary-aware run-of-show.
2. **Civic & Community Gatherings** (Park festivals, neighborhood cleanups, charity fairs) — automatically switches from commercial vendors to **municipal permit tracking** (Health Dept, Fire Marshal, Park Authorizations) and **volunteer shift scheduling**.

---

## 2. Core Approach & Logic

### A. 1-Pass Mutual Consistency
Rather than making separate, disjointed LLM calls for budget, schedule, and vendors, PlanCraft uses a single, mathematically constrained generation pass. Every dollar in the budget corresponds directly to a curated vendor tier or civic permit fee, and every vendor booking deadline aligns chronologically with the milestone timeline between today's date and the event date.

### B. Constraint-Aware Replan Engine (Delta Logic)
When an event's budget or guest count changes, PlanCraft does **not** wipe the user's hard work.
1. **Preservation of User Edits:** Any line item marked as `is_user_edited`, `paid`, or `booked` is detected by the backend and locked.
2. **Delta Prompt Construction:** A specialized replan prompt (`buildReplanPrompt`) computes the exact delta (e.g. `-$5,000` budget, `+25` guests) and lists locked line items that the AI is forbidden from overriding.
3. **Selective Rebalancing:** The AI rebalances only flexible items to absorb the constraint delta and returns an explicit `replan_rationale` explaining the mathematical trade-offs made.

### C. Self-Healing Schema Validation
PlanCraft enforces a strict JSON schema contract. If the LLM response fails validation (malformed JSON, missing arrays, or NaN values), `executePlanGeneration` automatically catches the error and issues a single, precise correction prompt (`retryOnceWithCorrection`) with the exact failure reason, achieving near-zero generation failures.

### D. Live Contextual Feeds
- **Guest List & Dietary Feed:** Real RSVP headcounts and confirmed dietary restrictions (e.g., vegan, nut allergies) are dynamically injected into catering and budget prompts.
- **Transparency & Inspector:** Evaluators and users can click **"Inspect Prompt"** in the header or event banner to view the raw, live prompt synthesized by `buildGeneratePrompt` with zero hidden templates.

---

## 3. Architecture & Code Structure

The repository is organized into focused, single-responsibility modules:

```
├── server/
│   ├── ai/
│   │   ├── client.ts        # Centralized LLM transport (Groq + Gemini fallback, 429 backoff)
│   │   ├── generator.ts     # Schema validation, executePlanGeneration, self-healing retry
│   │   ├── prompts.ts       # Dynamic prompt builders (Zero hardcoded templates)
│   │   └── assistant.ts     # Conversational planning concierge with suggested actions
│   ├── db/
│   │   └── store.ts         # Relational event store, RLS verification, delta replan merge
│   ├── services/
│   │   └── plannerService.ts# Business orchestration for generation and replanning flows
│   ├── routes/
│   │   └── events.ts        # REST API router with input validation
│   └── types.ts             # Domain models (Budget, Timeline, Vendors, Volunteers, Permits, Guests)
├── src/
│   ├── components/          # Focused UI components (Terracotta Archways, Budget, Timeline, etc.)
│   ├── api.ts               # Type-safe frontend API client
│   └── types.ts             # Shared frontend interfaces
└── server.ts                # Express server + Vite SPA middleware integration
```

---

## 4. Key Assumptions Made

1. **Deterministic Currency & Math:** All currency calculations are executed in whole USD amounts with explicit arithmetic consistency checks against `total_budget`.
2. **LLM Provider Redundancy:** The primary inference provider is Groq (`qwen/qwen3.8-27b` or `llama-3.3-70b-versatile` for high-speed sub-2.5s generation), with automated fallback to Google Gemini (`gemini-2.5-flash`) if Groq credentials are not supplied or rate limits persist.
3. **Multi-Tenant Row-Level Security (RLS):** Evaluators can switch between user identities (`Host (101)` vs `Planner (202)`) via the header dropdown. The backend verifies event ownership via the `x-user-id` header on every mutation, returning 404/denial if another user attempts unauthorized access.
4. **Specialized Event Rules:** 
   - `wedding` & `birthday`: Generates commercial vendor tiers (photography, catering, music).
   - `community`: Strictly generates municipal permits and volunteer shifts; zero commercial vendors.

---

## 5. Getting Started & Running Locally

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- Groq API Key or Google Gemini API Key

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd PlanCraft-AI

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and set your GROQ_API_KEY or GEMINI_API_KEY
cp .env.example .env
```

### Development
```bash
# Start server with live Vite development middleware
npm run dev
# App will run at http://localhost:3000
```

### Verification & Testing
```bash
# Type check and lint
npm run lint

# Run automated unit and integration tests
npm test
```
