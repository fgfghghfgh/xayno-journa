const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'trades.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const REMOTE_ENABLED = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

async function fetchRemoteTrades() {
  if (!REMOTE_ENABLED) return null;
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/trades?select=*`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    return null;
  }
}

async function persistRemoteTrades(trades) {
  if (!REMOTE_ENABLED) return false;
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/trades`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-delete',
      },
    });
    if (!response.ok) return false;

    for (const trade of trades) {
      const payload = { ...trade };
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/trades`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
    }
    return true;
  } catch (error) {
    return false;
  }
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
    return Array.isArray(parsed) ? parsed : [];
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
  res.json({ remoteEnabled: REMOTE_ENABLED });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), remoteEnabled: REMOTE_ENABLED });
});

app.get('/api/trades', async (_req, res) => {
  const localTrades = readTrades();
  if (!REMOTE_ENABLED) {
    return res.json({ trades: localTrades.sort((a, b) => new Date(b.createdAt || b.openedAt || 0) - new Date(a.createdAt || a.openedAt || 0)) });
  }

  const remoteTrades = await fetchRemoteTrades();
  if (remoteTrades && remoteTrades.length) {
    writeTrades(remoteTrades);
    return res.json({ trades: remoteTrades });
  }

  return res.json({ trades: localTrades });
});

app.get('/api/summary', (_req, res) => {
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
    await persistRemoteTrades(nextTrades);
  }

  res.status(201).json({ trade, summary: buildSummary(nextTrades) });
});

app.post('/api/trades/sync', async (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : [];
  const current = readTrades();
  const merged = [...incoming, ...current.filter((item) => !incoming.some((candidate) => candidate.id === item.id))];
  writeTrades(merged);
  if (REMOTE_ENABLED) await persistRemoteTrades(merged);
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
  res.json({ trade: nextTrade, summary: buildSummary(nextTrades) });
});

app.delete('/api/trades/:id', (req, res) => {
  const id = req.params.id;
  const trades = readTrades();
  const nextTrades = trades.filter((trade) => trade.id !== id);
  writeTrades(nextTrades);
  res.json({ success: true, summary: buildSummary(nextTrades) });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`XAYNO journal app running on http://localhost:${PORT}`);
});
