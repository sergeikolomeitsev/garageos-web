# garageos-web

Статичный сайт поддержки **GarageOS** на GitHub Pages — [support.kolomeitsevs.com](https://support.kolomeitsevs.com).

## Структура

```
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
  shell.html       — каркас страницы (стили + nav + footer)
build.js           — генератор index.html
index.html         — сгенерированный файл (НЕ редактировать вручную)
```

## Редактирование

1. Правите файлы в `content/`.
2. Коммитите в `main`.
3. GitHub Action (`.github/workflows/build.yml`) автоматически перегенерирует `index.html` и закоммитит его в репозиторий.

### Локальная сборка

```bash
npm install
npm run build       # → index.html
```

Откройте `index.html` в браузере для предпросмотра.

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
