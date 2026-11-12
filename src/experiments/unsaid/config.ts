/** Experiment 004 — UNSAID: transient, organic vapour reveal. */
export const ERASURE = {
  repeatedText: 'I AM ONLY A WAVE',
  revealedText: 'I AM THE OCEAN.',
  revealedLines: ['I AM', 'THE OCEAN.'],

  background: '#f3f1ec',
  ink: '#171717',
  accent: '#b63724',

  // Speed of the small printed rows (CSS pixels per second).
  marqueeSpeed: 10,

  // The visible cursor stays small. It is NOT the eraser radius.
  cursorDiameter: 36,

  // Size of the actual cloud, in CSS pixels. Individual clouds vary
  // widely around this base to avoid a uniform brush-stroke silhouette.
  vaporRadius: 116,
  emissionSpacing: 68,

  // At first the cloud expands quickly. It then holds before a slower fade.
  vaporBloomMs: 250,
  vaporHoldMs: 1350,
  vaporFadeMs: 1750,

  // Subtle upward movement as the cloud dissipates.
  vaporRise: 17,
  maxPuffs: 90,
} as const;
