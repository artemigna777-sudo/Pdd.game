/**
 * Безопасная работа с localStorage: в приватном режиме или при запрете хранения
 * чтение и запись не должны ломать игру.
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Хранилище недоступно — настройки просто не запомнятся.
  }
}
