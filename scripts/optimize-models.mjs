/**
 * Compresses every GLB in models-src/cars/ into public/models/cars/ (meshopt geometry,
 * WebP textures). Geometry is not simplified (the low-poly shapes are already minimal) and
 * materials are not merged into a palette (liveries are applied per material at runtime).
 * Usage: npm run models:optimize
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'models-src/cars';
const OUT = 'public/models/cars';
const LIMIT = 3 * 1024 * 1024;
const cli = join('node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.glb'))) {
  const input = join(SRC, file), output = join(OUT, file);
  // --palette false keeps the separate materials the app recolours per team
  execFileSync(process.execPath, [cli, 'optimize', input, output, '--compress', 'meshopt', '--texture-compress', 'webp', '--simplify', 'false', '--palette', 'false'], { stdio: 'inherit' });
  const before = statSync(input).size, after = statSync(output).size;
  console.log(`${file}: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB${after > LIMIT ? '  ⚠ over 3 MB' : ''}`);
}
copyFileSync(join(SRC, 'CREDITS.md'), join(OUT, 'CREDITS.md'));
