const state = {
  termsAccepted: false,
  importedScenarios: [],
  currentScenario: null,
  messages: [],
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  voiceInterval: null,
  activeUtterance: null,
};

const builtInScenarios = [
  {
    id: 'repairing-exclusion',
    title: 'Repairing exclusion after a team meeting',
    selectLabel: 'Repairing exclusion after a team meeting  A teammate felt dismissed in a meeting and is unsure whether you really value their perspective.',
    summary: 'A teammate felt dismissed in a meeting and is unsure whether you really value their perspective.',
    role: 'the team lead',
    counterpart: 'Jamie - a capable teammate who felt sidelined',
    focus: 'active listening, inclusion, accountability',
    intent: 'The user is trying to rebuild trust after a teammate felt dismissed. The counterpart should express the impact honestly, respond to accountability and curiosity, and only warm up if the user shows real listening and ownership.',
    context: 'In the last meeting, Jamie raised a concern about workload distribution and the conversation moved on without real discussion.',
    starter: 'I agreed to this conversation because I want things to improve, but honestly I left that meeting feeling dismissed.',
  },
  {
    id: 'addressing-low-motivation',
    title: 'Re-engaging a disengaged team member',
    selectLabel: 'Re-engaging a disengaged team member A team member has been showing low motivation and inconsistent effort on shared work.',
    summary: 'A team member has become noticeably disengaged, and their performance is beginning to affect the team.',
    role: 'the team supervisor',
    counterpart: 'Jordan - a team member whose motivation and engagement have declined',
    focus: 'motivation, empathy, accountability, coaching',
    intent: 'The user is trying to understand the drop in motivation, show empathy, and re-engage the team member while still addressing accountability. The counterpart should sound discouraged but believable, open up more when the user shows care and curiosity, and resist shallow fixes.',
    context: 'Over the past few weeks, Jordan has missed deadlines and contributed less during meetings. Previously, they were highly engaged. There may be underlying factors shaping their current behavior, including how they experience the team environment, how their contributions are recognized, and whether they feel a sense of belonging or growth.',
    starter: 'I know my performance has not been where it should be lately. I just feel like what I am doing does not really matter anymore.',
  },
  {
    id: 'negotiating-compensation-self-advocacy',
    title: 'Negotiating your compensation after a job offer',
    selectLabel: 'Negotiating your compensation after a job offer You believe your offer does not fully reflect your value and want to advocate for higher pay.',
    summary: 'You have received a job offer and want to negotiate for higher compensation based on your qualifications and market value.',
    role: 'the candidate',
    counterpart: 'Morgan - the hiring manager who extended the offer',
    focus: 'self-advocacy, negotiation, confidence, professionalism',
    intent: 'The user is negotiating a job offer. The counterpart should behave like a realistic hiring manager: professional, somewhat flexible, mindful of budget constraints, and responsive to specific evidence, confidence, and professionalism from the candidate.',
    context: 'You recently received an offer for a role you are excited about, but after researching market rates and reflecting on your experience, you believe the compensation is lower than expected. You are also aware that negotiating can feel uncomfortable and that norms around negotiation are not always consistent across candidates, which adds some uncertainty as you prepare for this conversation.',
    starter: 'I am glad we could connect today. I understand you had some questions about the offer I sent over.',
  },
  {
    id: 'entry-level-interview-candidate-role',
    title: 'Interviewing for an entry-level role',
    selectLabel: 'Interviewing for an entry-level role You are navigating how to present your experiences and potential in a high-stakes interview.',
    summary: 'You are interviewing for an entry-level role and need to effectively communicate your skills, experiences, and potential.',
    role: 'the candidate',
    counterpart: 'Alex - an interviewer assessing your fit and potential for the role',
    focus: 'self-presentation, confidence, communication, navigating bias',
    intent: 'The user is in a realistic entry-level interview. The counterpart should act like an interviewer, ask grounded follow-up questions, evaluate clarity and fit, and respond naturally to the candidate’s examples, confidence, and communication style.',
    context: 'You are interviewing for an entry-level role that you are excited about. While you may not have extensive formal experience, you have developed relevant skills through coursework, part-time roles, and other experiences. You are aware that first impressions matter and that interview dynamics can shape how your background and potential are interpreted.',
    starter: 'Thanks for coming in today. To get us started, can you tell me a little about yourself and what drew you to this role?',
  },
];

function getCounterpartName(scenario = state.currentScenario) {
  const raw = String(scenario?.counterpart || '').trim();
  if (!raw) return 'Counterpart';
  const parts = raw.split(/\s+-\s+/);
  return parts[0]?.trim() || raw;
}

function getParticipantLabel(scenario = state.currentScenario) {
  const raw = String(scenario?.role || 'the participant').trim();
  return raw || 'the participant';
}

function getParticipantDisplayRole(scenario = state.currentScenario) {
  const role = getParticipantLabel(scenario);
  return role.replace(/^the\s+/i, '').trim() || role;
}

const elements = {
  termsModal: document.getElementById('termsModal'),
  termsCheckbox: document.getElementById('termsCheckbox'),
  agreeBtn: document.getElementById('agreeBtn'),
  scenarioSelect: document.getElementById('scenarioSelect'),
  scenarioSummary: document.getElementById('scenarioSummary'),
  conversationContext: document.getElementById('conversationContext'),
  conversationThread: document.getElementById('conversationThread'),
  coachFeedback: document.getElementById('coachFeedback'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  recordBtn: document.getElementById('recordBtn'),
  uploadAudioBtn: document.getElementById('uploadAudioBtn'),
  audioFileInput: document.getElementById('audioFileInput'),
  importScenariosBtn: document.getElementById('importScenariosBtn'),
  scenarioFileInput: document.getElementById('scenarioFileInput'),
  downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),
  statusText: document.getElementById('statusText'),
  micStatus: document.getElementById('micStatus'),
  voiceStatus: document.getElementById('voiceStatus'),
  restartScenarioBtn: document.getElementById('restartScenarioBtn'),
  chatModelLabel: document.getElementById('chatModelLabel'),
  avatar: document.getElementById('ailaAvatar'),
  avatarMouth: document.getElementById('avatarMouth'),
  scenarioRole: document.getElementById('scenarioRole'),
  scenarioCounterpart: document.getElementById('scenarioCounterpart'),
  scenarioFocus: document.getElementById('scenarioFocus'),
};

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function setMicStatus(text) {
  elements.micStatus.textContent = text;
}

function setVoiceStatus(text) {
  elements.voiceStatus.textContent = text;
}

function renderConversation() {
  elements.conversationThread.innerHTML = state.messages.map(message => `
    <article class="message-card ${message.role === 'user' ? 'user' : ''}">
      <div class="message-speaker">${escapeHtml(message.displayName)}</div>
      <div class="message-content">${escapeHtml(message.text)}</div>
    </article>
  `).join('');
}

function updateMessagePlaceholder() {
  const role = getParticipantDisplayRole();
  elements.messageInput.placeholder = `Type what you would say as ${role}.`;
}

function updateScenarioDetails() {
  const scenario = state.currentScenario;
  if (!scenario) return;

  elements.scenarioSummary.textContent = scenario.summary;
  elements.conversationContext.textContent = scenario.context;
  updateMessagePlaceholder();

  if (elements.scenarioRole) {
    elements.scenarioRole.textContent = scenario.role;
  }

  if (elements.scenarioCounterpart) {
    elements.scenarioCounterpart.textContent = scenario.counterpart;
  }

  if (elements.scenarioFocus) {
    elements.scenarioFocus.textContent = scenario.focus;
  }
}

function buildSystemPrompt(mode = 'turn') {
  const scenario = state.currentScenario;
  const counterpartName = getCounterpartName(scenario);
  const participantRole = getParticipantLabel(scenario);
  const scenarioIntent = scenario?.intent || 'Stay aligned with the scenario, the relationship, and the communication goal.';

  const shared = [
    'You are generating live scenario dialogue for AILA, a conversation practice app.',
    'Everything shown in the conversation must come from the model output you generate right now.',
    'You must play only the named counterpart in the scenario and never switch roles.',
    'Return only a valid JSON object with no markdown, no code fences, and no extra narration.',
    'Do not include labels like AILA:, JSON:, counterpartReply:, jamieReply:, or coachingFeedback: inside the values.',
    'Keep the tone realistic, emotionally intelligent, specific to the scenario, and responsive to the latest user message.',
    `Never act like a generic chatbot and never repeat prior ${counterpartName} wording verbatim unless the exact same wording is absolutely necessary.`,
    'If the user repeats a question, answer it differently while staying consistent with the scenario and moving the conversation forward.',
    `${counterpartName} should sound like one believable human counterpart, not a narrator or assistant.`,
    'AILA coaching should react to what the user just said, point out one strength or one miss, and suggest a stronger next move.',
    'Do not give legal, HR, medical, or emergency advice.',
    `Scenario title: ${scenario.title}`,
    `Scenario summary: ${scenario.summary}`,
    `Scenario context: ${scenario.context}`,
    `User role: ${participantRole}`,
    `Counterpart role to play: ${scenario.counterpart}`,
    `Scenario focus: ${scenario.focus}`,
    `Scenario intent: ${scenarioIntent}`,
    `Starter cue from the counterpart: ${scenario.starter}`,
  ];

  if (mode === 'init') {
    return [
      ...shared,
      'Return exactly these keys: ailaIntro, counterpartReply, coachingFeedback.',
      'ailaIntro must be one short scene-setting line from AILA that introduces this specific conversation.',
      `counterpartReply must be one first-person opening statement from ${counterpartName} that fits the scenario and feels natural.`,
      `coachingFeedback must be 2 to 4 concise sentences coaching the user in the role of ${participantRole} on the first response.`,
    ].join(' ');
  }

  return [
    ...shared,
    'Return exactly these keys: counterpartReply, coachingFeedback.',
    `counterpartReply must be a fresh first-person reply from ${counterpartName} to the user's latest message.`,
    'counterpartReply must directly answer the user\'s latest message and should add at least one concrete detail, feeling, or concern when appropriate.',
    `coachingFeedback must be 2 to 4 concise sentences for the user in the role of ${participantRole}, based on the latest turn only.`,
  ].join(' ');
}

function buildInitMessages() {
  return [
    { role: 'system', content: buildSystemPrompt('init') },
    { role: 'user', content: 'Start the scenario now.' },
  ];
}

function buildChatMessages(userText) {
  const transcript = state.messages.slice(-10).map(message => (
    `${message.displayName}: ${message.text}`
  )).join('\n');

  return [
    { role: 'system', content: buildSystemPrompt('turn') },
    {
      role: 'user',
      content: [
        'Use the scenario and transcript below to generate the next turn.',
        'Conversation transcript:',
        transcript || 'No prior transcript.',
        `Latest user message: ${userText}`,
        `Respond to the latest user message right now as ${getCounterpartName()}. Do not repeat an earlier ${getCounterpartName()} sentence verbatim. Output JSON only.`
      ].join('\n\n')
    },
  ];
}

function sanitizeCounterpartReply(text) {
  let cleaned = String(text || '').trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  cleaned = cleaned.replace(/^\{+/, '').replace(/\}+$/, '').trim();
  cleaned = cleaned.replace(/^"?(?:counterpartReply|jamieReply)"?\s*:\s*/i, '').trim();
  cleaned = cleaned.replace(/^jamie\s*[:\-]\s*/i, '').trim();
  cleaned = cleaned.replace(/^reply\s*[:\-]\s*/i, '').trim();
  cleaned = cleaned.replace(/^"|"$/g, '').trim();
  cleaned = cleaned.replace(/\n/g, ' ');
  return cleaned;
}

function parseModelReply(raw) {
  const text = String(raw || '').trim();

  const tryJson = value => {
    try {
      const parsed = JSON.parse(value);
      const counterpartReply = sanitizeCounterpartReply(parsed?.counterpartReply || parsed?.jamieReply || '');
      const coachingFeedback = String(parsed?.coachingFeedback || '').trim();
      if (counterpartReply && coachingFeedback) {
        return { counterpartReply, coachingFeedback };
      }
    } catch (_) {}
    return null;
  };

  const direct = tryJson(text);
  if (direct) return direct;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const fencedParsed = tryJson(fenced[1].trim());
    if (fencedParsed) return fencedParsed;
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const objectParsed = tryJson(objectMatch[0]);
    if (objectParsed) return objectParsed;
  }

  throw new Error('Groq response could not be parsed into the required JSON shape.');
}

function setAvatarLevel(level) {
  const safeLevel = Math.max(0, Math.min(1, level));
  elements.avatar.style.setProperty('--voice-level', String(safeLevel));
  elements.avatarMouth.style.setProperty('--mouth-open', String(0.2 + safeLevel * 0.9));
}

function startAvatarPulse() {
  clearInterval(state.voiceInterval);
  elements.avatar.dataset.speaking = 'true';
  setVoiceStatus('Speaking');
  state.voiceInterval = window.setInterval(() => {
    const nextLevel = 0.28 + Math.random() * 0.72;
    setAvatarLevel(nextLevel);
  }, 120);
}

function stopAvatarPulse() {
  clearInterval(state.voiceInterval);
  state.voiceInterval = null;
  elements.avatar.dataset.speaking = 'false';
  setAvatarLevel(0);
  setVoiceStatus('Ready');
}

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;

  const preferred = voices.find(voice => /female|samantha|ava|victoria|zira|aria|google us english/i.test(voice.name));
  return preferred || voices.find(voice => /en/i.test(voice.lang)) || voices[0];
}

function cancelSpeech() {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  state.activeUtterance = null;
  stopAvatarPulse();
}

function speakAssistantText(text) {
  if (!text || !('speechSynthesis' in window)) {
    setVoiceStatus('Unavailable');
    return;
  }

  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1.02;
  utterance.volume = 1;

  utterance.onstart = () => {
    state.activeUtterance = utterance;
    startAvatarPulse();
  };

  utterance.onboundary = () => {
    setAvatarLevel(0.42 + Math.random() * 0.58);
  };

  utterance.onend = () => {
    if (state.activeUtterance === utterance) {
      state.activeUtterance = null;
      stopAvatarPulse();
    }
  };

  utterance.onerror = () => {
    if (state.activeUtterance === utterance) {
      state.activeUtterance = null;
      stopAvatarPulse();
      setVoiceStatus('Error');
    }
  };

  window.speechSynthesis.speak(utterance);
}

async function resetConversation() {
  cancelSpeech();
  state.messages = [];
  renderConversation();
  elements.coachFeedback.textContent = 'Waiting for Groq to open the conversation...';
  setStatus('Starting...');
  elements.sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: buildInitMessages(), mode: 'init' }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to start scenario with Groq.');
    }

    const structured = data?.structured;
    if (!structured?.ailaIntro || !structured?.counterpartReply || !structured?.coachingFeedback) {
      throw new Error('Groq did not return the required opening payload.');
    }

    const openingReply = sanitizeCounterpartReply(structured.counterpartReply);
    state.messages = [
      { role: 'assistant', displayName: 'AILA', text: structured.ailaIntro.trim() },
      { role: 'assistant', displayName: getCounterpartName(), text: openingReply },
    ];
    elements.coachFeedback.textContent = structured.coachingFeedback.trim();
    renderConversation();
    setStatus('Ready');
    speakAssistantText(openingReply);
  } catch (error) {
    setStatus('Error');
    elements.coachFeedback.textContent = error.message || 'Groq could not start the scenario.';
  } finally {
    elements.sendBtn.disabled = false;
  }
}

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  state.messages.push({ role: 'user', displayName: 'You', text: trimmed });
  renderConversation();
  elements.messageInput.value = '';
  setStatus('Sending...');
  elements.sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: buildChatMessages(trimmed), mode: 'turn' }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Chat request failed.');
    }

    const parsed = data?.structured?.counterpartReply && data?.structured?.coachingFeedback
      ? {
          counterpartReply: sanitizeCounterpartReply(data.structured.counterpartReply),
          coachingFeedback: String(data.structured.coachingFeedback || '').trim(),
        }
      : parseModelReply(data.output || '');

    state.messages.push({ role: 'assistant', displayName: getCounterpartName(), text: parsed.counterpartReply });
    elements.coachFeedback.textContent = parsed.coachingFeedback;
    setStatus('Ready');
    renderConversation();
    speakAssistantText(parsed.counterpartReply);
  } catch (error) {
    setStatus('Error');
    elements.coachFeedback.textContent = error.message || 'Something went wrong while contacting Groq.';
  } finally {
    elements.sendBtn.disabled = false;
  }
}

async function transcribeBlob(blob, filename = 'audio.webm') {
  const formData = new FormData();
  formData.append('audio', blob, filename);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Transcription failed.');
  }

  return data.text || '';
}

async function toggleRecording() {
  if (state.isRecording && state.mediaRecorder) {
    state.mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.audioChunks = [];
    state.mediaRecorder = recorder;
    state.isRecording = true;
    setMicStatus('Recording');
    setStatus('Recording...');
    elements.recordBtn.textContent = 'Stop recording';

    recorder.ondataavailable = event => {
      if (event.data?.size) state.audioChunks.push(event.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      state.isRecording = false;
      elements.recordBtn.textContent = 'Record with mic';
      setMicStatus('Processing');
      setStatus('Transcribing...');

      try {
        const audioBlob = new Blob(state.audioChunks, { type: recorder.mimeType || 'audio/webm' });
        const text = await transcribeBlob(audioBlob, 'mic-recording.webm');
        setMicStatus('Ready');
        setStatus('Ready');
        if (text.trim()) {
          elements.messageInput.value = text.trim();
          await sendMessage(text.trim());
        }
      } catch (error) {
        setMicStatus('Error');
        setStatus('Error');
        elements.coachFeedback.textContent = error.message || 'Audio processing failed.';
      }
    };

    recorder.start();
  } catch (error) {
    setMicStatus('Unavailable');
    setStatus('Error');
    elements.coachFeedback.textContent = 'Microphone access was not granted or is not available in this browser.';
  }
}

function downloadTemplate() {
  const template = {
    scenarios: [
      {
        id: 'new-scenario-id',
        title: 'Name of the scenario',
        selectLabel: 'Name of the scenario  short one-line description.',
        summary: 'Short summary shown under the selector.',
        role: 'your role',
        counterpart: 'counterpart name - short description',
        focus: 'focus area one, focus area two',
        intent: 'What the user is trying to accomplish and how the counterpart should behave in this scenario.',
        context: 'One paragraph of context for the conversation.',
        starter: 'Opening line from the counterpart.',
      },
    ],
  };

  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'aila-scenarios-template.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function applyScenarioList(scenarios) {
  const allScenarios = [...builtInScenarios, ...scenarios];
  state.importedScenarios = scenarios;
  elements.scenarioSelect.innerHTML = allScenarios
    .map(scenario => `<option value="${escapeHtml(scenario.id)}">${escapeHtml(scenario.selectLabel || scenario.title)}</option>`)
    .join('');
  state.currentScenario = allScenarios[0];
  elements.scenarioSelect.value = state.currentScenario.id;
  updateScenarioDetails();
  resetConversation();
}

function populateScenarioSelect() {
  const allScenarios = [...builtInScenarios, ...state.importedScenarios];

  elements.scenarioSelect.innerHTML = allScenarios
    .map(
      scenario =>
        `<option value="${escapeHtml(scenario.id)}">${escapeHtml(
          scenario.selectLabel || scenario.title
        )}</option>`
    )
    .join('');

  if (!state.currentScenario && allScenarios.length) {
    state.currentScenario = allScenarios[0];
  }

  if (state.currentScenario) {
    elements.scenarioSelect.value = state.currentScenario.id;
  }
}

async function loadHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    if (response.ok && data?.chatModel) {
      elements.chatModelLabel.textContent = `${data.chatModel} - live`;
    }
  } catch (_) {}
}

function warmVoices() {
  if (!('speechSynthesis' in window)) {
    setVoiceStatus('Unavailable');
    return;
  }

  const updateVoiceStatus = () => {
    const voices = window.speechSynthesis.getVoices();
    setVoiceStatus(voices.length ? 'Ready' : 'Loading');
  };

  updateVoiceStatus();
  window.speechSynthesis.onvoiceschanged = updateVoiceStatus;
}

function initialize() {
  state.currentScenario = builtInScenarios[0];
  populateScenarioSelect();
  updateScenarioDetails();
  resetConversation();
  loadHealth();
  warmVoices();

  elements.termsCheckbox.addEventListener('change', () => {
    elements.agreeBtn.disabled = !elements.termsCheckbox.checked;
  });

  elements.agreeBtn.addEventListener('click', () => {
    if (!elements.termsCheckbox.checked) return;
    state.termsAccepted = true;
    elements.termsModal.classList.add('hidden');
  });

  elements.sendBtn.addEventListener('click', () => sendMessage(elements.messageInput.value));

  elements.messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(elements.messageInput.value);
    }
  });

  elements.recordBtn.addEventListener('click', toggleRecording);
  elements.uploadAudioBtn.addEventListener('click', () => elements.audioFileInput.click());
  elements.audioFileInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('Transcribing...');
    setMicStatus('Processing');
    try {
      const text = await transcribeBlob(file, file.name);
      setStatus('Ready');
      setMicStatus('Ready');
      if (text.trim()) {
        elements.messageInput.value = text.trim();
        await sendMessage(text.trim());
      }
    } catch (error) {
      setStatus('Error');
      setMicStatus('Error');
      elements.coachFeedback.textContent = error.message || 'Audio upload failed.';
    } finally {
      event.target.value = '';
    }
  });

  elements.importScenariosBtn.addEventListener('click', () => elements.scenarioFileInput.click());
  elements.scenarioFileInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const scenarios = Array.isArray(parsed) ? parsed : parsed.scenarios;
      if (!Array.isArray(scenarios) || !scenarios.length) {
        throw new Error('No scenarios found in the uploaded file.');
      }
      const normalized = scenarios.map((scenario, index) => ({
        id: scenario.id || `imported-${index + 1}`,
        title: scenario.title || `Imported scenario ${index + 1}`,
        selectLabel: scenario.selectLabel || scenario.title || `Imported scenario ${index + 1}`,
        summary: scenario.summary || 'Imported scenario.',
        role: scenario.role || 'the participant',
        counterpart: scenario.counterpart || 'counterpart',
        focus: scenario.focus || 'active listening',
        intent: scenario.intent || 'Stay aligned with the scenario and play the counterpart realistically.',
        context: scenario.context || 'Imported context',
        starter: scenario.starter || 'I wanted to talk because the last interaction did not sit right with me.',
      }));
      localStorage.setItem('ailaImportedScenarios', JSON.stringify(normalized));
      applyScenarioList(normalized);
      setStatus('Ready');
    } catch (error) {
      setStatus('Error');
      elements.coachFeedback.textContent = error.message || 'Scenario import failed.';
    } finally {
      event.target.value = '';
    }
  });

  elements.downloadTemplateBtn.addEventListener('click', downloadTemplate);

  elements.restartScenarioBtn.addEventListener('click', () => {
    resetConversation();
    setStatus('Ready');
    setMicStatus('Ready');
    setVoiceStatus('Ready');
    elements.messageInput.value = '';
  });

  elements.scenarioSelect.addEventListener('change', event => {
    const allScenarios = [...builtInScenarios, ...state.importedScenarios];
    const nextScenario = allScenarios.find(scenario => scenario.id === event.target.value);
    if (!nextScenario) return;
    state.currentScenario = nextScenario;
    updateScenarioDetails();
    resetConversation();
  });

  try {
    const saved = localStorage.getItem('ailaImportedScenarios');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        applyScenarioList(parsed);
      }
    }
  } catch (_) {}
}

initialize();
