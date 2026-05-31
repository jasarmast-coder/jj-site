// netlify/functions/schedule.js
//
// Shared schedule storage — syncs calendar across all devices.
// Uses JSONBin.io as a free hosted JSON store (no database needed).
//
// ── ONE-TIME SETUP ─────────────────────────────────────────────────
//  1. Go to https://jsonbin.io and create a free account
//  2. Click "Create Bin" and paste in this default JSON:
//     {
//       "closedDates": [],
//       "openTimes": ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"],
//       "blockedDates": [],
//       "blockedTimesPerDate": {},
//       "bookings": []
//     }
//  3. Copy the Bin ID from the URL (looks like: 6649ab1facd3cb34a85c4bcd)
//  4. Go to Account > API Keys, create a key, copy it
//  5. In Netlify → Site config → Environment variables, add:
//       JSONBIN_BIN_ID    =  your_bin_id_here
//       JSONBIN_API_KEY   =  your_api_key_here
// ──────────────────────────────────────────────────────────────────

const BIN_ID  = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;
const BASE    = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const HEADERS = {
  'Content-Type':  'application/json',
  'X-Master-Key':  API_KEY,
  'X-Bin-Versioning': 'false', // always overwrite, no version history
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DEFAULT_SCHEDULE = {
  closedDates: [],
  openTimes: ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'],
  blockedDates: [],
  blockedTimesPerDate: {},
  bookings: [],
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // ── GET: load schedule ──────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const res = await fetch(BASE + '/latest', { headers: HEADERS });
      if (!res.ok) throw new Error('Fetch failed: ' + res.status);
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify(data.record || DEFAULT_SCHEDULE),
      };
    } catch (err) {
      console.error('GET error:', err.message);
      // Return default so the site still works even if JSONBin is down
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_SCHEDULE),
      };
    }
  }

  // ── POST: save schedule ─────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      let body;
      try { body = JSON.parse(event.body); }
      catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

      const res = await fetch(BASE, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed: ' + res.status);
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      console.error('POST error:', err.message);
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
