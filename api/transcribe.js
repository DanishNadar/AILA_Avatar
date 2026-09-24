import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, result => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    console.warn('[api/transcribe] unavailable: GROQ_API_KEY is not configured');
    return res.status(503).json({
      error: 'Cloud transcription is not configured. Set GROQ_API_KEY, or use browser speech recognition for hands-free input.',
      code: 'STT_NOT_CONFIGURED'
    });
  }

  try {
    await runMiddleware(req, res, upload.single('audio'));

    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    console.info('[api/transcribe] received audio', {
      bytes: req.file.size,
      mimeType: req.file.mimetype || 'audio/webm',
    });

    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });

    form.append('file', blob, req.file.originalname || 'speech.webm');
    form.append('model', process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo');
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: form,
      signal: AbortSignal.timeout(50_000),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      console.error('[api/transcribe] provider failed', { status: response.status });
      return res.status(response.status).json({
        error: data?.error?.message || data?.error || `Groq transcription failed with ${response.status}`,
        details: data
      });
    }

    console.info('[api/transcribe] completed', { characters: String(data?.text || '').length });
    return res.status(200).json({ text: data?.text || '' });
  } catch (err) {
    console.error('[api/transcribe] failed', { message: err.message, code: err.code });
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Audio files must be 25 MB or smaller.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || /multipart|unexpected field/i.test(err.message || '')) {
      return res.status(400).json({ error: 'Send one audio file in a multipart field named "audio".' });
    }
    return res.status(500).json({
      error: err.message || 'Server error in /api/transcribe'
    });
  }
}
