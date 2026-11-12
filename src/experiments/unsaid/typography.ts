import { ERASURE } from './config';

/** Paint the opaque foreground, including continuously moving type rows. */
export function paintForeground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSeconds: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = ERASURE.background;
  ctx.fillRect(0, 0, width, height);

  const size = Math.max(12, Math.min(21, width * 0.015));
  const rowHeight = Math.max(35, size * 2.45);
  const rows = Math.ceil(height / rowHeight) + 1;

  ctx.font = `600 ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ERASURE.ink;

  const fragment = `${ERASURE.repeatedText}   /   `;
  const fragmentWidth = Math.max(1, ctx.measureText(fragment).width);

  for (let row = 0; row < rows; row += 1) {
    const y = row * rowHeight + rowHeight / 2;
    const direction = row % 2 === 0 ? -1 : 1;
    const displacement = direction * timeSeconds * ERASURE.marqueeSpeed;

    // Every second row begins at a different point in the phrase.
    const shift = ((displacement + row * 53) % fragmentWidth + fragmentWidth) % fragmentWidth;
    let x = shift - fragmentWidth;

    while (x < width + fragmentWidth) {
      ctx.fillText(fragment, x, y);
      x += fragmentWidth;
    }

    ctx.strokeStyle = 'rgba(23, 23, 23, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, (row + 1) * rowHeight - 0.5);
    ctx.lineTo(width, (row + 1) * rowHeight - 0.5);
    ctx.stroke();
  }
}
