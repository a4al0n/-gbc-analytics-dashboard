require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ─── Config ───────────────────────────────────────────────────────────────────
const RETAILCRM_URL = process.env.RETAILCRM_URL;
const RETAILCRM_KEY  = process.env.RETAILCRM_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY; // Секретный ключ

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Fetch orders ─────────────────────────────────────────────────────────────
async function fetchOrders(page = 1, limit = 50) {
  const baseUrl = RETAILCRM_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v5/orders`;
  
  const response = await axios.get(url, {
    params: { apiKey: RETAILCRM_KEY, page, limit }
  });

  if (!response.data.success) throw new Error('RetailCRM Error');
  return response.data;
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1); // Берем заказы за последние 24 часа для синхронизации
  return d.toISOString().split('T')[0];
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function mapOrder(order) {
  return {
    id:                  order.id,
    number:              order.number,
    created_at:          order.createdAt,
    status:              order.status,
    total_summ:          order.summ || 0,
    customer_first_name: order.firstName || null,
    customer_last_name:  order.lastName || null,
    customer_phone:      order.phone || (order.customer?.phone) || null,
    customer_email:      order.email || (order.customer?.email) || null,
    customer_city:       order.delivery?.address?.city || null,
    synced_at:           new Date().toISOString()
  };
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
async function sync() {
  console.log(`\n🔄 [Sync] Starting check at ${new Date().toLocaleTimeString()}`);
  try {
    const result = await fetchOrders(1);
    const orders = result.orders || [];
    
    if (orders.length > 0) {
      // Дедупликация в памяти: оставляем только последний уникальный номер
      const uniqueRows = [];
      const seenNumbers = new Set();
      
      const rows = orders.map(mapOrder).reverse(); // С конца, чтобы свежие были в приоритете
      for (const row of rows) {
        if (!seenNumbers.has(row.number)) {
          uniqueRows.push(row);
          seenNumbers.add(row.number);
        }
      }

      const { error } = await supabase.from('orders').upsert(uniqueRows, { onConflict: 'id' });
      if (error) throw error;
      console.log(`   ✅ Synced ${uniqueRows.length} unique orders`);
    } else {
      console.log('   ℹ No new orders found');
    }
  } catch (err) {
    console.error('   ❌ Sync failed:', err.message);
  }
}

// Цикл: запускаем синхронизацию сразу и затем каждые 2 минуты
sync();
setInterval(sync, 120000); 

console.log('🚀 Sync engine started (every 2 minutes)');
