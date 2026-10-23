/**
 * Загрузка роликов на YouTube: проверка описания, тело запроса, разбор ответа о докачке.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkMeta, rangeEnd, videoResource, type VideoMeta } from '../trailer/youtube/upload.ts';

const ok: VideoMeta = {
  title: 'Папа водит 20 лет — а билет ПДД не сдал бы #Shorts',
  description: 'Проверь себя.\nhttps://artemigna777-sudo.github.io/Pdd.game/?ref=youtube',
  tags: ['ПДД'],
};

test('описание ролика проверяется до загрузки', () => {
  assert.deepEqual(checkMeta(ok), []);
  assert.match(checkMeta({ ...ok, title: 'x'.repeat(101) + ' #Shorts' }).join(), /100/);
  assert.match(checkMeta({ ...ok, title: 'Без тега' }).join(), /#Shorts/);
  assert.match(checkMeta({ ...ok, description: 'без ссылки' }).join(), /ref=youtube/);
  assert.match(checkMeta({ ...ok, title: 'a <b> #Shorts' }).join(), /< и >/);
  assert.match(checkMeta({ ...ok, publishAt: 'завтра' }).join(), /ISO/);
  assert.match(checkMeta({ ...ok, publishAt: new Date(Date.now() - 1000).toISOString() }).join(), /15 минут/);
  assert.deepEqual(checkMeta({ ...ok, publishAt: new Date(Date.now() + 86_400_000).toISOString() }), []);
});

test('видео — скрытое, «Образование», русский, не для детей', () => {
  const r = videoResource({ ...ok, publishAt: '2026-11-01T09:00:00+03:00' });
  assert.equal(r.snippet.categoryId, '27');
  assert.equal(r.snippet.defaultLanguage, 'ru');
  assert.equal(r.status.privacyStatus, 'private');
  assert.equal(r.status.selfDeclaredMadeForKids, false);
  assert.equal(r.status.publishAt, '2026-11-01T06:00:00.000Z');
  assert.equal('publishAt' in videoResource(ok).status, false);
});

test('докачка продолжается с того места, что получил YouTube', () => {
  assert.equal(rangeEnd('bytes=0-8388607'), 8388608);
  assert.equal(rangeEnd(null), 0);
});

test('готовые описания роликов в trailer/youtube/meta проходят проверку', () => {
  const dir = new URL('../trailer/youtube/meta/', import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const m = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as VideoMeta;
    assert.deepEqual(checkMeta({ ...m, publishAt: undefined }), [], f);
  }
});
