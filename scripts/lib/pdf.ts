/**
 * Низкоуровневое чтение PDF для импорта билетов.
 *
 * Текст берём через pdfjs-dist (он умеет декодировать шрифты и ToUnicode),
 * картинки через pdf-lib: так мы получаем исходные JPEG-потоки байт в байт,
 * без перекодирования, а их положение на странице вычисляем по content stream.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFStream,
  decodePDFRawStream,
} from 'pdf-lib';

/** Строка текста. Координаты в пунктах, начало отсчёта в левом верхнем углу страницы. */
export interface TextLine {
  text: string;
  /** Левая граница строки. */
  x: number;
  /** Базовая линия строки, сверху вниз. */
  y: number;
}

/** Отдельный фрагмент текста (нужен для таблицы ответов, где важны колонки). */
export interface TextItem {
  text: string;
  x: number;
  y: number;
  /** Высота шрифта. */
  height: number;
}

export interface PageText {
  /** Номер страницы, с 1. */
  page: number;
  lines: TextLine[];
  items: TextItem[];
}

export interface PageImage {
  /** Номер страницы, с 1. */
  page: number;
  /** Имя ресурса на странице, например "Img8". */
  name: string;
  /** Габариты картинки на странице (пункты, начало в левом верхнем углу). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Фильтр потока, например "DCTDecode" (это JPEG). */
  filter: string;
  /** Сырые байты потока. Для DCTDecode это готовый JPEG-файл. */
  bytes: Uint8Array;
}

/** Максимальная разница по вертикали, при которой фрагменты считаются одной строкой. */
const LINE_TOLERANCE = 2.5;

export async function readPdfText(data: Uint8Array): Promise<PageText[]> {
  // pdfjs забирает буфер себе, поэтому передаём копию.
  const loadingTask = getDocument({
    data: data.slice(),
    verbosity: 0,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;

  const pages: PageText[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!('str' in item) || item.str === '') continue;
      items.push({ text: item.str, x: item.transform[4], y: height - item.transform[5], height: item.height });
    }
    pages.push({ page: p, lines: groupLines(items), items });
    page.cleanup();
  }
  await loadingTask.destroy();
  return pages;
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻',
};

function groupLines(items: TextItem[]): TextLine[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: TextItem[][] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last[0].y - item.y) <= LINE_TOLERANCE) last.push(item);
    else groups.push([item]);
  }

  // Верхний индекс (например, «см³»): мелкий шрифт чуть выше базовой линии следующей строки.
  for (let i = 0; i < groups.length - 1; i++) {
    const group = groups[i];
    const below = groups[i + 1];
    const size = Math.max(...group.map((it) => it.height));
    const belowSize = Math.max(...below.map((it) => it.height));
    if (size < 0.8 * belowSize && below[0].y - group[0].y < 0.6 * belowSize) {
      for (const it of group) {
        below.push({ ...it, text: [...it.text].map((ch) => SUPERSCRIPT[ch] ?? ch).join('') });
      }
      groups.splice(i--, 1);
    }
  }

  return groups
    .map((group) => {
      group.sort((a, b) => a.x - b.x);
      return { text: group.map((i) => i.text).join(''), x: group[0].x, y: group[0].y };
    })
    .filter((line) => line.text.trim() !== '');
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m × n в соглашении PDF (вектор-строка слева). */
function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

const DELIMITER = /[\s()<>[\]{}/%]/;

/** Упрощённый токенайзер content stream: нам нужны только q, Q, cm и Do. */
function* tokenize(src: string): Generator<string> {
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === '%') {
      while (i < n && src[i] !== '\n' && src[i] !== '\r') i++;
    } else if (c === '(') {
      let depth = 0;
      for (; i < n; i++) {
        const ch = src[i];
        if (ch === '\\') i++;
        else if (ch === '(') depth++;
        else if (ch === ')' && --depth === 0) break;
      }
      i++;
      yield '(string)';
    } else if (c === '<' && src[i + 1] === '<') {
      i += 2;
      yield '<<';
    } else if (c === '>' && src[i + 1] === '>') {
      i += 2;
      yield '>>';
    } else if (c === '<') {
      i = src.indexOf('>', i) + 1 || n;
      yield '<hex>';
    } else if ('[]{}'.includes(c)) {
      i++;
      yield c;
    } else {
      let j = i + 1;
      while (j < n && !DELIMITER.test(src[j])) j++;
      yield src.slice(i, j);
      i = j;
    }
  }
}

function streamBytes(stream: PDFStream): Uint8Array {
  if (stream instanceof PDFRawStream) return decodePDFRawStream(stream).decode();
  return stream.getContents();
}

function filterName(dict: PDFDict): string {
  const filter = dict.lookup(PDFName.of('Filter'));
  if (filter instanceof PDFName) return filter.decodeText();
  if (filter instanceof PDFArray) {
    return filter
      .asArray()
      .map((f) => (f instanceof PDFName ? f.decodeText() : '?'))
      .join('+');
  }
  return '';
}

export async function readPdfImages(data: Uint8Array): Promise<PageImage[]> {
  const doc = await PDFDocument.load(data, { updateMetadata: false });
  const result: PageImage[] = [];

  doc.getPages().forEach((page, index) => {
    const pageHeight = page.getHeight();
    const node = page.node;
    const xobjects = node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!xobjects) return;

    const contents = node.Contents();
    const streams: PDFStream[] = [];
    if (contents instanceof PDFStream) streams.push(contents);
    else if (contents instanceof PDFArray) {
      for (let i = 0; i < contents.size(); i++) streams.push(contents.lookup(i, PDFStream));
    }
    const src = streams.map((s) => Buffer.from(streamBytes(s)).toString('latin1')).join('\n');

    let ctm: Matrix = IDENTITY;
    const saved: Matrix[] = [];
    const operands: string[] = [];
    for (const token of tokenize(src)) {
      if (token === 'q') {
        saved.push(ctm);
      } else if (token === 'Q') {
        ctm = saved.pop() ?? IDENTITY;
      } else if (token === 'cm') {
        const m = operands.slice(-6).map(Number) as Matrix;
        ctm = multiply(m, ctm);
      } else if (token === 'Do') {
        const name = operands[operands.length - 1]?.slice(1);
        const stream = name ? xobjects.lookupMaybe(PDFName.of(name), PDFStream) : undefined;
        const subtype = stream?.dict.lookup(PDFName.of('Subtype'));
        if (stream instanceof PDFRawStream && subtype === PDFName.of('Image')) {
          // Картинка занимает единичный квадрат в текущей системе координат.
          const xs = [ctm[4], ctm[4] + ctm[0], ctm[4] + ctm[2], ctm[4] + ctm[0] + ctm[2]];
          const ys = [ctm[5], ctm[5] + ctm[1], ctm[5] + ctm[3], ctm[5] + ctm[1] + ctm[3]];
          result.push({
            page: index + 1,
            name: name!,
            x: Math.min(...xs),
            y: pageHeight - Math.max(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
            filter: filterName(stream.dict),
            bytes: stream.getContents(),
          });
        }
      }
      if (/^[-+.\d]/.test(token) || token.startsWith('/')) operands.push(token);
      else operands.length = 0;
    }
  });

  return result;
}

