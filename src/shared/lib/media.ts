/** Image URLs on the official F1 media CDN (same source OpenF1 uses for headshots). */
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../mock/season';
import type { TeamId } from '../model/types';

const CDN = 'https://media.formula1.com';

/** `1col` ≈ 93px wide (badges), `4col` ≈ 400px (large portraits). */
export function driverPhoto(code: string, size: '1col' | '4col' = '1col') {
  const p = DRIVER_BY_CODE[code]?.photo;
  return p ? `${CDN}/d_driver_fallback_image.png/content/dam/fom-website/drivers/${p}.png.transform/${size}/image.png` : undefined;
}

/** Official season portrait: transparent, full height (≈ 1:2.9), facing right. */
export function driverCutout(code: string, width = 900) {
  const d = DRIVER_BY_CODE[code];
  if (!d?.photo) return undefined;
  const s = TEAM_BY_ID[d.teamId].slug;
  const id = d.photo.split('/').pop();
  return `${CDN}/image/upload/c_fill,w_${width}/q_auto/v1740000001/common/f1/2026/${s}/${id}/2026${s}${id}right.webp`;
}

export function teamCar(id: TeamId, height = 224) {
  const s = TEAM_BY_ID[id].slug;
  return `${CDN}/image/upload/c_lfill,h_${height}/q_auto/v1740000000/common/f1/2026/${s}/2026${s}carright.webp`;
}

/** Monochrome team logo: `white` for dark surfaces, `black` for light ones. */
export function teamLogo(id: TeamId, height = 128, tone: 'white' | 'black' = 'white') {
  const s = TEAM_BY_ID[id].slug;
  return `${CDN}/image/upload/c_fit,h_${height}/q_auto/v1740000000/common/f1/2026/${s}/2026${s}logo${tone}.webp`;
}
