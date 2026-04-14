require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const RETAILCRM_URL = process.env.RETAILCRM_URL;
const RETAILCRM_KEY  = process.env.RETAILCRM_API_KEY;

if (!RETAILCRM_URL || !RETAILCRM_KEY) {
  console.error('❌ Missing RETAILCRM_URL or RETAILCRM_API_KEY in .env');
  process.exit(1);
}

// ─── Load Mock Data ─────────────────────────────────────────────────────────
const mockPath = path.join(__dirname, '..', 'mock_orders.json');
let mockOrders = [];

try {
  mockOrders = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
} catch (err) {
  console.error('❌ Failed to read mock_orders.json:', err.message);
  process.exit(1);
}

// ─── Mapping Tables ──────────────────────────────────────────────────────────
const STATUS_MAP = {
  'new': 'new',
  'complete': 'complete',
  'delivery': 'delivering',
  'cancel': 'cancel-other',
  'assembling': 'assembling'
};

const DEFAULT_SITE = 'alikhanserik41';

// ─── Upload to RetailCRM ────────────────────────────────────────────────────
async function uploadOrder(order) {
  const url = `${RETAILCRM_URL.replace(/\/$/, '')}/api/v5/orders/create`;

  const mappedStatus = STATUS_MAP[order.status] || order.status || 'new';
  const siteCode = order.site === 'main' ? DEFAULT_SITE : (order.site || DEFAULT_SITE);

  // Маппинг полей согласно структуре mock_orders.json
  const orderData = {
    number:    order.number,
    status:    mappedStatus,
    createdAt: order.created_at ? order.created_at.replace('T', ' ').replace('Z', '').split('.')[0] : null,
    firstName: order.customer_first_name || '',
    lastName:  order.customer_last_name || '',
    phone:     order.customer_phone || '',
    email:     order.customer_email || '',
    summ:      order.total_summ || 0, // В RetailCRM поле называется summ
    site:      siteCode,
    externalId: `mock-${order.id}-${Date.now()}` // Гарантируем уникальность для повторных тестов
  };

  try {
    const params = new URLSearchParams();
    params.append('apiKey', RETAILCRM_KEY);
    params.append('site', siteCode);
    params.append('order', JSON.stringify(orderData));

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.data.success) {
      throw new Error(JSON.stringify(response.data.errors || response.data));
    }

    return response.data.id;
  } catch (err) {
    if (err.response && err.response.data) {
      throw new Error(`[API Error] ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

// ─── Main Logic ──────────────────────────────────────────────────────────────
async function runImport() {
  console.log(`🚀 Starting import of ${mockOrders.length} orders to RetailCRM...\n`);

  let success = 0;
  let failed = 0;

  for (const order of mockOrders) {
    try {
      const crmId = await uploadOrder(order);
      console.log(` ✅ Order ${order.number} imported successfully (CRM ID: ${crmId})`);
      success++;
    } catch (err) {
      console.error(` ❌ Failed to import order ${order.number}:`, err.message);
      failed++;
    }
  }

  console.log(`\n🎉 Import finished!`);
  console.log(`📈 Success: ${success}`);
  console.log(`📉 Failed:  ${failed}`);
}

runImport();
