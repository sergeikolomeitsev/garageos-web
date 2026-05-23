# garageos-web

Статичный сайт поддержки **GarageOS** — [support.kolomeitsevs.com](https://support.kolomeitsevs.com).

Хостинг: **Cloudflare Pages**, сборка автоматически на каждый push в `main`.

## Структура

```text
content/
  _config.json     — общие настройки (title, footer, support email)
  00-hero.md       — hero-блок
  10-roles.md      — таблица ролей
  20-start.md      — «Начало работы»
  30-telegram.md   — гайд по Telegram-боту
  40-statuses.md   — статусы заявки
  50-faq.md        — частые вопросы
  60-contact.md    — контакты
templates/
  shell.html       — каркас (стили + nav + footer)
build.js           — генератор → dist/index.html
dist/              — артефакт сборки (в .gitignore, деплоится Pages)
```

## Редактирование

1. Правите файлы в `content/`.
2. Коммитите в `main`.
3. Cloudflare Pages автоматически запускает `npm run build` и публикует `dist/`.

### Локальная сборка и предпросмотр

```bash
npm install
npm run build           # → dist/index.html

# preview (любой статичный сервер)
npx serve dist
# или
python3 -m http.server 8000 -d dist
```

## Cloudflare Pages — конфигурация

При создании проекта в Cloudflare:

- **Framework preset:** None
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Production branch:** `main`
- **Root directory:** (пустой)

## Шаблоны секций

Каждый файл в `content/` начинается с YAML frontmatter, поле `template` определяет рендерер:

- `hero` — заглавный блок
- `roles` — таблица прав ролей
- `steps` — нумерованные шаги (с опциональным `invite_flow`)
- `tg-steps` — шаги с иконками + блок «куда вставить» + сценарий бота
- `statuses` — flow-чипы + таблица статусов
- `faq` — accordion из `### Вопросы` в markdown-теле
- `contact` — карточка контактов

Чтобы добавить новую секцию: создайте файл `content/NN-name.md` с frontmatter (`template`, `id`, `nav_label`, …) — она автоматически появится в навигации и попадёт в сборку.
