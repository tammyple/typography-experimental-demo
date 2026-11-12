import { ERASURE } from './config';

export type Point = { x: number; y: number };

export type EraseMask = {
  resize(width: number, height: number, dpr: number): void;
  dab(point: Point, radius: number, time: number, instant?: boolean): void;
  stroke(
    from: Point,
    to: Point,
    radius: number,
    speed: number,
    time: number,
    instant?: boolean
  ): void;
  composite(
    target: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void;
  clear(): void;
};

type Blob = {
  x: number;
  y: number;
  radius: number;
  seed: number;
  born: number;
  droplet: boolean;
};

const clamp = (min: number, max: number, value: number) =>
  Math.max(min, Math.min(max, value));

const smooth = (value: number) =>
  1 - Math.pow(1 - clamp(0, 1, value), 3);

/**
 * Draws one rounded, irregular liquid shape. Quadratic curves keep
 * the boundary continuous instead of making a jagged polygon.
 */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  blob: Blob,
  progress: number
) {
  const growth = 0.78 + 0.22 * smooth(progress);
  const radius = blob.radius * growth;
  const phase = blob.seed * 6.283185307;

  // New droplets expand a little and then settle into place.
  const shift = (1 - progress) * radius * 0.055;
  const cx = blob.x + Math.sin(phase) * shift;
  const cy = blob.y + Math.cos(phase) * shift;

  const count = 18;
  const coords: Point[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const variation =
      1 +
      0.075 * Math.sin(3 * angle + phase) +
      0.055 * Math.cos(5 * angle - phase * 0.8);
    const r = radius * variation;
    coords.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  const start = coords[0];
  const last = coords[count - 1];
  ctx.beginPath();
  ctx.moveTo((start.x + last.x) / 2, (start.y + last.y) / 2);

  for (let index = 0; index < count; index += 1) {
    const a = coords[index];
    const b = coords[(index + 1) % count];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.closePath();

  // Mild feathering makes nearby pools visually merge.
  ctx.shadowColor = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur = blob.droplet ? 2 : Math.max(3, radius * 0.075);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.shadowBlur = 0;
}

/**
 * Persistent mask + a small active pool of expanding shapes.
 * Once a shape finishes spreading, it is baked into the permanent mask.
 * This avoids retaining an ever-growing list of brush strokes.
 */
export function createEraseMask(): EraseMask {
  const settledCanvas = document.createElement('canvas');
  const activeCanvas = document.createElement('canvas');
  const settledCtx = settledCanvas.getContext('2d');
  const activeCtx = activeCanvas.getContext('2d');

  if (!settledCtx || !activeCtx) {
    throw new Error('Canvas 2D is required for Experiment 004.');
  }

  let width = 1;
  let height = 1;
  let stampIndex = 0;
  let blobs: Blob[] = [];

  function stamp(point: Point, radius: number, time: number, instant: boolean) {
    stampIndex += 1;
    const seed = (stampIndex * 0.6180339887) % 1;
    const blob: Blob = {
      x: point.x,
      y: point.y,
      radius,
      seed,
      born: time,
      droplet: false,
    };

    if (instant) {
      drawBlob(settledCtx!, blob, 1);
    } else {
      blobs.push(blob);
    }

    // Occasional small splashes add a liquid edge without random speckling.
    if (stampIndex % 13 === 0) {
      const angle = seed * Math.PI * 2;
      const drop: Blob = {
        x: point.x + Math.cos(angle) * radius * 0.98,
        y: point.y + Math.sin(angle) * radius * 0.98,
        radius: radius * 0.2,
        seed: (seed + 0.37) % 1,
        born: time,
        droplet: true,
      };
      if (instant) drawBlob(settledCtx!, drop, 1);
      else blobs.push(drop);
    }
  }

  function update(time: number) {
    if (!blobs.length) return;
    activeCtx!.clearRect(0, 0, width, height);

    const remaining: Blob[] = [];
    for (const blob of blobs) {
      const progress = clamp(
        0,
        1,
        (time - blob.born) / ERASURE.liquidSettleMs
      );
      if (progress >= 1) {
        drawBlob(settledCtx!, blob, 1);
      } else {
        drawBlob(activeCtx!, blob, progress);
        remaining.push(blob);
      }
    }
    blobs = remaining;
  }

  return {
    resize(nextWidth, nextHeight, dpr) {
      const oldWidth = width;
      const oldHeight = height;
      const snapshot = document.createElement('canvas');
      snapshot.width = settledCanvas.width;
      snapshot.height = settledCanvas.height;
      snapshot.getContext('2d')?.drawImage(settledCanvas, 0, 0);

      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      const pixelRatio = Math.min(2, Math.max(1, dpr));
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);

      settledCanvas.width = pixelWidth;
      settledCanvas.height = pixelHeight;
      activeCanvas.width = pixelWidth;
      activeCanvas.height = pixelHeight;
      settledCtx!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      activeCtx!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      // Maintain erased regions when the browser changes size.
      if (snapshot.width > 1 && snapshot.height > 1) {
        settledCtx!.drawImage(snapshot, 0, 0, width, height);
      }

      const sx = width / oldWidth;
      const sy = height / oldHeight;
      for (const blob of blobs) {
        blob.x *= sx;
        blob.y *= sy;
        blob.radius *= Math.sqrt(sx * sy);
      }
    },

    dab(point, radius, time, instant = false) {
      stamp(point, radius, time, instant);
    },

    stroke(from, to, radius, speed, time, instant = false) {
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      // Faster swipes stretch the brush, rather than making it disappear.
      const adjustedRadius = radius * clamp(0.78, 1.1, 1.05 - speed / 4000);
      const steps = Math.max(1, Math.ceil(length / Math.max(5, radius * 0.24)));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        stamp(
          {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          },
          adjustedRadius * (1 + 0.045 * Math.sin(stampIndex * 0.65)),
          time,
          instant
        );
      }
    },

    composite(target, drawWidth, drawHeight, time) {
      update(time);
      target.save();
      target.globalCompositeOperation = 'destination-out';
      target.drawImage(settledCanvas, 0, 0, drawWidth, drawHeight);
      if (blobs.length) {
        target.drawImage(activeCanvas, 0, 0, drawWidth, drawHeight);
      }
      target.restore();
    },

    clear() {
      blobs = [];
      stampIndex = 0;
      settledCtx!.clearRect(0, 0, width, height);
      activeCtx!.clearRect(0, 0, width, height);
    },
  };
}
