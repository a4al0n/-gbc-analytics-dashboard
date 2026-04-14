require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Секретный ключ для записи

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables for the bot.');
  process.exit(1);
}

const bot      = new TelegramBot(BOT_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helper: join customer names ─────────────────────────────────────────────
function getCustomerName(o) {
  return `${o.customer_first_name || ''} ${o.customer_last_name || ''}`.trim() || 'Неизвестно';
}

// ─── Notify New Orders ───────────────────────────────────────────────────────
async function checkNewOrders() {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('notified', false)
      .limit(10);

    if (error) throw error;

    for (const order of (orders || [])) {
      const orderSum = Number(order.total_summ) || 0;
      
      // Отправляем уведомление только если сумма выше 50,000 ₸
      if (orderSum >= 50000) {
        const amountFormatted = orderSum.toLocaleString('ru-RU', { minimumFractionDigits: 2 });
        const created = new Date(order.created_at).toLocaleString('ru-RU').replace(',', '');
        
        const msg = 
          `🔥 *High-value order in RetailCRM*\n` +
          `Order: #${order.number} (id: ${order.id})\n` +
          `Amount: ${amountFormatted} ₸\n` +
          `Customer: ${getCustomerName(order)}\n` +
          `Phone: ${order.customer_phone || '—'}\n` +
          `City: ${order.customer_city || '—'}\n` +
          `Status: ${order.status}\n` +
          `Created: ${created}`;

        await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
        console.log(`✅ [Bot] Notified about HIGH VALUE order #${order.number}`);
      } else {
        console.log(`ℹ️ [Bot] Skipping notification for small order #${order.number} (${orderSum} ₸)`);
      }

      // Всегда помечаем как уведомленный, чтобы не проверять повторно
      await supabase.from('orders').update({ notified: true }).eq('id', order.id);
    }
  } catch (err) {
    console.error('❌ [Bot] Error checking orders:', err.message);
  }
}

// Запускаем проверку каждые 30 секунд
setInterval(checkNewOrders, 30000);

// ─── Bot commands ─────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '👋 *Привет! Я бот мониторинга заказов.*\n\n' +
    'Я буду присылать уведомления о новых заказах автоматически!\n\n' +
    'Команды:\n' +
    '📊 /stats — статистика\n' +
    '🔥 /top — топ-5\n' +
    '🔄 /latest — последние 5',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/stats/, async (msg) => {
  const { data, error } = await supabase.from('orders').select('total_summ, status');
  if (error) return bot.sendMessage(msg.chat.id, '❌ Ошибка');

  const total   = data.length;
  const revenue = data.reduce((sum, o) => sum + (Number(o.total_summ) || 0), 0);
  
  bot.sendMessage(msg.chat.id,
    `📊 *Статистика*\n\n` +
    `🗂 Всего: *${total}*\n` +
    `💰 Выручка: *${revenue.toLocaleString('ru-KZ')} ₸*`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/top/, async (msg) => {
  const { data, error } = await supabase
    .from('orders')
    .select('number, customer_first_name, customer_last_name, total_summ')
    .order('total_summ', { ascending: false })
    .limit(5);

  if (error) return bot.sendMessage(msg.chat.id, '❌ Ошибка');

  const lines = data.map((o, i) =>
    `${i + 1}. #${o.number} — ${getCustomerName(o)} — *${Number(o.total_summ).toLocaleString('ru-KZ')} ₸*`
  ).join('\n');

  bot.sendMessage(msg.chat.id, `🔥 *Топ-5 заказов:*\n\n${lines || 'Нет данных'}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/latest/, async (msg) => {
  const { data, error } = await supabase
    .from('orders')
    .select('number, customer_first_name, customer_last_name, total_summ, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return bot.sendMessage(msg.chat.id, '❌ Ошибка');

  const lines = data.map((o) =>
    `📦 #${o.number} — ${getCustomerName(o)} — ${Number(o.total_summ).toLocaleString('ru-KZ')} ₸ [\`${o.status}\`]`
  ).join('\n\n');

  bot.sendMessage(msg.chat.id, `🕐 *Последние 5 заказов:*\n\n${lines || 'Заказов нет'}`, { parse_mode: 'Markdown' });
});

console.log(`🤖 Telegram bot started (chat: ${CHAT_ID})`);
bot.on('polling_error', (err) => console.error('Polling error:', err.message));
