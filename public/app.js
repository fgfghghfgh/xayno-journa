const STORAGE_KEY = 'xayno-local-journal';
const ACCESS_KEY_STORAGE = 'xayno-journal-access-key';
const state = {
  trades: [],
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: new Date().toISOString().slice(0, 10),
  formImages: [],
  remoteEnabled: false,
};

const summaryGrid = document.getElementById('summaryGrid');
const calendarGrid = document.getElementById('calendarGrid');
const monthLabel = document.getElementById('monthLabel');
const selectedDayLabel = document.getElementById('selectedDayLabel');
const selectedDayTrades = document.getElementById('selectedDayTrades');
const selectedDayPnl = document.getElementById('selectedDayPnl');
const tradeForm = document.getElementById('tradeForm');
const saveStatus = document.getElementById('saveStatus');
const imagePreviews = document.getElementById('imagePreviews');
const syncLabel = document.getElementById('syncLabel');
const syncState = document.getElementById('syncState');
let accessKey = localStorage.getItem(ACCESS_KEY_STORAGE) || '';
let syncInProgress = false;

function updateSyncStatus(online) {
  syncLabel.textContent = state.remoteEnabled ? 'همگام‌سازی ابری' : 'ذخیرهٔ محلی';
  syncState.textContent = state.remoteEnabled ? (online ? 'متصل' : 'قطع') : 'فقط این دستگاه';
  syncState.style.color = state.remoteEnabled && online ? 'var(--green)' : 'var(--yellow)';
}

function promptForAccessKey() {
  const entered = window.prompt('برای مشاهده و همگام‌سازی ژورنال، کلید خصوصی ژورنال را وارد کن:');
  if (!entered) throw new Error('برای دسترسی به ژورنال، کلید خصوصی لازم است.');
  accessKey = entered.trim();
  localStorage.setItem(ACCESS_KEY_STORAGE, accessKey);
}

async function apiFetch(url, options = {}) {
  if (state.remoteEnabled && !accessKey) promptForAccessKey();
  const headers = new Headers(options.headers || {});
  if (state.remoteEnabled) headers.set('Authorization', `Bearer ${accessKey}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && state.remoteEnabled) {
    localStorage.removeItem(ACCESS_KEY_STORAGE);
    accessKey = '';
    promptForAccessKey();
    headers.set('Authorization', `Bearer ${accessKey}`);
    return fetch(url, { ...options, headers });
  }
  return response;
}

async function changeJournalAccessKey() {
  if (!state.remoteEnabled) {
    window.alert('اتصال ابری هنوز در Render فعال نشده است.');
    return;
  }
  localStorage.removeItem(ACCESS_KEY_STORAGE);
  accessKey = '';
  try {
    promptForAccessKey();
    updateSyncStatus(false);
    const response = await apiFetch('/api/trades');
    if (response.status === 401) throw new Error('کلید دسترسی رد شد؛ مقدار JOURNAL_ACCESS_KEY در Render را بررسی کن.');
    if (response.status === 503) {
      const details = await response.json().catch(() => ({}));
      throw new Error(details.message || 'اتصال دیتابیس برقرار نشد؛ جدول journal_trades را در Supabase بررسی کن.');
    }
    if (!response.ok) throw new Error(`خطای سرور (${response.status}).`);
    const payload = await response.json();
    if (!Array.isArray(payload.trades)) throw new Error('دریافت معاملات کامل نشد.');
    state.trades = payload.trades;
    saveLocalTrades(state.trades);
    renderAll();
    updateSyncStatus(true);
  } catch (error) {
    updateSyncStatus(false);
    window.alert(error.message);
  }
}

function renderImagePreviews() {
  imagePreviews.replaceChildren(...state.formImages.map((source, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview';
    const image = document.createElement('img');
    image.src = source;
    image.alt = `تصویر معامله ${index + 1}`;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'mini-btn';
    removeButton.textContent = 'حذف عکس';
    removeButton.addEventListener('click', () => {
      state.formImages.splice(index, 1);
      renderImagePreviews();
    });
    wrapper.append(image, removeButton);
    return wrapper;
  }));
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('خواندن یکی از تصاویر انجام نشد.'));
    };
    image.src = objectUrl;
  });
}

document.getElementById('tradeImages').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []).slice(0, 3 - state.formImages.length);
  try {
    state.formImages.push(...await Promise.all(files.map(compressImage)));
    renderImagePreviews();
  } catch (error) {
    saveStatus.textContent = error.message;
    saveStatus.hidden = false;
  } finally {
    event.target.value = '';
  }
});

function openTradeForm() {
  saveStatus.hidden = true;
  tradeForm.style.display = 'grid';
  tradeForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('token').focus({ preventScroll: true });
}

function readLocalTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveLocalTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

async function fetchServerTrades() {
  try {
    const response = await apiFetch('/api/trades');
    if (!response.ok) throw new Error('api fail');
    const payload = await response.json();
    return Array.isArray(payload.trades) ? payload.trades : [];
  } catch (error) {
    return readLocalTrades();
  }
}

async function syncLocalTradesToServer(pendingTrades = readLocalTrades()) {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    const response = await apiFetch('/api/trades/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: pendingTrades, deleted: [] }),
    });
    if (!response.ok) {
      updateSyncStatus(false);
      return;
    }
    const payload = await response.json();
    if (Array.isArray(payload.trades)) {
      saveLocalTrades(payload.trades);
      state.trades = payload.trades;
      renderAll();
      updateSyncStatus(true);
    }
  } catch (error) {
    updateSyncStatus(false);
  } finally {
    syncInProgress = false;
  }
}

function tradePnl(trade) {
  const hasPnlDollar = trade.pnlDollar !== '' && trade.pnlDollar != null && Number.isFinite(Number(trade.pnlDollar));
  if (hasPnlDollar) return Number(trade.pnlDollar);
  const invest = Number(trade.investAmount);
  const pnlPct = Number(trade.pnlPercent);
  if (Number.isFinite(invest) && Number.isFinite(pnlPct)) return (invest * pnlPct) / 100;
  return 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch (error) {
    return '';
  }
}

function safeImageSource(value) {
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value)) return value;
  return safeExternalUrl(value);
}

function getTradeDateKey(trade) {
  return trade.journalDate || (trade.openedAt || trade.createdAt || '').slice(0, 10) || '';
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
    wins,
    losses,
    winRate,
    realizedPnl,
    realizedPercent,
    openTrades: trades.filter((trade) => trade.status === 'open').length,
    totalTrades: trades.length,
  };
}

function renderSummary() {
  const summary = buildSummary(state.trades);
  const cards = [
    { label: 'معاملات ثبت‌شده', value: summary.totalTrades },
    { label: 'وین‌ریت', value: `${summary.winRate.toFixed(1)}%` },
    { label: 'خالص سود/ضرر', value: `${summary.realizedPnl >= 0 ? '+' : '-'}$${Math.abs(summary.realizedPnl).toFixed(2)}` },
    { label: 'بازده کل', value: `${summary.realizedPercent >= 0 ? '+' : ''}${summary.realizedPercent.toFixed(2)}%` },
    { label: 'برد', value: summary.wins },
    { label: 'باخت', value: summary.losses },
  ];

  summaryGrid.innerHTML = cards.map((item) => `
    <div class="metric">
      <label>${item.label}</label>
      <strong style="color: ${item.label === 'خالص سود/ضرر' || item.label === 'بازده کل' ? (summary.realizedPnl >= 0 || summary.realizedPercent >= 0 ? '#00f5a0' : '#ff4a6b') : '#edf7f4'};">${item.value}</strong>
    </div>
  `).join('');
}

function groupTradesByDay() {
  const map = {};
  state.trades.forEach((trade) => {
    const key = getTradeDateKey(trade);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(trade);
  });
  return map;
}

function renderCalendar() {
  monthLabel.textContent = state.currentMonth.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' });

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const offset = (firstDay.getDay() + 1) % 7;
  const days = [];

  for (let i = 0; i < offset; i++) days.push(null);
  for (let day = 1; day <= lastDay.getDate(); day++) days.push(day);
  while (days.length % 7 !== 0) days.push(null);

  const groups = groupTradesByDay();

  calendarGrid.innerHTML = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه']
    .map((label) => `<div class="week-name">${label}</div>`)
    .join('') + days.map((dayNumber) => {
      if (!dayNumber) return '<div class="day-cell" style="visibility:hidden"></div>';
      const dateKey = new Date(year, month, dayNumber).toISOString().slice(0, 10);
      const dayTrades = groups[dateKey] || [];
      const dayPnl = dayTrades.reduce((sum, trade) => sum + tradePnl(trade), 0);
      const wins = dayTrades.filter((trade) => tradePnl(trade) > 0).length;
      const losses = dayTrades.filter((trade) => tradePnl(trade) < 0).length;
      const openCount = dayTrades.filter((trade) => trade.status === 'open').length;
      const selected = dateKey === state.selectedDate ? 'selected' : '';
      const tone = dayPnl > 0 ? 'green' : dayPnl < 0 ? 'red' : '';

      return `
        <button class="day-cell ${selected} ${tone}" data-date="${dateKey}">
          <div class="day-num">${dayNumber}</div>
          <div class="day-badges">
            ${wins ? `<span class="badge-win">+${wins}</span>` : ''}
            ${losses ? `<span class="badge-loss">-${losses}</span>` : ''}
            ${openCount ? `<span class="badge-open">${openCount}●</span>` : ''}
          </div>
        </button>
      `;
    }).join('');

  document.querySelectorAll('.day-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      state.selectedDate = cell.dataset.date;
      renderCalendar();
      renderSelectedDay();
    });
  });
}

function renderSelectedDay() {
  const groups = groupTradesByDay();
  const key = state.selectedDate;
  const trades = groups[key] || [];
  const totalPnl = trades.reduce((sum, trade) => sum + tradePnl(trade), 0);

  selectedDayLabel.textContent = new Date(`${key}T00:00:00`).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  selectedDayPnl.textContent = trades.length ? `${totalPnl >= 0 ? '+' : '-'}$${Math.abs(totalPnl).toFixed(2)}` : '';
  selectedDayPnl.style.color = totalPnl >= 0 ? 'var(--green)' : totalPnl < 0 ? 'var(--red)' : 'var(--muted)';

  if (!trades.length) {
    selectedDayTrades.innerHTML = '<div class="empty">برای این روز معامله‌ای ثبت نشده است.</div>';
    return;
  }

  selectedDayTrades.innerHTML = trades.map((trade) => {
    const pnl = tradePnl(trade);
    const color = trade.status === 'open' ? 'var(--yellow)' : pnl >= 0 ? 'var(--green)' : 'var(--red)';
    return `
      <div class="trade-item">
        <div class="trade-row">
          <span class="trade-token">${escapeHtml(trade.token)}</span>
          <span class="trade-pnl" style="color:${color}">${trade.status === 'open' ? 'باز' : `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`}</span>
        </div>
        <div class="trade-meta">${escapeHtml(trade.network)} • ${trade.status === 'closed' ? 'بسته' : 'باز'} • ${trade.investAmount ? '$' + Number(trade.investAmount).toFixed(2) : '—'}</div>
        ${trade.address ? `<div class="trade-meta">آدرس: ${escapeHtml(trade.address)}</div>` : ''}
        ${trade.openedAt ? `<div class="trade-meta">ورود: ${escapeHtml(trade.openedAt)}</div>` : ''}
        ${trade.closedAt ? `<div class="trade-meta">خروج: ${escapeHtml(trade.closedAt)}</div>` : ''}
        ${trade.entryMarketCap ? `<div class="trade-meta">مارکت‌کپ ورود: $${escapeHtml(trade.entryMarketCap)}</div>` : ''}
        ${trade.exitMarketCap ? `<div class="trade-meta">مارکت‌کپ خروج: $${escapeHtml(trade.exitMarketCap)}</div>` : ''}
        ${trade.riskLevel ? `<div class="trade-meta">ریسک: ${escapeHtml(trade.riskLevel)}</div>` : ''}
        ${safeExternalUrl(trade.txLink) ? `<div class="trade-meta"><a href="${escapeHtml(safeExternalUrl(trade.txLink))}" target="_blank" rel="noopener">لینک تراکنش</a></div>` : ''}
        ${trade.setup ? `<div class="trade-meta">ستاپ: ${escapeHtml(trade.setup)}</div>` : ''}
        ${trade.entryReason ? `<div class="trade-meta">دلیل ورود: ${escapeHtml(trade.entryReason)}</div>` : ''}
        ${trade.exitReason ? `<div class="trade-meta">دلیل خروج: ${escapeHtml(trade.exitReason)}</div>` : ''}
        ${trade.emotion ? `<div class="trade-meta">حالت ذهنی: ${escapeHtml(trade.emotion)}</div>` : ''}
        ${trade.mistakes ? `<div class="trade-meta">اشتباه‌ها: ${escapeHtml(trade.mistakes)}</div>` : ''}
        ${trade.lesson ? `<div class="trade-meta">درس: ${escapeHtml(trade.lesson)}</div>` : ''}
        ${trade.notes ? `<div class="trade-meta">${escapeHtml(trade.notes)}</div>` : ''}
        ${Array.isArray(trade.images) && trade.images.length ? `<div class="image-previews">${trade.images.map((image, index) => { const source = safeImageSource(image); return source ? `<img src="${escapeHtml(source)}" alt="تصویر معامله ${index + 1}" loading="lazy">` : ''; }).join('')}</div>` : ''}
        <div class="trade-actions">
          <button class="mini-btn" data-edit="${escapeHtml(trade.id)}">ویرایش</button>
          <button class="mini-btn" data-delete="${escapeHtml(trade.id)}">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openFormForEdit(btn.dataset.edit));
  });

  document.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteTrade(btn.dataset.delete));
  });
}

function fillForm(trade) {
  document.getElementById('tradeId').value = trade.id || '';
  document.getElementById('journalDate').value = trade.journalDate || getTradeDateKey(trade) || new Date().toISOString().slice(0, 10);
  document.getElementById('token').value = trade.token || '';
  document.getElementById('network').value = trade.network || 'Solana';
  document.getElementById('status').value = trade.status || 'closed';
  document.getElementById('address').value = trade.address || '';
  document.getElementById('openedAt').value = (trade.openedAt || '').slice(0, 16);
  document.getElementById('closedAt').value = (trade.closedAt || '').slice(0, 16);
  document.getElementById('entryMarketCap').value = trade.entryMarketCap ?? '';
  document.getElementById('exitMarketCap').value = trade.exitMarketCap ?? '';
  document.getElementById('investAmount').value = trade.investAmount ?? '';
  document.getElementById('pnlPercent').value = trade.pnlPercent ?? '';
  document.getElementById('pnlDollar').value = trade.pnlDollar ?? '';
  document.getElementById('pnlOutcome').value = trade.pnlOutcome || 'profit';
  document.getElementById('riskLevel').value = trade.riskLevel || 'high';
  document.getElementById('txLink').value = trade.txLink || '';
  document.getElementById('setup').value = trade.setup || '';
  document.getElementById('entryReason').value = trade.entryReason || '';
  document.getElementById('exitReason').value = trade.exitReason || '';
  document.getElementById('emotion').value = trade.emotion || '';
  document.getElementById('mistakes').value = trade.mistakes || '';
  document.getElementById('lesson').value = trade.lesson || '';
  document.getElementById('notes').value = trade.notes || '';
  state.formImages = Array.isArray(trade.images) ? [...trade.images].slice(0, 3) : [];
  renderImagePreviews();
}

function openFormForEdit(id) {
  const trade = state.trades.find((item) => item.id === id);
  if (!trade) return;
  fillForm(trade);
  openTradeForm();
}

function resetForm() {
  tradeForm.reset();
  document.getElementById('tradeId').value = '';
  document.getElementById('journalDate').value = state.selectedDate;
  state.formImages = [];
  renderImagePreviews();
  saveStatus.hidden = true;
}

function getFormValues() {
  return {
    id: document.getElementById('tradeId').value || undefined,
    journalDate: document.getElementById('journalDate').value,
    token: document.getElementById('token').value.trim(),
    network: document.getElementById('network').value,
    status: document.getElementById('status').value,
    address: document.getElementById('address').value.trim(),
    openedAt: document.getElementById('openedAt').value,
    closedAt: document.getElementById('closedAt').value,
    entryMarketCap: document.getElementById('entryMarketCap').value,
    exitMarketCap: document.getElementById('exitMarketCap').value,
    investAmount: document.getElementById('investAmount').value === '' ? '' : Number(document.getElementById('investAmount').value),
    pnlPercent: document.getElementById('pnlPercent').value === '' ? '' : Number(document.getElementById('pnlPercent').value),
    pnlDollar: document.getElementById('pnlDollar').value === '' ? '' : Number(document.getElementById('pnlDollar').value),
    pnlOutcome: document.getElementById('pnlOutcome').value,
    riskLevel: document.getElementById('riskLevel').value,
    txLink: document.getElementById('txLink').value.trim(),
    setup: document.getElementById('setup').value.trim(),
    entryReason: document.getElementById('entryReason').value.trim(),
    exitReason: document.getElementById('exitReason').value.trim(),
    emotion: document.getElementById('emotion').value.trim(),
    mistakes: document.getElementById('mistakes').value.trim(),
    lesson: document.getElementById('lesson').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    images: state.formImages,
    createdAt: new Date().toISOString(),
  };
}

async function saveTrade(event) {
  event.preventDefault();
  const values = getFormValues();
  if (!values.token) {
    saveStatus.textContent = 'نام توکن را وارد کن.';
    saveStatus.hidden = false;
    document.getElementById('token').focus();
    return;
  }

  const submitButton = tradeForm.querySelector('button[type="submit"]');
  const nextTrade = {
    id: values.id || `trade_${Date.now()}`,
    ...values,
    createdAt: state.trades.find((trade) => trade.id === values.id)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  submitButton.disabled = true;
  saveStatus.textContent = 'در حال ذخیره...';
  saveStatus.style.color = 'var(--text-muted)';
  saveStatus.hidden = false;
  try {
    const response = await apiFetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextTrade),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'ذخیره در سرور انجام نشد.');

    const existingIndex = state.trades.findIndex((trade) => trade.id === nextTrade.id);
    state.trades = existingIndex >= 0
      ? state.trades.map((trade) => trade.id === nextTrade.id ? payload.trade : trade)
      : [payload.trade, ...state.trades];
    saveLocalTrades(state.trades);
    tradeForm.style.display = 'none';
    resetForm();
    renderAll();
    updateSyncStatus(true);
  } catch (error) {
    saveStatus.textContent = `${error.message}؛ فعلاً داده فقط در همین دستگاه نگه داشته شد و به دستگاه دیگر نرسیده است.`;
    saveStatus.style.color = 'var(--red)';
    saveLocalTrades([nextTrade, ...state.trades.filter((trade) => trade.id !== nextTrade.id)]);
    state.trades = readLocalTrades();
    renderAll();
    updateSyncStatus(false);
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteTrade(id) {
  try {
    const response = await apiFetch(`/api/trades/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('حذف از سرور انجام نشد.');
    state.trades = state.trades.filter((trade) => trade.id !== id);
    saveLocalTrades(state.trades);
    renderAll();
  } catch (error) {
    window.alert(`${error.message} معامله در سایت باقی ماند.`);
  }
}

function renderAll() {
  renderSummary();
  renderCalendar();
  renderSelectedDay();
}

document.getElementById('newTradeBtn').addEventListener('click', () => {
  resetForm();
  openTradeForm();
});

document.getElementById('syncKeyBtn').addEventListener('click', changeJournalAccessKey);

document.getElementById('cancelFormBtn').addEventListener('click', () => {
  tradeForm.style.display = 'none';
  resetForm();
});

document.getElementById('tradeForm').addEventListener('submit', saveTrade);
document.getElementById('prevMonthBtn').addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('nextMonthBtn').addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

async function hydrateApp() {
  try {
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();
    state.remoteEnabled = Boolean(config.remoteEnabled);
  } catch (error) {
    state.remoteEnabled = false;
  }
  updateSyncStatus(false);
  const pendingLocalTrades = readLocalTrades();
  const serverTrades = await fetchServerTrades();
  if (Array.isArray(serverTrades) && (serverTrades.length || state.remoteEnabled)) {
    state.trades = serverTrades;
    saveLocalTrades(serverTrades);
  } else {
    state.trades = pendingLocalTrades;
  }

  state.selectedDate = new Date().toISOString().slice(0, 10);
  resetForm();
  renderAll();
  syncLocalTradesToServer(pendingLocalTrades);
  window.setInterval(() => {
    if (!document.hidden) syncLocalTradesToServer();
  }, 20000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncLocalTradesToServer();
  });
}

hydrateApp();
