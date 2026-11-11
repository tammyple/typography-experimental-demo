// Experiment 003 — The Weight of Words
// The phrase is stored once, but its letters appear twice in the scene.
export const WEIGHT_TEXT = 'SOME WORDS CARRY MORE WEIGHT';
export const LETTER_COPIES = 2;

const CHARACTERS = [...WEIGHT_TEXT].filter(
  (character) => character !== ' '
);

export const WEIGHT_LETTERS = Array.from(
  { length: LETTER_COPIES },
  () => [...CHARACTERS]
).flat();

export const WEIGHT_SETTINGS = {
  gravity: 2.0,            // Faster drop than v1/v2
  floorInset: 32,          // Keep in sync with .weight-floor in CSS
  wallThickness: 120,

  // Close to the first version: lively motion, but very little bounce.
  restitution: 0.06,       // Low bounce without making movement sluggish
  friction: 0.72,
  frictionStatic: 0.92,
  frictionAir: 0.016,      // Back near the first version
  density: 0.0018,

  // Responsive cursor brush — same 180px visual circle, stronger forces.
  sweepRadius: 90,
  sweepStrength: 0.0030,   // Responsive brush, applied once per physics step
  sweepFollow: 36,        // Higher = faster brush tracking
  sweepMaxStep: 30,       // Maximum movement used in one physics step
  sweepUpwardScale: 0.55, // Upward pushes are deliberately weaker
  sweepDownwardScale: 0.80,
};
