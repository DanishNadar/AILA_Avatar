AILA Leadership Studio with Talking Avatar

What is included
- Simple friendly circular avatar under the Conversation header
- Browser voice playback for counterpart replies using SpeechSynthesis
- Soft pulse / ring animation while the voice is speaking
- Serverless Groq chat endpoint for the conversation
- Serverless Groq transcription endpoint for uploaded or recorded audio
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
7. Optionally test mic recording and uploaded audio.

How to deploy on Vercel
1. Import the repo into Vercel.
2. Add these environment variables:
   GROQ_API_KEY=your_real_key
   GROQ_CHAT_MODEL=llama-3.1-8b-instant
   GROQ_CHAT_FALLBACK_MODEL=llama-3.1-8b-instant
   GROQ_STT_MODEL=whisper-large-v3-turbo

3. Deploy.

Important behavior notes
- The avatar voice uses the browser's built-in speech engine, not a separate paid TTS provider.
- The visualizer is driven by the speaking state and boundary events from browser speech playback.
- Terms acceptance is intentionally not persisted between page loads.
- Conversation messages stay in browser memory for the current session only.
- Imported scenarios are saved in browser local storage for convenience.
- If Groq returns invalid JSON, the app shows an error instead of inventing a fallback reply.

Note on local dependencies
- This build now includes a plain Node local server in server.mjs, so you can run the app locally without needing Vercel login.
- Running npm install first is still the recommended setup.
