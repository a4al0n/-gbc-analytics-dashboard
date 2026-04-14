require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ─── Config ───────────────────────────────────────────────────────────────────
const RETAILCRM_URL = process.env.RETAILCRM_URL;       // https://alikhanserik41.retailcrm.ru
const RETAILCRM_KEY  = process.env.RETAILCRM_API_KEY;  // i0LuTWzRPrJZdWrA385f3MUXoR68sZNZ
const SUPABASE_URL   = process.env.SUPABASE_URL;       // https://iyleoysbwqdwuwrreaam.supabase.co
const SUPABASE_KEY   = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Fetch orders from Supabase that are not yet in RetailCRM ─────────────────
async function fetchNewOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('uploaded_to_crm', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ─── Upload single order to RetailCRM ────────────────────────────────────────
async function uploadOrder(order) {
  const url = `${RETAILCRM_URL}/api/v5/orders/create`;

  const payload = {
    apiKey: RETAILCRM_KEY,
    order: JSON.stringify({
      number:    order.number || `SUP-${order.id}`,
      status:    order.status || 'new',
      firstName: order.customer_name?.split(' ')[0] || '',
      lastName:  order.customer_name?.split(' ').slice(1).join(' ') || '',
      phone:     order.customer_phone || '',
      email:     order.customer_email || '',
      summ:      order.total_summ || 0,
      site:      order.site || 'default',
    }),
  };

  const response = await axios.post(url, null, { params: payload });

  if (!response.data.success) {
    throw new Error(`RetailCRM create error: ${JSON.stringify(response.data.errors)}`);
  }

  return response.data.id;
}

// ─── Mark order as uploaded ───────────────────────────────────────────────────
async function markUploaded(orderId, crmId) {
  const { error } = await supabase
    .from('orders')
    .update({ uploaded_to_crm: true, crm_id: crmId })
    .eq('id', orderId);

  if (error) throw error;
}

// ─── Main upload loop ─────────────────────────────────────────────────────────
async function upload() {
  console.log('🚀 Starting upload: Supabase → RetailCRM');
  console.log(`   RetailCRM: ${RETAILCRM_URL}`);
  console.log(`   Supabase:  ${SUPABASE_URL}`);

  const orders = await fetchNewOrders();

  if (orders.length === 0) {
    console.log('✅ No new orders to upload.');
    return;
  }

  console.log(`\n📦 Found ${orders.length} orders to upload\n`);
  let success = 0;
  let failed  = 0;

  for (const order of orders) {
    try {
      const crmId = await uploadOrder(order);
      await markUploaded(order.id, crmId);
      console.log(`  ✅ Order #${order.number || order.id} → CRM id ${crmId}`);
      success++;
    } catch (err) {
      console.error(`  ❌ Order #${order.number || order.id} failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done! Success: ${success} | Failed: ${failed}`);
}

upload().catch((err) => {
  console.error('❌ Upload failed:', err.message);
  process.exit(1);
});
