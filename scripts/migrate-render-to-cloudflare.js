const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const sourceUrl = 'https://xayno-journa.onrender.com';
const targetUrl = 'https://xayno-journal-api.seyed-rasool2017.workers.dev';
const maxBatchBytes = 500_000;

function ask(question) {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => terminal.question(question, (answer) => {
    terminal.close();
    resolve(answer.trim());
  }));
}

function askSecret(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('اجرای امن این ابزار به ترمینال تعاملی نیاز دارد؛ آن را در PowerShell یا ترمینال VS Code اجرا کن.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('انتقال لغو شد.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value.trim());
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (/^[\x20-\x7e]$/.test(character)) value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function requestJson(url, key, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${key}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `درخواست ناموفق بود (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function setCloudflareAccessKey(key) {
  const command = process.env.ComSpec || 'cmd.exe';
  const wrangler = path.join(process.cwd(), 'node_modules', '.bin', 'wrangler.cmd');
  const result = spawnSync(command, ['/d', '/s', '/c', `"${wrangler}" secret put JOURNAL_ACCESS_KEY`], {
    input: `${key}\n`,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['pipe', 'ignore', 'ignore'],
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error('ثبت امن کلید در Cloudflare ناموفق بود؛ هیچ معامله‌ای منتقل نشد. وضعیت ورود Wrangler را بررسی کن.');
  }
}

function mergeTrades(...tradeLists) {
  const unique = new Map();
  for (const list of tradeLists) {
    for (const trade of list) {
      const id = String(trade.id);
      const existing = unique.get(id);
      const existingTime = Date.parse(existing?.updatedAt || existing?.createdAt || existing?.openedAt || '') || 0;
      const incomingTime = Date.parse(trade.updatedAt || trade.createdAt || trade.openedAt || '') || 0;
      if (!existing || incomingTime >= existingTime) unique.set(id, trade);
    }
  }
  return [...unique.values()];
}

async function readOptionalTradesFile(filePath, label) {
  if (!filePath) return [];
  let contents;
  try {
    contents = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' && label === 'فایل محلی سرور') return [];
    throw new Error(`خواندن ${label} ناموفق بود؛ مسیر فایل را بررسی کن.`);
  }
  let payload;
  try {
    payload = JSON.parse(contents);
  } catch {
    throw new Error(`${label} JSON معتبر نیست.`);
  }
  return validateTradeRecords(Array.isArray(payload) ? payload : payload?.trades);
}

function validateTradeRecords(value) {
  if (!Array.isArray(value)) throw new Error('فهرست معاملات با قالب معتبر برنگشت.');
  const unique = new Map();
  for (const trade of value) {
    if (!trade || typeof trade !== 'object' || Array.isArray(trade)
      || !String(trade.id || '').trim() || !String(trade.token || '').trim()) {
      throw new Error('یک معامله شناسه یا نام توکن ندارد؛ انتقال متوقف شد و هیچ داده‌ای به Cloudflare ارسال نشد.');
    }
    unique.set(String(trade.id), trade);
  }
  return [...unique.values()];
}

function makeBatches(trades) {
  const batches = [];
  let batch = [];
  let batchBytes = 0;
  for (const trade of trades) {
    const tradeBytes = Buffer.byteLength(JSON.stringify(trade), 'utf8');
    if (tradeBytes > maxBatchBytes) {
      throw new Error('یکی از معامله‌ها یا عکس‌هایش از سقف حجم انتقال بیشتر است؛ هیچ بسته‌ای ارسال نشد.');
    }
    if (batch.length && (batch.length >= 25 || batchBytes + tradeBytes > maxBatchBytes)) {
      batches.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(trade);
    batchBytes += tradeBytes;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function main() {
  console.log('این انتقال فقط معامله‌ها را از Render می‌خواند و به Cloudflare اضافه می‌کند.');
  console.log('معامله‌های موجود در Cloudflare هرگز بازنویسی یا حذف نمی‌شوند؛ منبع Render هم دست‌نخورده می‌ماند.');
  const sourceKey = await askSecret('کلید دسترسی فعلی Render (ورودی پنهان است): ');
  if (!sourceKey) throw new Error('کلید Render وارد نشد.');

  console.log('در حال دریافت فهرست معامله‌ها از Render...');
  const sourcePayload = await requestJson(`${sourceUrl}/api/trades`, sourceKey);
  const renderTrades = validateTradeRecords(sourcePayload.trades);
  const localTrades = await readOptionalTradesFile(path.join(process.cwd(), 'data', 'trades.json'), 'فایل محلی سرور');
  const backupPath = await ask('مسیر پشتیبان JSON دسکتاپ (اختیاری؛ برای رد شدن Enter بزن): ');
  const backupTrades = await readOptionalTradesFile(backupPath, 'پشتیبان دسکتاپ');
  const trades = mergeTrades(localTrades, backupTrades, renderTrades);
  const batches = makeBatches(trades);
  console.log(`معاملات Render: ${renderTrades.length}؛ فایل محلی سرور: ${localTrades.length}؛ پشتیبان دسکتاپ: ${backupTrades.length}.`);
  console.log(`تعداد معامله‌های یکتا برای انتقال: ${trades.length}`);
  console.log('پس از تأیید، کلید Render به‌صورت امن به‌عنوان JOURNAL_ACCESS_KEY در Cloudflare ثبت می‌شود؛ مقدار قبلی کلید Cloudflare جایگزین خواهد شد. کلید Render و داده‌های مبدأ تغییر نمی‌کنند.');
  const confirmation = await ask('اگر با انتقال معاملات و جایگزینی کلید Cloudflare موافقی، IMPORT را وارد کن: ');
  if (confirmation !== 'IMPORT') {
    console.log('انتقال لغو شد؛ هیچ معامله‌ای به Cloudflare ارسال نشد.');
    return;
  }

  console.log('در حال تنظیم کلید Cloudflare از ورودی امن Render...');
  setCloudflareAccessKey(sourceKey);
  const targetKey = sourceKey;
  const health = await requestJson(`${targetUrl}/api/health`, targetKey);
  if (!health.remoteEnabled || health.database !== 'D1') {
    throw new Error('مقصد Cloudflare یا دیتابیس D1 آماده نیست.');
  }

  const before = await requestJson(`${targetUrl}/api/migration/status`, targetKey);
  let inserted = 0;
  let skipped = 0;
  for (let index = 0; index < batches.length; index += 1) {
    const result = await requestJson(`${targetUrl}/api/migration/import`, targetKey, {
      method: 'POST',
      body: JSON.stringify({ trades: batches[index] }),
    });
    if (result.ok !== true || !Number.isInteger(result.inserted) || !Number.isInteger(result.skipped)) {
      throw new Error(`پاسخ بستهٔ ${index + 1} معتبر نبود؛ برای ادامه می‌توان ابزار را دوباره اجرا کرد، چون انتقال idempotent است.`);
    }
    inserted += result.inserted;
    skipped += result.skipped;
    console.log(`بسته ${index + 1} از ${batches.length}: ${result.inserted} اضافه، ${result.skipped} تکراری و دست‌نخورده`);
  }

  const after = await requestJson(`${targetUrl}/api/migration/status`, targetKey);
  const expectedActiveCount = before.trades.active + inserted;
  if (after.trades.active !== expectedActiveCount) {
    throw new Error(`بررسی نهایی تعداد موفق نبود. قبل: ${before.trades.active}، اضافه‌شده: ${inserted}، بعد: ${after.trades.active}. داده‌ای حذف نشده؛ ابزار را دوباره اجرا نکن و این شمارش‌ها را گزارش کن.`);
  }
  console.log(`پایان: ${inserted} معامله اضافه شد؛ ${skipped} معاملهٔ موجود بدون تغییر رد شد.`);
  console.log(`بررسی شمارش D1: ${before.trades.active} قبل، ${after.trades.active} بعد.`);
  console.log('فایل‌ها، داده‌های Render و معاملات محلی حذف یا تغییر داده نشدند.');
}

main().catch((error) => {
  console.error(`انتقال کامل نشد: ${error.message}`);
  process.exitCode = 1;
});
