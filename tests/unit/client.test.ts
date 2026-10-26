import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM } from '../../server/ai/client.js';

// Top-level mock for @google/genai
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: '{"fallback":"gemini_success"}',
        }),
      };
    },
  };
});

describe('Universal LLM Call Wrapper', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error when no API key is configured', async () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await expect(callLLM('system', 'user')).rejects.toThrow(
      'No valid LLM API key configured. Please set GROQ_API_KEY in your .env file.'
    );
  });

  it('calls Groq API successfully when GROQ_API_KEY is present', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_groq_key_123';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ budget: [], timeline: [], vendors: [], ideas: [] }),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', mockFetch);

    const response = await callLLM('System prompt', 'User prompt', { temperature: 0.5 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(callArgs[1].headers.Authorization).toBe('Bearer gsk_test_groq_key_123');
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.temperature).toBe(0.5);
    expect(response).toContain('budget');
  });

  it('retries on 429 rate limit with backoff and succeeds on subsequent attempt', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_groq_key_123';

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded: try again in 50ms',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"status":"ok"}' } }],
        }),
      };
    });

    vi.stubGlobal('fetch', mockFetch);

    const response = await callLLM('System prompt', 'User prompt');
    expect(callCount).toBe(2);
    expect(response).toBe('{"status":"ok"}');
  });

  it('falls back to Gemini if Groq fails and standard GEMINI_API_KEY is provided', async () => {
    delete process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = 'AIzaSyStandardGeminiKey';

    const response = await callLLM('System', 'User');
    expect(response).toBe('{"fallback":"gemini_success"}');
  });

  it('handles non-429 API errors by throwing informative error message', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_groq_key_123';
    delete process.env.GEMINI_API_KEY;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key provided',
    });

    vi.stubGlobal('fetch', mockFetch);

    await expect(callLLM('System', 'User')).rejects.toThrow(
      'Groq API error (401): Invalid API key provided'
    );
  });
});
