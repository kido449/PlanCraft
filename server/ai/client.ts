/**
 * Centralized Universal LLM Transport Client
 * Provides high-speed inference via Groq (LLaMA/Qwen) with automated
 * rate-limit backoff (429 parsing) and resilient fallback to Google Gemini.
 */

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions = {}
): Promise<string> {
  const temperature = options.temperature ?? 0.4;
  const maxTokens = options.maxTokens ?? 1000;
  const groqKey =
    process.env.GROQ_API_KEY ||
    (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : '');
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  // 1. Try Groq API
  if (groqKey) {
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
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
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (res.status === 429 && attempts < 3) {
          const errBody = await res.text();
          console.warn(`[Groq 429 rate limit - backing off attempt ${attempts}/3]:`, errBody);
          let waitMs = 1500 * attempts;
          const matchMs = errBody.match(/try again in ([0-9.]+)ms/i);
          const matchSec = errBody.match(/try again in ([0-9.]+)s/i);
          if (matchMs && matchMs[1]) {
            waitMs = Math.ceil(parseFloat(matchMs[1])) + 300;
          } else if (matchSec && matchSec[1]) {
            waitMs = Math.ceil(parseFloat(matchSec[1]) * 1000) + 300;
          }
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text();
          const apiErr = new Error(`Groq API error (${res.status}): ${errBody}`);
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            throw apiErr;
          }
          if (attempts >= 3) {
            throw apiErr;
          }
          await new Promise((r) => setTimeout(r, 1000 * attempts));
          continue;
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
      } catch (networkErr: any) {
        if (networkErr.message && networkErr.message.startsWith('Groq API error (4')) {
          throw networkErr;
        }
        if (attempts >= 3) {
          console.warn('Groq max attempts exceeded, evaluating fallback...', networkErr.message);
          break;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  // 2. Fallback to Gemini if a standard Google API key is configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('gsk_')) {
    try {
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
          temperature,
        },
      });
      return response.text || '';
    } catch (geminiErr: any) {
      throw new Error(`Gemini Fallback failed: ${geminiErr.message || String(geminiErr)}`);
    }
  }

  throw new Error(
    'No valid LLM API key configured. Please set GROQ_API_KEY in your .env file.'
  );
}
