/** Relative luminance of a #rrggbb colour (WCAG). */
export function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.2;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

const INK = '#101114';
const WHITE = '#ffffff';

/**
 * Text colour for content placed on a solid colour field (team colours, accent):
 * whichever of ink / white has the higher contrast ratio.
 */
export function onColor(hex: string) {
  const l = luminance(hex);
  const vsWhite = 1.05 / (l + 0.05);
  const vsInk = (l + 0.05) / (luminance(INK) + 0.05);
  return vsInk >= vsWhite ? INK : WHITE;
}
