# Заявка на аудит YouTube API — готовые тексты

Форма: https://support.google.com/youtube/contact/yt_api_form
(YouTube API Services — Audit and Quota Extension Form). Отправляет владелец канала.
Форма на английском, поэтому ответы — по-английски; в скобках — что это значит.

**Organization / Developer name:** Artem I (independent developer)

**Contact email:** почта аккаунта Google, которым создан проект.

**Google Cloud project:** Default Gemini Project (номер проекта — в Google Cloud Console → Dashboard).

**API client / OAuth client name:** Kurier PDD uploader

**Website:** https://artemigna777-sudo.github.io/Pdd.game/

**Privacy policy:** https://artemigna777-sudo.github.io/Pdd.game/privacy.html

**Which API services do you use?** YouTube Data API v3 — `videos.insert`, `channels.list`,
`channels.update` (brandingSettings).

**Describe your use case** (что делает приложение):

> Kurier PDD is a free educational game that helps people in Russia prepare for the theory part of the driving
> licence exam (all 800 official exam questions). I make short vertical educational videos about road rules and
> the exam. "Kurier PDD uploader" is an internal command-line script that uploads these videos to my own YouTube
> channel and schedules their publication. It is used only by me, the owner of the channel. It does not access
> other users' data, does not display YouTube data to anyone, and does not store any YouTube data except the IDs
> of the videos it uploaded.

(Бесплатная обучающая игра для подготовки к теории на права. Я делаю короткие обучающие ролики. Приложение —
внутренний скрипт, который загружает мои ролики на мой канал и ставит время публикации. Пользуюсь только я,
чужих данных не трогает, ничего из YouTube не показывает и не хранит, кроме номеров загруженных видео.)

**Who are the users of your application?**

> Only one user: me, the channel owner. The application is not available to the public and there is no sign-in
> for other people.

**How many users / channels?** 1 channel.

**Expected usage:** up to 7 uploads per week (about 11 200 quota units per week, under 3 200 per day) — the
default quota of 10 000 units per day is enough; I only need the audit so that uploaded videos can be public.

(До 7 загрузок в неделю, лимита хватает — аудит нужен, чтобы видео не становились скрытыми.)

**Why do you need the audit?**

> API projects created after July 28, 2020 that have not been verified upload videos as private. My app uploads
> my own videos to my own channel, and I would like them to be published publicly at the scheduled time.

**Screenshots / demo** (если форма просит): скриншот YouTube Studio со скрытыми видео, загруженными скриптом,
и ссылка на код скрипта в репозитории: https://github.com/artemigna777-sudo/Pdd.game/blob/main/trailer/youtube/upload.ts

Заметки:
- Ответ обычно приходит на почту за несколько недель; Google может попросить уточнения.
- Если спросят про соответствие правилам: приложение выполняет только загрузку своих видео, ничего не показывает
  и не хранит — большинство требований YouTube API Developer Policies (показ данных, удаление данных пользователей)
  к нему не относятся.
