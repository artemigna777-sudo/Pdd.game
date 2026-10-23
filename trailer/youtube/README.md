# Загрузка роликов на YouTube

Скрипт `upload.ts` загружает готовый вертикальный ролик на свой канал через YouTube Data API v3
(без лишних библиотек, через `fetch`).

```sh
npx tsx trailer/youtube/upload.ts --check                                  # ключи работают? какой канал?
npx tsx trailer/youtube/upload.ts trailer/ads/mp4/kurier-pdd-ad-39-papa-youtube.mp4 trailer/youtube/meta/39-papa.json
npx tsx trailer/youtube/upload.ts <ролик.mp4> <описание.json> --dry-run    # только проверить описание
```

В конце скрипт печатает ссылку на видео в YouTube Studio и будущую ссылку для зрителей.

## Канал

Загрузка идёт на канал «KREX» (@small-you). Описание канала (23.10.2026) задано через API
(`channels.update`, part=brandingSettings). Название и @-имя через API не меняются — только в приложении YouTube:
аватар → «Ваш канал» → карандаш → «Название» / «Псевдоним». Предложенное название — «Билет 41».

Пробная загрузка 23.10.2026: ролик 39 «Папа водит 20 лет» (версия со своими звуками),
https://studio.youtube.com/video/uWyIikfOe7M/edit — загружен скрытым, как и ожидалось.

## Описание ролика — JSON в `meta/`

```json
{
  "title": "До 100 знаков, обязательно с #Shorts",
  "description": "Коротко + ссылка на игру https://artemigna777-sudo.github.io/Pdd.game/?ref=youtube",
  "tags": ["ПДД", "билеты ПДД"],
  "publishAt": "2026-10-27T18:00:00+03:00"
}
```

- `publishAt` — необязательно: YouTube сам откроет видео в это время (только после аудита, см. ниже).
- Скрипт не загрузит ролик, если в названии больше 100 знаков или нет `#Shorts`, если в описании нет ссылки
  на игру с меткой `?ref=youtube` (по ней в статистике игры видно, кто пришёл с YouTube).
- Видео загружается в категорию «Образование», язык — русский, «не для детей».
- Тест: `tests/youtube.test.ts` проверяет и все описания в `meta/`.

## Ключи

Переменные окружения (в настройках окружения Claude Code, не в репозитории):

| Переменная | Что это |
|---|---|
| `YT_CLIENT_ID` | идентификатор OAuth-клиента «Kurier PDD uploader» (Google Cloud → APIs & Services → Credentials) |
| `YT_CLIENT_SECRET` | секрет этого клиента |
| `YT_REFRESH_TOKEN` | refresh token из OAuth Playground со scope `https://www.googleapis.com/auth/youtube` |

Канал, на который идёт загрузка, — тот, что выбран при входе в OAuth Playground. Чтобы сменить канал,
получи новый refresh token и при входе выбери нужный канал. Токены скрипт никуда не печатает и не сохраняет.

Ошибки:
- `invalid_grant` — refresh token отозван или устарел: получить новый в OAuth Playground.
- `invalid_client` — ID и секрет не от того клиента, которым получен refresh token.
- `quotaExceeded` — дневной лимит API: 10 000 единиц, одна загрузка ≈ 1 600, то есть до 6 роликов в сутки.

## Видео будут скрытыми, пока Google не проверит приложение

Пока приложение «Kurier PDD uploader» не прошло аудит Google, YouTube делает все загруженные им видео
**скрытыми (private)** — и `publishAt` тоже не сработает. Открыть их можно пачкой:

1. YouTube Studio (studio.youtube.com или приложение «YouTube Studio») → **Контент**.
2. Поставить галочки у нужных видео → **Изменить** → **Доступ** → **Открытый** → **Обновить видео**.

Чтобы видео выходили сами, нужна заявка на аудит — тексты для неё в `audit.md`.

## Звук

В роликах TikTok — музыка из чужих роликов-образцов, на YouTube на такое ставят заявки Content ID. Поэтому
для YouTube собирается версия **только со своими синтезированными звуками** (`trailer/ads/sfx.ts`):

```sh
id=39-papa
ffmpeg -y -i trailer/ads/out/$id/raw.mp4 -i trailer/ads/out/$id/sfx.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart trailer/ads/mp4/kurier-pdd-ad-$id-youtube.mp4
```

(`raw.mp4` и `sfx.wav` появляются после `sh trailer/ads/render7.sh <id>` или `render6.sh`.)
