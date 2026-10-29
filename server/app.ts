import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { eventsRouter } from './routes/events.js';
import { eventStore } from './db/store.js';

import rateLimit from 'express-rate-limit';

dotenv.config();

export const app = express();

// Body parser with 1mb limit
app.use(express.json({ limit: '1mb' }));

// Global API Rate Limiter (200 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Stricter LLM Rate Limiter for compute-heavy routes (30 requests per 15 minutes)
const llmEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI generation rate limit reached. Please wait a few minutes before submitting new requests.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/api', globalLimiter);
app.use(['/api/events/:id/generate', '/api/events/:id/replan', '/api/events/:id/assistant'], llmEndpointLimiter);

// Health check endpoint (Public)
app.get('/api/health', (_req: Request, res: Response) => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY?.startsWith('gsk_'));
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('gsk_'));
  res.json({
    status: 'ok',
    service: 'PlanCraft AI Engine',
    timestamp: new Date().toISOString(),
    groqConfigured: hasGroq,
    geminiConfigured: hasGemini,
    activeProvider: hasGroq
      ? `Groq (${process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'})`
      : hasGemini
      ? 'Google Gemini'
      : 'None',
  });
});

// API Routes
app.use('/api', eventsRouter);

// Seed default initial event if database is completely empty
const defaultOwnerId = 'default-user-101';
try {
  const existingEvents = eventStore.listEvents(defaultOwnerId);
  if (existingEvents.length === 0) {
    eventStore.createEvent(
      {
        type: 'wedding',
        name: 'Elena & Marcus Autumn Vineyard Wedding',
        date: '2026-10-24',
        guest_count: 120,
        location: 'Napa Valley, CA',
        total_budget: 35000,
        vibe: 'Rustic elegance, warm amber lighting, farm-to-table dining, acoustic jazz',
      },
      defaultOwnerId
    );
  }
} catch (err) {
  // If store is still initializing or in test mode, continue gracefully
}

// Global error handler for API
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});
