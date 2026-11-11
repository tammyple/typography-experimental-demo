import { Body, Sleeping, type Body as MatterBody } from 'matter-js';
import { WEIGHT_SETTINGS } from './config';

type Point = { x: number; y: number };

type SweepOptions = {
  stage: HTMLElement;
  cursor: HTMLElement;
  getBodies: () => MatterBody[];
};

export type SweepController = {
  /** Call once for each fixed physics step (not once per pointer event). */
  step(deltaMs: number): void;
  destroy(): void;
};

/**
 * A responsive brush. Cursor events only record the destination;
 * force is applied once per physics step, consistently at 60 fps.
 */
export function attachSweep({
  stage,
  cursor,
  getBodies,
}: SweepOptions): SweepController {
  let target: Point | null = null;
  let brush: Point | null = null;
  let touchPointerId: number | null = null;

  function localPoint(event: PointerEvent): Point {
    const bounds = stage.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }

  function setBrushPosition(point: Point) {
    cursor.style.opacity = '1';
    cursor.style.transform =
      `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
  }

  function begin(point: Point) {
    target = { ...point };
    brush = { ...point };
    setBrushPosition(point);
  }

  function end() {
    target = null;
    brush = null;
    cursor.style.opacity = '0';
  }

  function onEnter(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    begin(localPoint(event));
  }

  function onDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    touchPointerId = event.pointerId;
    begin(localPoint(event));
    stage.setPointerCapture(event.pointerId);
  }

  function onMove(event: PointerEvent) {
    if (
      event.pointerType === 'touch' &&
      touchPointerId !== event.pointerId
    ) {
      return;
    }

    const point = localPoint(event);
    if (!target || !brush) {
      begin(point);
    } else {
      target = point;
    }
  }

  function onLeave(event: PointerEvent) {
    // Ignore pointerleave for a captured touch; pointerup will end it.
    if (event.pointerType === 'touch') return;
    end();
  }

  function onUp(event: PointerEvent) {
    if (
      event.pointerType !== 'touch' ||
      touchPointerId !== event.pointerId
    ) {
      return;
    }

    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    touchPointerId = null;
    end();
  }

  stage.addEventListener('pointerenter', onEnter);
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);

  return {
    step(deltaMs) {
      if (!target || !brush) return;

      // Ease the brush toward the actual pointer position.
      const follow = 1 - Math.exp(
        -WEIGHT_SETTINGS.sweepFollow * deltaMs / 1000
      );
      const previousX = brush.x;
      const previousY = brush.y;

      brush.x += (target.x - brush.x) * follow;
      brush.y += (target.y - brush.y) * follow;
      setBrushPosition(brush);

      // This is displacement per physics step, not a raw event impulse.
      const limit = WEIGHT_SETTINGS.sweepMaxStep;
      const dx = Math.max(-limit, Math.min(limit, brush.x - previousX));
      const dy = Math.max(-limit, Math.min(limit, brush.y - previousY));

      if (Math.hypot(dx, dy) < 0.28) return;

      for (const body of getBodies()) {
        const distance = Math.hypot(
          body.position.x - brush.x,
          body.position.y - brush.y
        );

        const bodyRadius = Math.min(46, Math.sqrt(body.area) * 0.4);
        const reach = WEIGHT_SETTINGS.sweepRadius + bodyRadius;
        if (distance >= reach) continue;

        // Wide responsive area: the cursor can sweep a crowded pile.
        const proximity = Math.pow(1 - distance / reach, 1.25);
        const resistance = 0.8 + body.mass * 0.17;
        const strength =
          body.mass * WEIGHT_SETTINGS.sweepStrength * proximity /
          resistance;

        // Weaken upwards forces; let gravity keep the letters grounded.
        const yScale = dy < 0
          ? WEIGHT_SETTINGS.sweepUpwardScale
          : WEIGHT_SETTINGS.sweepDownwardScale;

        Sleeping.set(body, false);
        Body.applyForce(
          body,
          { x: body.position.x, y: body.position.y + bodyRadius * 0.12 },
          { x: dx * strength, y: dy * strength * yScale }
        );
      }
    },

    destroy() {
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);

      if (
        touchPointerId !== null &&
        stage.hasPointerCapture(touchPointerId)
      ) {
        stage.releasePointerCapture(touchPointerId);
      }
      touchPointerId = null;
      end();
    },
  };
}
