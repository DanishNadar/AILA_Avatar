export default async function handler(req, res) {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Missing GROQ_API_KEY in environment'
    });
  }

  return res.status(200).json({
    ok: true,
    chatModel: process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant',
    fallbackModel: process.env.GROQ_CHAT_FALLBACK_MODEL || 'llama-3.1-8b-instant',
    sttModel: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
    ttsConfigured: Boolean(process.env.HUGGINGFACE_TTS_ENDPOINT && process.env.HUGGINGFACE_TOKEN),
    ttsModel: process.env.COQUI_TTS_MODEL || 'coqui/XTTS-v2',
    ttsSpeaker: process.env.COQUI_SPEAKER || 'Ana Florence'
  });
}
