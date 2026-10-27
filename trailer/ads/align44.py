#!/usr/bin/env python3
"""Привязка озвучки части 3 к предложениям сценария (videos/v44-script.json).

Запуск: python3 trailer/ads/align44.py --recap вступление.mp3 --main часть1.mp3 [часть2.mp3 ...]
Делает: music/44-noch-doroga-3/vo.wav (вступление + пауза + основная озвучка) и videos/v44-timing.json
(время начала и конца каждого предложения). Распознавание — faster-whisper (medium), совпадение — по буквам, поэтому
цифры и ошибки распознавания ничего не ломают: предложение без совпадений берёт время у соседей.
"""
import argparse, difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
SR = 44100

def load(files, gap=0.3):
    """Склеить файлы в стерео 44,1 кГц; вернуть (массив float32 [n,2], длительность)."""
    parts = []
    for i, f in enumerate(files):
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        a = np.frombuffer(raw, np.float32).reshape(-1, 2)
        if i: parts.append(np.zeros((int(gap * SR), 2), np.float32))
        parts.append(a)
    y = np.concatenate(parts)
    return y, len(y) / SR

def words_of(y):
    from faster_whisper import WhisperModel
    mono = y.mean(1)
    # 44,1 → 16 кГц
    idx = np.linspace(0, len(mono) - 1, int(len(mono) * 16000 / SR)).astype(int)
    m = WhisperModel('medium', device='cpu', compute_type='int8')
    segs, _ = m.transcribe(mono[idx].astype(np.float32), language='ru', word_timestamps=True, beam_size=5)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]

def letters(s):
    return re.sub(r'[^а-я]', '', s.lower().replace('ё', 'е'))

def align(sentences, words, total):
    """Вернуть [(начало, конец)] для каждого предложения."""
    sc, sidx = '', []
    for i, s in enumerate(sentences):
        l = letters(s.replace('*', ''))
        sc += l; sidx += [i] * len(l)
    tc, tidx = '', []
    for j, (w, a, b) in enumerate(words):
        l = letters(w)
        tc += l; tidx += [j] * len(l)
    first, last = {}, {}
    for blk in difflib.SequenceMatcher(None, sc, tc, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            i, j = sidx[blk.a + k], tidx[blk.b + k]
            first[i] = min(first.get(i, 10 ** 9), j); last[i] = max(last.get(i, -1), j)
    n = len(sentences)
    st = [words[first[i]][1] if i in first else None for i in range(n)]
    en = [words[last[i]][2] if i in last else None for i in range(n)]
    # заполнить пропуски по соседям
    def fill(v, default_lo, default_hi):
        for i in range(n):
            if v[i] is None:
                lo = next((v[k] for k in range(i - 1, -1, -1) if v[k] is not None), default_lo)
                hi = next((v[k] for k in range(i + 1, n) if v[k] is not None), default_hi)
                v[i] = (lo + hi) / 2
        return v
    st = fill(st, 0.0, total); en = fill(en, 0.0, total)
    if words: st[0] = min(st[0], words[0][1])
    out = []
    for i in range(n):
        a = st[i] if i == 0 else max(st[i], out[-1][1] + 0.05)
        b = max(en[i], a + 0.6)
        if i + 1 < n: b = min(b, max(st[i + 1] - 0.05, a + 0.6))
        out.append((round(float(a), 2), round(float(b), 2)))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--recap', nargs='+', required=True)
    ap.add_argument('--main', nargs='+', required=True)
    ap.add_argument('--id', default='44-noch-doroga-3')
    ap.add_argument('--script', default=str(HERE / 'videos/v44-script.json'))
    ap.add_argument('--timing', default=str(HERE / 'videos/v44-timing.json'))
    a = ap.parse_args()
    script = json.load(open(a.script))
    yr, dr = load(a.recap)
    ym, dm = load(a.main)
    tr = align(script['recap'], words_of(yr), dr)
    tm = align(script['main'], words_of(ym), dm)
    off = round(dr + 0.6, 2)
    json.dump({'off': off, 'recap': tr, 'main': tm}, open(a.timing, 'w'), ensure_ascii=False)
    y = np.concatenate([yr, np.zeros((int((off - dr) * SR), 2), np.float32), ym])
    out = HERE / 'music' / a.id / 'vo.wav'
    out.parent.mkdir(parents=True, exist_ok=True)
    import soundfile as sf
    sf.write(str(out), y, SR)
    print('off', off, 'recap', tr, 'main first/last', tm[0], tm[-1], 'длина озвучки', round(off + dm, 1))

if __name__ == '__main__':
    main()
