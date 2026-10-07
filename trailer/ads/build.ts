/**
 * Собирает композиции рекламных роликов: `trailer/ads/out/<id>/index.html`.
 *
 *   npx tsx trailer/ads/build.ts            — все ролики
 *   npx tsx trailer/ads/build.ts 01 05      — только ролики с этими номерами
 *
 * Рендер — `trailer/ads/render.sh` (см. README).
 */
import { writeVideo, type Video } from './engine.ts';
import { writeVideo3, type Video3 } from './engine3.ts';
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
import { v11 } from './videos/v11-parizh.ts';
import { v12 } from './videos/v12-svetofor.ts';
import { v13 } from './videos/v13-berta.ts';
import { v14 } from './videos/v14-shahmaty.ts';
import { v15 } from './videos/v15-nastolka.ts';
import { v16 } from './videos/v16-seneka.ts';
import { v17 } from './videos/v17-apollon.ts';
import { v18 } from './videos/v18-geymer.ts';
import { v19 } from './videos/v19-milya.ts';
import { v20 } from './videos/v20-pokazhi.ts';
import { v21 } from './videos/v21-ikar.ts';
import { v22 } from './videos/v22-sizif.ts';
import { v23 } from './videos/v23-ahill.ts';
import { v24 } from './videos/v24-strekoza.ts';
import { v25 } from './videos/v25-titanik.ts';
import { v26 } from './videos/v26-kolobok.ts';
import { v27 } from './videos/v27-ariadna.ts';
import { v28 } from './videos/v28-damokl.ts';
import { v29 } from './videos/v29-gretel.ts';
import { v30 } from './videos/v30-uzel.ts';

export const VIDEOS: Video[] = [v01, v02, v03, v04, v05, v06, v07, v08, v09, v10, v11, v12, v13, v14, v15, v16, v17, v18, v19, v20];
/** Третья серия — формат новых образцов (`engine3.ts`). */
export const VIDEOS3: Video3[] = [v21, v22, v23, v24, v25, v26, v27, v28, v29, v30];

const only = process.argv.slice(2);
for (const v of VIDEOS) {
  if (only.length && !only.some((n) => v.id.startsWith(n))) continue;
  console.log(`${v.id}: ${writeVideo(v)}`);
}
for (const v of VIDEOS3) {
  if (only.length && !only.some((n) => v.id.startsWith(n))) continue;
  console.log(`${v.id}: ${writeVideo3(v)}`);
}
