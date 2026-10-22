import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Compass, Mountain } from 'lucide-react';
import { CIRCUITS } from '../../shared/data/circuits';
import { ELEVATION_RANGE, elevationProfile, isHilly } from '../../shared/data/elevation';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { useTheme } from '../../app/providers/ThemeProvider';
import { cn } from '../../shared/lib/utils';
import { findCorners, getProLap, sampleAt, type LapModel } from '../lap-simulator/lapModel';
import { carIndex, type CarState, type TimingState } from './timingModel';

const W = 1000;
const H = 620;
const PAD = 56;
const TILT_3D = 0.9; // radians from top-down
const YAW_3D = -0.6; // look along the track diagonally, like a 3D map flyover

/** Apple-Maps-like palettes. */
const PALETTE = {
  light: {
    grass: '#d4ebc1', sky: ['#e4edf5', '#f6f8fa'], ground: '#cde6b8', groundEdge: '#b5d39d', wall: '#93ae78', grid: 'rgba(40,80,30,0.08)',
    runoff: '#ece6d6', edge: '#ffffff', asphalt: '#4b4f57', label: '#ffffff', labelText: '#2a2d33', labelIcon: '#6b6f78', shadow: 'rgba(30,50,20,0.35)',
  },
  dark: {
    grass: '#18241d', sky: ['#07090c', '#11161b'], ground: '#1b2a21', groundEdge: '#2a3d31', wall: '#3b5a45', grid: 'rgba(255,255,255,0.04)',
    runoff: '#252b28', edge: '#6a7079', asphalt: '#2f333a', label: '#2a2e35', labelText: '#e8e9ec', labelIcon: '#9aa0aa', shadow: 'rgba(0,0,0,0.6)',
  },
};

interface Geo {
  lap: LapModel;
  px: Float32Array; // principal frame, metres
  py: Float32Array;
  z: Float32Array; // exaggerated height, metres
  idx: number[]; // downsampled indices for drawing
  toLocal: (x: number, y: number) => [number, number];
  ground: [number, number, number, number];
  extent: number;
  corners: { number: number; apex: number; dir: 'L' | 'R'; out: number }[];
}

function buildGeo(circuitId: string, lapTime: number): Geo | null {
  const c = CIRCUITS[circuitId];
  if (!c) return null;
  const lap = getProLap(c.points, lapTime, c.length);
  const { n, cx, cy } = lap;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += cx[i]; my += cy[i]; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = cx[i] - mx, dy = cy[i] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let cos = Math.cos(-angle), sin = Math.sin(-angle);
  // start/finish in the lower half, like every other outline on the site
  if ((cx[0] - mx) * sin + (cy[0] - my) * cos > 0) { cos = -cos; sin = -sin; }
  const toLocal = (x: number, y: number): [number, number] => [(x - mx) * cos - (y - my) * sin, (x - mx) * sin + (y - my) * cos];

  const px = new Float32Array(n), py = new Float32Array(n);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    [px[i], py[i]] = toLocal(cx[i], cy[i]);
    x0 = Math.min(x0, px[i]); x1 = Math.max(x1, px[i]);
    y0 = Math.min(y0, py[i]); y1 = Math.max(y1, py[i]);
  }
  const extent = Math.max(x1 - x0, y1 - y0);

  // exaggerate the hills so 30–100 m reads on a 3–7 km model, keep flat tracks flat
  const range = ELEVATION_RANGE[circuitId] ?? 5;
  const exag = Math.min(6, (0.09 * extent) / Math.max(range, 8));
  const slab = 0.012 * extent;
  const raw = elevationProfile(circuitId, n);
  const z = new Float32Array(n);
  for (let i = 0; i < n; i++) z[i] = raw[i] * exag + slab;

  const step = Math.max(1, Math.round(n / 700));
  const idx: number[] = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  idx.push(0);

  const margin = 0.45 * extent;
  const corners = findCorners(lap).map((k) => ({ number: k.number, apex: k.apex, dir: k.dir, out: k.dir === 'L' ? -1 : 1 }));
  return { lap, px, py, z, idx, toLocal, ground: [x0 - margin, y0 - margin, x1 + margin, y1 + margin], extent, corners };
}

/** Eases a number towards its target on rAF — used for the camera. */
function useEased(target: number, rate = 0.14) {
  const [value, setValue] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const d = target - cur.current;
      if (Math.abs(d) < 1e-3) {
        cur.current = target;
        setValue(target);
        return;
      }
      cur.current += d * rate;
      setValue(cur.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, rate]);
  return value;
}

type Projector = (x: number, y: number, z: number) => [number, number, number];

function makeProjector(geo: Geo, yaw: number, tilt: number): Projector {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
  const dist = geo.extent * 1.7; // camera distance — mild perspective, stronger as it tilts
  const raw = (x: number, y: number, z: number): [number, number, number] => {
    const rx = x * cy - y * sy;
    const ry = x * sy + y * cy;
    const p = dist / (dist + ry * st);
    return [rx * p, (-ry * ct - z * st) * p, ry]; // [screen x, screen y, depth (bigger = farther)]
  };
  // fit the track into the view box; the ground runs on past the edges
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const eat = ([sx, sy2]: [number, number, number]) => {
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
    y0 = Math.min(y0, sy2); y1 = Math.max(y1, sy2);
  };
  for (const i of geo.idx) {
    eat(raw(geo.px[i], geo.py[i], geo.z[i]));
    eat(raw(geo.px[i], geo.py[i], 0));
  }
  const s = Math.min((W - PAD * 2) / (x1 - x0), (H - PAD * 2) / (y1 - y0));
  const ox = W / 2 - ((x0 + x1) / 2) * s;
  const oy = H / 2 - ((y0 + y1) / 2) * s;
  return (x, y, z) => {
    const [sx, sy2, d] = raw(x, y, z);
    return [ox + sx * s, oy + sy2 * s, d];
  };
}

const luminance = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
};

interface Props {
  circuitId: string;
  lapTime: number;
  timing: TimingState;
  selected: string | null;
  hovered: string | null;
  onSelect: (code: string | null) => void;
  onHover: (code: string | null) => void;
}

export function TrackMap({ circuitId, lapTime, timing, selected, hovered, onSelect, onHover }: Props) {
  const { theme } = useTheme();
  const pal = PALETTE[theme];
  const geo = useMemo(() => buildGeo(circuitId, lapTime), [circuitId, lapTime]);
  const hilly = isHilly(circuitId);
  const [mode, setMode] = useState<'2d' | '3d'>(hilly ? '3d' : '2d');
  const [yawTarget, setYawTarget] = useState(hilly ? YAW_3D : 0);
  const [tiltTarget, setTiltTarget] = useState(hilly ? TILT_3D : 0);
  const yaw = useEased(yawTarget);
  const tilt = useEased(tiltTarget, 0.1);
  const drag = useRef<{ x: number; y: number; yaw: number; tilt: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const setView = (m: '2d' | '3d') => {
    setMode(m);
    setTiltTarget(m === '3d' ? TILT_3D : 0);
    setYawTarget(m === '3d' ? YAW_3D : 0);
  };

  const proj = useMemo(() => (geo ? makeProjector(geo, yaw, tilt) : null), [geo, yaw, tilt]);
  const k3 = Math.min(1, tilt / TILT_3D); // 0 = flat map, 1 = full 3D

  const scene = useMemo(() => {
    if (!geo || !proj) return null;
    const { px, py, z, idx } = geo;
    const pts = idx.map((i) => proj(px[i], py[i], z[i]));
    const m = pts.length - 1; // last point repeats the first (closed loop)
    const shadow = idx.map((i, j) => {
      const [x, y] = proj(px[i], py[i], 0);
      return `${j ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    // The track is drawn in short chunks, far → near (painter's order): each chunk is its
    // "curtain" down to the ground plus its own piece of ribbon, so a nearer, higher part of
    // the lap correctly hides whatever lies behind it. Chunks overlap by one point and use
    // butt caps, so the joins are seamless.
    const CHUNK = 6;
    const at = (j: number) => pts[((j % m) + m) % m];
    const chunks: { ribbon: string; walls: { d: string; shade: number }[]; depth: number }[] = [];
    for (let s = 0; s < m; s += CHUNK) {
      const e = Math.min(m, s + CHUNK);
      let ribbon = '';
      for (let j = s - 1; j <= e + 1; j++) {
        const [x, y] = at(j);
        ribbon += `${j === s - 1 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      const walls: { d: string; shade: number }[] = [];
      let depth = 0;
      for (let j = s; j < e; j++) {
        const ta = pts[j], tb = pts[j + 1];
        depth += (ta[2] + tb[2]) / 2;
        if (tilt <= 0.02) continue;
        // vertical "curtains" from the ground up to the track — this is what sells the elevation
        const ga = proj(px[idx[j]], py[idx[j]], 0), gb = proj(px[idx[j + 1]], py[idx[j + 1]], 0);
        // light from the upper left; shade by which way the wall faces on screen
        const dx = tb[0] - ta[0], dy = tb[1] - ta[1];
        const len = Math.hypot(dx, dy) || 1;
        walls.push({
          d: `M${ta[0].toFixed(1)} ${ta[1].toFixed(1)}L${tb[0].toFixed(1)} ${tb[1].toFixed(1)}L${gb[0].toFixed(1)} ${gb[1].toFixed(1)}L${ga[0].toFixed(1)} ${ga[1].toFixed(1)}Z`,
          shade: 0.5 + 0.5 * Math.abs((dy * 0.6 + dx * 0.8) / len),
        });
      }
      chunks.push({ ribbon, walls, depth: depth / (e - s) });
    }
    if (tilt > 0.02) chunks.sort((p, q) => q.depth - p.depth);

    const [gx0, gy0, gx1, gy1] = geo.ground;
    const groundPoly = [[gx0, gy0], [gx1, gy0], [gx1, gy1], [gx0, gy1]].map(([x, y]) => proj(x, y, 0).slice(0, 2).join(',')).join(' ');
    const grid: string[] = [];
    const cell = Math.max(150, Math.round(geo.extent / 12 / 50) * 50);
    for (let x = Math.ceil(gx0 / cell) * cell; x < gx1; x += cell) {
      const [a, b] = [proj(x, gy0, 0), proj(x, gy1, 0)];
      grid.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }
    for (let y = Math.ceil(gy0 / cell) * cell; y < gy1; y += cell) {
      const [a, b] = [proj(gx0, y, 0), proj(gx1, y, 0)];
      grid.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }

    // start / finish: a short line across the track on screen
    const s0 = pts[0], s1 = pts[1];
    const sl = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1;
    const nx = -(s1[1] - s0[1]) / sl, ny = (s1[0] - s0[0]) / sl;
    const start = { x1: s0[0] - nx * 9, y1: s0[1] - ny * 9, x2: s0[0] + nx * 9, y2: s0[1] + ny * 9 };

    // turn labels sit just outside each apex
    const lap = geo.lap;
    // close corners would stack their pills: push a clashing label further out, else drop it
    const placed: { x: number; y: number }[] = [];
    const clashes = (x: number, y: number) => placed.some((p) => Math.abs(p.x - x) < 44 && Math.abs(p.y - y) < 20);
    const turns = geo.corners.flatMap((k) => {
      const i = k.apex;
      const [ax, ay] = geo.toLocal(lap.cx[i], lap.cy[i]);
      const [ox, oy] = geo.toLocal(lap.cx[i] + lap.nx[i] * k.out * 10, lap.cy[i] + lap.ny[i] * k.out * 10);
      const a = proj(ax, ay, z[i]);
      const o = proj(ox, oy, z[i]);
      const l = Math.hypot(o[0] - a[0], o[1] - a[1]) || 1;
      for (const dist of [26, 44]) {
        const x = a[0] + ((o[0] - a[0]) / l) * dist, y = a[1] + ((o[1] - a[1]) / l) * dist;
        if (!clashes(x, y)) {
          placed.push({ x, y });
          return [{ ...k, x, y }];
        }
      }
      return [];
    });

    return { shadow, chunks, groundPoly, grid: grid.join(''), start, turns };
  }, [geo, proj, tilt]);

  if (!geo || !proj || !scene) return null;

  const cars = timing.cars
    .map((car) => {
      const fi = carIndex(geo.lap, car);
      const s = sampleAt(geo.lap, fi, 0);
      const i0 = Math.floor(fi) % geo.lap.n;
      const [lx, ly] = geo.toLocal(s.x, s.y);
      const [x, y, depth] = proj(lx, ly, geo.z[i0]);
      return { car, x, y, depth, color: TEAM_BY_ID[DRIVER_BY_CODE[car.code].teamId].color };
    })
    .sort((a, b) => b.depth - a.depth || b.car.position - a.car.position);

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, yaw: yawTarget, tilt: tiltTarget, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) {
      d.moved = true;
      setDragging(true);
    }
    if (!d.moved) return;
    setYawTarget(d.yaw + dx * 0.006);
    if (mode === '3d') setTiltTarget(Math.max(0.35, Math.min(1.15, d.tilt - dy * 0.004)));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  const showTag = (c: CarState) => c.position <= 3 || c.code === selected || c.code === hovered;

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ background: pal.grass }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          <linearGradient id="map-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={pal.sky[0]} />
            <stop offset="1" stopColor={pal.sky[1]} />
          </linearGradient>
          <filter id="map-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="map-drop" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.35" />
          </filter>
        </defs>

        <rect width={W} height={H} fill={pal.grass} />
        <rect width={W} height={H} fill="url(#map-sky)" opacity={k3} />
        <polygon points={scene.groundPoly} fill={pal.ground} stroke={pal.groundEdge} strokeWidth={2} strokeLinejoin="round" />
        <path d={scene.grid} stroke={pal.grid} strokeWidth={1} fill="none" />

        {k3 > 0.02 && <path d={scene.shadow} stroke={pal.shadow} strokeWidth={16} fill="none" strokeLinejoin="round" filter="url(#map-blur)" opacity={k3} />}
        {scene.chunks.map((c, i) => (
          <g key={i}>
            {c.walls.map((w, k) => (
              <g key={k} opacity={Math.min(1, k3 * 1.5)}>
                <path d={w.d} fill={pal.wall} stroke={pal.wall} strokeWidth={0.6} strokeLinejoin="round" />
                <path d={w.d} fill="#000" opacity={(1 - w.shade) * 0.55} />
              </g>
            ))}
            <path d={c.ribbon} stroke={pal.runoff} strokeWidth={22} fill="none" strokeLinejoin="round" />
            <path d={c.ribbon} stroke={pal.edge} strokeWidth={13} fill="none" strokeLinejoin="round" />
            <path d={c.ribbon} stroke={pal.asphalt} strokeWidth={9.5} fill="none" strokeLinejoin="round" />
          </g>
        ))}

        <line {...scene.start} stroke="#fff" strokeWidth={4} />
        <line {...scene.start} stroke="#111" strokeWidth={4} strokeDasharray="2.25 2.25" />

        {scene.turns.map((t) => (
          <g key={t.number} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`} filter="url(#map-drop)" className="pointer-events-none">
            <rect x={-19} y={-9} width={t.number >= 10 ? 42 : 36} height={18} rx={9} fill={pal.label} />
            <circle cx={-10} cy={0} r={6.5} fill={pal.labelIcon} />
            <path d={t.dir === 'R' ? 'M-12.5 3V-0.5H-7.5M-9 -2L-7.5 -0.5L-9 1' : 'M-7.5 3V-0.5H-12.5M-11 -2L-12.5 -0.5L-11 1'} stroke="#fff" strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x={-1} y={4} fontSize={11} fontWeight={700} fill={pal.labelText} fontFamily="var(--font-sport)">
              T{t.number}
            </text>
          </g>
        ))}

        {cars.map(({ car, x, y, color }) => {
          const active = car.code === selected || car.code === hovered;
          const dark = luminance(color) > 0.6;
          return (
            <g
              key={car.code}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
              opacity={car.inPit ? 0.55 : 1}
              className="cursor-pointer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect(car.code === selected ? null : car.code)}
              onMouseEnter={() => onHover(car.code)}
              onMouseLeave={() => onHover(null)}
            >
              {active && <circle r={17} fill={color} opacity={0.28} />}
              <circle r={active ? 11 : 9} fill={color} stroke="#fff" strokeWidth={2} filter="url(#map-drop)" />
              <text y={3.6} textAnchor="middle" fontSize={active ? 11 : 10} fontWeight={800} fill={dark ? '#111' : '#fff'} fontFamily="var(--font-mono)">
                {car.position}
              </text>
              {showTag(car) && (
                <g transform="translate(0 -24)">
                  <rect x={-22} y={-10} width={44} height={18} rx={4} fill="#15151e" opacity={0.92} />
                  <rect x={-22} y={-10} width={4} height={18} rx={1.5} fill={color} />
                  <text x={2} y={3.5} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#fff" fontFamily="var(--font-mono)">
                    {car.inPit ? 'PIT' : car.code}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Apple-Maps-style controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setView(mode === '3d' ? '2d' : '3d')}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/90 font-sport text-sm font-black text-[#15151e] shadow-md backdrop-blur transition hover:scale-105 dark:bg-[#2a2e35]/90 dark:text-white"
          aria-label={mode === '3d' ? 'Плоска карта' : '3D-вигляд'}
        >
          {mode === '3d' ? '2D' : '3D'}
        </button>
        <button
          type="button"
          onClick={() => setYawTarget(0)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#15151e] shadow-md backdrop-blur transition hover:scale-105 dark:bg-[#2a2e35]/90 dark:text-white"
          aria-label="Скинути поворот"
        >
          <Compass className="h-5 w-5 text-f1-red" style={{ transform: `rotate(${(yaw * 180) / Math.PI - 45}deg)` }} />
        </button>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-[#2a2d33] shadow-sm backdrop-blur dark:bg-[#2a2e35]/85 dark:text-white/90">
        <Mountain className="h-3.5 w-3.5" />
        Перепад висот {ELEVATION_RANGE[circuitId] ?? '—'} м
      </div>
      <div className={cn('pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/80 transition-opacity', dragging ? 'opacity-0' : 'opacity-100')}>
        {mode === '3d' ? 'Тягни, щоб обертати й нахиляти' : 'Тягни, щоб обертати'}
      </div>
    </div>
  );
}
