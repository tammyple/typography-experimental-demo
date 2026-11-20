import { SUBMERGED } from './config';

let headingFontStack: string | undefined;
function getHeadingFontStack(): string {
  if (headingFontStack === undefined) {
    headingFontStack = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-heading').trim() || '"Arial Narrow", sans-serif';
  }
  return headingFontStack;
}


/** Paint a sharp, static typography texture once on resize/font load. The lens bends this image on the GPU. */
export function drawTypography(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number
) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = SUBMERGED.background;
  ctx.fillRect(0, 0, w, h);

  // Subtle contour lines make the bending of the water visible even between glyphs.
  ctx.save();
  ctx.strokeStyle = '#d1d1ca';
  ctx.lineWidth = 0.8;
  for (let i = -2; i < 13; i++) {
    const y = (i / 11) * h;
    ctx.beginPath();
    for (let x = -15; x <= w + 20; x += 5) {
      const wave = Math.sin(x * 0.014 + i * 0.64) * 7;
      if (x === -15) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();

  // The oversized headline is the main surface for refraction.
  const rows = SUBMERGED.headline;
  const fontSize = Math.min(230, Math.max(44, h * 0.286));
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const positions = [0.265, 0.51, 0.755];
  rows.forEach((word, index) => {
    ctx.save();
    const weight = index === 1 ? 400 : 600;
    ctx.font = `${weight} ${fontSize}px ${getHeadingFontStack()}`;
    const measured = Math.max(1, ctx.measureText(word).width);
    const scale = Math.min(1.05, (w * 0.86) / measured);
    ctx.translate(w / 2, h * positions[index]);
    ctx.scale(scale, 1);
    ctx.fillStyle = SUBMERGED.ink;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  });
}
