/**
 * Голос инспектора (этап 15): синтез речи телефона, без интернета и без файлов. Говорит, только
 * если включены звуки и «Голос инспектора»; если русского голоса в телефоне нет — молчит.
 */
import { getSettings } from '../settings.ts';

function russianVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ru'));
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function speak(text: string): void {
  const s = getSettings();
  if (!s.sound || !s.voice || !canSpeak()) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    const voice = russianVoice();
    if (voice) u.voice = voice;
    u.rate = 1.05;
    u.pitch = 0.85;
    speechSynthesis.speak(u);
  } catch {
    // Синтез речи недоступен — игра работает и без голоса.
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  try {
    speechSynthesis.cancel();
  } catch {
    // Нечего останавливать.
  }
}
