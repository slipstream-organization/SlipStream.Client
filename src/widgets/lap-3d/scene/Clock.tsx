import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Playback } from './playback';

/** Advances the shared clock once per frame, before anything that reads it. */
export function Clock({ playback, lapTime }: { playback: RefObject<Playback>; lapTime: number }) {
  useFrame((_, dtRaw) => playback.current.advance(Math.min(dtRaw, 0.1), lapTime), -10);
  return null;
}
