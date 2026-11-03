
import { gsap } from 'gsap';

/**
 * Reveal existing letters one by one.
 * Returns a cleanup function.
 */
export function playType(
  letters: HTMLSpanElement[]
) {
  gsap.set(letters, {
    autoAlpha: 0,
    y: 7,
  });

  const clearCursor = () => {
    letters.forEach((el) => {
      el.classList.remove('typing-current');
    });
  };

  const timeline = gsap.timeline();

  letters.forEach((letter, i) => {
    const at = i * 0.2;

    timeline.call(() => {
      clearCursor();
      letter.classList.add('typing-current');
    }, [], at);

    timeline.to(
      letter,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.06,
        ease: 'none',
      },
      at
    );
  });

  timeline.call(
    clearCursor,
    [],
    letters.length * 0.2 + 0.5
  );

  return () => {
    timeline.kill();
    clearCursor();

    gsap.set(letters, {
      autoAlpha: 1,
      y: 0,
    });
  };
}
