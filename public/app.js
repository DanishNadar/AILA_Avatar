import { scoreTurn } from './scoring.js';

const state = {
  termsAccepted: false,
  importedScenarios: [],
  currentScenario: null,
  messages: [],
  mediaRecorder: null,
  audioChunks: [],
  micStream: null,
  audioContext: null,
  micAnalyser: null,
  micSamples: null,
  vadFrame: null,
  handsFreeEnabled: false,
  userSpeaking: false,
  speechStartedAt: 0,
  lastSpeechAt: 0,
  speechVoiceFrames: 0,
  speechPeakRms: 0,
  voiceFrames: 0,
  noiseFloor: 0.008,
  noiseCooldownUntil: 0,
  voiceBlobQueue: [],
  processingVoiceQueue: false,
  chatBusy: false,
  conversationGeneration: 0,
  voiceInterval: null,
  assistantSpeaking: false,
  echoSuppressionUntil: 0,
  suppressCurrentSpeech: false,
  pendingInterruption: false,
  currentSpeechInterrupted: false,
  assistantVoiceFrames: 0,
  activeUtterance: null,
  activeAudio: null,
  activeAudioUrl: null,
  ttsAbortController: null,
  ttsConfigured: false,
  ttsSpeaker: '',
  voicePreference: 'auto',
  turnCount: 0,
  sessionScore: 0,
  scoreTotals: {
    overall: 0,
    activeListening: 0,
    clarity: 0,
    empathy: 0,
  },
  coachingHistory: [],
  coachingUnread: 0,
  currentTheme: 'midnight-purple',
  lastDarkTheme: 'midnight-purple',
  lastLightTheme: 'light-violet',
  badgeTimeout: null,
};

function scenarioPreset(scenario) {
  return {
    ...scenario,
    selectLabel: scenario.selectLabel || `${scenario.title}  ${scenario.summary}`,
  };
}

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
    context: 'Over the past few weeks, Jordan has missed deadlines and contributed less during meetings. Previously, they were highly engaged.',
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
    context: 'You recently received an offer for a role you are excited about, but after researching market rates and reflecting on your experience, you believe the compensation is lower than expected.',
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
    intent: 'The user is in a realistic entry-level interview. The counterpart should act like an interviewer, ask grounded follow-up questions, evaluate clarity and fit, and respond naturally to the candidate\'s examples, confidence, and communication style.',
    context: 'You are interviewing for an entry-level role that you are excited about. While you may not have extensive formal experience, you have developed relevant skills through coursework, part-time roles, and other experiences.',
    starter: 'Thanks for coming in today. To get us started, can you tell me a little about yourself and what drew you to this role?',
  },
  scenarioPreset({
    id: 'give-clear-developmental-feedback',
    title: 'Giving clear developmental feedback',
    summary: 'A strong contributor has a recurring behavior that is affecting the team.',
    role: 'the manager',
    counterpart: 'Priya - a high-performing employee who may feel surprised by the feedback',
    focus: 'specific feedback, empathy, accountability, development',
    intent: 'Address a repeated behavior directly without making the person defensive. The counterpart should want to understand the impact and test whether the manager is fair and specific.',
    context: 'Priya consistently produces excellent work, but has twice overridden colleagues during project reviews, leaving them reluctant to contribute.',
    starter: 'I know you wanted to talk about the last project review. Is something wrong with my work?',
  }),
  scenarioPreset({
    id: 'resolve-conflict-between-teammates',
    title: 'Resolving conflict between teammates',
    summary: 'Two teammates disagree over ownership and one wants you to take a side.',
    role: 'the team lead',
    counterpart: 'Mateo - a teammate who feels another colleague is taking credit',
    focus: 'conflict resolution, neutrality, fact finding, fairness',
    intent: 'De-escalate a conflict while gathering specifics and protecting working relationships. The counterpart should be frustrated and seek validation, but respond to balanced leadership.',
    context: 'Mateo says Taylor presented shared work as their own in a leadership update. The two must still collaborate on a deadline next week.',
    starter: 'I am tired of this. Taylor took credit again, and I need you to do something about it.',
  }),
  scenarioPreset({
    id: 'delegate-a-stretch-assignment',
    title: 'Delegating a stretch assignment',
    summary: 'You want a capable employee to lead work that feels bigger than their current role.',
    role: 'the manager',
    counterpart: 'Avery - a capable employee who doubts they have enough experience',
    focus: 'delegation, confidence building, expectations, support',
    intent: 'Give Avery meaningful ownership with clear guardrails, authority, and support. The counterpart should weigh the opportunity against real concerns about capacity and readiness.',
    context: 'Avery has delivered reliably on smaller projects. You want them to lead a cross-functional launch while you remain available as a sponsor.',
    starter: 'I appreciate you thinking of me, but I am not sure I am the right person to lead something this visible.',
  }),
  scenarioPreset({
    id: 'address-a-missed-deadline',
    title: 'Addressing a missed deadline',
    summary: 'A deadline passed without warning and a stakeholder is now blocked.',
    role: 'the manager',
    counterpart: 'Sam - an employee who missed a critical deliverable',
    focus: 'accountability, curiosity, recovery planning, trust',
    intent: 'Address the missed commitment calmly, learn what happened, and secure a credible recovery plan. The counterpart should be embarrassed and initially explain their constraints.',
    context: 'Sam did not deliver a client-ready briefing by Friday and did not alert anyone until the client asked for it Monday morning.',
    starter: 'I know the briefing was not ready. I had several things come up, and I was trying to fix it before I said anything.',
  }),
  scenarioPreset({
    id: 'lead-a-change-announcement',
    title: 'Leading a difficult change announcement',
    summary: 'Your team is losing a familiar process and worries about the impact on their work.',
    role: 'the department lead',
    counterpart: 'Renee - a tenured employee concerned about the new direction',
    focus: 'change leadership, transparency, listening, clarity',
    intent: 'Communicate a change honestly without overpromising. The counterpart should surface practical worries and look for evidence that concerns will shape implementation.',
    context: 'The organization is consolidating two tools into a new platform next quarter. The decision is final, but the rollout approach is still being designed.',
    starter: 'People are saying the new platform will slow us down. Was anyone on this team even consulted?',
  }),
  scenarioPreset({
    id: 'push-back-on-unrealistic-scope',
    title: 'Pushing back on unrealistic scope',
    summary: 'A senior stakeholder wants more delivered than the team can safely complete.',
    role: 'the project lead',
    counterpart: 'Casey - a senior stakeholder focused on a high-visibility launch',
    focus: 'executive communication, prioritization, influence, boundaries',
    intent: 'Protect quality and team capacity while offering clear tradeoffs instead of a flat no. The counterpart should press for options and respond to evidence-based recommendations.',
    context: 'Casey has asked to add three major features before a launch that is six weeks away. Your team can complete only one without moving the date or reducing quality.',
    starter: 'This launch is important. I need all three features included—what will it take to make that happen?',
  }),
  scenarioPreset({
    id: 'performance-improvement-conversation',
    title: 'Starting a performance improvement conversation',
    summary: 'An employee has not met expectations after prior coaching and needs a clear plan.',
    role: 'the manager',
    counterpart: 'Devin - an employee worried this conversation could affect their job',
    focus: 'performance management, clarity, dignity, next steps',
    intent: 'Explain performance expectations and support without ambiguity or unnecessary harshness. The counterpart should be anxious, ask direct questions, and need concrete examples.',
    context: 'Devin has received coaching for missed follow-through and incomplete work over the last two months, with limited improvement.',
    starter: 'You said this was about my progress. Am I in trouble?',
  }),
  scenarioPreset({
    id: 'facilitate-a-tense-meeting',
    title: 'Facilitating a tense team meeting',
    summary: 'A decision meeting is becoming personal and needs to return to productive discussion.',
    role: 'the meeting facilitator',
    counterpart: 'Lee - a subject-matter expert who feels their concerns are being ignored',
    focus: 'facilitation, de-escalation, inclusion, decision making',
    intent: 'Create space for disagreement while moving the group toward a fair decision. The counterpart should be sharp at first and engage when their technical concern is accurately reflected.',
    context: 'A product and operations group disagree about whether to delay a release. The discussion has shifted from evidence to blame.',
    starter: 'We keep pretending this is a preference issue when the data clearly says this release is not ready.',
  }),
  scenarioPreset({
    id: 'advocate-for-team-resources',
    title: 'Advocating for team resources',
    summary: 'You need headcount or budget from a leader who is skeptical about the request.',
    role: 'the team manager',
    counterpart: 'Noor - a director balancing competing budget requests',
    focus: 'business case, influence, prioritization, executive presence',
    intent: 'Make a crisp resource case tied to impact, risks, and tradeoffs. The counterpart should challenge vague claims and ask what happens if the request is not approved.',
    context: 'Your team has absorbed two additional product lines without extra capacity. Quality and response times are beginning to slip.',
    starter: 'I have several teams asking for more people. Why is your request the one I should prioritize?',
  }),
  scenarioPreset({
    id: 'manage-conflicting-priorities',
    title: 'Managing conflicting priorities upward',
    summary: 'Two leaders have assigned urgent work that cannot both be completed this week.',
    role: 'the individual contributor',
    counterpart: 'Dana - your manager who expects you to resolve the conflict professionally',
    focus: 'managing up, prioritization, clarity, professionalism',
    intent: 'Bring a recommendation and make the tradeoff visible rather than simply escalating a problem. The counterpart should ask what you have already considered.',
    context: 'Your manager wants a board update by Thursday while another executive wants a customer analysis by Wednesday. Each task requires nearly all of your available time.',
    starter: 'You mentioned you have competing priorities. What do you recommend we do?',
  }),
  scenarioPreset({
    id: 'behavioral-interview-leadership',
    title: 'Answering a leadership interview question',
    summary: 'Practice a concise, evidence-based answer about leading through a challenge.',
    role: 'the job candidate',
    counterpart: 'Harper - an interviewer evaluating leadership potential',
    focus: 'interviewing, STAR storytelling, leadership, executive presence',
    intent: 'Tell a specific story with context, actions, results, and reflection. The interviewer should ask follow-ups when the answer is vague or the impact is unclear.',
    context: 'You are interviewing for a role that requires influencing across teams, even though you may not have held a formal management title.',
    starter: 'Tell me about a time you had to lead through a difficult situation. What did you do and what was the outcome?',
  }),
  scenarioPreset({
    id: 'panel-interview-cross-functional',
    title: 'Navigating a cross-functional panel interview',
    summary: 'Several interviewers want to know how you work across competing functions.',
    role: 'the job candidate',
    counterpart: 'Quinn - a panel interviewer from a partner team',
    focus: 'interviewing, collaboration, stakeholder management, clarity',
    intent: 'Show how you communicate with different functions and handle disagreement. The counterpart should probe for concrete behaviors, not generic claims about teamwork.',
    context: 'You are interviewing for a role that partners closely with product, operations, and customer-facing teams.',
    starter: 'This role works with teams that often want different things. How do you build alignment when priorities conflict?',
  }),
  scenarioPreset({
    id: 'interview-career-gap',
    title: 'Explaining a career gap professionally',
    summary: 'An interviewer asks about time away from traditional employment.',
    role: 'the job candidate',
    counterpart: 'Blake - an interviewer seeking context without needing private details',
    focus: 'interviewing, confidence, boundaries, professional framing',
    intent: 'Answer with confidence, disclose only what is comfortable, and redirect to your current readiness and skills. The interviewer should be courteous and ask one relevant follow-up.',
    context: 'You took time away from work for personal reasons and are now applying for a role that fits your skills and direction.',
    starter: 'I noticed a gap between your recent roles. Can you tell me about that period and what brings you back now?',
  }),
  scenarioPreset({
    id: 'internal-promotion-interview',
    title: 'Interviewing for an internal promotion',
    summary: 'You need to advocate for your readiness with leaders who know your current work.',
    role: 'the internal candidate',
    counterpart: 'Morgan - a leader assessing readiness for broader scope',
    focus: 'career growth, self-advocacy, leadership, evidence',
    intent: 'Describe readiness with specific outcomes, self-awareness, and a plan for the larger role. The counterpart should distinguish strong current performance from readiness for expanded leadership.',
    context: 'A team lead role has opened. You have been a top individual contributor and have informally mentored newer teammates.',
    starter: 'You have done strong work here. What makes you ready to take on the team lead role now?',
  }),
  scenarioPreset({
    id: 'recruiter-screen-role-fit',
    title: 'Handling a recruiter screen',
    summary: 'Practice a focused first conversation about your background, motivation, and logistics.',
    role: 'the job candidate',
    counterpart: 'Taylor - a recruiter conducting an initial screen',
    focus: 'job search, concise communication, motivation, professionalism',
    intent: 'Give a succinct, relevant overview and ask thoughtful questions. The recruiter should evaluate fit, interest, availability, and salary expectations without becoming a full interview.',
    context: 'You applied for a role that matches several of your strengths but represents a slight industry change.',
    starter: 'Thanks for taking the call. Could you walk me through your background and what interested you in this opportunity?',
  }),
  scenarioPreset({
    id: 'networking-conversation',
    title: 'Making a networking conversation useful',
    summary: 'You are meeting a professional contact and want to build rapport without asking for a job outright.',
    role: 'the professional seeking advice',
    counterpart: 'Jordan - an experienced contact in your target field',
    focus: 'networking, curiosity, rapport, professional presence',
    intent: 'Build a genuine connection, communicate your direction, and make a respectful ask for insight. The counterpart should offer more when the conversation is specific and reciprocal.',
    context: 'A former colleague introduced you to Jordan, who works in a field you are exploring. You have 20 minutes to talk.',
    starter: 'I am glad we could connect. What are you hoping to learn as you explore this field?',
  }),
  scenarioPreset({
    id: 'follow-up-after-rejection',
    title: 'Requesting feedback after a job rejection',
    summary: 'You want to leave a strong impression and learn from a hiring decision.',
    role: 'the job candidate',
    counterpart: 'Alexis - a hiring manager who selected another candidate',
    focus: 'professionalism, resilience, feedback seeking, relationship building',
    intent: 'Respond gracefully to disappointing news and ask for useful feedback without pressuring the hiring manager. The counterpart should offer limited but candid insight when approached professionally.',
    context: 'You were a finalist for a role you genuinely wanted. The hiring manager offered a brief follow-up call after choosing another candidate.',
    starter: 'Thank you for making time. I know this was a competitive process, and I am happy to share what I can about the decision.',
  }),
  scenarioPreset({
    id: 'clarify-first-week-expectations',
    title: 'Clarifying expectations in a new role',
    summary: 'You need alignment on priorities, decision rights, and how success will be measured.',
    role: 'the new employee',
    counterpart: 'Cameron - your new manager who has limited time but wants you to succeed',
    focus: 'onboarding, expectation setting, managing up, initiative',
    intent: 'Ask focused questions that reveal priorities and reduce ambiguity. The counterpart should provide direction but expect you to synthesize it into an action plan.',
    context: 'You are in your first week. Several people have assigned work, but you have not yet discussed near-term goals with your manager.',
    starter: 'Welcome aboard. You have probably received a lot of information already—what would be most useful to discuss today?',
  }),
  scenarioPreset({
    id: 'handle-client-escalation',
    title: 'De-escalating an unhappy client',
    summary: 'A client is frustrated after a mistake affected their timeline.',
    role: 'the account lead',
    counterpart: 'Robin - a client who needs confidence that the problem will be fixed',
    focus: 'client communication, accountability, de-escalation, recovery',
    intent: 'Acknowledge impact, avoid defensiveness, and agree on an actionable recovery plan. The client should press for specifics and respond to clear ownership.',
    context: 'Your team sent the client an incorrect data file, delaying a presentation they had planned for senior leadership.',
    starter: 'This mistake put us in a difficult position. I need to understand what happened and what you are doing to fix it.',
  }),
  scenarioPreset({
    id: 'own-a-professional-mistake',
    title: 'Owning a professional mistake',
    summary: 'You need to tell a stakeholder about an error before they discover it themselves.',
    role: 'the project owner',
    counterpart: 'Emerson - a stakeholder affected by the error',
    focus: 'accountability, concise communication, recovery planning, trust',
    intent: 'Take responsibility early, describe impact honestly, and present a practical remedy. The counterpart should be concerned and ask whether the issue has broader consequences.',
    context: 'You discovered that an analysis sent yesterday used an outdated assumption, which changes one of the recommended actions.',
    starter: 'You asked to speak about the analysis. Is there an issue I need to know about?',
  }),
  scenarioPreset({
    id: 'decline-work-respectfully',
    title: 'Declining additional work respectfully',
    summary: 'A colleague asks for urgent help when your own commitments are already full.',
    role: 'the individual contributor',
    counterpart: 'Kris - a colleague who needs support quickly',
    focus: 'boundaries, prioritization, collaboration, professionalism',
    intent: 'Set a clear boundary while remaining helpful and offering feasible alternatives. The counterpart should have a genuine need but not automatically accept an unclear no.',
    context: 'Kris asks you to help prepare a last-minute presentation due tomorrow, while you have a major deliverable due at the same time.',
    starter: 'I know this is late, but could you spend a few hours helping me polish this presentation tonight?',
  }),
  scenarioPreset({
    id: 'negotiate-a-project-deadline',
    title: 'Negotiating a realistic project deadline',
    summary: 'A stakeholder wants a faster delivery than the work can responsibly support.',
    role: 'the project owner',
    counterpart: 'Sydney - a stakeholder with a fixed event date in mind',
    focus: 'expectation setting, negotiation, risk communication, solutions',
    intent: 'Explain constraints clearly and propose options with tradeoffs. The counterpart should care about the deadline and ask what can be delivered sooner.',
    context: 'The requested project normally takes four weeks, but Sydney has asked for a complete version in ten business days.',
    starter: 'I need this ready before the event next week. Can your team make that timeline work?',
  }),
  scenarioPreset({
    id: 'give-upward-feedback',
    title: 'Giving constructive feedback to your manager',
    summary: 'Your manager’s communication style is creating confusion and you want to address it well.',
    role: 'the direct report',
    counterpart: 'Marisol - your manager, who may not realize the impact',
    focus: 'upward feedback, courage, specificity, professionalism',
    intent: 'Share an observable pattern and its impact while making a constructive request. The manager should be open but may need help seeing the issue through your perspective.',
    context: 'Your manager frequently changes priorities in group chats without explaining the shift, causing duplicated work and anxiety across the team.',
    starter: 'You said you wanted to discuss how the team is working. What is on your mind?',
  }),
  scenarioPreset({
    id: 'set-after-hours-boundaries',
    title: 'Setting after-hours boundaries',
    summary: 'A colleague regularly sends non-urgent requests late at night and expects a quick response.',
    role: 'the colleague setting a boundary',
    counterpart: 'Owen - a teammate who works late and assumes others can respond then too',
    focus: 'boundaries, directness, empathy, working agreements',
    intent: 'Set a sustainable boundary without shaming the other person. The counterpart should explain their habit and be open to a clearer agreement if the request is specific.',
    context: 'Owen has messaged you after 10 p.m. several times this month and followed up early the next morning when you did not answer.',
    starter: 'I wanted to check whether you saw my message last night. I need your input before I can move forward.',
  }),
  scenarioPreset({
    id: 'navigate-cross-functional-disagreement',
    title: 'Navigating a cross-functional disagreement',
    summary: 'A partner team rejects your proposal because it adds work for them.',
    role: 'the proposal owner',
    counterpart: 'Inez - a partner-team lead concerned about operational burden',
    focus: 'collaboration, influence, active listening, problem solving',
    intent: 'Understand the partner team’s concern before defending the proposal, then look for a workable shared solution. The counterpart should challenge assumptions and value genuine collaboration.',
    context: 'Your proposal would improve the customer experience but requires the operations team to change a weekly workflow.',
    starter: 'I understand the customer benefit, but this proposal adds work to my team without giving us any capacity back.',
  }),
  scenarioPreset({
    id: 'redirect-workplace-gossip',
    title: 'Redirecting workplace gossip professionally',
    summary: 'A colleague starts speculating about a coworker’s private situation during work.',
    role: 'the colleague redirecting the conversation',
    counterpart: 'Bailey - a coworker who wants to keep discussing the rumor',
    focus: 'professionalism, boundaries, respect, redirection',
    intent: 'Set a respectful limit and redirect to appropriate work-related conversation. The counterpart should not be malicious but may minimize the concern at first.',
    context: 'During a break, Bailey begins speculating about why another coworker has been absent and asks what you have heard.',
    starter: 'Have you noticed that Morgan has been out again? I heard there might be something going on—do you know anything?',
  }),
  scenarioPreset({
    id: 'align-hybrid-work-expectations',
    title: 'Aligning hybrid-work expectations',
    summary: 'A teammate feels meetings and availability expectations are uneven across remote and in-office staff.',
    role: 'the team lead',
    counterpart: 'Nia - a remote teammate who feels excluded from key decisions',
    focus: 'inclusion, team norms, listening, fairness',
    intent: 'Understand the lived experience, avoid defensiveness, and establish clear team practices. The counterpart should describe concrete examples and look for follow-through.',
    context: 'Several important decisions have been made informally after office meetings, leaving remote teammates to catch up later.',
    starter: 'I do not think the hybrid setup is working fairly. Important conversations keep happening after the meetings end.',
  }),
  scenarioPreset({
    id: 'negotiate-with-a-vendor',
    title: 'Negotiating with a vendor',
    summary: 'A vendor proposes a renewal price increase that exceeds your budget.',
    role: 'the buyer',
    counterpart: 'Parker - a vendor representative responsible for the renewal',
    focus: 'negotiation, preparation, relationship management, value',
    intent: 'Negotiate firmly and professionally by discussing value, constraints, and alternatives. The vendor should protect their position but respond to a credible, collaborative proposal.',
    context: 'Your software vendor has proposed a 15% renewal increase. Your budget allows only a modest increase, but switching providers would be disruptive.',
    starter: 'We are glad your team has been successful with the platform. I understand you wanted to discuss the renewal proposal.',
  }),
  scenarioPreset({
    id: 'ask-for-clarity-on-ambiguous-work',
    title: 'Clarifying an ambiguous assignment',
    summary: 'You received a broad request but need enough clarity to deliver the right outcome.',
    role: 'the individual contributor',
    counterpart: 'Rowan - a busy stakeholder who gave the assignment',
    focus: 'clarifying questions, initiative, scope, professionalism',
    intent: 'Ask focused questions about outcome, audience, priorities, and timing while showing that you have begun thinking about the work. The stakeholder should be brief but responsive to prepared questions.',
    context: 'Rowan asked you to “put together something on customer retention” for an upcoming discussion, but did not define the audience, decision, or format.',
    starter: 'Thanks for picking this up. What do you need from me to get started?',
  }),
  scenarioPreset({
    id: 'respond-to-a-negative-review',
    title: 'Responding to difficult performance feedback',
    summary: 'Your manager shares a review that is more critical than you expected.',
    role: 'the employee receiving feedback',
    counterpart: 'Jules - your manager delivering the review',
    focus: 'receiving feedback, self-regulation, curiosity, growth mindset',
    intent: 'Stay composed, seek examples, and turn feedback into a development plan without becoming defensive. The manager should be direct, fair, and willing to discuss next steps.',
    context: 'Your review recognizes strong results but says your communication with stakeholders has been inconsistent and needs improvement for advancement.',
    starter: 'I want to walk through your review carefully. You have delivered meaningful results, and there are also areas we need to address for your growth.',
  }),
];

const THEMES = [
  { id: 'midnight-purple', name: 'Midnight Purple', mode: 'dark',  colors: ['#0c0912', '#9b6dff', '#e8709a'] },
  { id: 'dark-ocean',      name: 'Dark Ocean',      mode: 'dark',  colors: ['#040d1a', '#38b2f7', '#64d8ff'] },
  { id: 'forest-dark',     name: 'Forest Night',    mode: 'dark',  colors: ['#060f0a', '#4dd9ac', '#a5e07d'] },
  { id: 'ruby-dark',       name: 'Ruby Dark',       mode: 'dark',  colors: ['#140609', '#e8709a', '#ff9bb8'] },
  { id: 'slate-dark',      name: 'Charcoal',        mode: 'dark',  colors: ['#0f0f14', '#8b85d4', '#c084a8'] },
  { id: 'light-violet',    name: 'Violet Light',    mode: 'light', colors: ['#f4f0ff', '#6d3ae6', '#c42783'] },
  { id: 'light-sky',       name: 'Sky Blue',        mode: 'light', colors: ['#eef5ff', '#1a5fcc', '#cc2060'] },
  { id: 'light-clean',     name: 'Clean White',     mode: 'light', colors: ['#f9f9fb', '#6020c0', '#b0185a'] },
];

const DARK_THEMES  = THEMES.filter(t => t.mode === 'dark').map(t => t.id);
const LIGHT_THEMES = THEMES.filter(t => t.mode === 'light').map(t => t.id);

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
  voicePreferenceSelect: document.getElementById('voicePreferenceSelect'),
  voicePreviewBtn: document.getElementById('voicePreviewBtn'),
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

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return `${Math.floor(diff / 604800000)}w ago`;
}

function saveActivity(title) {
  try {
    const stored = localStorage.getItem('ailaActivities');
    const activities = stored ? JSON.parse(stored) : [];
    activities.unshift({ title, timestamp: Date.now() });
    localStorage.setItem('ailaActivities', JSON.stringify(activities.slice(0, 12)));
    renderActivityList();
    updateProgressStats();
  } catch (_) {}
}

function renderActivityList() {
  const list = document.getElementById('activityList');
  if (!list) return;
  try {
    const stored = localStorage.getItem('ailaActivities');
    const activities = stored ? JSON.parse(stored) : [];
    if (!activities.length) {
      list.innerHTML = '<li class="activity-empty">No recent activity yet. Start a conversation to begin!</li>';
      return;
    }
    list.innerHTML = activities.map(a => `
      <li class="activity-item">
        <div class="activity-icon-wrap" aria-hidden="true">💬</div>
        <div class="activity-text">
          <p class="activity-title">${escapeHtml(a.title || 'Scenario practice')}</p>
          <p class="activity-when">${escapeHtml(timeAgo(a.timestamp))}</p>
        </div>
      </li>
    `).join('');
  } catch (_) {
    list.innerHTML = '<li class="activity-empty">No recent activity yet.</li>';
  }
}

function updateProgressStats() {
  try {
    const stored = localStorage.getItem('ailaActivities');
    const activities = stored ? JSON.parse(stored) : [];
    const convEl = document.getElementById('statConversations');
    const streakEl = document.getElementById('statStreak');
    if (convEl) convEl.textContent = String(activities.length);
    const days = new Set(activities.map(a => new Date(a.timestamp).toDateString())).size;
    if (streakEl) streakEl.textContent = `${days} 🔥`;
    const streakDayEl = document.getElementById('streakDays');
    if (streakDayEl) streakDayEl.textContent = `${days} day streak`;
  } catch (_) {}
}

function updateScore(assessment) {
  const previousScore = state.sessionScore;
  state.turnCount += 1;
  state.scoreTotals.overall += assessment.overall;
  state.scoreTotals.activeListening += assessment.activeListening;
  state.scoreTotals.clarity += assessment.clarity;
  state.scoreTotals.empathy += assessment.empathy;
  state.sessionScore = state.scoreTotals.overall / state.turnCount;
  const pct = Math.round(state.sessionScore);
  const change = Math.round(state.sessionScore - previousScore);

  const circle = document.getElementById('scoreCircle');
  const pctEl = document.getElementById('scorePct');
  const msgEl = document.getElementById('scoreMsg');
  const trendEl = document.getElementById('scoreTrend');
  if (!circle) return;

  const circumference = 314;
  circle.style.strokeDashoffset = String(circumference - (circumference * pct / 100));
  if (pctEl) pctEl.textContent = `${pct}%`;

  const label =
    assessment.overall <= 20 ? 'Watch your tone' :
    assessment.overall < 45  ? 'Room to improve' :
    pct >= 80  ? 'Excellent!' :
    pct >= 60  ? 'Good job!' :
    pct >= 35  ? 'Keep going!' : 'Getting started';
  if (msgEl) msgEl.textContent = label;

  const trend = state.turnCount === 1
    ? `${assessment.overall}% this turn`
    : change < 0
      ? `↓ ${Math.abs(change)} from this turn`
      : change > 0
        ? `↑ ${change} from this turn`
        : `No score change this turn`;
  if (trendEl) trendEl.style.color = change < 0 || assessment.overall <= 20 ? 'var(--rose)' : 'var(--teal)';
  if (trendEl) trendEl.textContent = trend;

  const focusItems = [
    { bar: 'focusListeningBar', pct: 'focusListeningPct', key: 'activeListening' },
    { bar: 'focusClarityBar', pct: 'focusClarityPct', key: 'clarity' },
    { bar: 'focusEmpathyBar', pct: 'focusEmpathyPct', key: 'empathy' },
  ];

  focusItems.forEach(({ bar, pct: pctId, key }) => {
    const val = Math.round(state.scoreTotals[key] / state.turnCount);
    const barEl = document.getElementById(bar);
    const pEl   = document.getElementById(pctId);
    if (barEl) barEl.style.width = `${val}%`;
    if (pEl)   pEl.textContent   = `${val}%`;
  });
}

function renderConversation() {
  if (!state.messages.length) {
    elements.conversationThread.innerHTML = '<div class="chat-empty-state">Select a scenario and start your conversation.</div>';
    return;
  }
  elements.conversationThread.innerHTML = state.messages.map(message => `
    <article class="message-card ${message.role === 'user' ? 'user' : ''}">
      <div class="message-speaker">${escapeHtml(message.displayName)}</div>
      <div class="message-content">${escapeHtml(message.text)}</div>
    </article>
  `).join('');
  elements.conversationThread.scrollTop = elements.conversationThread.scrollHeight;
}

function updateMessagePlaceholder() {
  const role = getParticipantDisplayRole();
  elements.messageInput.placeholder = `Type what you would say as ${role}.`;
}

function updateFeaturedScenario(scenario) {
  const titleEl = document.getElementById('featuredTitle');
  if (titleEl) titleEl.textContent = scenario.title || 'Untitled scenario';
  elements.scenarioSummary.textContent = scenario.summary || '';
  updateScenarioDock();
}

function updateScenarioDock() {
  const titleEl = document.getElementById('scenarioDockTitle');
  const metaEl = document.getElementById('scenarioDockMeta');
  if (!titleEl || !metaEl) return;
  const scenario = state.currentScenario;
  titleEl.textContent = scenario?.title || 'Choose a scenario';
  metaEl.textContent = scenario
    ? `${getParticipantDisplayRole(scenario)} with ${getCounterpartName(scenario)}`
    : 'Select a practice setup';
}

function populateScenarioVisualList() {
  const list = document.getElementById('scenarioList');
  if (!list) return;

  const allScenarios = [...builtInScenarios, ...state.importedScenarios];
  const icons = ['💬', '🧠', '💼', '🎯', '🤝', '📋', '🔄', '⚡'];

  list.innerHTML = allScenarios.map((scenario, index) => {
    const isActive = state.currentScenario?.id === scenario.id;
    const icon = icons[index % icons.length];
    const label = scenario.title || scenario.selectLabel || 'Untitled';
    return `
      <li class="scenario-list-item${isActive ? ' active' : ''}"
          role="option"
          aria-selected="${isActive}"
          data-scenario-id="${escapeHtml(scenario.id)}"
          tabindex="0">
        <span class="scenario-list-icon" aria-hidden="true">${icon}</span>
        <span class="scenario-list-label">${escapeHtml(label)}</span>
        <span class="scenario-list-arrow" aria-hidden="true">›</span>
      </li>
    `;
  }).join('');

  list.querySelectorAll('.scenario-list-item').forEach(item => {
    const selectItem = () => {
      const id = item.dataset.scenarioId;
      const allSc = [...builtInScenarios, ...state.importedScenarios];
      const scenario = allSc.find(s => s.id === id);
      if (!scenario || scenario.id === state.currentScenario?.id) return;
      state.currentScenario = scenario;
      elements.scenarioSelect.value = id;
      updateScenarioDetails();
      resetConversation();
      populateScenarioVisualList();
    };
    item.addEventListener('click', selectItem);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(); } });
  });
}

function updateScenarioDetails() {
  const scenario = state.currentScenario;
  if (!scenario) return;

  elements.scenarioSummary.textContent = scenario.summary;
  elements.conversationContext.textContent = scenario.context;
  updateMessagePlaceholder();
  updateFeaturedScenario(scenario);

  if (elements.scenarioRole) elements.scenarioRole.textContent = scenario.role;
  if (elements.scenarioCounterpart) elements.scenarioCounterpart.textContent = getCounterpartName(scenario);
  if (elements.scenarioFocus) elements.scenarioFocus.textContent = scenario.focus;
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
    'If the user interrupted the counterpart/AILA while they were still speaking, coaching should mention that interruption tactfully and score active listening lower.',
    'For each user turn, assess the latest user message itself. Do not reward participation, verbosity, or politeness words when the underlying meaning is dismissive, insulting, defensive, or uncaring.',
    'Communication scores use 0 to 100. Hostile or insulting language should score 0 to 15 overall; dismissive or invalidating language should score 10 to 30; neutral but unhelpful language should score 35 to 55; constructive, accountable, empathetic language should score 70 to 100.',
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
    'Return exactly these keys: counterpartReply, coachingFeedback, communicationAssessment.',
    `counterpartReply must be a fresh first-person reply from ${counterpartName} to the user's latest message.`,
    'counterpartReply must directly answer the user\'s latest message and should add at least one concrete detail, feeling, or concern when appropriate.',
    `coachingFeedback must be 2 to 4 concise sentences for the user in the role of ${participantRole}, based on the latest turn only.`,
    'communicationAssessment must be an object with numeric keys overall, activeListening, clarity, and empathy from 0 to 100, plus a short tone string.',
  ].join(' ');
}

function buildInitMessages() {
  return [
    { role: 'system', content: buildSystemPrompt('init') },
    { role: 'user', content: 'Start the scenario now.' },
  ];
}

function buildChatMessages(userText, options = {}) {
  const transcript = state.messages.slice(-10).map(message => (
    `${message.displayName}: ${message.text}`
  )).join('\n');
  const interrupted = Boolean(options.interrupted);

  return [
    { role: 'system', content: buildSystemPrompt('turn') },
    {
      role: 'user',
      content: [
        'Use the scenario and transcript below to generate the next turn.',
        'Conversation transcript:',
        transcript || 'No prior transcript.',
        `Latest user message: ${userText}`,
        interrupted
          ? 'Important behavior note: the user began speaking while the counterpart/AILA was still talking. Treat this as an interruption and reflect that it weakens active listening, patience, and conversational respect unless the content shows urgent necessity.'
          : '',
        `Respond to the latest user message right now as ${getCounterpartName()}. Do not repeat an earlier ${getCounterpartName()} sentence verbatim. Output JSON only.`
      ].filter(Boolean).join('\n\n')
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
        return { counterpartReply, coachingFeedback, communicationAssessment: parsed?.communicationAssessment };
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

async function readApiJson(response, endpoint) {
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_) {
    if (!response.ok && response.status === 404 && endpoint === '/api/chat') {
      throw new Error('The chat service was not found. Run the app with npm run dev locally, or deploy the API routes and public site together.');
    }
    throw new Error(`${endpoint} returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    if (response.status === 404 && endpoint === '/api/chat') {
      throw new Error('The chat service was not found. Run the app with npm run dev locally, or deploy the API routes and public site together.');
    }
    throw new Error(data?.error || `${endpoint} failed with status ${response.status}.`);
  }

  return data;
}

function updateChatModelLabel(model) {
  if (model && elements.chatModelLabel) elements.chatModelLabel.textContent = model;
}

function setAvatarLevel(level) {
  const safeLevel = Math.max(0, Math.min(1, level));
  elements.avatar.style.setProperty('--voice-level', String(safeLevel));
  elements.avatarMouth.style.setProperty('--mouth-open', String(0.2 + safeLevel * 0.9));
}

function startAvatarPulse() {
  clearInterval(state.voiceInterval);
  state.assistantSpeaking = true;
  state.echoSuppressionUntil = performance.now() + 1000;
  state.voiceFrames = 0;
  state.assistantVoiceFrames = 0;
  if (state.mediaRecorder?.state === 'recording') {
    state.suppressCurrentSpeech = true;
    state.mediaRecorder.stop();
  }
  elements.avatar.dataset.speaking = 'true';
  setVoiceStatus('Speaking');
  if (state.handsFreeEnabled) setMicStatus('Muted for AILA');
  state.voiceInterval = window.setInterval(() => {
    setAvatarLevel(0.28 + Math.random() * 0.72);
  }, 120);
}

function stopAvatarPulse() {
  clearInterval(state.voiceInterval);
  state.voiceInterval = null;
  state.assistantSpeaking = false;
  state.echoSuppressionUntil = performance.now() + 1400;
  state.voiceFrames = 0;
  state.assistantVoiceFrames = 0;
  elements.avatar.dataset.speaking = 'false';
  setAvatarLevel(0);
  setVoiceStatus('Ready');
  if (state.handsFreeEnabled) setMicStatus('Listening');
}

function isAssistantVoiceActive() {
  return Boolean(
    state.assistantSpeaking ||
    state.ttsAbortController ||
    state.activeAudio ||
    state.activeUtterance ||
    window.speechSynthesis?.speaking
  );
}

const FEMININE_VOICE_RE = /female|woman|samantha|ava|victoria|zira|aria|jenny|joanna|susan|karen|moira|tessa|fiona|serena|salli|kimberly|emma|amy|olivia|nicole|linda|monica|google us english/i;
const MASCULINE_VOICE_RE = /male|man|david|mark|daniel|alex|fred|tom|george|guy|brian|joey|justin|matthew|ryan|kevin|james|paul|lee|oliver|arthur|google uk english male/i;

function scoreVoiceForPreference(voice, preference) {
  const name = `${voice.name || ''} ${voice.voiceURI || ''}`;
  const englishBonus = /^en[-_]?/i.test(voice.lang || '') ? 6 : 0;
  const localBonus = voice.localService ? 2 : 0;
  if (preference === 'masculine') {
    return englishBonus + localBonus + (MASCULINE_VOICE_RE.test(name) ? 25 : 0) - (FEMININE_VOICE_RE.test(name) ? 8 : 0);
  }
  if (preference === 'feminine') {
    return englishBonus + localBonus + (FEMININE_VOICE_RE.test(name) ? 25 : 0) - (MASCULINE_VOICE_RE.test(name) ? 8 : 0);
  }
  return englishBonus + localBonus + (FEMININE_VOICE_RE.test(name) ? 8 : 0);
}

function pickVoice(preference = state.voicePreference) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;
  const target = ['masculine', 'feminine'].includes(preference) ? preference : 'auto';
  const ranked = [...voices].sort((a, b) => scoreVoiceForPreference(b, target) - scoreVoiceForPreference(a, target));
  return ranked[0] || voices.find(voice => /^en/i.test(voice.lang || '')) || voices[0];
}

function updateVoicePreferenceUi() {
  if (elements.voicePreferenceSelect) {
    elements.voicePreferenceSelect.value = state.voicePreference;
  }
  if (state.ttsConfigured && state.voicePreference === 'auto') {
    setVoiceStatus(`Coqui: ${state.ttsSpeaker || 'Ready'}`);
    return;
  }
  if (!('speechSynthesis' in window)) return;
  const voice = pickVoice();
  if (voice) setVoiceStatus(voice.name || 'Ready');
}

function setVoicePreference(preference) {
  state.voicePreference = ['auto', 'feminine', 'masculine'].includes(preference) ? preference : 'auto';
  localStorage.setItem('ailaVoicePreference', state.voicePreference);
  cancelSpeech();
  updateVoicePreferenceUi();
}

function cancelSpeech() {
  if (state.ttsAbortController) {
    state.ttsAbortController.abort();
    state.ttsAbortController = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio.src = '';
    state.activeAudio = null;
  }
  if (state.activeAudioUrl) {
    URL.revokeObjectURL(state.activeAudioUrl);
    state.activeAudioUrl = null;
  }
  state.activeUtterance = null;
  stopAvatarPulse();
}

function speakWithBrowserVoice(text) {
  if (!text || !('speechSynthesis' in window)) {
    setVoiceStatus('Unavailable');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = state.voicePreference === 'masculine' ? 0.98 : 1;
  utterance.pitch = state.voicePreference === 'masculine' ? 0.92 : 1.04;
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

async function speakAssistantText(text) {
  if (!text) return;
  cancelSpeech();
  if (state.userSpeaking) return;

  if (!state.ttsConfigured || state.voicePreference !== 'auto') {
    speakWithBrowserVoice(text);
    return;
  }

  setVoiceStatus('Loading Coqui');
  const controller = new AbortController();
  state.ttsAbortController = controller;
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'Coqui voice request failed.');
    }

    const audioBlob = await response.blob();
    if (state.ttsAbortController === controller) state.ttsAbortController = null;
    if (controller.signal.aborted || state.userSpeaking) return;
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    state.activeAudio = audio;
    state.activeAudioUrl = audioUrl;

    audio.onplay = startAvatarPulse;
    audio.onended = () => {
      if (state.activeAudio === audio) cancelSpeech();
    };
    audio.onerror = () => {
      if (state.activeAudio === audio) {
        cancelSpeech();
        setVoiceStatus('Error');
      }
    };

    await audio.play();
  } catch (error) {
    if (state.ttsAbortController === controller) state.ttsAbortController = null;
    if (error?.name === 'AbortError') return;
    console.warn('Coqui TTS unavailable; using browser voice.', error);
    cancelSpeech();
    if (!state.userSpeaking) speakWithBrowserVoice(text);
  }
}

/* =====================================================================
   Coaching Feed
   ===================================================================== */

function clearCoachingFeed(loading = false) {
  const feed = elements.coachFeedback;
  if (!feed) return;
  if (loading) {
    feed.innerHTML = '<div class="coaching-loading-state"><div class="coaching-typing"><span></span><span></span><span></span></div><span>Starting conversation…</span></div>';
  } else {
    feed.innerHTML = '<div class="coaching-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Coaching insights appear here after each response.</p></div>';
  }
}

function appendCoachingBubble(text, type = 'coaching') {
  const feed = elements.coachFeedback;
  if (!feed) return;
  const placeholder = feed.querySelector('.coaching-empty-state, .coaching-loading-state');
  if (placeholder) placeholder.remove();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const bubble = document.createElement('div');
  bubble.className = `coaching-bubble${type === 'error' ? ' coaching-bubble-error' : ''}`;
  bubble.innerHTML = `<div class="coaching-bubble-meta"><span class="coaching-bubble-label">${type === 'error' ? 'Error' : 'AILA Coach'}</span><span class="coaching-bubble-time">${timeStr}</span></div><p class="coaching-bubble-text">${escapeHtml(text)}</p>`;
  feed.appendChild(bubble);
  feed.scrollTop = feed.scrollHeight;
  if (type === 'coaching') {
    state.coachingHistory.push({ text, time: timeStr });
    incrementCoachingUnread();
  }
}

function updateCoachDockBadge() {
  const badges = document.querySelectorAll('[data-coach-unread]');
  badges.forEach(badge => {
    const count = state.coachingUnread;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.toggle('hidden', count <= 0);
    badge.setAttribute('aria-label', `${count} unread coaching message${count === 1 ? '' : 's'}`);
  });
}

function incrementCoachingUnread() {
  if (document.body.dataset.modalView !== 'coaching') {
    state.coachingUnread += 1;
  }
  updateCoachDockBadge();
  clearTimeout(state.badgeTimeout);
  const coachButtons = document.querySelectorAll('[data-open-feature="coaching"]');
  coachButtons.forEach(button => button.classList.add('has-new-coaching'));
  state.badgeTimeout = setTimeout(() => {
    coachButtons.forEach(button => button.classList.remove('has-new-coaching'));
  }, 1800);
}

function clearCoachingUnread() {
  state.coachingUnread = 0;
  document.querySelectorAll('[data-open-feature="coaching"]').forEach(button => {
    button.classList.remove('has-new-coaching');
  });
  updateCoachDockBadge();
}

/* =====================================================================
   View System
   ===================================================================== */

function setActiveNav(viewName) {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
}

function closeFeatureModal() {
  delete document.body.dataset.modalView;
  const main = document.querySelector('.main-content');
  if (main) main.dataset.activeView = 'studio';
  setActiveNav('studio');
}

function openFeatureModal(viewName) {
  if (viewName === 'studio') {
    closeFeatureModal();
    return;
  }

  if (viewName === 'progress')  { renderActivityList(); updateProgressStats(); }
  if (viewName === 'scenarios') { renderScenariosGrid(); }
  if (viewName === 'insights')  { renderInsightsView(); }
  if (viewName === 'settings')  { renderThemesGrid(); }
  if (viewName === 'coaching')  { clearCoachingUnread(); }

  const main = document.querySelector('.main-content');
  if (main) main.dataset.activeView = 'studio';
  document.body.dataset.modalView = viewName;
  setActiveNav(viewName);
}

function switchView(viewName) {
  openFeatureModal(viewName);
}

function buildStudioActionBar() {
  const header = document.querySelector('.view-studio .page-header');
  if (!header || header.querySelector('.studio-actions')) return;

  const existingInsightsBtn = document.getElementById('viewInsightsBtn');
  if (existingInsightsBtn) existingInsightsBtn.remove();

  const actions = document.createElement('div');
  actions.className = 'studio-actions';
  actions.innerHTML = `
    <button class="btn-outline btn-sm" type="button" data-open-feature="scenarios" aria-label="Open scenarios" title="Scenarios"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h12"/><path d="M4 12h16"/><path d="M4 17.5h9"/><circle cx="18.5" cy="17.5" r="2"/></svg><span>Scenario</span></button>
    <button class="btn-outline btn-sm coach-action" type="button" data-open-feature="coaching" aria-label="Open coaching" title="Coaching"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a7 7 0 0 0-7 7v3a3 3 0 0 0 3 3h1v-6H6"/><path d="M12 4a7 7 0 0 1 7 7v3a3 3 0 0 1-3 3h-1v-6h3"/><path d="M9 20h6"/></svg><span>Coach</span><span class="coach-unread-badge hidden" data-coach-unread>0</span></button>
    <button class="btn-outline btn-sm" type="button" data-open-feature="progress" aria-label="Open progress" title="Progress"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V8"/><path d="M10 18V5"/><path d="M16 18v-7"/><path d="M22 18H2"/></svg><span>Progress</span></button>
    <button class="btn-outline btn-sm" type="button" data-open-feature="insights" aria-label="Open insights" title="Insights"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14c3.5 0 3.5-5 7-5s3.5 7 9 7"/><path d="M4 20h16"/></svg><span>Insights</span></button>
    <button class="btn-outline btn-sm" type="button" data-open-feature="settings" aria-label="Open settings" title="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg><span>Settings</span></button>
  `;
  header.appendChild(actions);
}

function buildFeatureModalChrome() {
  if (!document.getElementById('featureModalBackdrop')) {
    const backdrop = document.createElement('button');
    backdrop.id = 'featureModalBackdrop';
    backdrop.className = 'feature-modal-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close feature window');
    backdrop.addEventListener('click', closeFeatureModal);
    document.body.appendChild(backdrop);
  }

  if (!document.getElementById('scenarioDock')) {
    const dock = document.createElement('button');
    dock.id = 'scenarioDock';
    dock.className = 'scenario-dock';
    dock.type = 'button';
    dock.dataset.openFeature = 'scenarios';
    dock.setAttribute('aria-label', 'Choose a scenario');
    dock.innerHTML = `
      <span class="scenario-dock-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 6.5h12"/><path d="M4 12h16"/><path d="M4 17.5h9"/><circle cx="18.5" cy="17.5" r="2"/></svg>
      </span>
      <span class="scenario-dock-copy">
        <span class="scenario-dock-kicker">Scenario</span>
        <span class="scenario-dock-title" id="scenarioDockTitle">Choose a scenario</span>
        <span class="scenario-dock-meta" id="scenarioDockMeta">Select a practice setup</span>
      </span>
    `;
    document.querySelector('.app-shell')?.appendChild(dock);
  }

  if (!document.getElementById('coachDock')) {
    const dock = document.createElement('button');
    dock.id = 'coachDock';
    dock.className = 'coach-dock';
    dock.type = 'button';
    dock.dataset.openFeature = 'coaching';
    dock.setAttribute('aria-label', 'Open coaching');
    dock.innerHTML = `
      <span class="coach-dock-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 4a7 7 0 0 0-7 7v3a3 3 0 0 0 3 3h1v-6H6"/><path d="M12 4a7 7 0 0 1 7 7v3a3 3 0 0 1-3 3h-1v-6h3"/><path d="M9 20h6"/></svg>
      </span>
      <span class="coach-dock-text">Coach</span>
      <span class="coach-unread-badge hidden" data-coach-unread>0</span>
    `;
    dock.addEventListener('click', () => switchView('coaching'));
    document.querySelector('.app-shell')?.appendChild(dock);
  }

  updateCoachDockBadge();
  updateScenarioDock();

  document.querySelectorAll('.view-progress, .view-scenarios, .view-insights, .view-settings').forEach(view => {
    const header = view.querySelector('.page-header');
    if (!header || header.querySelector('.feature-modal-close')) return;
    const close = document.createElement('button');
    close.className = 'feature-modal-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close feature window');
    close.textContent = 'Close';
    close.addEventListener('click', closeFeatureModal);
    header.appendChild(close);
  });

  const coachingHeader = document.querySelector('.coaching-flow-card .step-header');
  if (coachingHeader && !coachingHeader.querySelector('.feature-modal-close')) {
    const close = document.createElement('button');
    close.className = 'feature-modal-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close coaching window');
    close.textContent = 'Close';
    close.addEventListener('click', closeFeatureModal);
    coachingHeader.appendChild(close);
  }
}

/* =====================================================================
   Theme System
   ===================================================================== */

function applyTheme(themeId) {
  if (!THEMES.find(t => t.id === themeId)) return;
  document.documentElement.dataset.theme = themeId;
  localStorage.setItem('ailaTheme', themeId);
  state.currentTheme = themeId;
  const isLight = LIGHT_THEMES.includes(themeId);
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
  if (isLight) { state.lastLightTheme = themeId; }
  else { state.lastDarkTheme = themeId; }
  const tgl = document.getElementById('themeToggleLabel');
  if (tgl) tgl.textContent = isLight ? 'Dark mode' : 'Light mode';
  const stgl = document.getElementById('settingsLightDarkLabel');
  if (stgl) stgl.textContent = isLight ? 'Switch to Dark' : 'Switch to Light';
}

function toggleLightDark() {
  const isLight = LIGHT_THEMES.includes(state.currentTheme);
  if (isLight) {
    applyTheme(state.lastDarkTheme || 'midnight-purple');
  } else {
    applyTheme(state.lastLightTheme || 'light-violet');
  }
}

function initTheme() {
  const saved = localStorage.getItem('ailaTheme') || 'midnight-purple';
  applyTheme(saved);
}

function initVoicePreference() {
  const saved = localStorage.getItem('ailaVoicePreference') || 'auto';
  state.voicePreference = ['auto', 'feminine', 'masculine'].includes(saved) ? saved : 'auto';
  updateVoicePreferenceUi();
}

let _themeFilter = '';
let _themeMode = 'all';

function renderThemesGrid() {
  const grid = document.getElementById('themesGrid');
  if (!grid) return;
  const current = state.currentTheme;
  let list = THEMES;
  if (_themeMode !== 'all') list = list.filter(t => t.mode === _themeMode);
  if (_themeFilter) list = list.filter(t => t.name.toLowerCase().includes(_themeFilter.toLowerCase()));
  if (!list.length) {
    grid.innerHTML = '<p class="themes-no-result">No themes match your search.</p>';
    return;
  }
  grid.innerHTML = list.map(t => `
    <div class="theme-card${t.id === current ? ' active' : ''}" data-theme-id="${escapeHtml(t.id)}" tabindex="0" role="button" aria-pressed="${t.id === current}">
      <div class="theme-preview">${t.colors.map(c => `<span style="background:${c}"></span>`).join('')}</div>
      <div class="theme-card-info">
        <span class="theme-card-name">${escapeHtml(t.name)}</span>
        <span class="theme-card-mode">${t.mode}</span>
      </div>
      ${t.id === current ? '<span class="theme-card-check" aria-hidden="true">✓</span>' : ''}
    </div>
  `).join('');
  grid.querySelectorAll('.theme-card').forEach(card => {
    const select = () => { applyTheme(card.dataset.themeId); renderThemesGrid(); };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
  });
}

/* =====================================================================
   Scenarios View
   ===================================================================== */

function renderScenariosGrid(filter = '') {
  const grid = document.getElementById('scenariosViewGrid');
  if (!grid) return;
  const allScenarios = [...builtInScenarios, ...state.importedScenarios];
  const filtered = filter
    ? allScenarios.filter(s =>
        (s.title || '').toLowerCase().includes(filter.toLowerCase()) ||
        (s.focus || '').toLowerCase().includes(filter.toLowerCase()) ||
        (s.role || '').toLowerCase().includes(filter.toLowerCase()))
    : allScenarios;
  if (!filtered.length) {
    grid.innerHTML = '<p class="scenarios-empty">No scenarios match your search.</p>';
    return;
  }
  const icons = ['💬','🧠','💼','🎯','🤝','📋','🔄','⚡'];
  grid.innerHTML = filtered.map((sc, i) => `
    <div class="scenario-card" data-scenario-id="${escapeHtml(sc.id)}" tabindex="0" role="button">
      <div class="scenario-card-header">
        <div class="scenario-card-icon">${icons[i % icons.length]}</div>
        <h3 class="scenario-card-title">${escapeHtml(sc.title || 'Untitled')}</h3>
      </div>
      <p class="scenario-card-summary">${escapeHtml(sc.summary || '')}</p>
      <div class="scenario-card-meta">
        <span class="scenario-card-meta-tag">As: ${escapeHtml(sc.role || '—')}</span>
        <span class="scenario-card-meta-tag">With: ${escapeHtml(getCounterpartName(sc))}</span>
      </div>
      <p class="scenario-card-focus">${escapeHtml(sc.focus || '')}</p>
      <button class="btn-primary scenario-practice-btn" type="button" data-scenario-id="${escapeHtml(sc.id)}">Practice →</button>
    </div>
  `).join('');

  grid.querySelectorAll('[data-scenario-id]').forEach(el => {
    const launch = () => {
      const sc = [...builtInScenarios, ...state.importedScenarios].find(s => s.id === el.dataset.scenarioId);
      if (!sc) return;
      state.currentScenario = sc;
      if (elements.scenarioSelect) elements.scenarioSelect.value = sc.id;
      updateScenarioDetails();
      populateScenarioVisualList();
      switchView('studio');
      resetConversation();
    };
    if (el.classList.contains('scenario-practice-btn')) {
      el.addEventListener('click', e => { e.stopPropagation(); launch(); });
    } else {
      el.addEventListener('click', launch);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
      });
    }
  });
}

/* =====================================================================
   Insights View
   ===================================================================== */

function renderInsightsView() {
  const pct = Math.round(state.sessionScore);
  const scoreEl = document.getElementById('insightsScoreDisplay');
  const listenEl = document.getElementById('insightsListeningVal');
  const clarityEl = document.getElementById('insightsClarityVal');
  const empathyEl = document.getElementById('insightsEmpathyVal');
  if (scoreEl)  scoreEl.textContent  = pct > 0 ? `${pct}%` : '—';
  if (listenEl) listenEl.textContent = state.turnCount > 0 ? `${Math.round(state.scoreTotals.activeListening / state.turnCount)}%` : '—';
  if (clarityEl) clarityEl.textContent = state.turnCount > 0 ? `${Math.round(state.scoreTotals.clarity / state.turnCount)}%` : '—';
  if (empathyEl) empathyEl.textContent = state.turnCount > 0 ? `${Math.round(state.scoreTotals.empathy / state.turnCount)}%` : '—';

  const historyEl = document.getElementById('insightsCoachingHistory');
  if (!historyEl) return;
  if (!state.coachingHistory.length) {
    historyEl.innerHTML = '<div class="coaching-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Start a conversation to see coaching history.</p></div>';
    return;
  }
  historyEl.innerHTML = state.coachingHistory.map((item, i) => `
    <div class="coaching-bubble">
      <div class="coaching-bubble-meta">
        <span class="coaching-bubble-label">Turn ${i + 1}</span>
        <span class="coaching-bubble-time">${escapeHtml(item.time)}</span>
      </div>
      <p class="coaching-bubble-text">${escapeHtml(item.text)}</p>
    </div>
  `).join('');
}

/* =====================================================================
   Conversation
   ===================================================================== */

async function resetConversation() {
  cancelSpeech();
  ++state.conversationGeneration;
  state.chatBusy = false;
  state.voiceBlobQueue = [];
  state.messages = [];
  state.turnCount = 0;
  state.sessionScore = 0;
  state.scoreTotals = { overall: 0, activeListening: 0, clarity: 0, empathy: 0 };
  state.coachingHistory = [];
  state.coachingUnread = 0;
  updateCoachDockBadge();

  const circle = document.getElementById('scoreCircle');
  if (circle) circle.style.strokeDashoffset = '314';
  const scorePctEl = document.getElementById('scorePct');
  if (scorePctEl) scorePctEl.textContent = '—';
  const scoreMsgEl = document.getElementById('scoreMsg');
  if (scoreMsgEl) scoreMsgEl.textContent = 'Start a session';
  const scoreTrendEl = document.getElementById('scoreTrend');
  if (scoreTrendEl) { scoreTrendEl.textContent = 'Complete a conversation to get your score'; scoreTrendEl.style.color = ''; }
  ['focusListening', 'focusClarity', 'focusEmpathy'].forEach(name => {
    const bar = document.getElementById(`${name}Bar`);
    const pct = document.getElementById(`${name}Pct`);
    if (bar) bar.style.width = '0%';
    if (pct) pct.textContent = '—';
  });
  renderConversation();
  clearCoachingFeed(false);
  setStatus('Ready');
  elements.sendBtn.disabled = false;

  if (state.termsAccepted) {
    await startScenarioConversation(state.conversationGeneration);
  }
}

async function startScenarioConversation(generation) {
  if (state.chatBusy || generation !== state.conversationGeneration) return;

  state.chatBusy = true;
  elements.sendBtn.disabled = true;
  clearCoachingFeed(true);
  setStatus('Preparing scenario...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: buildInitMessages(), mode: 'init' }),
    });
    const data = await readApiJson(response, '/api/chat');
    if (generation !== state.conversationGeneration) return;

    const opening = data?.structured;
    if (!opening?.ailaIntro || !opening?.counterpartReply || !opening?.coachingFeedback) {
      throw new Error('The chat service returned an incomplete scenario opening. Please restart the scenario.');
    }

    const counterpartReply = sanitizeCounterpartReply(opening.counterpartReply);
    updateChatModelLabel(data.model);
    state.messages = [
      { role: 'assistant', displayName: 'AILA', text: String(opening.ailaIntro).trim() },
      { role: 'assistant', displayName: getCounterpartName(), text: counterpartReply },
    ];
    appendCoachingBubble(String(opening.coachingFeedback).trim());
    renderConversation();
    setStatus('Ready');
    speakAssistantText(counterpartReply);
  } catch (error) {
    if (generation !== state.conversationGeneration) return;
    setStatus('Error');
    clearCoachingFeed(false);
    appendCoachingBubble(error.message || 'Unable to start the scenario.', 'error');
  } finally {
    if (generation === state.conversationGeneration) {
      state.chatBusy = false;
      elements.sendBtn.disabled = false;
    }
  }
}

async function sendMessage(text, options = {}) {
  const trimmed = text.trim();
  if (!trimmed || state.chatBusy) return;
  const interrupted = Boolean(options.interrupted || state.pendingInterruption || isAssistantVoiceActive());
  if (interrupted && isAssistantVoiceActive()) {
    cancelSpeech();
  }
  state.pendingInterruption = false;

  const generation = state.conversationGeneration;
  state.chatBusy = true;
  state.messages.push({ role: 'user', displayName: 'You', text: trimmed });
  renderConversation();
  elements.messageInput.value = '';
  setStatus('Sending...');
  elements.sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: buildChatMessages(trimmed, { interrupted }), mode: 'turn' }),
    });

    const data = await readApiJson(response, '/api/chat');
    if (generation !== state.conversationGeneration) return;
    updateChatModelLabel(data.model);

    const parsed = data?.structured?.counterpartReply && data?.structured?.coachingFeedback
      ? {
          counterpartReply: sanitizeCounterpartReply(data.structured.counterpartReply),
          coachingFeedback: String(data.structured.coachingFeedback || '').trim(),
          communicationAssessment: data.structured.communicationAssessment,
        }
      : parseModelReply(data.output || '');

    state.messages.push({ role: 'assistant', displayName: getCounterpartName(), text: parsed.counterpartReply });
    const coachingText = interrupted
      ? `${parsed.coachingFeedback} Also, you interrupted before AILA finished speaking; in a real conversation, that can feel dismissive and lowers your active listening score.`
      : parsed.coachingFeedback;
    appendCoachingBubble(coachingText);
    updateScore(scoreTurn(trimmed, parsed.communicationAssessment, { interrupted }));
    setStatus('Ready');
    renderConversation();
    speakAssistantText(parsed.counterpartReply);
  } catch (error) {
    setStatus('Error');
    appendCoachingBubble(error.message || 'Something went wrong while contacting Groq.', 'error');
  } finally {
    if (generation === state.conversationGeneration) {
      state.chatBusy = false;
      elements.sendBtn.disabled = false;
    }
  }
}

async function transcribeBlob(blob, filename = 'audio.webm') {
  const formData = new FormData();
  formData.append('audio', blob, filename);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const data = await readApiJson(response, '/api/transcribe');

  return data.text || '';
}

function getSupportedRecordingMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function calculateRms(samples) {
  let sum = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / samples.length);
}

function handleAssistantInterruption(now) {
  if (!state.handsFreeEnabled || state.userSpeaking) return;
  state.pendingInterruption = true;
  state.assistantVoiceFrames = 0;
  setStatus('Interrupted');
  setVoiceStatus('Interrupted');
  cancelSpeech();
  state.echoSuppressionUntil = now;
  startSpeechCapture(now, { interrupted: true, allowDuringAssistant: true });
}

function startSpeechCapture(now, options = {}) {
  if (!state.handsFreeEnabled || !state.micStream || state.userSpeaking) return;
  const { interrupted = false, allowDuringAssistant = false } = options;
  if (!allowDuringAssistant && (isAssistantVoiceActive() || now < state.echoSuppressionUntil)) return;

  const mimeType = getSupportedRecordingMimeType();
  const recorder = new MediaRecorder(
    state.micStream,
    mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined
  );

  state.audioChunks = [];
  state.suppressCurrentSpeech = false;
  state.currentSpeechInterrupted = interrupted;
  state.mediaRecorder = recorder;
  state.userSpeaking = true;
  state.speechStartedAt = now;
  state.lastSpeechAt = now;
  state.speechVoiceFrames = 0;
  state.speechPeakRms = 0;
  setMicStatus('Listening to you');
  setStatus('You are speaking...');
  elements.recordBtn.classList.add('is-speaking');

  recorder.ondataavailable = event => {
    if (event.data?.size) state.audioChunks.push(event.data);
  };

  recorder.onstop = () => {
    const duration = performance.now() - state.speechStartedAt;
    const audioBlob = new Blob(state.audioChunks, {
      type: recorder.mimeType || mimeType || 'audio/webm',
    });

    state.mediaRecorder = null;
    state.audioChunks = [];
    state.userSpeaking = false;
    elements.recordBtn.classList.remove('is-speaking');

    const interruptedCapture = state.currentSpeechInterrupted;
    const suppressed = !interruptedCapture && (state.suppressCurrentSpeech || performance.now() < state.echoSuppressionUntil);
    const voicedMs = state.speechVoiceFrames * 16;
    const likelyNoiseBurst = !interruptedCapture && (
      duration < 700 ||
      voicedMs < 260 ||
      (duration < 1100 && voicedMs < 520 && state.speechPeakRms > Math.max(0.05, state.noiseFloor * 6))
    );
    state.suppressCurrentSpeech = false;
    state.currentSpeechInterrupted = false;
    state.speechVoiceFrames = 0;
    state.speechPeakRms = 0;

    if (state.handsFreeEnabled && !suppressed && !likelyNoiseBurst && duration >= 250 && audioBlob.size > 1000) {
      state.voiceBlobQueue.push({
        audioBlob,
        generation: state.conversationGeneration,
        interrupted: interruptedCapture,
      });
      processVoiceBlobQueue();
    } else if (state.handsFreeEnabled) {
      if (likelyNoiseBurst) {
        state.noiseCooldownUntil = performance.now() + 700;
        setMicStatus('Ignored noise');
      } else {
        setMicStatus(isAssistantVoiceActive() ? 'Muted for AILA' : 'Listening');
      }
      setStatus('Ready');
    }
  };

  recorder.start(200);
}

function stopSpeechCapture() {
  if (!state.userSpeaking || state.mediaRecorder?.state !== 'recording') return;
  setMicStatus('Processing');
  setStatus('Transcribing...');
  state.mediaRecorder.stop();
}

async function processVoiceBlobQueue() {
  if (state.processingVoiceQueue) return;
  state.processingVoiceQueue = true;

  while (state.voiceBlobQueue.length) {
    const { audioBlob, generation, interrupted = false } = state.voiceBlobQueue.shift();
    if (generation !== state.conversationGeneration) continue;
    try {
      const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const text = (await transcribeBlob(audioBlob, `hands-free-turn.${extension}`)).trim();
      if (!text || generation !== state.conversationGeneration) continue;

      elements.messageInput.value = text;
      while (state.chatBusy) {
        await new Promise(resolve => window.setTimeout(resolve, 100));
        if (generation !== state.conversationGeneration) break;
      }
      if (generation !== state.conversationGeneration) continue;
      await sendMessage(text, { interrupted });
    } catch (error) {
      setMicStatus('Error');
      setStatus('Error');
      appendCoachingBubble(error.message || 'Audio processing failed.', 'error');
    }
  }

  state.processingVoiceQueue = false;
  if (state.handsFreeEnabled && !state.userSpeaking) {
    setMicStatus('Listening');
    if (!state.chatBusy) setStatus('Ready');
  }
}

function monitorVoiceActivity() {
  if (!state.handsFreeEnabled || !state.micAnalyser || !state.micSamples) return;

  state.micAnalyser.getByteTimeDomainData(state.micSamples);
  const rms = calculateRms(state.micSamples);
  const now = performance.now();
  const assistantVoiceActive = isAssistantVoiceActive();
  const suppressAssistantAudio = assistantVoiceActive || now < state.echoSuppressionUntil;

  if (now < state.noiseCooldownUntil) {
    state.voiceFrames = 0;
    state.assistantVoiceFrames = 0;
    state.vadFrame = window.requestAnimationFrame(monitorVoiceActivity);
    return;
  }

  if (assistantVoiceActive) {
    const bargeInThreshold = Math.max(0.065, state.noiseFloor * 6.2);
    if (rms > bargeInThreshold) {
      state.assistantVoiceFrames += 1;
      if (state.assistantVoiceFrames >= 12) {
        handleAssistantInterruption(now);
      }
    } else {
      state.assistantVoiceFrames = 0;
    }
    state.voiceFrames = 0;
    if (!state.userSpeaking) setMicStatus('Muted for AILA');
    state.vadFrame = window.requestAnimationFrame(monitorVoiceActivity);
    return;
  }

  if (suppressAssistantAudio) {
    state.assistantVoiceFrames = 0;
    state.voiceFrames = 0;
    if (!state.userSpeaking) setMicStatus('Echo cooldown');
    state.vadFrame = window.requestAnimationFrame(monitorVoiceActivity);
    return;
  }

  if (!state.userSpeaking) setMicStatus('Listening');
  state.assistantVoiceFrames = 0;

  const threshold = Math.max(0.026, state.noiseFloor * 3.8);
  const requiredVoiceFrames = 9;
  const voiceDetected = rms > threshold;

  if (!state.userSpeaking && !voiceDetected) {
    state.noiseFloor = state.noiseFloor * 0.97 + rms * 0.03;
  }

  if (voiceDetected) {
    state.voiceFrames += 1;
    state.lastSpeechAt = now;
    if (state.userSpeaking) {
      state.speechVoiceFrames += 1;
      state.speechPeakRms = Math.max(state.speechPeakRms, rms);
    }
    if (!state.userSpeaking && state.voiceFrames >= requiredVoiceFrames) {
      startSpeechCapture(now);
    }
  } else {
    state.voiceFrames = 0;
  }

  const silenceLimitMs = state.currentSpeechInterrupted ? 1900 : 2600;
  const maxTurnMs = state.currentSpeechInterrupted ? 75000 : 120000;
  if (
    state.userSpeaking &&
    (now - state.lastSpeechAt >= silenceLimitMs || now - state.speechStartedAt >= maxTurnMs)
  ) {
    stopSpeechCapture();
  }

  state.vadFrame = window.requestAnimationFrame(monitorVoiceActivity);
}

async function startHandsFreeMode() {
  if (state.handsFreeEnabled) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setMicStatus('Unavailable');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      },
    });
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable.');
    const audioContext = new AudioContextClass();
    await audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.15;
    source.connect(analyser);

    state.micStream = stream;
    state.audioContext = audioContext;
    state.micAnalyser = analyser;
    state.micSamples = new Uint8Array(analyser.fftSize);
    state.handsFreeEnabled = true;
    state.noiseFloor = 0.008;
    elements.recordBtn.textContent = 'Turn hands-free mode off';
    elements.recordBtn.setAttribute('aria-pressed', 'true');
    elements.recordBtn.classList.add('is-recording');
    setMicStatus('Listening');
    monitorVoiceActivity();
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    setMicStatus('Unavailable');
    setStatus('Error');
    appendCoachingBubble('Microphone access was not granted or is not available in this browser.', 'error');
  }
}

async function stopHandsFreeMode() {
  state.handsFreeEnabled = false;
  if (state.vadFrame) window.cancelAnimationFrame(state.vadFrame);
  state.vadFrame = null;

  if (state.mediaRecorder?.state === 'recording') {
    state.mediaRecorder.stop();
  }
  state.micStream?.getTracks().forEach(track => track.stop());
  state.micStream = null;
  state.micAnalyser = null;
  state.micSamples = null;
  if (state.audioContext && state.audioContext.state !== 'closed') {
    await state.audioContext.close();
  }
  state.audioContext = null;
  state.userSpeaking = false;
  state.voiceFrames = 0;
  state.speechVoiceFrames = 0;
  state.speechPeakRms = 0;
  state.noiseCooldownUntil = 0;
  elements.recordBtn.textContent = 'Turn hands-free mode on';
  elements.recordBtn.setAttribute('aria-pressed', 'false');
  elements.recordBtn.classList.remove('is-recording', 'is-speaking');
  setMicStatus('Off');
}

function toggleHandsFreeMode() {
  return state.handsFreeEnabled ? stopHandsFreeMode() : startHandsFreeMode();
}

function downloadTemplate() {
  const template = {
    scenarios: [
      {
        id: 'new-scenario-id',
        title: 'Name of the scenario',
        selectLabel: 'Name of the scenario  short one-line description.',
        summary: 'Short summary shown in the scenario card.',
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
  populateScenarioVisualList();
  resetConversation();
}

function populateScenarioSelect() {
  const allScenarios = [...builtInScenarios, ...state.importedScenarios];

  elements.scenarioSelect.innerHTML = allScenarios
    .map(scenario => `<option value="${escapeHtml(scenario.id)}">${escapeHtml(scenario.selectLabel || scenario.title)}</option>`)
    .join('');

  if (!state.currentScenario && allScenarios.length) {
    state.currentScenario = allScenarios[0];
  }

  if (state.currentScenario) {
    elements.scenarioSelect.value = state.currentScenario.id;
  }

  populateScenarioVisualList();
}

async function loadHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await readApiJson(response, '/api/health');
    if (response.ok && data?.chatModel) {
      elements.chatModelLabel.textContent = `${data.chatModel}`;
    }
    if (response.ok && data?.ttsConfigured) {
      state.ttsConfigured = true;
      state.ttsSpeaker = data.ttsSpeaker || '';
      if (state.voicePreference === 'auto') {
        setVoiceStatus(`Coqui: ${state.ttsSpeaker || 'Ready'}`);
      } else {
        updateVoicePreferenceUi();
      }
    }
  } catch (_) {}
}

function warmVoices() {
  if (state.ttsConfigured && state.voicePreference === 'auto') return;
  if (!('speechSynthesis' in window)) {
    setVoiceStatus('Unavailable');
    return;
  }

  const updateVoiceStatus = () => {
    if (state.ttsConfigured && state.voicePreference === 'auto') return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      updateVoicePreferenceUi();
    } else {
      setVoiceStatus('Loading');
    }
  };

  updateVoiceStatus();
  window.speechSynthesis.onvoiceschanged = updateVoiceStatus;
}

function clearHistory() {
  if (!confirm('Clear all activity history? This cannot be undone.')) return;
  localStorage.removeItem('ailaActivities');
  renderActivityList();
  updateProgressStats();
}

function initialize() {
  state.currentScenario = builtInScenarios[0];
  populateScenarioSelect();
  updateScenarioDetails();
  renderActivityList();
  updateProgressStats();
  initTheme();
  initVoicePreference();
  buildStudioActionBar();
  buildFeatureModalChrome();
  resetConversation();
  loadHealth();
  warmVoices();

  /* Nav view switching */
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchView(item.dataset.view); });
  });

  document.querySelectorAll('[data-open-feature]').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.openFeature));
  });

  /* Sidebar theme toggle */
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleLightDark);

  /* Settings light/dark button */
  const settingsLightDarkBtn = document.getElementById('settingsLightDarkBtn');
  if (settingsLightDarkBtn) settingsLightDarkBtn.addEventListener('click', toggleLightDark);

  if (elements.voicePreferenceSelect) {
    elements.voicePreferenceSelect.addEventListener('change', event => {
      setVoicePreference(event.target.value);
    });
  }

  if (elements.voicePreviewBtn) {
    elements.voicePreviewBtn.addEventListener('click', () => {
      speakWithBrowserVoice('Hi, I am AILA. This is how I will sound during your conversation.');
    });
  }

  /* Theme search */
  const themeSearch = document.getElementById('themeSearch');
  if (themeSearch) themeSearch.addEventListener('input', e => { _themeFilter = e.target.value; renderThemesGrid(); });

  /* Theme mode tabs */
  document.querySelectorAll('.theme-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.theme-mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _themeMode = tab.dataset.mode;
      renderThemesGrid();
    });
  });

  /* Scenarios search */
  const scenariosSearch = document.getElementById('scenariosSearch');
  if (scenariosSearch) scenariosSearch.addEventListener('input', e => renderScenariosGrid(e.target.value));

  const scenariosTitle = document.querySelector('.view-scenarios .page-title');
  if (scenariosTitle) scenariosTitle.textContent = 'Choose a scenario';

  /* View insights button (opens Insights view) */
  const viewInsightsBtn = document.getElementById('viewInsightsBtn');
  if (viewInsightsBtn) viewInsightsBtn.addEventListener('click', () => switchView('insights'));

  /* Browse all scenarios button */
  const browseScenariosBtn = document.getElementById('browseScenariosBtn');
  if (browseScenariosBtn) browseScenariosBtn.addEventListener('click', () => switchView('scenarios'));

  /* Clear history buttons */
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
  const clearHistoryBtnSettings = document.getElementById('clearHistoryBtnSettings');
  if (clearHistoryBtnSettings) clearHistoryBtnSettings.addEventListener('click', clearHistory);

  /* Terms */
  elements.termsCheckbox.addEventListener('change', () => {
    elements.agreeBtn.disabled = !elements.termsCheckbox.checked;
  });

  elements.agreeBtn.addEventListener('click', () => {
    if (!elements.termsCheckbox.checked) return;
    state.termsAccepted = true;
    elements.termsModal.classList.add('hidden');
    setMicStatus('Off');
    resetConversation();
  });

  /* Send message */
  elements.sendBtn.addEventListener('click', () => sendMessage(elements.messageInput.value));

  elements.messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(elements.messageInput.value);
    }
  });

  /* Voice */
  elements.recordBtn.addEventListener('click', toggleHandsFreeMode);
  elements.uploadAudioBtn.addEventListener('click', () => elements.audioFileInput.click());

  elements.audioFileInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('Transcribing...');
    setMicStatus('Processing');
    try {
      const text = await transcribeBlob(file, file.name);
      setStatus('Ready');
      setMicStatus(state.handsFreeEnabled ? 'Listening' : 'Off');
      if (text.trim()) {
        elements.messageInput.value = text.trim();
        await sendMessage(text.trim());
      }
    } catch (error) {
      setStatus('Error');
      setMicStatus('Error');
      appendCoachingBubble(error.message || 'Audio upload failed.', 'error');
    } finally {
      event.target.value = '';
    }
  });

  /* Scenarios import */
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
      appendCoachingBubble(error.message || 'Scenario import failed.', 'error');
    } finally {
      event.target.value = '';
    }
  });

  elements.downloadTemplateBtn.addEventListener('click', downloadTemplate);

  elements.restartScenarioBtn.addEventListener('click', () => {
    resetConversation();
    setMicStatus(state.handsFreeEnabled ? 'Listening' : 'Off');
    setVoiceStatus('Ready');
    elements.messageInput.value = '';
  });

  elements.scenarioSelect.addEventListener('change', event => {
    const allScenarios = [...builtInScenarios, ...state.importedScenarios];
    const nextScenario = allScenarios.find(scenario => scenario.id === event.target.value);
    if (!nextScenario) return;
    state.currentScenario = nextScenario;
    updateScenarioDetails();
    populateScenarioVisualList();
    resetConversation();
  });

  window.addEventListener('beforeunload', () => {
    state.micStream?.getTracks().forEach(track => track.stop());
    state.audioContext?.close();
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.dataset.modalView) {
      closeFeatureModal();
    }
  });

  try {
    const saved = localStorage.getItem('ailaImportedScenarios');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        applyScenarioList(parsed);
        return;
      }
    }
  } catch (_) {}
}

initialize();
