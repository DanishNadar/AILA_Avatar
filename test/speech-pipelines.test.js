import assert from 'node:assert/strict';
import test from 'node:test';

import healthHandler from '../api/health.js';
import transcribeHandler from '../api/transcribe.js';
import ttsHandler from '../api/tts.js';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

async function withEnvironment(values, work) {
  const original = new Map(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await work();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('health reports individual speech capability state without requiring chat', { concurrency: false }, async () => {
  await withEnvironment({ GROQ_API_KEY: undefined, HUGGINGFACE_TTS_ENDPOINT: undefined, HUGGINGFACE_TOKEN: undefined }, async () => {
    const res = createResponse();
    await healthHandler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.sttConfigured, false);
    assert.equal(res.body.ttsConfigured, false);
  });
});

test('transcription returns a clear service-unavailable error when cloud STT is not configured', { concurrency: false }, async () => {
  await withEnvironment({ GROQ_API_KEY: undefined }, async () => {
    const res = createResponse();
    await transcribeHandler({ method: 'POST' }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'STT_NOT_CONFIGURED');
  });
});

test('TTS proxies audio bytes from a configured Coqui endpoint', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnvironment({
      HUGGINGFACE_TTS_ENDPOINT: 'https://voice.example.test/generate',
      HUGGINGFACE_TOKEN: 'test-token',
      COQUI_SPEAKER: 'Test Speaker',
    }, async () => {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://voice.example.test/generate');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        assert.equal(JSON.parse(options.body).inputs, 'Hello from AILA');
        return new Response(new Uint8Array([82, 73, 70, 70]), {
          status: 200,
          headers: { 'content-type': 'audio/wav' },
        });
      };
      const res = createResponse();
      await ttsHandler({ method: 'POST', body: { text: 'Hello from AILA' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['content-type'], 'audio/wav');
      assert.deepEqual([...res.body], [82, 73, 70, 70]);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('TTS reports missing configuration instead of attempting a broken provider call', { concurrency: false }, async () => {
  await withEnvironment({ HUGGINGFACE_TTS_ENDPOINT: undefined, HUGGINGFACE_TOKEN: undefined }, async () => {
    const res = createResponse();
    await ttsHandler({ method: 'POST', body: { text: 'Hello' } }, res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /not configured/i);
  });
});

test('TTS rejects a successful but non-audio provider response', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnvironment({ HUGGINGFACE_TTS_ENDPOINT: 'https://voice.example.test/generate', HUGGINGFACE_TOKEN: 'test-token' }, async () => {
      globalThis.fetch = async () => new Response(JSON.stringify({ error: 'model loading' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      const res = createResponse();
      await ttsHandler({ method: 'POST', body: { text: 'Hello' } }, res);
      assert.equal(res.statusCode, 502);
      assert.match(res.body.error, /non-audio/i);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
