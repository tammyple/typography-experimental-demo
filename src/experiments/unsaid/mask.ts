import { ERASURE } from './config';

export type Point = { x: number; y: number };

export type VaporMask = {
  resize(width: number, height: number): void;
  emit(point: Point, now: number, velocity?: Point): void;
  move(from: Point, to: Point, now: number, velocity?: Point): void;
  composite(
    destination: CanvasRenderingContext2D,
    width: number,
    height: number,
    now: number
  ): void;
  clear(): void;
};

type Lobe = {
  dx: number;
  dy: number;
  size: number;
  strength: number;
};

type Cloud = {
  center: Point;
  velocity: Point;
  radius: number;
  born: number;
  seed: number;
  lobes: Lobe[];
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const smoothstep = (lo: number, hi: number, v: number) => {
  const t = clamp((v - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

// A stable pseudo-random generator means each cloud keeps the same shape
// throughout its lifetime instead of flickering into new shapes per frame.
function randomGenerator(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

/**
 * Soft, short-lived connected vapour patches, NOT permanent paint strokes.
 *
 * Rather than stamping equally sized circles along every pointer event,
 * we emit a sparse set of differently sized cloud clusters. Each cluster
 * has an offset body and irregular satellite lobes. Their density fields
 * merge naturally before being used to erase the foreground canvas.
 */
export function createVaporMask(reducedMotion = false): VaporMask {
  const field = document.createElement('canvas');
  const fieldCtx = field.getContext('2d', { willReadFrequently: true });
  if (!fieldCtx) throw new Error('Canvas 2D is required for the vapour mask.');

  let width = 1;
  let height = 1;
  let scale = 0.5;
  let serial = 0;
  let distanceToNext: number = ERASURE.emissionSpacing;
  let clouds: Cloud[] = [];

  const fullLifetime =
    ERASURE.vaporHoldMs + ERASURE.vaporFadeMs;

  function spawn(
    point: Point,
    now: number,
    velocity: Point = { x: 0, y: 0 }
  ) {
    serial++;
    const random = randomGenerator(serial * 7919 + 101);

    // Vary the cloud sizes and nudge their centres to either side of a
    // stroke. A single straight sweep should NOT make a flat-ended bar.
    const speed = Math.hypot(velocity.x, velocity.y);
    const normalX = speed > 1 ? -velocity.y / speed : Math.cos(random() * 6.28);
    const normalY = speed > 1 ? velocity.x / speed : Math.sin(random() * 6.28);
    const sideways = (random() - 0.5) * ERASURE.vaporRadius * 0.80;
    const along = (random() - 0.5) * ERASURE.vaporRadius * 0.22;
    const forwardX = speed > 1 ? velocity.x / speed : 0;
    const forwardY = speed > 1 ? velocity.y / speed : 0;

    const radius = ERASURE.vaporRadius * (0.72 + random() * 0.60);
    const count = 3 + Math.floor(random() * 3);
    const lobes: Lobe[] = [
      // Central mass makes the revelation visibly larger than its cursor.
      { dx: 0, dy: 0, size: 1, strength: 1 },
    ];

    // Add irregular peripheral bubbles. They merge into the main body
    // but create protrusions, not a regular round or rectangular edge.
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random() * 1.6;
      const reach = radius * (0.35 + random() * 0.62);
      lobes.push({
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach,
        size: 0.34 + random() * 0.50,
        strength: 0.55 + random() * 0.35,
      });
    }

    clouds.push({
      center: {
        x: point.x + normalX * sideways + forwardX * along,
        y: point.y + normalY * sideways + forwardY * along,
      },
      velocity: {
        x: clamp(velocity.x * 0.012, -11, 11),
        y: clamp(velocity.y * 0.008, -8, 8),
      },
      radius,
      born: now,
      seed: random() * Math.PI * 2,
      lobes,
    });

    if (clouds.length > ERASURE.maxPuffs) {
      clouds.splice(0, clouds.length - ERASURE.maxPuffs);
    }
  }

  function drawLobe(
    x: number,
    y: number,
    radius: number,
    alpha: number
  ) {
    if (radius < 1 || alpha < 0.005) return;
    const gradient = fieldCtx!.createRadialGradient(
      x, y, radius * 0.08,
      x, y, radius
    );
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(0.44, `rgba(255,255,255,${alpha * 0.90})`);
    gradient.addColorStop(0.75, `rgba(255,255,255,${alpha * 0.45})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    fieldCtx!.fillStyle = gradient;
    fieldCtx!.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawCloud(cloud: Cloud, now: number) {
    const age = Math.max(0, now - cloud.born);
    if (age >= fullLifetime) return;

    // Bloom: visible quickly; hold: stays open; fade: begins AFTER hold.
    const bloom = reducedMotion
      ? 1
      : smoothstep(0, ERASURE.vaporBloomMs, age);
    const fade = 1 - smoothstep(
      ERASURE.vaporHoldMs,
      fullLifetime,
      age
    );
    const opacity = bloom * fade;
    if (opacity < 0.003) return;

    const time = age / 1000;
    const holdProgress = clamp(age / ERASURE.vaporHoldMs, 0, 1);
    const expansion = reducedMotion
      ? 1
      : 0.82 + 0.26 * smoothstep(0, 1, holdProgress);

    const x = cloud.center.x + (reducedMotion ? 0 : cloud.velocity.x * time);
    const y = cloud.center.y + (reducedMotion ? 0 :
      cloud.velocity.y * time - ERASURE.vaporRise * age / fullLifetime);

    cloud.lobes.forEach((lobe, i) => {
      const wobble = reducedMotion ? 0 :
        Math.sin(cloud.seed + i * 2.6 + time * 1.15) * cloud.radius * 0.045;
      const lx = x + lobe.dx * expansion + wobble;
      const ly = y + lobe.dy * expansion + wobble * 0.48;
      drawLobe(
        lx,
        ly,
        cloud.radius * lobe.size * expansion,
        Math.min(1, lobe.strength * opacity)
      );
    });
  }

  return {
    resize(nextWidth, nextHeight) {
      const oldWidth = width;
      const oldHeight = height;
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);

      // Process at a limited resolution; upscale the organic edge smoothly.
      scale = Math.min(0.48, 700 / Math.max(width, height));
      field.width = Math.max(1, Math.round(width * scale));
      field.height = Math.max(1, Math.round(height * scale));
      fieldCtx!.setTransform(scale, 0, 0, scale, 0, 0);

      if (oldWidth > 1 && oldHeight > 1) {
        const sx = width / oldWidth;
        const sy = height / oldHeight;
        clouds.forEach((cloud) => {
          cloud.center.x *= sx;
          cloud.center.y *= sy;
          cloud.radius *= Math.sqrt(sx * sy);
          cloud.lobes.forEach((lobe) => {
            lobe.dx *= sx;
            lobe.dy *= sy;
          });
        });
      }
    },

    emit(point, now, velocity) {
      distanceToNext = ERASURE.emissionSpacing;
      spawn(point, now, velocity);
    },

    move(from, to, now, velocity) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.5) return;

      // Space emissions by travelled DISTANCE across multiple mouse events,
      // instead of stamping at every event (which produced rectangular bands).
      let covered = 0;
      let made = 0;
      while (covered + distanceToNext <= distance && made < 28) {
        covered += distanceToNext;
        const t = covered / distance;
        spawn(
          { x: from.x + dx * t, y: from.y + dy * t },
          now,
          velocity
        );
        distanceToNext = ERASURE.emissionSpacing * (0.74 + (serial % 5) * 0.12);
        made++;
      }
      distanceToNext -= distance - covered;
      distanceToNext = Math.max(1, distanceToNext);
    },

    composite(destination, drawWidth, drawHeight, now) {
      clouds = clouds.filter((cloud) => now - cloud.born < fullLifetime);
      if (!clouds.length) return;

      fieldCtx!.clearRect(0, 0, width, height);
      fieldCtx!.globalCompositeOperation = 'lighter';
      clouds.forEach((cloud) => drawCloud(cloud, now));
      fieldCtx!.globalCompositeOperation = 'source-over';

      // A soft density threshold joins neighbouring vapour lobes while
      // preserving more organic silhouettes than uniform stamped circles.
      const pixels = fieldCtx!.getImageData(0, 0, field.width, field.height);
      const data = pixels.data;
      for (let i = 3; i < data.length; i += 4) {
        data[i] = Math.round(
          255 * smoothstep(0.16, 0.62, data[i] / 255)
        );
      }
      fieldCtx!.putImageData(pixels, 0, 0);

      destination.save();
      destination.globalCompositeOperation = 'destination-out';
      destination.imageSmoothingEnabled = true;
      destination.drawImage(field, 0, 0, drawWidth, drawHeight);
      destination.restore();
    },

    clear() {
      clouds = [];
      serial = 0;
      distanceToNext = ERASURE.emissionSpacing;
      fieldCtx!.clearRect(0, 0, width, height);
    },
  };
}
