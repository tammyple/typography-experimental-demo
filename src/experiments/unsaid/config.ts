/**
 * Experiment 004 — UNSAID
 * A small, repeated belief opens onto a much larger perspective.
 * Change the text here without altering the masking logic.
 */
export const ERASURE = {
  repeatedText: 'I AM ONLY A WAVE',
  revealedText: 'I AM THE OCEAN.',
  revealedLines: ['I AM', 'THE OCEAN.'],

  background: '#f3f1ec',
  ink: '#171717',
  accent: '#b63724',

  // Horizontal motion of the small printed rows (CSS pixels / second).
  marqueeSpeed: 10,

  // A wider liquid brush makes connected pools rather than tiny holes.
  brushRadius: 94,

  // Opening spreads slightly after the stroke (milliseconds).
  liquidSettleMs: 320,
} as const;
