import * as THREE from 'three';

/** Small procedural textures — no image files to download. */
function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function finish(c: HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean; nearest?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.nearest) t.magFilter = t.minFilter = THREE.NearestFilter;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Worn night asphalt: speckle, a darker rubbered line down the middle, lighter dust at the edges. u across, v along. */
export function asphaltTexture() {
  const W = 256, H = 1024;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#3a3d44';
  g.fillRect(0, 0, W, H);
  // rubber: two darker bands where the cars run, the middle a little lighter
  for (const [x0, x1, a] of [[0.18, 0.42, 0.28], [0.58, 0.82, 0.28]] as const) {
    const gr = g.createLinearGradient(x0 * W, 0, x1 * W, 0);
    gr.addColorStop(0, 'rgba(10,11,14,0)');
    gr.addColorStop(0.5, `rgba(10,11,14,${a})`);
    gr.addColorStop(1, 'rgba(10,11,14,0)');
    g.fillStyle = gr;
    g.fillRect(x0 * W, 0, (x1 - x0) * W, H);
  }
  // patches: slightly different tarmac pours along the length
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(${i % 2 ? '255,255,255' : '0,0,0'},${0.025 + Math.random() * 0.03})`;
    g.fillRect(Math.random() * W * 0.5, Math.random() * H, W * (0.3 + Math.random() * 0.7), 18 + Math.random() * 90);
  }
  // aggregate speckle
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return finish(c);
}

/** Red / white kerb stripes along v. */
export function kerbTexture() {
  const { c, g } = canvas(4, 2);
  g.fillStyle = '#d4272b';
  g.fillRect(0, 0, 4, 1);
  g.fillStyle = '#ececec';
  g.fillRect(0, 1, 4, 1);
  return finish(c, { nearest: true });
}

/** Catch-fence mesh as an alpha map: bright wires on black. */
export function fenceTexture() {
  const { c, g } = canvas(64, 64);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#fff';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(64, 64);
  g.moveTo(64, 0); g.lineTo(0, 64);
  g.moveTo(-32, 32); g.lineTo(32, 96);
  g.moveTo(32, -32); g.lineTo(96, 32);
  g.moveTo(32, 96); g.lineTo(96, 32);
  g.moveTo(-32, 32); g.lineTo(32, -32);
  g.stroke();
  return finish(c, { srgb: false });
}

/** Soft round light pool (white → transparent). */
export function poolTexture() {
  const { c, g } = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,236,200,1)');
  gr.addColorStop(0.35, 'rgba(255,214,150,0.45)');
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return finish(c, { repeat: false });
}

/** Chequered start line. */
export function checkerTexture() {
  const { c, g } = canvas(16, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) {
    g.fillStyle = (x + y) % 2 ? '#101114' : '#f2f2f2';
    g.fillRect(x, y, 1, 1);
  }
  return finish(c, { nearest: true, repeat: false });
}

/**
 * Facade tile, 8 x 8 windows: the base colour (dark glass and concrete) and the emissive mask (the
 * lit windows). Two canvases drawn together so a lit window is a lit window in both.
 */
export function facadeTextures() {
  const N = 8, C = 32; // cells, pixels per cell
  const base = canvas(N * C, N * C), glow = canvas(N * C, N * C);
  base.g.fillStyle = '#1b1f2a';
  base.g.fillRect(0, 0, N * C, N * C);
  glow.g.fillStyle = '#000';
  glow.g.fillRect(0, 0, N * C, N * C);
  const lit = ['#ffcf8a', '#ffd9a0', '#ffe3b8', '#ffc27a', '#f2f0e6', '#ffd9a0', '#ffb36b', '#bcd8ff'];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x * C, py = y * C;
    // frame between windows
    base.g.fillStyle = '#12151d';
    base.g.fillRect(px, py, C, C);
    // the pane
    const on = Math.random() < 0.34;
    base.g.fillStyle = on ? '#3a3f4d' : '#222733';
    base.g.fillRect(px + 6, py + 5, C - 12, C - 12);
    if (on) {
      glow.g.fillStyle = lit[Math.floor(Math.random() * lit.length)];
      glow.g.globalAlpha = 0.35 + Math.random() * 0.5;
      glow.g.fillRect(px + 6, py + 5, C - 12, C - 12);
      glow.g.globalAlpha = 1;
    }
  }
  return { map: finish(base.c), emissive: finish(glow.c) };
}

/** Sphere skin: horizontal bands of saturated light. */
export function sphereTexture() {
  const { c, g } = canvas(256, 128);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#ff2d95');
  gr.addColorStop(0.35, '#8a4dff');
  gr.addColorStop(0.7, '#19b8ff');
  gr.addColorStop(1, '#19e6c8');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 256, 1);
  return finish(c);
}
