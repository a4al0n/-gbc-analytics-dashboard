# 📦 Orders Dashboard

Дашборд мониторинга заказов RetailCRM с синхронизацией в Supabase, Telegram-ботом и деплоем на Vercel.

---

## 🔧 Стек

| Сервис | Назначение |
|---|---|
| [RetailCRM](https://alikhanserik41.retailcrm.ru) | Источник заказов |
| [Supabase](https://iyleoysbwqdwuwrreaam.supabase.co) | База данных (PostgreSQL) |
| Telegram Bot `8627109829` | Уведомления о крупных заказах |
| Vercel | Хостинг дашборда |

---

## 🚀 Быстрый старт

### 1. Установить зависимости
```bash
npm install
```

### 2. Создать таблицу в Supabase
1. Открыть файл `supabase/schema.sql` в редакторе
2. Скопировать **всё содержимое** файла (Ctrl+A → Ctrl+C)
3. Вставить в [Supabase SQL Editor](https://supabase.com/dashboard/project/iyleoysbwqdwuwrreaam/sql) и нажать **Run**

### 3. Синхронизировать заказы из RetailCRM → Supabase
```bash
npm run sync
```

### 4. Запустить Telegram-бота
```bash
npm run bot
```

### 5. Открыть дашборд локально
```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Структура

```
orders-dashboard/
├── dashboard/
│   └── index.html          # Веб-дашборд (vanilla JS + Chart.js)
├── scripts/
│   ├── sync_to_supabase.js # RetailCRM → Supabase
│   └── upload_to_retailcrm.js # Supabase → RetailCRM
├── telegram-bot/
│   └── bot.js              # Telegram-бот с командами
├── supabase/
│   └── schema.sql          # SQL-схема таблицы orders
├── mock_orders.json         # Тестовые данные
├── .env                    # Токены (не коммитить!)
├── vercel.json             # Конфиг деплоя
└── package.json
```

---

## 🤖 Команды Telegram-бота

| Команда | Описание |
|---|---|
| `/start` | Приветствие и список команд |
| `/stats` | Общая статистика заказов |
| `/top` | Топ-5 заказов по сумме |
| `/latest` | Последние 5 заказов |

Бот автоматически уведомляет при поступлении заказов **≥ 50 000 ₸**.

---

## ☁️ Деплой на Vercel

```bash
# Установить Vercel CLI
npm i -g vercel

# Добавить секреты
vercel secrets add retailcrm_api_key "i0LuTWzRPrJZdWrA385f3MUXoR68sZNZ"
vercel secrets add supabase_key "sb_publishable_qenEdWww0JR5BnTMaR-Uwg_S1yEfix_"
vercel secrets add telegram_bot_token "8627109829:AAHveG-OW3uFF5fTBDY7vwio8pdM-pygh1c"

# Деплой
vercel --prod
```

---

## 🔑 Переменные окружения (.env)

```env
RETAILCRM_URL=https://alikhanserik41.retailcrm.ru
RETAILCRM_API_KEY=...
SUPABASE_URL=https://iyleoysbwqdwuwrreaam.supabase.co
SUPABASE_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=8627109829
```

> ⚠️ Файл `.env` добавлен в `.gitignore` — токены не попадут в репозиторий.

---

## 📊 Схема данных

```sql
orders (
  id              BIGINT PRIMARY KEY,   -- ID заказа RetailCRM
  number          TEXT UNIQUE,          -- Номер заказа
  total_summ      NUMERIC,              -- Сумма в тенге
  status          TEXT,                 -- Статус заказа
  customer_*      TEXT,                 -- Данные клиента
  notified        BOOLEAN,              -- Отправлено уведомление в Telegram
  uploaded_to_crm BOOLEAN,             -- Загружено обратно в CRM
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
```
