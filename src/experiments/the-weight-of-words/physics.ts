import {
  Bodies,
  Body,
  Composite,
  Engine,
  type Body as MatterBody,
} from 'matter-js';
import { WEIGHT_SETTINGS } from './config';
import { attachSweep } from './interactions';

const FIXED_STEP = 1000 / 60;

type Letter = {
  element: HTMLSpanElement;
  body: MatterBody;
  width: number;
  height: number;
};

export type WeightPhysics = {
  restart(): void;
  destroy(): void;
};

/** Physical rounded rectangles, with real serif glyphs rendered in HTML. */
export function createWeightPhysics(
  stage: HTMLElement,
  elements: HTMLSpanElement[],
  cursor: HTMLElement
): WeightPhysics {
  let engine = Engine.create({ enableSleeping: true });
  let letters: Letter[] = [];
  let frame = 0;
  let resizeFrame = 0;
  let previousTime = 0;
  let accumulated = 0;
  let destroyed = false;
  let previousWidth = 0;
  let previousHeight = 0;

  function draw() {
    // Cache letter sizes at spawn time, rather than reading layout
    // 48 times per frame while we write CSS transforms.
    for (const { element, body, width, height } of letters) {
      const x = body.position.x - width / 2;
      const y = body.position.y - height / 2;
      element.style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
    }
  }

  function restart() {
    if (destroyed) return;

    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width < 1 || height < 1) return;

    previousWidth = width;
    previousHeight = height;

    Composite.clear(engine.world, false);
    Engine.clear(engine);
    engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = WEIGHT_SETTINGS.gravity;
    engine.positionIterations = 8;
    engine.velocityIterations = 8;

    const wall = WEIGHT_SETTINGS.wallThickness;
    const floorY = height - WEIGHT_SETTINGS.floorInset;
    const boundaryOptions = {
      isStatic: true,
      friction: 0.95,
      restitution: 0.02,
    };

    Composite.add(engine.world, [
      Bodies.rectangle(
        width / 2, floorY + wall / 2,
        width + wall * 2, wall, boundaryOptions
      ),
      Bodies.rectangle(
        -wall / 2, height / 2,
        wall, height * 5, boundaryOptions
      ),
      Bodies.rectangle(
        width + wall / 2, height / 2,
        wall, height * 5, boundaryOptions
      ),
    ]);

    // Spread the doubled letter set across the top.
    const largestWidth = Math.max(
      25,
      ...elements.map((element) => element.offsetWidth)
    );
    const columns = Math.max(3, Math.floor(width / (largestWidth * 1.2)));
    const centerGap = width / columns;

    letters = elements.map((element, index) => {
      const elementWidth = Math.max(12, element.offsetWidth);
      const elementHeight = Math.max(14, element.offsetHeight);
      const collisionWidth = elementWidth * 0.84;
      const collisionHeight = elementHeight * 0.70;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const jitter = Math.sin(index * 19.73) * centerGap * 0.13;

      const x = Math.max(
        collisionWidth / 2 + 2,
        Math.min(
          width - collisionWidth / 2 - 2,
          (column + 0.5) * centerGap + jitter
        )
      );
      const y =
        -elementHeight * (1.1 + row * 1.22) - (index % 4) * 14;

      const body = Bodies.rectangle(x, y, collisionWidth, collisionHeight, {
        friction: WEIGHT_SETTINGS.friction,
        frictionStatic: WEIGHT_SETTINGS.frictionStatic,
        frictionAir: WEIGHT_SETTINGS.frictionAir,
        restitution: WEIGHT_SETTINGS.restitution,
        density: WEIGHT_SETTINGS.density,
        sleepThreshold: 75,
        chamfer: { radius: Math.min(7, collisionWidth * 0.1) },
      });

      Body.setAngle(body, Math.sin(index * 2.47) * 0.37);

      // Give the letters an immediate downward start.
      // They still accelerate naturally under gravity afterward.
      Body.setVelocity(body, {
        x: Math.sin(index * 3.11) * 0.25,
        y: 4.2 + (index % 3) * 0.35,
      });
      Composite.add(engine.world, body);
      element.style.opacity = '1';

      return {
        element,
        body,
        width: elementWidth,
        height: elementHeight,
      };
    });

    accumulated = 0;
    previousTime = 0;
    draw();
  }

  restart();

  const sweep = attachSweep({
    stage,
    cursor,
    getBodies: () => letters.map(({ body }) => body),
  });

  function tick(now: number) {
    if (destroyed) return;

    if (previousTime === 0) previousTime = now;
    accumulated += Math.min(now - previousTime, 50);
    previousTime = now;

    let steps = 0;
    while (accumulated >= FIXED_STEP && steps < 3) {
      // Input is applied once for every physics frame.
      // This prevents high-Hz mice from launching the letters.
      sweep.step(FIXED_STEP);
      Engine.update(engine, FIXED_STEP);
      accumulated -= FIXED_STEP;
      steps++;
    }

    draw();
    frame = requestAnimationFrame(tick);
  }

  const observer = new ResizeObserver(() => {
    const changed =
      Math.abs(stage.clientWidth - previousWidth) > 2 ||
      Math.abs(stage.clientHeight - previousHeight) > 2;
    if (!changed) return;

    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(restart);
  });

  observer.observe(stage);
  frame = requestAnimationFrame(tick);

  return {
    restart,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      sweep.destroy();
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      for (const element of elements) element.style.opacity = '0';
    },
  };
}
