// Fetches real laps from OpenF1 and caches them as JSON in public/tracks/<id>/laps/.
//
//   node scripts/tracks-fetch.mjs vegas --city "Las Vegas" --years 2025,2026 --driver VER --session Qualifying
//   npm run tracks:fetch -- vegas --city "Las Vegas" --years 2025,2026 --driver VER
//
// Per year it saves the driver's fastest valid lap (position x/y/z + car data) as <year>-<DRV>.json, and a
// pool of the fastest laps of the whole field (positions only) as pool-<year>.json — the centre line of the
// circuit is derived from those. After this run nothing needs the API any more.
//
// OpenF1: x / y / z are in 1/10 m. Public rate limit is low (a few requests a second), so every call is
// throttled and retried with back-off.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith('--')) {
  console.error('usage: node scripts/tracks-fetch.mjs <trackId> --city "Las Vegas" [--years 2025,2026] [--driver VER] [--session Qualifying] [--pool 10]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const city = opt('city');
const years = opt('years', '2025,2026').split(',').map(Number);
const driver = opt('driver', 'VER');
const sessionName = opt('session', 'Qualifying');
const POOL = Number(opt('pool', '10'));
if (!city) throw new Error('--city is required (OpenF1 circuit_short_name, e.g. "Las Vegas")');

const BASE = 'https://api.openf1.org/v1';
const out = path.join('public', 'tracks', id, 'laps');
fs.mkdirSync(out, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function api(endpoint, params) {
  // OpenF1 filters are written as `date>=...`, which the generic encoder above would break — build by hand
  const parts = Object.entries(params).map(([k, v]) => {
    const m = /^(.*?)([<>]=?)$/.exec(k);
    return m ? `${m[1]}${encodeURIComponent(m[2])}${encodeURIComponent(v)}` : `${k}=${encodeURIComponent(v)}`;
  });
  const url = `${BASE}/${endpoint}?${parts.join('&')}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = 450 - (Date.now() - last);
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': 'SlipStream-tracks-fetch' } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * 2 ** attempt);
      continue;
    }
    throw new Error(`${endpoint} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  throw new Error(`${endpoint}: gave up after retries`);
}

const iso = (ms) => new Date(ms).toISOString().replace('Z', '');
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** Samples of one driver during [start, start + duration]; t in seconds from the lap start. */
async function lapSamples(sessionKey, number, startIso, duration, withCar) {
  const t0 = new Date(startIso).getTime();
  const win = { 'date>=': iso(t0 - 1500), 'date<=': iso(t0 + duration * 1000 + 1500) };
  const loc = await api('location', { session_key: sessionKey, driver_number: number, ...win });
  const pos = loc
    .map((p) => [round((new Date(p.date).getTime() - t0) / 1000, 3), p.x, p.y, p.z])
    .filter((p) => p[0] >= -0.6 && p[0] <= duration + 0.6)
    .sort((a, b) => a[0] - b[0]);
  let car;
  if (withCar) {
    const cd = await api('car_data', { session_key: sessionKey, driver_number: number, ...win });
    car = cd
      .map((c) => [round((new Date(c.date).getTime() - t0) / 1000, 3), c.speed, c.throttle, c.brake, c.n_gear, c.rpm, c.drs])
      .filter((c) => c[0] >= -0.6 && c[0] <= duration + 0.6)
      .sort((a, b) => a[0] - b[0]);
  }
  return { pos, car };
}

for (const year of years) {
  const sessions = await api('sessions', { circuit_short_name: city, session_name: sessionName, year });
  const session = sessions[0];
  if (!session) {
    console.log(`${year}: no ${sessionName} session at ${city} — skipped`);
    continue;
  }
  const key = session.session_key;
  const drivers = await api('drivers', { session_key: key });
  const me = drivers.find((d) => d.name_acronym === driver);
  if (!me) {
    console.log(`${year}: driver ${driver} not in session ${key} — skipped`);
    continue;
  }

  // all fast laps of the field, to pick the driver's best and the pool for the centre line
  const rows = [];
  for (const d of drivers) {
    const laps = await api('laps', { session_key: key, driver_number: d.driver_number });
    for (const l of laps) if (l.lap_duration && !l.is_pit_out_lap && l.date_start) rows.push({ ...l, acr: d.name_acronym });
    process.stdout.write('.');
  }
  console.log(` ${year}: ${rows.length} timed laps in session ${key}`);
  rows.sort((a, b) => a.lap_duration - b.lap_duration);

  const best = rows.find((r) => r.driver_number === me.driver_number);
  if (!best) {
    console.log(`${year}: no valid lap for ${driver}`);
    continue;
  }
  const mine = await lapSamples(key, me.driver_number, best.date_start, best.lap_duration, true);
  fs.writeFileSync(
    path.join(out, `${year}-${driver}.json`),
    JSON.stringify({
      source: 'OpenF1',
      units: { pos: 'x,y,z in 1/10 m', car: 'speed km/h, throttle %, brake, gear, rpm, drs' },
      year,
      sessionKey: key,
      driver,
      lapNumber: best.lap_number,
      lapTime: best.lap_duration,
      sectors: [best.duration_sector_1, best.duration_sector_2, best.duration_sector_3],
      pos: mine.pos, // [t, x, y, z]
      car: mine.car, // [t, speed, throttle, brake, gear, rpm, drs]
    }),
  );
  console.log(`${year}-${driver}: lap ${best.lap_number} ${best.lap_duration}s, ${mine.pos.length} position samples, ${mine.car.length} car samples`);

  // pool: the fastest laps of different drivers, positions only
  const seen = new Set();
  const pool = [];
  for (const r of rows) {
    if (seen.has(r.driver_number)) continue;
    seen.add(r.driver_number);
    if (pool.length >= POOL) break;
    const s = await lapSamples(key, r.driver_number, r.date_start, r.lap_duration, false);
    pool.push({ driver: r.acr, lapTime: r.lap_duration, pos: s.pos });
  }
  fs.writeFileSync(path.join(out, `pool-${year}.json`), JSON.stringify({ source: 'OpenF1', year, sessionKey: key, laps: pool }));
  console.log(`pool-${year}: ${pool.length} laps cached`);
}
console.log('done →', out);
