/**
 * Портреты персонажей: у каждого героя сюжета есть портрет, и его можно вставить на экран
 * несколько раз (внутри нет id, внешних файлов и скриптов).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PORTRAIT_IDS, portraitSvg } from '../src/story/portraits.ts';
import { CHARACTERS } from '../src/story/story.ts';

test('у каждого персонажа свой портрет: SVG без id, ссылок и скриптов, фон — цвет героя', () => {
  assert.deepEqual([...PORTRAIT_IDS].sort(), Object.keys(CHARACTERS).sort());
  const seen = new Set<string>();
  for (const id of PORTRAIT_IDS) {
    const svg = portraitSvg(id);
    assert.match(svg, /^<svg viewBox="0 0 96 96"[^>]*>.*<\/svg>$/s, id);
    assert.ok(svg.includes(`fill="${CHARACTERS[id].color}"`), `${id}: фон цвета героя`);
    assert.doesNotMatch(svg, /\sid=|href|<script|url\(/, `${id}: без id, ссылок и скриптов`);
    // Теги закрыты: открывающих столько же, сколько закрывающих (кроме самозакрывающихся).
    const open = (svg.match(/<(svg|g)[\s>]/g) ?? []).length;
    const close = (svg.match(/<\/(svg|g)>/g) ?? []).length;
    assert.equal(open, close, `${id}: теги закрыты`);
    assert.ok(!seen.has(svg), `${id}: портрет не повторяет другой`);
    seen.add(svg);
    assert.ok(svg.length < 6000, `${id}: портрет лёгкий (${svg.length} символов)`);
  }
});
