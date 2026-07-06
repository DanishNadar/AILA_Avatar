const SCORE_KEYS = ['overall', 'activeListening', 'clarity', 'empathy'];

const SEVERE_HOSTILITY = /\b(?:shut up|get out|go away|leave me alone|i (?:really |literally )?don'?t care|who cares|feelings?\s+shm\w+|you(?:'re| are) (?:stupid|useless|an idiot|pathetic)|that(?:'s| is) (?:so )?stupid|this is pointless|waste of (?:my )?time|whatever|i quit|forget it)\b/i;
const DISMISSIVE_LANGUAGE = /\b(?:stop (?:talking|whining)|not my (?:problem|fault)|you(?:'re| are) (?:so )?(?:annoying|annoyed|dramatic|sensitive)|get over it|calm down|it(?:'s| is) not (?:a )?big deal|that(?:'s| is) just (?:a )?(?:phase|period of time)|you don'?t (?:get it|understand)|that(?:'s| is) (?:ridiculous|absurd)|i literally am not|you(?:'re| are) wrong)\b/i;
const EMPATHETIC_LANGUAGE = /\b(?:i (?:hear|understand|appreciate|see) (?:you|that|your)|i(?:'m| am) sorry|that makes sense|i value your|your (?:perspective|concern|feelings|experience) matters?|thank you for (?:telling|sharing)|help me understand)\b/i;
const CURIOUS_LANGUAGE = /\b(?:can you (?:tell|share|explain)|what (?:did|do|would|can) you|how (?:did|does|can|could) (?:that|you|we)|what would help|what do you need)\b/i;
const ACCOUNTABLE_LANGUAGE = /\b(?:i (?:was|am) wrong|i take responsibility|i should have|i could have handled|that was dismissive|i want to make this right)\b/i;

function clampScore(value, fallback = 50) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback;
}

function heuristicAssessment(text) {
  const message = String(text || '').trim();
  const severe = SEVERE_HOSTILITY.test(message);
  const dismissive = DISMISSIVE_LANGUAGE.test(message);
  const empathetic = EMPATHETIC_LANGUAGE.test(message);
  const curious = CURIOUS_LANGUAGE.test(message);
  const accountable = ACCOUNTABLE_LANGUAGE.test(message);

  if (severe) {
    return { overall: 5, activeListening: 4, clarity: 28, empathy: 2, tone: 'hostile' };
  }

  if (dismissive) {
    return { overall: 18, activeListening: 12, clarity: 38, empathy: 8, tone: 'dismissive' };
  }

  let activeListening = 45;
  let clarity = message.length >= 18 ? 58 : 48;
  let empathy = 42;

  if (empathetic) {
    activeListening += 25;
    empathy += 32;
  }
  if (curious) {
    activeListening += 22;
    clarity += 12;
    empathy += 10;
  }
  if (accountable) {
    activeListening += 18;
    clarity += 14;
    empathy += 24;
  }

  const overall = Math.round(activeListening * 0.35 + clarity * 0.25 + empathy * 0.4);
  return {
    overall: clampScore(overall),
    activeListening: clampScore(activeListening),
    clarity: clampScore(clarity),
    empathy: clampScore(empathy),
    tone: empathetic || accountable ? 'constructive' : 'neutral',
  };
}

function normalizeAssessment(assessment) {
  if (!assessment || typeof assessment !== 'object') return null;
  const normalized = {};
  for (const key of SCORE_KEYS) {
    if (!Number.isFinite(Number(assessment[key]))) return null;
    normalized[key] = clampScore(assessment[key]);
  }
  normalized.tone = String(assessment.tone || 'neutral').trim().toLowerCase();
  return normalized;
}

export function scoreTurn(text, modelAssessment, options = {}) {
  const message = String(text || '');
  const severe = SEVERE_HOSTILITY.test(message);
  const dismissive = DISMISSIVE_LANGUAGE.test(message);
  const interrupted = Boolean(options.interrupted);
  const assessment = normalizeAssessment(modelAssessment) || heuristicAssessment(message);

  if (severe) {
    assessment.overall = Math.min(assessment.overall, 10);
    assessment.activeListening = Math.min(assessment.activeListening, 8);
    assessment.empathy = Math.min(assessment.empathy, 5);
    assessment.tone = 'hostile';
  } else if (dismissive) {
    assessment.overall = Math.min(assessment.overall, 25);
    assessment.activeListening = Math.min(assessment.activeListening, 20);
    assessment.empathy = Math.min(assessment.empathy, 15);
    assessment.tone = 'dismissive';
  }

  if (interrupted) {
    assessment.overall = Math.min(assessment.overall, 62);
    assessment.activeListening = Math.min(assessment.activeListening, 35);
    assessment.empathy = Math.min(assessment.empathy, 58);
    assessment.tone = assessment.tone === 'hostile' || assessment.tone === 'dismissive'
      ? assessment.tone
      : 'interrupted';
  }

  return assessment;
}
