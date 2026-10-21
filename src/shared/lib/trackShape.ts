/**
 * Normalises a circuit outline so every drawing looks consistent:
 * the longest (principal) axis is horizontal and the start/finish sits in the lower half.
 * Returns a projector into an SVG box of width `width` that hugs the shape.
 */
export function fitShape(points: ArrayLike<number>[] | [number, number][], width = 100, pad = 4) {
  const n = points.length;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += points[i][0]; cy += points[i][1]; }
  cx /= n; cy /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = points[i][0] - cx, dy = points[i][1] - cy;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let cos = Math.cos(-angle), sin = Math.sin(-angle);
  const rot = (x: number, y: number) => [(x - cx) * cos - (y - cy) * sin, (x - cx) * sin + (y - cy) * cos];
  // start/finish at the bottom (data is north-up: negative y = lower)
  if (rot(points[0][0], points[0][1])[1] > 0) { cos = -cos; sin = -sin; }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const [x, y] = rot(points[i][0], points[i][1]);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const scale = (width - pad * 2) / (maxX - minX);
  const height = (maxY - minY) * scale + pad * 2;
  const project = (x: number, y: number): [number, number] => {
    const [rx, ry] = rot(x, y);
    return [pad + (rx - minX) * scale, pad + (maxY - ry) * scale];
  };
  return { project, width, height, viewBox: `0 0 ${width} ${height.toFixed(2)}` };
}

export function shapePath(points: [number, number][], project: (x: number, y: number) => [number, number], close = true) {
  return (
    points
      .map(([x, y], i) => {
        const [px, py] = project(x, y);
        return `${i ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)}`;
      })
      .join(' ') + (close ? ' Z' : '')
  );
}
