require('dotenv').config();
const axios = require('axios');

async function checkSites() {
  const url = `${process.env.RETAILCRM_URL.replace(/\/$/, '')}/api/v5/reference/sites`;
  try {
    const response = await axios.get(url, {
      params: { apiKey: process.env.RETAILCRM_API_KEY }
    });
    console.log(JSON.stringify(response.data.sites, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSites();
