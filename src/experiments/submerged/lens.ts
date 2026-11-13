import { SUBMERGED } from './config';
import { drawTypography } from './typography';

export type SubmergedLens = {
  resize(): void;
  move(clientX: number, clientY: number): void;
  leave(): void;
  pulse(clientX: number, clientY: number): void;
  destroy(): void;
  readonly supported: boolean;
};

// The shader remaps coordinates of a typography texture. This distorts the actual
// letterforms, rather than just painting a translucent circle over them.
const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec2 u_pulse_center;
uniform float u_time;
uniform float u_presence;
uniform float u_energy;
uniform float u_pulse_age;
uniform float u_lens_radius;
uniform float u_distortion;
uniform float u_ripple_speed;

float saturate(float v) { return clamp(v, 0.0, 1.0); }

void main() {
  vec2 delta = (v_uv - u_mouse) * u_resolution;
  float distancePx = length(delta);
  float angle = atan(delta.y, delta.x);
  vec2 dir = delta / max(distancePx, 0.001);
  vec2 tangent = vec2(-dir.y, dir.x);

  // The glass stays broadly circular while its edge undulates slightly.
  float edgeWave = 1.0 + 0.035 * sin(angle * 7.0 + u_time * 0.7)
                       + 0.023 * sin(angle * 11.0 - u_time * 1.1);
  float radius = u_lens_radius * edgeWave;
  float lens = (1.0 - smoothstep(radius * 0.9, radius * 1.045, distancePx)) * u_presence;
  float interior = (1.0 - smoothstep(0.0, radius, distancePx)) * u_presence;

  // Radial waves and a tangential current bend each letter in two directions.
  float waveA = sin(distancePx * 0.064 - u_time * u_ripple_speed + angle * 1.7);
  float waveB = sin(delta.x * 0.032 + delta.y * 0.023 + u_time * 2.3);
  float waveC = cos(distancePx * 0.035 + angle * 5.0 - u_time * 1.55);
  vec2 bendPx = (dir * (12.0 * waveA + 8.0 * waveB)
                + tangent * (10.5 * waveC)
                + vec2(waveB, waveA) * 6.5)
                * (0.60 + 0.4 * u_energy)
                * u_distortion
                * pow(interior, 0.85);

  // Glass makes the central type slightly larger, like a water-filled lens.
  vec2 magnified = u_mouse + (v_uv - u_mouse) * (1.0 - 0.17 * interior);
  vec2 distorted = magnified + bendPx / u_resolution;
  vec2 sampleUv = mix(v_uv, distorted, lens);

  // Click/tap generates a short, spreading circular wave.
  float pulseVisibility = 1.0 - smoothstep(0.1, 1.45, u_pulse_age);
  vec2 pulseDelta = (v_uv - u_pulse_center) * u_resolution;
  float pulseDistance = length(pulseDelta);
  float pulseRadius = u_pulse_age * 280.0;
  float pulseBand = exp(-pow((pulseDistance - pulseRadius) / 21.0, 2.0));
  vec2 pulseDir = pulseDelta / max(pulseDistance, 1.0);
  sampleUv += pulseDir * pulseBand * pulseVisibility * 11.0 / u_resolution;
  sampleUv = clamp(sampleUv, vec2(0.002), vec2(0.998));

  // A restrained blue-grey refraction fringe catches the light at the edge.
  float rim = smoothstep(radius * 0.79, radius * 0.96, distancePx)
             * (1.0 - smoothstep(radius * 0.975, radius * 1.07, distancePx))
             * u_presence;
  vec2 chroma = dir * (rim * 2.0) / u_resolution;
  vec3 color;
  color.r = texture2D(u_texture, clamp(sampleUv + chroma, 0.001, 0.999)).r;
  color.g = texture2D(u_texture, sampleUv).g;
  color.b = texture2D(u_texture, clamp(sampleUv - chroma, 0.001, 0.999)).b;
  color = mix(color, vec3(0.81, 0.86, 0.85), interior * 0.085);

  float highlight = pow(max(0.0, dot(dir, normalize(vec2(-0.65, 0.76)))), 7.0);
  color += vec3(0.095, 0.12, 0.12) * rim * highlight;
  color -= vec3(0.12, 0.13, 0.13) * rim * (1.0 - highlight) * 0.7;

  // Moving caustics: faint enough not to overwhelm the black typography.
  float caustic = sin(delta.x * 0.049 + u_time * 1.1)
                  * sin(delta.y * 0.057 - u_time * 1.4);
  color += vec3(0.025, 0.04, 0.045) * caustic * interior;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind);
  if (!shader) throw new Error('Unable to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Shader compile error';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export function createSubmergedLens(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  onSupportChange?: (supported: boolean) => void
): SubmergedLens {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    premultipliedAlpha: false,
  });

  const textureCanvas = document.createElement('canvas');
  const textureCtx = textureCanvas.getContext('2d');
  if (!textureCtx) throw new Error('2D Canvas is not supported');

  let width = 1;
  let height = 1;
  let dpr = 1;
  let raf = 0;
  let destroyed = false;
  let visible = true;
  let active = false;
  let present = 0;
  let motion = 0;
  let lastFrame = 0;
  let pulseStart = -10000;
  let pulseAt = { x: 0.5, y: 0.5 };
  let mouse = { x: 0.5, y: 0.5 };
  let target = { x: 0.5, y: 0.5 };
  let lastPointer = { x: 0.5, y: 0.5 };

  // A static Canvas 2D fallback is always available if WebGL is disabled.
  let fallbackContext: CanvasRenderingContext2D | null = null;
  if (!gl) {
    fallbackContext = canvas.getContext('2d');
    onSupportChange?.(false);
  }

  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let position = -1;
  const uniforms: Record<string, WebGLUniformLocation | null> = {};

  if (gl) {
    try {
      const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX);
      const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      program = gl.createProgram();
      if (!program) throw new Error('Unable to link WebGL program');
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'WebGL link failure');
      }
      gl.useProgram(program);
      position = gl.getAttribLocation(program, 'a_position');
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
      ]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      for (const key of [
        'u_texture', 'u_resolution', 'u_mouse', 'u_pulse_center',
        'u_time', 'u_presence', 'u_energy', 'u_pulse_age',
        'u_lens_radius', 'u_distortion', 'u_ripple_speed',
      ]) {
        uniforms[key] = gl.getUniformLocation(program, key);
      }
      gl.uniform1i(uniforms.u_texture, 0);
    } catch (error) {
      // A transparent error is better than silently showing a broken lens.
      console.error('Submerged shader error:', error);
      onSupportChange?.(false);
    }
  }

  function updateTexture() {
    const pxW = Math.max(1, Math.round(width * dpr));
    const pxH = Math.max(1, Math.round(height * dpr));
    textureCanvas.width = pxW;
    textureCanvas.height = pxH;
    drawTypography(textureCtx!, width, height, dpr);
    if (gl && program && texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    } else if (fallbackContext) {
      fallbackContext.setTransform(1, 0, 0, 1, 0, 0);
      fallbackContext.drawImage(textureCanvas, 0, 0, canvas.width, canvas.height);
    }
  }

  function resize() {
    if (destroyed) return;
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (width === w && height === h && dpr === ratio) return;
    width = w;
    height = h;
    dpr = ratio;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    updateTexture();
  }

  function point(clientX: number, clientY: number) {
    const rect = stage.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1))),
      y: Math.max(0, Math.min(1, 1 - (clientY - rect.top) / Math.max(rect.height, 1))),
    };
  }

  function move(clientX: number, clientY: number) {
    const next = point(clientX, clientY);
    const distance = Math.hypot(
      (next.x - lastPointer.x) * width,
      (next.y - lastPointer.y) * height
    );
    lastPointer = next;
    target = next;
    active = true;
    motion = Math.min(1.7, Math.max(motion, distance / 30));
  }

  function leave() { active = false; }

  function pulse(clientX: number, clientY: number) {
    move(clientX, clientY);
    pulseAt = point(clientX, clientY);
    pulseStart = performance.now();
  }

  function frame(timestamp: number) {
    if (destroyed) return;
    const dt = Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    const easing = 1 - Math.exp(-22 * dt);
    mouse.x += (target.x - mouse.x) * easing;
    mouse.y += (target.y - mouse.y) * easing;
    present += ((active ? 1 : 0) - present) * (1 - Math.exp(-8 * dt));
    motion *= Math.exp(-2.2 * dt);

    if (gl && program && visible) {
      gl.useProgram(program);
      gl.uniform2f(uniforms.u_resolution, width, height);
      gl.uniform2f(uniforms.u_mouse, mouse.x, mouse.y);
      gl.uniform2f(uniforms.u_pulse_center, pulseAt.x, pulseAt.y);
      gl.uniform1f(uniforms.u_time, timestamp * 0.001);
      gl.uniform1f(uniforms.u_presence, present);
      gl.uniform1f(uniforms.u_energy, motion);
      gl.uniform1f(uniforms.u_pulse_age, Math.max(0, (timestamp - pulseStart) / 1000));
      gl.uniform1f(uniforms.u_lens_radius, Math.min(SUBMERGED.maxLensRadius, Math.max(110, Math.min(width, height) * SUBMERGED.lensScale)));
      gl.uniform1f(uniforms.u_distortion, SUBMERGED.distortion);
      gl.uniform1f(uniforms.u_ripple_speed, SUBMERGED.rippleSpeed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    raf = requestAnimationFrame(frame);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }, { rootMargin: '100px' });
  visibilityObserver.observe(stage);

  resize();
  if (gl && program) raf = requestAnimationFrame(frame);
  let fontReady = true;
  document.fonts.ready.then(() => { if (fontReady && !destroyed) updateTexture(); });

  return {
    resize,
    move,
    leave,
    pulse,
    supported: Boolean(gl && program),
    destroy() {
      destroyed = true;
      fontReady = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
    },
  };
}
