/**
 * Собирает композиции рекламных роликов: `trailer/ads/out/<id>/index.html`.
 *
 *   npx tsx trailer/ads/build.ts            — все ролики
 *   npx tsx trailer/ads/build.ts 01 05      — только ролики с этими номерами
 *
 * Рендер — `trailer/ads/render.sh` (см. README).
 */
import { writeVideo, type Video } from './engine.ts';
import { v01 } from './videos/v01-zabyvanie.ts';
import { v02 } from './videos/v02-kriegsspiel.ts';
import { v03 } from './videos/v03-mesta.ts';
import { v04 } from './videos/v04-otvechat.ts';
import { v05 } from './videos/v05-topgun.ts';
import { v06 } from './videos/v06-hirurgi.ts';
import { v07 } from './videos/v07-leitner.ts';
import { v08 } from './videos/v08-taksi.ts';
import { v09 } from './videos/v09-rait.ts';
import { v10 } from './videos/v10-son.ts';

export const VIDEOS: Video[] = [v01, v02, v03, v04, v05, v06, v07, v08, v09, v10];

const only = process.argv.slice(2);
for (const v of VIDEOS) {
  if (only.length && !only.some((n) => v.id.startsWith(n))) continue;
  console.log(`${v.id}: ${writeVideo(v)}`);
}
