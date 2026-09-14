function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// llama-3.1-8b-instant was retired for Groq developer/free accounts in 2026.
// Keep the default in one place so the health endpoint and chat endpoint cannot
// drift apart again.
export const DEFAULT_CHAT_MODEL = 'openai/gpt-oss-20b';

function responseSchema(mode) {
  const reply = {
    type: 'string',
    description: 'A concise, natural first-person reply from the scenario counterpart.'
  };
  const coaching = {
    type: 'string',
    description: 'Concise, actionable coaching for the participant.'
  };

  if (mode === 'init') {
    return {
      name: 'aila_scenario_opening',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          ailaIntro: { type: 'string' },
          counterpartReply: reply,
          coachingFeedback: coaching,
        },
        required: ['ailaIntro', 'counterpartReply', 'coachingFeedback'],
        additionalProperties: false,
      },
    };
  }

  return {
    name: 'aila_scenario_turn',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        counterpartReply: reply,
        coachingFeedback: coaching,
        communicationAssessment: {
          type: 'object',
          properties: {
            overall: { type: 'number', minimum: 0, maximum: 100 },
            activeListening: { type: 'number', minimum: 0, maximum: 100 },
            clarity: { type: 'number', minimum: 0, maximum: 100 },
            empathy: { type: 'number', minimum: 0, maximum: 100 },
            tone: { type: 'string' },
          },
          required: ['overall', 'activeListening', 'clarity', 'empathy', 'tone'],
          additionalProperties: false,
        },
      },
      required: ['counterpartReply', 'coachingFeedback', 'communicationAssessment'],
      additionalProperties: false,
    },
  };
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();

  if (Array.isArray(content)) {
    const joined = content.map(part => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    }).join(' ').trim();
    if (joined) return joined;
  }

  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const joined = data.output.flatMap(item => {
      if (typeof item?.content === 'string') return [item.content];
      if (Array.isArray(item?.content)) {
        return item.content.map(part => part?.text || part?.content || '').filter(Boolean);
      }
      return [];
    }).join(' ').trim();
    if (joined) return joined;
  }

  return '';
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  const candidates = [raw];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) candidates.push(objectMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {}
  }

  return null;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getReplyField(parsed) {
  return normalizeString(parsed?.counterpartReply || parsed?.jamieReply);
}

function normalizeCommunicationAssessment(value) {
  if (!value || typeof value !== 'object') return null;
  const keys = ['overall', 'activeListening', 'clarity', 'empathy'];
  const assessment = {};

  for (const key of keys) {
    const score = Number(value[key]);
    if (!Number.isFinite(score)) return null;
    assessment[key] = Math.max(0, Math.min(100, Math.round(score)));
  }

  assessment.tone = normalizeString(value.tone) || 'neutral';
  return assessment;
}

function parseStructuredReply(output, mode) {
  const parsed = parseJsonObject(output);
  if (!parsed) return null;

  if (mode === 'init') {
    const ailaIntro = normalizeString(parsed.ailaIntro);
    const counterpartReply = getReplyField(parsed);
    const coachingFeedback = normalizeString(parsed.coachingFeedback);
    if (!ailaIntro || !counterpartReply || !coachingFeedback) return null;
    return { ailaIntro, counterpartReply, coachingFeedback };
  }

  const counterpartReply = getReplyField(parsed);
  const coachingFeedback = normalizeString(parsed.coachingFeedback);
  const communicationAssessment = normalizeCommunicationAssessment(parsed.communicationAssessment);
  if (!counterpartReply || !coachingFeedback) return null;
  return { counterpartReply, coachingFeedback, communicationAssessment };
}

async function requestChat(model, messages, mode, maxTokens = 260) {
  const payload = {
    model,
    messages,
    temperature: 0.7,
    max_completion_tokens: maxTokens,
    top_p: 0.95,
    // Structured Outputs avoids the intermittent malformed JSON that JSON mode
    // can produce, especially after longer role-play conversations.
    response_format: { type: 'json_schema', json_schema: responseSchema(mode) },
    reasoning_effort: 'low',
    reasoning_format: 'hidden',
  };

  let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 429) {
    await sleep(6500);
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
  }

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Missing GROQ_API_KEY in environment' });
  }

  try {
    const { messages, model, mode } = req.body || {};

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const requestMode = mode === 'init' ? 'init' : 'turn';
    const configuredModel = model || process.env.GROQ_CHAT_MODEL || DEFAULT_CHAT_MODEL;
    const configuredFallback = process.env.GROQ_CHAT_FALLBACK_MODEL || DEFAULT_CHAT_MODEL;
    const candidates = [...new Set([configuredModel, configuredFallback, DEFAULT_CHAT_MODEL].filter(Boolean))];
    const maxTokens = requestMode === 'init' ? 320 : 260;

    let response;
    let data;
    let output = '';
    let structured = null;
    let selectedModel = '';

    for (const candidate of candidates) {
      ({ response, data } = await requestChat(candidate, messages, requestMode, maxTokens));
      if (!response.ok) {
        // An invalid model can be repaired by trying the configured fallback.
        // Authentication, rate-limit, and provider failures must preserve their
        // actual error instead of pretending another model will solve them.
        if (response.status === 400 || response.status === 404) continue;
        const msg = data?.error?.message || data?.error || `Groq chat failed with ${response.status}`;
        return res.status(response.status).json({ error: msg, details: data });
      }

      output = extractText(data);
      structured = parseStructuredReply(output, requestMode);
      if (output && structured) {
        selectedModel = candidate;
        break;
      }
    }

    if (!output || !structured) {
      if (!response?.ok) {
        const msg = data?.error?.message || data?.error || 'No configured Groq chat model is available.';
        return res.status(response?.status || 502).json({ error: msg, details: data });
      }
      return res.status(502).json({
        error: 'Groq returned a reply that did not match the required JSON schema.',
        details: data
      });
    }

    return res.status(200).json({ output, structured, raw: data, provider: 'groq', model: selectedModel, mode: requestMode });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Server error in /api/chat'
    });
  }
}
