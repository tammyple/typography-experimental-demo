import { Body, Sleeping, type Body as MatterBody } from 'matter-js';
import { WEIGHT_SETTINGS } from './config';

type SweepOptions = {
  stage: HTMLElement;
  cursor: HTMLElement;
  getBodies: () => MatterBody[];
};

/**
 * A soft cursor brush: it pushes nearby physical bodies rather than
 * dragging them or making them follow the pointer.
 */
export function attachSweep({ stage, cursor, getBodies }: SweepOptions) {
  let last: { x: number; y: number; time: number } | null = null;
  let touchPointer: number | null = null;

  function position(event: PointerEvent) {
    const bounds = stage.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      time: event.timeStamp,
    };
  }

  function show(x: number, y: number) {
    cursor.style.opacity = '1';
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }

  function enter(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    last = position(event);
    show(last.x, last.y);
  }

  function down(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    touchPointer = event.pointerId;
    last = position(event);
    show(last.x, last.y);
    stage.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent) {
    if (event.pointerType === 'touch' && touchPointer !== event.pointerId) {
      return;
    }

    const next = position(event);
    show(next.x, next.y);

    if (!last) {
      last = next;
      return;
    }

    const elapsed = Math.max(8, Math.min(40, next.time - last.time));
    const normalization = 16.667 / elapsed;
    const dx = Math.max(-30, Math.min(30, (next.x - last.x) * normalization));
    const dy = Math.max(-22, Math.min(22, (next.y - last.y) * normalization));
    last = next;

    if (Math.hypot(dx, dy) < 0.7) return;

    for (const body of getBodies()) {
      const distance = Math.hypot(
        body.position.x - next.x,
        body.position.y - next.y
      );

      const bodyRadius = Math.min(46, Math.sqrt(body.area) * 0.4);
      const reach = WEIGHT_SETTINGS.sweepRadius + bodyRadius;
      if (distance >= reach) continue;

      // The brush has a soft edge, and large bodies resist more.
      const proximity = Math.pow(1 - distance / reach, 1.35);
      const resistance = 0.8 + body.mass * 0.17;
      const strength = (body.mass * 0.0019 * proximity) / resistance;

      Sleeping.set(body, false);
      Body.applyForce(
        body,
        { x: body.position.x, y: body.position.y + bodyRadius * 0.25 },
        {
          x: dx * strength,
          // Make upward motion weaker: letters should feel heavy.
          y: Math.max(-5, dy) * strength * 0.7,
        }
      );
    }
  }

  function leave(event: PointerEvent) {
    if (event.pointerType === 'touch' && touchPointer === event.pointerId) {
      touchPointer = null;
    }
    last = null;
    cursor.style.opacity = '0';
  }

  function up(event: PointerEvent) {
    if (event.pointerType !== 'touch' || touchPointer !== event.pointerId) {
      return;
    }
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    leave(event);
  }

  stage.addEventListener('pointerenter', enter);
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerleave', leave);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  return () => {
    stage.removeEventListener('pointerenter', enter);
    stage.removeEventListener('pointerdown', down);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerleave', leave);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
    cursor.style.opacity = '0';
  };
}
