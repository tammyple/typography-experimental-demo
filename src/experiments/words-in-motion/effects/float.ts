
import { gsap } from 'gsap';

const SETTINGS = {
  speed: 42,
  drift: 8,
  padding: 22,
  floatBounce: 0.8,
  throwBounce: 0.96,
  throwMultiplier: 0.85,
  maxThrowSpeed: 620,
  minThrowSpeed: 75,
};

type Particle = {
  el: HTMLSpanElement;
  index: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeVx: number;
  homeVy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  throwStrength: number;
  squash: number;
  squashVelocity: number;
  squashAxis: 'x' | 'y';
  pointerId: number | null;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  releaseVX: number;
  releaseVY: number;
};

export type FloatController = {
  returnHome(onComplete: () => void): void;
  dispose(): void;
};

export function startFloat(
  stage: HTMLElement,
  letters: HTMLSpanElement[]
): FloatController {
  // Each letter has independent movement data.
  const particles: Particle[] = letters.map(
    (el, index) => {
      const angle =
        (index / letters.length) * Math.PI * 2 + 0.4;

      const vx = Math.cos(angle) * SETTINGS.speed;
      const vy = Math.sin(angle) * SETTINGS.speed;

      return {
        el,
        index,
        x: 0,
        y: 0,
        vx,
        vy,
        homeVx: vx,
        homeVy: vy,
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        throwStrength: 0,
        squash: 0,
        squashVelocity: 0,
        squashAxis: 'x',
        pointerId: null,
        startX: 0,
        startY: 0,
        pointerX: 0,
        pointerY: 0,
        lastX: 0,
        lastY: 0,
        lastTime: 0,
        releaseVX: 0,
        releaseVY: 0,
      };
    }
  );

  // ----------------------------------------
  // 1. SET THE MOVEMENT BOUNDARIES
  // ----------------------------------------

  function measureBounds() {
    const stageRect = stage.getBoundingClientRect();

    for (const p of particles) {
      const rect = p.el.getBoundingClientRect();

      const baseLeft = rect.left - p.x;
      const baseTop = rect.top - p.y;

      const minX =
        stageRect.left + SETTINGS.padding - baseLeft;

      const maxX =
        stageRect.right -
        SETTINGS.padding -
        baseLeft -
        rect.width;

      const minY =
        stageRect.top + SETTINGS.padding - baseTop;

      const maxY =
        stageRect.bottom -
        SETTINGS.padding -
        baseTop -
        rect.height;

      p.minX = Math.min(minX, maxX);
      p.maxX = Math.max(minX, maxX);
      p.minY = Math.min(minY, maxY);
      p.maxY = Math.max(minY, maxY);

      p.x = gsap.utils.clamp(p.minX, p.maxX, p.x);
      p.y = gsap.utils.clamp(p.minY, p.maxY, p.y);
    }
  }

  measureBounds();

  const resizeObserver = new ResizeObserver(measureBounds);
  resizeObserver.observe(stage);

  const removeEvents: Array<() => void> = [];

  let disposed = false;
  let exiting = false;
  let homeTween: gsap.core.Tween | null = null;
  let elapsed = 0;
  let visible = true;

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });

  observer.observe(stage);

  // ----------------------------------------
  // 2. GRAB AND THROW
  // ----------------------------------------

  for (const p of particles) {
    const down = (e: PointerEvent) => {
      if (
        exiting ||
        p.pointerId !== null ||
        e.button !== 0
      ) {
        return;
      }

      e.preventDefault();

      p.pointerId = e.pointerId;

      p.startX = p.x;
      p.startY = p.y;

      p.pointerX = e.clientX;
      p.pointerY = e.clientY;

      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.lastTime = performance.now();

      p.releaseVX = 0;
      p.releaseVY = 0;
      p.throwStrength = 0;

      p.el.classList.add('is-dragging');
      p.el.setPointerCapture(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      if (
        p.pointerId !== e.pointerId ||
        exiting
      ) {
        return;
      }

      const time = performance.now();

      const dt = Math.max(
        (time - p.lastTime) / 1000,
        0.008
      );

      const vx = (e.clientX - p.lastX) / dt;
      const vy = (e.clientY - p.lastY) / dt;

      // Smooth the cursor's recent velocity.
      p.releaseVX =
        p.releaseVX * 0.35 + vx * 0.65;

      p.releaseVY =
        p.releaseVY * 0.35 + vy * 0.65;

      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.lastTime = time;

      // Follow the pointer within the boundaries.
      p.x = gsap.utils.clamp(
        p.minX,
        p.maxX,
        p.startX + e.clientX - p.pointerX
      );

      p.y = gsap.utils.clamp(
        p.minY,
        p.maxY,
        p.startY + e.clientY - p.pointerY
      );
    };

    const up = (e: PointerEvent) => {
      if (p.pointerId !== e.pointerId) return;

      const recent =
        e.type === 'pointerup' &&
        performance.now() - p.lastTime < 110;

      const vx = recent
        ? p.releaseVX * SETTINGS.throwMultiplier
        : 0;

      const vy = recent
        ? p.releaseVY * SETTINGS.throwMultiplier
        : 0;

      const speed = Math.hypot(vx, vy);

      p.pointerId = null;
      p.el.classList.remove('is-dragging');

      if (p.el.hasPointerCapture(e.pointerId)) {
        p.el.releasePointerCapture(e.pointerId);
      }

      if (speed >= SETTINGS.minThrowSpeed) {
        const multiplier = Math.min(
          1,
          SETTINGS.maxThrowSpeed / speed
        );

        p.vx = vx * multiplier;
        p.vy = vy * multiplier;
        p.throwStrength = 1;
      } else {
        p.vx = p.homeVx;
        p.vy = p.homeVy;
        p.throwStrength = 0;
      }
    };

    p.el.addEventListener('pointerdown', down);
    p.el.addEventListener('pointermove', move);
    p.el.addEventListener('pointerup', up);
    p.el.addEventListener('pointercancel', up);

    // Save cleanup functions for later.
    removeEvents.push(() => {
      p.el.removeEventListener('pointerdown', down);
      p.el.removeEventListener('pointermove', move);
      p.el.removeEventListener('pointerup', up);
      p.el.removeEventListener('pointercancel', up);

      if (
        p.pointerId !== null &&
        p.el.hasPointerCapture(p.pointerId)
      ) {
        p.el.releasePointerCapture(p.pointerId);
      }

      p.pointerId = null;
      p.el.classList.remove('is-dragging');
    });
  }

  // ----------------------------------------
  // 3. STOP INTERACTION
  // ----------------------------------------

  function stopInteraction() {
    gsap.ticker.remove(tick);

    while (removeEvents.length) {
      removeEvents.pop()?.();
    }
  }

  // ----------------------------------------
  // 4. CONTINUOUS FLOATING PHYSICS
  // ----------------------------------------

  function tick(_time: number, deltaMs: number) {
    if (!visible || exiting || disposed) return;

    const dt = Math.min(deltaMs / 1000, 0.04);
    elapsed += dt;

    for (const p of particles) {
      if (p.pointerId === null) {
        // Thrown letters gradually lose energy.
        p.throwStrength *= Math.exp(-0.9 * dt);

        const restore = 1 - Math.exp(-0.65 * dt);

        p.vx += (p.homeVx - p.vx) * restore;
        p.vy += (p.homeVy - p.vy) * restore;

        // Gentle floating forces.
        p.vx +=
          Math.sin(elapsed * 0.72 + p.index * 1.9) *
          SETTINGS.drift *
          dt;

        p.vy +=
          Math.cos(elapsed * 0.56 + p.index * 2.3) *
          SETTINGS.drift *
          dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Stronger bounce shortly after a throw.
        const bounce = gsap.utils.interpolate(
          SETTINGS.floatBounce,
          SETTINGS.throwBounce,
          p.throwStrength
        );

        let hitX = false;
        let hitY = false;

        if (p.x < p.minX) {
          p.x = p.minX;
          p.vx = Math.abs(p.vx) * bounce;
          p.homeVx = Math.abs(p.homeVx);
          hitX = true;
        }

        if (p.x > p.maxX) {
          p.x = p.maxX;
          p.vx = -Math.abs(p.vx) * bounce;
          p.homeVx = -Math.abs(p.homeVx);
          hitX = true;
        }

        if (p.y < p.minY) {
          p.y = p.minY;
          p.vy = Math.abs(p.vy) * bounce;
          p.homeVy = Math.abs(p.homeVy);
          hitY = true;
        }

        if (p.y > p.maxY) {
          p.y = p.maxY;
          p.vy = -Math.abs(p.vy) * bounce;
          p.homeVy = -Math.abs(p.homeVy);
          hitY = true;
        }

        // Small spring compression after impact.
        if (hitX || hitY) {
          p.squashAxis = hitX ? 'x' : 'y';
          p.squash =
            p.throwStrength > 0.2 ? 0.13 : 0.06;
          p.squashVelocity = 0;
        }
      }

      p.squashVelocity +=
        (-100 * p.squash -
          12 * p.squashVelocity) * dt;

      p.squash += p.squashVelocity * dt;

      const dragging = p.pointerId !== null;

      gsap.set(p.el, {
        x: p.x,
        y: p.y,

        rotation: dragging
          ? 0
          : Math.sin(elapsed * 0.48 + p.index) * 4,

        scaleX: dragging
          ? 1.08
          : p.squashAxis === 'x'
            ? 1 - p.squash
            : 1 + 0.4 * p.squash,

        scaleY: dragging
          ? 1.08
          : p.squashAxis === 'y'
            ? 1 - p.squash
            : 1 + 0.4 * p.squash,

        zIndex: dragging ? 10 : 1,
      });
    }
  }

  gsap.ticker.add(tick);

  // ----------------------------------------
  // 5. PUBLIC CONTROLS
  // ----------------------------------------

  return {
    returnHome(onComplete) {
      if (disposed || exiting) return;

      exiting = true;

      // Stop the physics BEFORE returning home.
      stopInteraction();

      homeTween = gsap.to(letters, {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,

        duration: 0.68,

        stagger: {
          each: 0.035,
          from: 'random',
        },

        ease: 'power2.inOut',
        overwrite: 'auto',
        onComplete,
      });
    },

    dispose() {
      if (disposed) return;
      disposed = true;

      stopInteraction();
      resizeObserver.disconnect();
      observer.disconnect();
      homeTween?.kill();
    },
  };
}
