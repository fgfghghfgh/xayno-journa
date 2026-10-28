const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'trades.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JOURNAL_ACCESS_KEY = process.env.JOURNAL_ACCESS_KEY || '';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';
const REMOTE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && JOURNAL_ACCESS_KEY);
const journalChartCache = new Map();

function requireJournalAccess(req, res, next) {
  if (!REMOTE_ENABLED) {
    if (process.env.RENDER) return res.status(503).json({ message: 'Online journal storage is not configured.' });
    return next();
  }

  const supplied = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const expectedBuffer = Buffer.from(JOURNAL_ACCESS_KEY);
  const suppliedBuffer = Buffer.from(supplied);
  const valid = expectedBuffer.length === suppliedBuffer.length
    && require('crypto').timingSafeEqual(expectedBuffer, suppliedBuffer);
  if (!valid) return res.status(401).json({ message: 'Journal access key is missing or incorrect.' });
  next();
}

async function fetchRemoteRecords() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/journal_trades?select=id,updated_at,deleted,payload`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!response.ok) throw new Error(`Cloud journal read failed (${response.status}).`);
  return response.json();
}

async function writeRemoteRecords(records) {
  if (!records.length) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/journal_trades?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(records),
  });
  if (!response.ok) throw new Error(`Cloud journal write failed (${response.status}).`);
}

function mergeJournalSync(remoteRecords, incomingTrades, incomingDeletions) {
  const merged = new Map(remoteRecords.map((record) => [record.id, record]));
  for (const trade of incomingTrades) {
    if (!trade || !trade.id || !String(trade.token || '').trim()) continue;
    const updatedAt = trade.updatedAt || trade.createdAt || new Date().toISOString();
    const current = merged.get(String(trade.id));
    if (!current || new Date(updatedAt).getTime() >= new Date(current.updated_at).getTime()) {
      merged.set(String(trade.id), {
        id: String(trade.id), updated_at: updatedAt, deleted: false, payload: trade,
      });
    }
  }
  for (const deletion of incomingDeletions) {
    if (!deletion || !deletion.id) continue;
    const deletedAt = deletion.deletedAt || new Date().toISOString();
    const current = merged.get(String(deletion.id));
    if (!current || new Date(deletedAt).getTime() >= new Date(current.updated_at).getTime()) {
      merged.set(String(deletion.id), {
        id: String(deletion.id), updated_at: deletedAt, deleted: true, payload: {},
      });
    }
  }
  return [...merged.values()];
}

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

function readTrades() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map((item, index) => {
      const trade = item && typeof item === 'object' ? item : {};
      if (trade.id) return trade;
      const fingerprint = [trade.token, trade.journalDate, trade.openedAt, trade.createdAt, index].join('|');
      const id = `legacy_${crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 24)}`;
      return { ...trade, id };
    });
    if (normalized.some((trade, index) => trade.id !== parsed[index]?.id)) writeTrades(normalized);
    return normalized;
  } catch (error) {
    return [];
  }
}

function writeTrades(trades) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(trades, null, 2));
}

function toDateKey(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function tradePnl(trade) {
  if (typeof trade.pnlDollar === 'number' && Number.isFinite(trade.pnlDollar)) return Number(trade.pnlDollar);
  if (typeof trade.investAmount === 'number' && Number.isFinite(trade.investAmount) && Number.isFinite(Number(trade.pnlPercent))) {
    return Number(trade.investAmount) * Number(trade.pnlPercent) / 100;
  }
  return 0;
}

function buildSummary(trades) {
  const closed = trades.filter((trade) => trade.status === 'closed');
  const wins = closed.filter((trade) => tradePnl(trade) > 0).length;
  const losses = closed.filter((trade) => tradePnl(trade) < 0).length;
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const realizedPnl = closed.reduce((sum, trade) => sum + tradePnl(trade), 0);
  const investedCapital = closed.reduce((sum, trade) => {
    const value = Number(trade.investAmount);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);
  const realizedPercent = investedCapital > 0 ? (realizedPnl / investedCapital) * 100 : 0;

  return {
    totalTrades: trades.length,
    winRate,
    wins,
    losses,
    realizedPnl,
    realizedPercent,
    closedTrades: closed.length,
    openTrades: trades.filter((trade) => trade.status === 'open').length,
  };
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/config', (_req, res) => {
  res.json({ remoteEnabled: REMOTE_ENABLED, accessRequired: true, chartEnabled: Boolean(BIRDEYE_API_KEY) });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), remoteEnabled: REMOTE_ENABLED });
});

app.use('/api/trades', requireJournalAccess);

app.get('/api/chart/candles', requireJournalAccess, async (req, res) => {
  const address = String(req.query.address || '').trim();
  const timeframe = String(req.query.timeframe || '5m');
  const chain = String(req.query.chain || 'solana');
  const start = Number(req.query.start);
  const count = Math.min(200, Math.max(1, Number(req.query.count) || 13));
  const intervalSeconds = timeframe === '15m' ? 900 : timeframe === '5m' ? 300 : 0;
  if (!BIRDEYE_API_KEY) return res.status(503).json({ message: 'دریافت چارت وب تنظیم نشده؛ BIRDEYE_API_KEY را در Render اضافه کن.' });
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(address) || !intervalSeconds || !Number.isInteger(start) || start <= 0 || !['solana', 'ethereum', 'base', 'bsc', 'arbitrum'].includes(chain)) {
    return res.status(400).json({ message: 'آدرس توکن، تایم‌فریم یا بازهٔ کندل معتبر نیست.' });
  }

  const end = start + count * intervalSeconds;
  const cacheKey = `${chain}:${address}:${timeframe}:${start}:${count}`;
  const cached = journalChartCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60_000) return res.json(cached.payload);

  try {
    const url = new URL('https://public-api.birdeye.so/defi/ohlcv');
    url.searchParams.set('address', address);
    url.searchParams.set('type', timeframe);
    url.searchParams.set('currency', 'usd');
    url.searchParams.set('time_from', String(start));
    url.searchParams.set('time_to', String(end));
    const response = await fetch(url, {
      headers: { 'x-chain': chain, 'x-api-key': BIRDEYE_API_KEY },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return res.status(502).json({ message: `Birdeye چارت را دریافت نکرد (${response.status}).` });
    const result = await response.json();
    const items = Array.isArray(result.data?.items) ? result.data.items : [];
    const candles = items.map((item) => ({
      time: Math.floor(Number(item.unixTime) > 1e12 ? Number(item.unixTime) / 1000 : Number(item.unixTime)),
      open: Number(item.o), high: Number(item.h), low: Number(item.l), close: Number(item.c), volume: Number(item.v) || 0,
    })).filter((item) => item.time >= start && item.time < end && [item.open, item.high, item.low, item.close].every(Number.isFinite))
      .sort((left, right) => left.time - right.time).slice(0, count);
    const payload = { candles };
    journalChartCache.set(cacheKey, { timestamp: Date.now(), payload });
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ message: 'دریافت کندل از Birdeye ناموفق بود.' });
  }
});

app.get('/api/trades', async (_req, res) => {
  if (REMOTE_ENABLED) {
    try {
      const records = mergeJournalSync(await fetchRemoteRecords(), readTrades(), []);
      await writeRemoteRecords(records);
      const trades = records.filter((record) => !record.deleted).map((record) => ({ ...record.payload, id: record.payload.id || record.id }));
      writeTrades(trades);
      return res.json({ trades });
    } catch (error) {
      return res.status(503).json({ message: 'ارتباط با فضای ابری انجام نشد.' });
    }
  }
  const localTrades = readTrades();
  return res.json({ trades: localTrades.sort((a, b) => new Date(b.createdAt || b.openedAt || 0) - new Date(a.createdAt || a.openedAt || 0)) });
});

app.get('/api/summary', requireJournalAccess, (_req, res) => {
  const trades = readTrades();
  res.json(buildSummary(trades));
});

app.post('/api/trades', async (req, res) => {
  const payload = req.body || {};
  const trades = readTrades();
  const trade = {
    id: payload.id || `trade_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    status: payload.status || 'closed',
    token: String(payload.token || '').trim(),
    network: payload.network || 'Solana',
    address: payload.address || '',
    riskLevel: payload.riskLevel || 'high',
    pnlOutcome: payload.pnlOutcome || 'profit',
    journalDate: payload.journalDate || toDateKey(new Date()),
    openedAt: payload.openedAt || new Date().toISOString(),
    closedAt: payload.closedAt || '',
    entryMarketCap: payload.entryMarketCap ?? '',
    exitMarketCap: payload.exitMarketCap ?? '',
    investAmount: payload.investAmount ?? '',
    pnlDollar: payload.pnlDollar ?? '',
    pnlPercent: payload.pnlPercent ?? '',
    txLink: payload.txLink || '',
    setup: payload.setup || '',
    entryReason: payload.entryReason || '',
    exitReason: payload.exitReason || '',
    emotion: payload.emotion || '',
    mistakes: payload.mistakes || '',
    lesson: payload.lesson || '',
    notes: payload.notes || '',
    images: Array.isArray(payload.images) ? payload.images : [],
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!trade.token) {
    return res.status(400).json({ message: 'نام توکن لازم است.' });
  }

  const nextTrades = [trade, ...trades.filter((item) => item.id !== trade.id)];
  writeTrades(nextTrades);

  if (REMOTE_ENABLED) {
    try {
      await writeRemoteRecords([{ id: trade.id, updated_at: trade.updatedAt, deleted: false, payload: trade }]);
    } catch (error) {
      return res.status(503).json({ message: 'ذخیره در فضای ابری ناموفق بود. دوباره تلاش کن.' });
    }
  }

  res.status(201).json({ trade, summary: buildSummary(nextTrades) });
});

app.post('/api/trades/sync', async (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.trades) ? req.body.trades : []);
  const incomingDeletions = Array.isArray(req.body) ? [] : (Array.isArray(req.body.deleted) ? req.body.deleted : []);
  if (REMOTE_ENABLED) {
    try {
      const merged = mergeJournalSync(await fetchRemoteRecords(), incoming, incomingDeletions);
      await writeRemoteRecords(merged);
      const active = merged.filter((record) => !record.deleted).map((record) => record.payload);
      const deleted = merged.filter((record) => record.deleted).map((record) => ({ id: record.id, deletedAt: record.updated_at }));
      writeTrades(active);
      return res.json({ ok: true, trades: active, deleted });
    } catch (error) {
      return res.status(503).json({ message: 'همگام‌سازی با فضای ابری ناموفق بود.' });
    }
  }
  const current = readTrades();
  const merged = [...incoming, ...current.filter((item) => !incoming.some((candidate) => candidate.id === item.id))];
  writeTrades(merged);
  res.json({ ok: true, trades: merged, summary: buildSummary(merged) });
});

app.put('/api/trades/:id', (req, res) => {
  const id = req.params.id;
  const trades = readTrades();
  const index = trades.findIndex((trade) => trade.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'معامله پیدا نشد.' });
  }

  const nextTrade = {
    ...trades[index],
    ...req.body,
    id,
    updatedAt: new Date().toISOString(),
  };

  const nextTrades = [...trades.slice(0, index), nextTrade, ...trades.slice(index + 1)];
  writeTrades(nextTrades);
  if (REMOTE_ENABLED) {
    writeRemoteRecords([{ id, updated_at: nextTrade.updatedAt, deleted: false, payload: nextTrade }])
      .then(() => res.json({ trade: nextTrade, summary: buildSummary(nextTrades) }))
      .catch(() => res.status(503).json({ message: 'ذخیره در فضای ابری ناموفق بود.' }));
    return;
  }
  res.json({ trade: nextTrade, summary: buildSummary(nextTrades) });
});

app.delete('/api/trades/:id', async (req, res) => {
  const id = req.params.id;
  const trades = readTrades();
  const nextTrades = trades.filter((trade) => trade.id !== id);
  writeTrades(nextTrades);
  if (REMOTE_ENABLED) {
    try {
      const deletedAt = new Date().toISOString();
      await writeRemoteRecords([{ id, updated_at: deletedAt, deleted: true, payload: {} }]);
    } catch (error) {
      return res.status(503).json({ message: 'حذف از فضای ابری ناموفق بود.' });
    }
  }
  res.json({ success: true, summary: buildSummary(nextTrades) });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`XAYNO journal app running on http://localhost:${PORT}`);
});
