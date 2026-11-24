export type Quality = 'low' | 'medium' | 'high';

/** What each tier switches on. The renderer reads this once per change — nothing here is per frame. */
export interface QualitySpec {
  /** device-pixel-ratio ceiling */
  dpr: number;
  antialias: boolean;
  /** metres between lamp posts */
  lampSpacing: number;
  /** neon light spilling on the asphalt */
  glow: boolean;
  /** catch fence above the barriers */
  fence: boolean;
  /** extent of the ground around the track, m */
  groundMargin: number;
}

export const QUALITY: Record<Quality, QualitySpec> = {
  low: { dpr: 1, antialias: false, lampSpacing: 90, glow: false, fence: false, groundMargin: 500 },
  medium: { dpr: 1.5, antialias: true, lampSpacing: 50, glow: true, fence: true, groundMargin: 800 },
  high: { dpr: 2, antialias: true, lampSpacing: 36, glow: true, fence: true, groundMargin: 1100 },
};

export const QUALITY_LABEL: Record<Quality, string> = { low: 'Низька', medium: 'Середня', high: 'Висока' };
