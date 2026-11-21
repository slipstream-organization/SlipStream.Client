/**
 * 3D car models and liveries per team.
 *
 * Only team colours are used — no logos, sponsor marks or official artwork.
 * Every team currently uses the shared `base.glb` (CC0, see public/models/cars/CREDITS.md)
 * recoloured at load time; to give a team its own model, drop a GLB into models-src/cars/,
 * run `npm run models:optimize` and point `url` at it.
 */
import type { TeamId } from '../model/types';

export interface Livery {
  /** main bodywork */
  primary: string;
  /** wings, engine cover, secondary panels */
  secondary: string;
  /** highlights (trail glow, small details) */
  accent: string;
}

export interface CarModelSpec {
  url: string;
  /** multiplier on top of the length normalisation (1 = REAL_CAR_LENGTH) */
  scale: number;
  /** Euler XYZ (radians) that turns the model so its nose points along +X */
  rotation: [number, number, number];
  /** extra lift after the model is put on the ground, metres */
  offsetY: number;
  livery: Livery;
}

/** Modern F1 car length, metres — every model is normalised to this by its bounding box. */
export const REAL_CAR_LENGTH = 5.6;

export const BASE_CAR_URL = '/models/cars/base.glb';

/**
 * Which materials of a model play which role. Names come from the GLB
 * (`gltf-transform inspect` or `node` + the JSON chunk); unknown materials keep their own colour.
 */
export const MATERIAL_ROLES: Record<string, { primary: string[]; secondary: string[]; carbon: string[]; tyre: string[] }> = {
  [BASE_CAR_URL]: {
    primary: ['Material.005'], // monocoque, sidepods, nose
    secondary: ['Material.006'], // front/rear wing planes, engine cover, helmet
    carbon: ['Material.009', 'Material.007'], // floor, suspension arms
    tyre: ['Material.008'], // four tyres (+ exhausts)
  },
};

/** base.glb is modelled nose towards −X, so it is turned around. */
const base = (livery: Livery): CarModelSpec => ({ url: BASE_CAR_URL, scale: 1, rotation: [0, Math.PI, 0], offsetY: 0, livery });

export const CAR_MODELS: Record<TeamId, CarModelSpec> = {
  mercedes: base({ primary: '#c5c9ce', secondary: '#0d0f12', accent: '#27f4d2' }),
  ferrari: base({ primary: '#dc0000', secondary: '#151515', accent: '#ffeb00' }),
  mclaren: base({ primary: '#ff8000', secondary: '#121212', accent: '#47c7fc' }),
  red_bull: base({ primary: '#1e2a5a', secondary: '#cc1e4a', accent: '#ffcc00' }),
  racing_bulls: base({ primary: '#f2f3f5', secondary: '#1634cb', accent: '#e30613' }),
  aston_martin: base({ primary: '#00594f', secondary: '#0c0c0c', accent: '#cedc00' }),
  williams: base({ primary: '#0a2d6e', secondary: '#00a3e0', accent: '#ffffff' }),
  audi: base({ primary: '#a7abb1', secondary: '#141414', accent: '#f50537' }),
  alpine: base({ primary: '#0090d0', secondary: '#ff87bc', accent: '#111111' }),
  haas: base({ primary: '#f2f2f2', secondary: '#1a1a1a', accent: '#e6002d' }),
  cadillac: base({ primary: '#161616', secondary: '#e8e8e8', accent: '#d4af37' }),
};

/** Spec for a team, or the base model painted in a single run colour when the team is unknown. */
export function carModelFor(teamId: TeamId | undefined, fallbackColor: string): CarModelSpec {
  return (teamId && CAR_MODELS[teamId]) || base({ primary: fallbackColor, secondary: '#15151e', accent: '#ffffff' });
}
