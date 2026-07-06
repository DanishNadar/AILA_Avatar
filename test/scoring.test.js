import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreTurn } from '../public/scoring.js';

test('explicitly uncaring language receives a severe score', () => {
  const result = scoreTurn("But I really don't care.", {
    overall: 80,
    activeListening: 80,
    clarity: 80,
    empathy: 80,
  });

  assert.ok(result.overall <= 10);
  assert.ok(result.empathy <= 5);
  assert.equal(result.tone, 'hostile');
});

test('insulting feelings receives a severe score', () => {
  const result = scoreTurn("Feelings shmealing, that's so stupid.");
  assert.ok(result.overall <= 10);
  assert.ok(result.activeListening <= 8);
});

test('dismissive transcript examples never receive a positive score', () => {
  const messages = [
    "But hey, that's just a period of time. And that's really hard.",
    'I literally am not.',
    "Dura, you're so annoyed.",
  ];

  for (const message of messages) {
    assert.ok(scoreTurn(message).overall <= 25, message);
  }
});

test('empathetic accountability scores above neutral', () => {
  const result = scoreTurn(
    "I'm sorry. I should have listened, and I want to understand what would help make this right."
  );
  assert.ok(result.overall >= 70);
  assert.ok(result.empathy >= 75);
});

test('interrupting caps active listening even with constructive wording', () => {
  const result = scoreTurn(
    "I hear you, and I want to understand what happened.",
    { overall: 92, activeListening: 95, clarity: 90, empathy: 88 },
    { interrupted: true }
  );

  assert.ok(result.overall <= 62);
  assert.ok(result.activeListening <= 35);
  assert.equal(result.tone, 'interrupted');
});
