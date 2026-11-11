
import { gsap } from 'gsap';

// ========================================
// TYPE + DECODE SETTINGS
// ========================================

const SETTINGS = {
  // Time between introducing new characters.
  letterInterval: 0.14,

  // How long a new character scrambles
  // before resolving into the correct one.
  decodeDuration: 0.18,

  // Random character changes per second.
  flickerRate: 60,
};

const RANDOM_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?%#';

// Get a random character different from the real one.
function randomCharacter(correct: string) {
  let result = correct;

  while (result === correct) {
    const index = Math.floor(
      Math.random() * RANDOM_CHARACTERS.length
    );

    result = RANDOM_CHARACTERS[index];
  }

  return result;
}

// ========================================
// MAIN ANIMATION
// ========================================

export function playType(
  letters: HTMLSpanElement[]
) {
  if (letters.length === 0) {
    return () => {};
  }

  // Save the intended characters.
  // Works with WORDS, TSUNAMI, or another word.
  const originals = letters.map(
    (letter) => letter.textContent ?? ''
  );

  // Preserve each character's original width.
  // Random characters must not move the layout.
  const widths = letters.map(
    (letter) => letter.getBoundingClientRect().width
  );

  letters.forEach((letter, i) => {
    letter.style.width = `${widths[i]}px`;
    letter.style.textAlign = 'center';
  });

  // All letters begin hidden, but their
  // space remains reserved in the layout.
  gsap.set(letters, {
    autoAlpha: 0,
    y: 0,
  });

  const state = { elapsed: 0 };

  // Track each character independently.
  const previousFrames = letters.map(() => -1);
  const resolved = letters.map(() => false);

  // Total time for the word to complete.
  const totalDuration =
    (letters.length - 1) * SETTINGS.letterInterval +
    SETTINGS.decodeDuration;

  // ========================================
  // UPDATE THE CHARACTERS
  // ========================================

  function render() {
    letters.forEach((letter, i) => {
      const startTime =
        i * SETTINGS.letterInterval;

      const age = state.elapsed - startTime;

      // This character hasn't been typed yet.
      if (age < 0) return;

      // ------------------------------------
      // CHARACTER HAS FINISHED DECODING
      // ------------------------------------

      if (age >= SETTINGS.decodeDuration) {
        if (!resolved[i]) {
          letter.textContent = originals[i];
          gsap.set(letter, { autoAlpha: 1 });
          resolved[i] = true;
        }

        return;
      }

      // ------------------------------------
      // CHARACTER IS STILL SCRAMBLING
      // ------------------------------------

      const frame = Math.floor(
        age * SETTINGS.flickerRate
      );

      // Only change the glyph when the next
      // flicker frame is reached.
      if (frame === previousFrames[i]) {
        return;
      }

      previousFrames[i] = frame;

      // Display an incorrect character first.
      letter.textContent = randomCharacter(
        originals[i]
      );

      // Reveal this position in the word.
      gsap.set(letter, {
        autoAlpha: 1,
      });
    });
  }

  // ========================================
  // PLAY THE ANIMATION ONCE
  // ========================================

  render();

  const tween = gsap.to(state, {
    elapsed: totalDuration,
    duration: totalDuration,

    ease: 'none',

    onUpdate: render,

    onComplete: () => {
      // Guarantee the correct final word.
      letters.forEach((letter, i) => {
        letter.textContent = originals[i];

        gsap.set(letter, {
          autoAlpha: 1,
        });
      });
    },
  });

  // ========================================
  // CLEANUP
  // ========================================

  return () => {
    tween.kill();

    letters.forEach((letter, i) => {
      letter.textContent = originals[i];

      letter.style.removeProperty('width');
      letter.style.removeProperty('text-align');

      letter.classList.remove('typing-current');
    });

    gsap.set(letters, {
      autoAlpha: 1,
      y: 0,
    });
  };
}
