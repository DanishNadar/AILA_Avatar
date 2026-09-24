import assert from 'node:assert/strict';
import test from 'node:test';

import chatHandler from '../api/chat.js';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test('chat retries a structured-output 400 with Groq-compatible JSON mode', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const payloads = [];
  process.env.GROQ_API_KEY = 'test-key';

  try {
    globalThis.fetch = async (_url, options) => {
      payloads.push(JSON.parse(options.body));
      if (payloads.length === 1) {
        return new Response(JSON.stringify({ error: { message: 'json_schema is unsupported' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          counterpartReply: 'I hear you.',
          coachingFeedback: 'Ask one focused follow-up question.',
          communicationAssessment: { overall: 80, activeListening: 82, clarity: 78, empathy: 81, tone: 'calm' },
        }) } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const res = createResponse();
    await chatHandler({
      method: 'POST',
      body: { mode: 'turn', messages: [{ role: 'user', content: 'Hello' }] },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.structured.counterpartReply, 'I hear you.');
    assert.equal(payloads.length, 2);
    assert.equal(payloads[0].response_format.type, 'json_schema');
    assert.equal(payloads[1].response_format.type, 'json_object');
    assert.equal(payloads[1].max_tokens, 260);
    assert.equal('reasoning_effort' in payloads[1], false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  }
});
