import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MAPS, type Mapping } from '../src/world/mapping.ts';
import { RoadGraph } from '../src/world/roadGraph.ts';
import { TEMPLATES } from '../src/world/templates.ts';

const mapping: Mapping = JSON.parse(readFileSync(new URL('../data/mapping.json', import.meta.url), 'utf8'));

test('у каждой главы своя карта района', () => {
  assert.equal(new Set(mapping.chapters.map((c) => c.map)).size, mapping.chapters.length);
});

test('точки глав не стоят друг на друге', () => {
  for (const chapter of mapping.chapters) {
    const graph = new RoadGraph(MAPS[chapter.map]);
    const stops = chapter.points.map((p) => ({ p, stop: graph.pointStop(p) }));
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const a = stops[i];
        const b = stops[j];
        if (a.stop.lane !== b.stop.lane) continue;
        assert.ok(Math.abs(a.stop.s - b.stop.s) > 40, `${chapter.id}: ${a.p.id} и ${b.p.id} слишком близко`);
      }
    }
  }
});

test('мини-игры есть там, где их вопросы, и серии не длиннее положенного', () => {
  for (const chapter of mapping.chapters) {
    for (const point of chapter.points) {
      const series = mapping.questions.filter((q) => q.chapter === chapter.id && q.point === point.id);
      assert.ok(series.length >= 1 && series.length <= TEMPLATES[point.template].series, `${chapter.id}/${point.id}`);
    }
  }
  const templates = new Set(mapping.questions.map((q) => q.template));
  for (const game of ['classroom', 'inspector', 'garage', 'first-aid'] as const) assert.ok(templates.has(game), game);
});
