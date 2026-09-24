import { DEFAULT_CHAT_MODEL } from './chat.js';

export default async function handler(req, res) {
  const chatConfigured = Boolean(process.env.GROQ_API_KEY);
  const ttsConfigured = Boolean(process.env.HUGGINGFACE_TTS_ENDPOINT && process.env.HUGGINGFACE_TOKEN);

  return res.status(200).json({
    // Health must describe each optional capability independently. Returning a
    // 500 for a missing chat key previously prevented the client from learning
    // that its TTS fallback was available.
    ok: true,
    chatConfigured,
    sttConfigured: chatConfigured,
    ttsConfigured,
    chatModel: process.env.GROQ_CHAT_MODEL || DEFAULT_CHAT_MODEL,
    fallbackModel: process.env.GROQ_CHAT_FALLBACK_MODEL || DEFAULT_CHAT_MODEL,
    sttModel: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
    ttsModel: process.env.COQUI_TTS_MODEL || 'coqui/XTTS-v2',
    ttsSpeaker: process.env.COQUI_SPEAKER || 'Ana Florence'
  });
}
