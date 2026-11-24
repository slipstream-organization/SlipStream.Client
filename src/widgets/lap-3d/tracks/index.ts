import type { TrackConfig } from './types';
import { vegas } from './vegas';

export const TRACKS: Record<string, TrackConfig> = { vegas };
export const getTrack = (id: string) => TRACKS[id];
