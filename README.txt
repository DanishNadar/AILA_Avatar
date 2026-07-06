AILA Leadership Studio with Talking Avatar

What is included
- Simple friendly circular avatar under the Conversation header
- Natural Coqui XTTS-v2 playback through a Hugging Face dedicated/custom endpoint
- Browser SpeechSynthesis fallback when Coqui is not configured or temporarily unavailable
- Soft pulse / ring animation while the voice is speaking
- Serverless Groq chat endpoint for the conversation
- Serverless Groq transcription endpoint for uploaded or recorded audio
- Continuous hands-free microphone mode with voice activity detection
- Barge-in support that stops the avatar when the user begins speaking
- Scenario import and JSON template download
- Vercel-ready static frontend + API routes
- Built-in scenarios for repairing exclusion, low motivation, compensation negotiation, and entry-level interviewing

Scenario integration updates in this build
- The three new scenarios are fully built in as presets
- The AI is now explicitly prompted to play the listed counterpart for each scenario
- Prompting no longer hardcodes “leader” or “Jamie” behavior across every scenario
- Coaching now adapts to the actual role the user is playing
- Added scenario-specific intent guidance so negotiation and interview flows behave more realistically
- Cleaned duplicate scenario selector markup in index.html
- Added exact run and syntax-check commands in package.json

Files that matter most
- public/index.html -> main interface
- public/app.js -> scenario definitions, UI logic, prompt construction, roleplay behavior
- api/chat.js -> Groq chat endpoint and JSON parsing
- api/transcribe.js -> Groq speech-to-text endpoint
- api/tts.js -> Hugging Face Coqui XTTS-v2 speech endpoint proxy
- api/health.js -> health check for env and model labels

How to run locally
1. Open a terminal in the project folder.
2. Install dependencies:
   npm install

3. Create a .env.local file in the project root with:
   GROQ_API_KEY=your_real_key
   GROQ_CHAT_MODEL=llama-3.1-8b-instant
   GROQ_CHAT_FALLBACK_MODEL=llama-3.1-8b-instant
   GROQ_STT_MODEL=whisper-large-v3-turbo
   HUGGINGFACE_TTS_ENDPOINT=https://your-dedicated-endpoint.endpoints.huggingface.cloud
   HUGGINGFACE_TOKEN=your_hugging_face_token
   COQUI_TTS_MODEL=coqui/XTTS-v2
   COQUI_SPEAKER=Ana Florence
   COQUI_LANGUAGE=en

   Optional voice-cloning reference:
   COQUI_SPEAKER_WAV_URL=https://your-public-url/reference-voice.wav

   The Hugging Face endpoint must run an XTTS-v2 custom handler that accepts:
   { "inputs": "Text to speak", "parameters": { "language": "en", "speaker": "Ana Florence" } }
   and returns audio bytes. Hugging Face serverless inference providers do not currently
   expose text-to-speech, so XTTS-v2 requires a dedicated/custom endpoint.

4. Run the syntax check:
   npm run check

5. Start the app locally:
   npm run dev

6. Open:
   http://localhost:3000

How to test it
1. Accept the terms modal.
2. Open each built-in scenario from the preset selector.
3. Confirm the role and counterpart cards change correctly.
4. Click Restart scenario and verify the opening counterpart line matches the selected scenario.
5. Test these specific cases:
   - Re-engaging a disengaged team member -> the AI should sound like Jordan, a discouraged team member
   - Negotiating your compensation after a job offer -> the AI should sound like Morgan, a hiring manager discussing the offer
   - Interviewing for an entry-level role -> the AI should sound like Alex, an interviewer asking realistic interview follow-ups
6. Type a message and confirm the coaching references your actual role, not always “leader”.
7. After accepting the terms, allow microphone access. Confirm Hands-free on appears.
8. Speak normally and pause for about one second. The turn should transcribe and send automatically.
9. Begin speaking while the avatar is talking. Its voice should stop immediately and your turn should be captured.
10. Use the Hands-free button to temporarily disable or re-enable continuous listening.

How to deploy on Vercel
1. Import the repo into Vercel.
2. Add these environment variables:
   GROQ_API_KEY=your_real_key
   GROQ_CHAT_MODEL=llama-3.1-8b-instant
   GROQ_CHAT_FALLBACK_MODEL=llama-3.1-8b-instant
   GROQ_STT_MODEL=whisper-large-v3-turbo
   HUGGINGFACE_TTS_ENDPOINT=https://your-dedicated-endpoint.endpoints.huggingface.cloud
   HUGGINGFACE_TOKEN=your_hugging_face_token
   COQUI_TTS_MODEL=coqui/XTTS-v2
   COQUI_SPEAKER=Ana Florence
   COQUI_LANGUAGE=en

3. Deploy.

Important behavior notes
- The avatar prefers Coqui XTTS-v2 audio from the configured Hugging Face endpoint.
- Browser speech remains as an automatic fallback, so the conversation still works without TTS credentials.
- Communication scores are per-turn quality averages based on model sentiment assessment, with deterministic caps for explicitly hostile or dismissive language.
- The visualizer is driven by Coqui audio playback or browser speech events.
- Hands-free mode keeps one microphone stream open, detects speech locally, and sends audio only after a spoken turn ends.
- Voice activity detection uses browser echo cancellation, noise suppression, and an adaptive noise floor. Headphones still provide the most reliable barge-in behavior.
- Terms acceptance is intentionally not persisted between page loads.
- Conversation messages stay in browser memory for the current session only.
- Imported scenarios are saved in browser local storage for convenience.
- If Groq returns invalid JSON, the app shows an error instead of inventing a fallback reply.

Note on local dependencies
- This build now includes a plain Node local server in server.mjs, so you can run the app locally without needing Vercel login.
- Running npm install first is still the recommended setup.
