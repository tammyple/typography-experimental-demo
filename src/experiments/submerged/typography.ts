import { SUBMERGED } from './config';

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
    ctx.font = `${weight} ${fontSize}px "Bodoni Moda", Georgia, serif`;
    const measured = Math.max(1, ctx.measureText(word).width);
    const scale = Math.min(1.05, (w * 0.86) / measured);
    ctx.translate(w / 2, h * positions[index]);
    ctx.scale(scale, 1);
    ctx.fillStyle = SUBMERGED.ink;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  });

  // Small technical annotations provide another typographic scale.
  ctx.save();
  const side = Math.max(16, Math.min(34, w * 0.035));
  const bottom = h - Math.max(20, Math.min(34, h * 0.05));
  ctx.fillStyle = SUBMERGED.accent;
  ctx.font = `500 10px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (w >= 520) {
    ctx.fillText('A STUDY OF REFRACTION', side, 32);
    ctx.fillText('WHAT YOU SEE IS NOT WHAT STAYS', side, bottom);
    ctx.textAlign = 'right';
    ctx.fillText('005 / SUBMERGED', w - side, 32);
    ctx.fillText('MOVE THE SURFACE', w - side, bottom);
  }
  ctx.restore();
}
