// Edit this sentence to change the letters in Experiment 003.
export const WEIGHT_TEXT = 'SOME WORDS CARRY MORE WEIGHT';

// Spaces do not become physical bodies.
export const WEIGHT_LETTERS = [...WEIGHT_TEXT].filter(
  (character) => character !== ' '
);

export const WEIGHT_SETTINGS = {
  gravity: 1.25,
  floorInset: 32,
  wallThickness: 120,
  restitution: 0.18,
  friction: 0.72,
  frictionStatic: 0.92,
  frictionAir: 0.016,
  density: 0.0018,
  sweepRadius: 90,
};
