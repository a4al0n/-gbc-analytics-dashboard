-- Создаём таблицу заказов (используем BIGINT для ID)
CREATE TABLE IF NOT EXISTS orders (
  id            BIGINT PRIMARY KEY,
  number        TEXT NOT NULL,
  created_at    TIMESTAMPTZ,
  status        TEXT,
  total_summ    NUMERIC DEFAULT 0,
  customer_first_name TEXT,
  customer_last_name  TEXT,
  customer_phone      TEXT,
  customer_email      TEXT,
  customer_city       TEXT,
  notified            BOOLEAN DEFAULT FALSE,
  synced_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_total_summ ON orders(total_summ DESC);

-- Включаем (или временно выключаем для простоты) Row Level Security
-- Если сайт пишет ОШИБКА ДОСТУПА, выполните эту строку:
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 1. Разрешаем чтение для всех
DROP POLICY IF EXISTS "allow_anon_read" ON orders;
CREATE POLICY "allow_anon_read" ON orders FOR SELECT USING (true);

-- 2. Разрешаем вставку/обновление (чтобы скрипт синхронизации работал через anon key)
DROP POLICY IF EXISTS "allow_anon_insert" ON orders;
CREATE POLICY "allow_anon_insert" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_update" ON orders;
CREATE POLICY "allow_anon_update" ON orders FOR UPDATE USING (true);
