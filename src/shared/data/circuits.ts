import circuits from './circuits.json';

export type CircuitMap = Record<string, { name: string; location: string; length: number; points: [number, number][] }>;
export const CIRCUITS = circuits as unknown as CircuitMap;
