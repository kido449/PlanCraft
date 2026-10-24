import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { eventsRouter } from './server/routes/events.js';
import { eventStore } from './server/db/store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json());

// API Routes
app.use('/api', eventsRouter);

// Health check endpoint
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

// Seed an initial demo event if database is completely empty
const defaultOwnerId = 'default-user-101';
const existingEvents = eventStore.listEvents(defaultOwnerId);
if (existingEvents.length === 0) {
  const seed = eventStore.createEvent(
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
  console.log(`Initialized default sample event: ${seed.id}`);
}

// Global error handler for API
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Dev or Production Static/Vite Integration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PlanCraft Event Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
