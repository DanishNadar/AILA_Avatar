const DEFAULT_MODEL = 'coqui/XTTS-v2';
const DEFAULT_SPEAKER = 'Ana Florence';

function getContentType(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.startsWith('audio/') ? contentType : 'audio/wav';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const endpoint = process.env.HUGGINGFACE_TTS_ENDPOINT;
  const token = process.env.HUGGINGFACE_TOKEN;

  if (!endpoint || !token) {
    console.warn('[api/tts] unavailable: Hugging Face endpoint or token is not configured');
    return res.status(503).json({
      error: 'Coqui voice is not configured. Set HUGGINGFACE_TTS_ENDPOINT and HUGGINGFACE_TOKEN.',
    });
  }

  const text = String(req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 1200) {
    return res.status(400).json({ error: 'text must be 1200 characters or fewer' });
  }

  try {
    const parameters = {
      language: process.env.COQUI_LANGUAGE || 'en',
      speaker: process.env.COQUI_SPEAKER || DEFAULT_SPEAKER,
    };

    if (process.env.COQUI_SPEAKER_WAV_URL) {
      parameters.speaker_wav = process.env.COQUI_SPEAKER_WAV_URL;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav,audio/*;q=0.9,application/json;q=0.5',
      },
      body: JSON.stringify({
        inputs: text,
        parameters,
        model: process.env.COQUI_TTS_MODEL || DEFAULT_MODEL,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('[api/tts] provider failed', { status: response.status });
      return res.status(response.status).json({
        error: `Hugging Face Coqui TTS failed with ${response.status}`,
        details: details.slice(0, 1000),
      });
    }

    const upstreamContentType = response.headers.get('content-type') || '';
    if (!upstreamContentType.startsWith('audio/') && !upstreamContentType.startsWith('application/octet-stream')) {
      const details = await response.text();
      console.error('[api/tts] provider returned a non-audio success response', { contentType: upstreamContentType });
      return res.status(502).json({
        error: 'Hugging Face Coqui TTS returned a non-audio response.',
        details: details.slice(0, 1000),
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) {
      console.error('[api/tts] provider returned an empty audio response');
      return res.status(502).json({ error: 'Hugging Face Coqui TTS returned empty audio.' });
    }
    console.info('[api/tts] completed', { bytes: audio.length, contentType: getContentType(response) });
    res.setHeader('Content-Type', getContentType(response));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('[api/tts] failed', { message: error.message, name: error.name });
    return res.status(500).json({ error: error.message || 'Server error in /api/tts' });
  }
}

