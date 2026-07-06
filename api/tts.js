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
    });

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        error: `Hugging Face Coqui TTS failed with ${response.status}`,
        details: details.slice(0, 1000),
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', getContentType(response));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error in /api/tts' });
  }
}

