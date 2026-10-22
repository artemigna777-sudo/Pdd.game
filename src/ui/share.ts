/**
 * «Поделиться»: картинка-результат для друзей и отправка файлов. На телефоне открывается
 * системное меню «Поделиться», где его нет — файл сохраняется. В Android-приложении браузер внутри
 * не умеет ни делиться файлами, ни скачивать их, поэтому там файл кладётся в кэш приложения
 * (@capacitor/filesystem) и отдаётся системному меню «Поделиться» (@capacitor/share).
 */
import { GAME_TITLE } from '../config.ts';
import { isNativeApp } from '../pwa.ts';
import { showToast } from './toast.ts';

/** Содержимое файла в base64 (без «data:…;base64,»). */
function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Android-приложение: файл в кэш и системное меню «Поделиться». */
async function shareNative(blob: Blob, name: string, title: string): Promise<'shared' | 'cancelled'> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const { uri } = await Filesystem.writeFile({ path: name, data: await base64(blob), directory: Directory.Cache });
  try {
    await Share.share({ title, files: [uri], dialogTitle: title });
    return 'shared';
  } catch (e) {
    // Игрок закрыл меню, ничего не выбрав.
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return 'cancelled';
    throw e;
  }
}

/** Отдать файл: системное меню «Поделиться» или скачивание. */
export async function shareFile(blob: Blob, name: string, title: string): Promise<'shared' | 'saved' | 'cancelled'> {
  if (isNativeApp()) {
    try {
      return await shareNative(blob, name, title);
    } catch {
      showToast('Не удалось открыть меню «Поделиться» — попробуй ещё раз.');
      return 'cancelled';
    }
  }
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // Не получилось поделиться — сохраняем файл.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

export interface ResultCard {
  /** Маленькая надпись сверху. */
  kicker: string;
  /** Главное: «Экзамен сдан!», «Глава 3 пройдена». */
  title: string;
  /** Крупно: «20 из 20», «★★★», «Уровень 7». */
  big: string;
  lines: string[];
}

const SIZE = 1080;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Картинка 1080×1080 с результатом. */
export function resultImage(card: ResultCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

  // Дорога: тёмный фон, разметка по краям.
  ctx.fillStyle = '#1b2430';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#243142';
  ctx.fillRect(90, 0, SIZE - 180, SIZE);
  ctx.fillStyle = '#ffb703';
  for (let y = 20; y < SIZE; y += 120) {
    ctx.fillRect(40, y, 16, 70);
    ctx.fillRect(SIZE - 56, y, 16, 70);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#b8c2cf';
  ctx.font = font(700, 40);
  ctx.fillText(card.kicker.toUpperCase(), SIZE / 2, 190);

  ctx.fillStyle = '#ffffff';
  ctx.font = font(900, 84);
  let y = 300;
  for (const line of wrap(ctx, card.title, 820)) {
    ctx.fillText(line, SIZE / 2, y);
    y += 96;
  }

  ctx.fillStyle = '#ffb703';
  ctx.font = font(900, 150);
  ctx.fillText(card.big, SIZE / 2, y + 150);
  y += 250;

  ctx.fillStyle = '#f5f7fa';
  ctx.font = font(600, 44);
  for (const text of card.lines) {
    for (const line of wrap(ctx, text, 820)) {
      ctx.fillText(line, SIZE / 2, y + 30);
      y += 60;
    }
  }

  ctx.fillStyle = '#ffb703';
  ctx.font = font(900, 56);
  ctx.fillText(GAME_TITLE, SIZE / 2, SIZE - 120);
  ctx.fillStyle = '#b8c2cf';
  ctx.font = font(500, 34);
  ctx.fillText('игра для подготовки к теории на права', SIZE / 2, SIZE - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось нарисовать картинку'))), 'image/png'));
}

/** Кнопка «Поделиться» для картинки-результата. */
export async function shareResult(card: ResultCard): Promise<void> {
  try {
    const blob = await resultImage(card);
    const result = await shareFile(blob, 'kurier-pdd-result.png', card.title);
    if (result === 'saved') showToast('Картинка сохранена — её можно отправить друзьям.');
  } catch {
    showToast('Не удалось подготовить картинку.');
  }
}
