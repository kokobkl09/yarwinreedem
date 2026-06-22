/**
 * Yarwin Redeem Pro - Node.js Backend Server
 * 
 * ✅ Signature logic: 100% matches the browser (timestamp excluded from hash).
 * ✅ Auto phone normalization: Supports 10-digit, 12-digit, or +91 formats.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Yarwin API Configuration
const YARWIN_BASE = 'https://api.yaarwapi62in.com/api/webapi';
const PROJECT = 'ar095';

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// UTILITY: AUTO-FIX PHONE NUMBER (So you never have to type 91)
// ============================================
function normalizePhone(phone) {
  // Remove spaces, dashes, and plus signs
  let cleaned = String(phone).replace(/[\s\-+]/g, '');
  
  // Remove leading zero (e.g., 09876543210 -> 9876543210)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If it's exactly 10 digits, prepend '91'
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  // Now it should be 12 digits starting with 91
  return cleaned;
}

// ============================================
// CORE SIGNATURE FUNCTION (NO TIMESTAMP)
// ============================================
function generateSignature(payloadWithoutTimestamp) {
  // Step 1: Filter out null, undefined, empty strings
  const filtered = {};
  for (const key in payloadWithoutTimestamp) {
    const val = payloadWithoutTimestamp[key];
    if (val !== null && val !== undefined && val !== '') {
      filtered[key] = val;
    }
  }

  // Step 2: Sort keys alphabetically
  const sortedKeys = Object.keys(filtered).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = filtered[key];
  }

  // Step 3: JSON.stringify with NO spaces
  const rawString = JSON.stringify(sortedObj);

  // Step 4: MD5 → UPPERCASE
  return crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();
}

// ============================================
// API: LOGIN
// ============================================
app.post('/api/login', async (req, res) => {
  try {
    let { username, pwd } = req.body;
    if (!username || !pwd) {
      return res.status(400).json({ code: -1, msg: 'Username and password required' });
    }

    // AUTO-FIX: Add 91 if missing
    username = normalizePhone(username);

    const ts = Math.floor(Date.now() / 1000);
    const rand = crypto.createHash('md5').update(String(Math.floor(Math.random() * 1000000))).digest('hex');
    const device = crypto.createHash('md5').update(`auto_${Math.floor(Math.random() * 900000) + 100000}_${ts}`).digest('hex');

    // Base payload WITHOUT timestamp
    const basePayload = {
      username: username,
      pwd: pwd,
      phonetype: 0,
      logintype: 'mobile',
      packId: '',
      deviceId: device,
      pixelId: '',
      fbcId: '',
      fbc: '',
      fbp: '',
      adId: '',
      language: 0,
      random: rand
    };

    const signature = generateSignature(basePayload);

    const finalPayload = {
      ...basePayload,
      signature: signature,
      timestamp: ts
    };

    const response = await fetch(`${YARWIN_BASE}/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Project': PROJECT,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(finalPayload)
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('[LOGIN ERROR]', error.message);
    res.status(500).json({ code: -1, msg: `Server error: ${error.message}` });
  }
});

// ============================================
// API: REDEEM GIFT CODE
// ============================================
app.post('/api/redeem', async (req, res) => {
  try {
    const { token, giftCode } = req.body;
    if (!token || !giftCode) {
      return res.status(400).json({ code: -1, msg: 'Token and giftCode required' });
    }

    const ts = Math.floor(Date.now() / 1000);
    const rand = crypto.createHash('md5').update(String(Math.floor(Math.random() * 1000000))).digest('hex');

    const basePayload = {
      giftCode: giftCode,
      language: 0,
      random: rand
    };

    const signature = generateSignature(basePayload);

    const finalPayload = {
      ...basePayload,
      signature: signature,
      timestamp: ts
    };

    const response = await fetch(`${YARWIN_BASE}/ConversionRedpage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Project': PROJECT,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(finalPayload)
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('[REDEEM ERROR]', error.message);
    res.status(500).json({ code: -1, msg: `Server error: ${error.message}` });
  }
});

// ============================================
// API: REGISTER (with Auto 91)
// ============================================
app.post('/api/register', async (req, res) => {
  try {
    let { username, pwd, inviteCode } = req.body;
    if (!username || !pwd) {
      return res.status(400).json({ code: -1, msg: 'Username and password required' });
    }

    // AUTO-FIX: Add 91 if missing
    username = normalizePhone(username);

    const ts = Math.floor(Date.now() / 1000);
    const rand = crypto.createHash('md5').update(String(Math.floor(Math.random() * 1000000))).digest('hex');
    const device = crypto.createHash('md5').update(`auto_${Math.floor(Math.random() * 900000) + 100000}_${ts}`).digest('hex');

    const basePayload = {
      username: username,
      pwd: pwd,
      phonetype: 0,
      registerType: 'mobile',
      deviceId: device,
      domainurl: 'yaarwin.xyz',
      invitecode: inviteCode || '378832018903',
      language: 0,
      packId: '',
      pixelId: '',
      random: rand,
      smsvcode: '',
      track: '',
      captchaId: '',
      adId: ''
    };

    const signature = generateSignature(basePayload);

    const finalPayload = {
      ...basePayload,
      signature: signature,
      timestamp: ts
    };

    const response = await fetch(`${YARWIN_BASE}/Register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Project': PROJECT,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(finalPayload)
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('[REGISTER ERROR]', error.message);
    res.status(500).json({ code: -1, msg: `Server error: ${error.message}` });
  }
});

// ============================================
// FALLBACK: Serve index.html
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     Yarwin Redeem Pro - Server Ready     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Port: ${PORT.toString().padEnd(35)} ║`);
  console.log(`║  Auto-91: ENABLED (Paste any format)     ║`);
  console.log(`║  Signature: FIXED (timestamp excluded)   ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});