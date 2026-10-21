import { findCorners, type Corner, type LapModel } from './lapModel';

export type Verdict = 'gain' | 'ok' | 'loss';

export interface SegmentDelta {
  corner: Corner;
  start: number; // sample index of the segment (corner + half the straights around it)
  end: number;
  delta: number; // s, positive = slower than the reference
  verdict: Verdict;
  apexMine: number; // km/h
  apexRef: number;
  brakeDiff: number; // m, positive = you brake earlier
  exitMine: number; // km/h
  exitRef: number;
}

export interface LapAnalysis {
  total: number;
  sectors: number[]; // 3 sector deltas
  segments: SegmentDelta[];
  tips: string[];
}

function minSpeed(lap: LapModel, a: number, b: number) {
  let m = Infinity;
  for (let i = a; i <= b; i++) m = Math.min(m, lap.speed[i]);
  return m;
}

/** Distance (m) from the braking point to the apex. */
function brakingDistance(lap: LapModel, from: number, apex: number) {
  let peak = from;
  for (let i = from; i <= apex; i++) if (lap.speed[i] > lap.speed[peak]) peak = i;
  return ((apex - peak) * lap.length) / lap.n;
}

const segTime = (lap: LapModel, a: number, b: number) => (b >= a ? lap.time[b] - lap.time[a] : lap.lapTime - lap.time[a] + lap.time[b]);

/** Compares `mine` against `ref` corner by corner. Both laps must come from the same circuit. */
export function analyseLap(mine: LapModel, ref: LapModel): LapAnalysis {
  const n = ref.n;
  const corners = findCorners(ref);
  const ratio = mine.lapTime / ref.lapTime - 1; // overall pace deficit
  const exitLook = Math.round(60 / (ref.length / n));

  const segments: SegmentDelta[] = corners.map((c, i) => {
    const start = i === 0 ? 0 : Math.round((corners[i - 1].end + c.start) / 2);
    const end = i === corners.length - 1 ? n - 1 : Math.round((c.end + corners[i + 1].start) / 2);
    const delta = segTime(mine, start, end) - segTime(ref, start, end);
    const expected = segTime(ref, start, end) * ratio;
    const verdict: Verdict = delta < -0.005 ? 'gain' : delta <= expected * 0.6 ? 'ok' : 'loss';
    const exitIdx = Math.min(n - 1, c.end + exitLook);
    return {
      corner: c,
      start,
      end,
      delta,
      verdict,
      apexMine: minSpeed(mine, c.start, c.end),
      apexRef: minSpeed(ref, c.start, c.end),
      brakeDiff: brakingDistance(mine, start, c.apex) - brakingDistance(ref, start, c.apex),
      exitMine: mine.speed[exitIdx],
      exitRef: ref.speed[exitIdx],
    };
  });

  const sectors = [0, 1, 2].map((k) => {
    const a = Math.floor((k * n) / 3);
    const b = k === 2 ? n - 1 : Math.floor(((k + 1) * n) / 3);
    return segTime(mine, a, b) - segTime(ref, a, b);
  });

  return { total: mine.lapTime - ref.lapTime, sectors, segments, tips: coachTips(segments, sectors) };
}

/**
 * Rule-based "AI coach": turns the biggest losses into concrete advice.
 * Kept deterministic for now — can be swapped for an LLM call that receives the same `segments`.
 */
function coachTips(segments: SegmentDelta[], sectors: number[]): string[] {
  const tips: string[] = [];
  const worst = [...segments].sort((a, b) => b.delta - a.delta).slice(0, 2);
  for (const s of worst) {
    if (s.delta <= 0.02) continue;
    const t = `T${s.corner.number}`;
    const lost = `втрачаєш ${s.delta.toFixed(3)} с`;
    const apexGap = s.apexRef - s.apexMine;
    const exitGap = s.exitRef - s.exitMine;
    if (s.brakeDiff > 8) {
      tips.push(`${t} (${lost}): гальмуєш приблизно на ${Math.round(s.brakeDiff)} м раніше за поулмена. Перенеси точку гальмування пізніше й гальмуй різкіше на вході.`);
    } else if (apexGap > 4) {
      tips.push(`${t} (${lost}): в апексі в тебе ${Math.round(s.apexMine)} км/год проти ${Math.round(s.apexRef)}. Відпускай гальмо плавніше й неси більше швидкості в поворот.`);
    } else if (exitGap > 4) {
      tips.push(`${t} (${lost}): вихід повільніший на ${Math.round(exitGap)} км/год. Раніше випрямляй кермо й раніше відкривай газ — це окупиться на всій прямій.`);
    } else {
      tips.push(`${t} (${lost}): втрата розмазана по всьому повороту — спробуй ширшу траєкторію на вході, щоб раніше вийти на газ.`);
    }
  }
  const best = [...segments].sort((a, b) => a.delta - b.delta)[0];
  if (best && best.delta < 0.01) {
    tips.push(`Сильне місце — T${best.corner.number}: ${best.delta < 0 ? `ти швидший за поул на ${Math.abs(best.delta).toFixed(3)} с` : 'тут ти в темпі поулу'}. Тримай цей підхід.`);
  }
  const worstSector = sectors.indexOf(Math.max(...sectors));
  tips.push(`Найбільший потенціал — сектор ${worstSector + 1} (+${sectors[worstSector].toFixed(3)} с).`);
  return tips;
}
