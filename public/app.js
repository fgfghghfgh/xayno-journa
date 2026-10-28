const STORAGE_KEY = 'xayno-local-journal';
const ACCESS_KEY_STORAGE = 'xayno-journal-access-key';
function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const state = {
  trades: [],
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: localDateKey(new Date()),
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
let journalChartInstance = null;
let journalChartOverlayIds = [];
let journalChartOverlayState = new Map();
let journalSelectedOverlayId = null;
let journalCrosshair = { color: '#91a19c', width: 1, style: 'dashed' };

const JOURNAL_CHART_TOOLS = [
  { id: 'segment', label: 'خط روند', glyph: '╱' },
  { id: 'longPosition', label: 'پوزیشن لانگ', glyph: '↗' },
  { id: 'shortPosition', label: 'پوزیشن شورت', glyph: '↘' },
  { id: 'horizontalStraightLine', label: 'خط افقی', glyph: '─' },
  { id: 'horizontalRayLine', label: 'نیم‌خط افقی', glyph: '⟶' },
  { id: 'verticalStraightLine', label: 'خط عمودی', glyph: '│' },
  { id: 'fibonacciLine', label: 'فیبوناچی', glyph: 'F' },
  { id: 'fibExtension', label: 'فیبوناچی گسترشی', glyph: 'FE' },
  { id: 'drawPriceRange', label: 'محدوده قیمت', glyph: '↕' },
  { id: 'drawRect', label: 'مستطیل', glyph: '□' },
  { id: 'drawText', label: 'متن', glyph: 'T' },
  { id: 'drawCross', label: 'علامت ضربدر', glyph: '×' },
];

const FIB_DEFAULT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.65, 0.705, 0.786, 0.886, 1, 1.13, 1.272, 1.414, 1.618, 2, 2.272, 2.414, 2.618, 3, 3.618, 4.236];
const FIB_RETRACE_CONFIG = FIB_DEFAULT_LEVELS.map((value) => ({ value, label: String(value), enabled: true, color: '#ff6b2b', size: 1 }));
const FIB_EXTENSION_CONFIG = FIB_DEFAULT_LEVELS.map((value) => ({ value, label: String(value), enabled: true, color: '#00d4f5', size: 1 }));

function fibOverlayFigures(payload, extension) {
  const coordinates = payload.coordinates || [];
  const points = payload.overlay.points || [];
  const required = extension ? 3 : 2;
  if (coordinates.length < required || points.length < required) return [];
  const extendData = payload.overlay.extendData || {};
  const levels = (Array.isArray(extendData.fibLevels) ? extendData.fibLevels : extension ? FIB_EXTENSION_CONFIG : FIB_RETRACE_CONFIG)
    .filter((level) => level.enabled !== false).slice().sort((left, right) => Number(left.value) - Number(right.value));
  const zones = extendData.fibZones || {};
  const direction = extendData.fibDirection || 'bearish';
  const line = payload.overlay.styles?.line || {};
  const high = Math.max(Number(points[0].value) || 0, Number(points[1].value) || 0);
  const low = Math.min(Number(points[0].value) || 0, Number(points[1].value) || 0);
  const swing = (Number(points[1].value) || 0) - (Number(points[0].value) || 0);
  const anchor = extension ? Number(points[2].value) || 0 : 0;
  const xStart = Math.min(coordinates[0].x, coordinates[extension ? 2 : 1].x);
  const xEnd = Math.max(coordinates[0].x, coordinates[extension ? 2 : 1].x);
  const yAxis = payload.yAxis;
  const priceAt = (level) => extension
    ? anchor + swing * Number(level.value) * (direction === 'bearish' ? -1 : 1)
    : direction === 'bullish' ? low + (high - low) * Number(level.value) : high - (high - low) * Number(level.value);
  const figures = [];
  levels.slice(0, -1).forEach((level, index) => {
    const next = levels[index + 1];
    const zone = zones[`${level.value}-${next.value}`];
    if (!zone?.enabled) return;
    const y1 = yAxis.convertToPixel(priceAt(level));
    const y2 = yAxis.convertToPixel(priceAt(next));
    const hex = String(zone.color || '#7b61ff').replace('#', '');
    const fill = /^[\da-f]{6}$/i.test(hex) ? `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${Number(zone.opacity ?? 0.12)})` : 'rgba(123,97,255,.12)';
    figures.push({ type: 'rect', attrs: [{ x: xStart, y: Math.min(y1, y2), width: xEnd - xStart, height: Math.abs(y2 - y1) }], styles: { style: 'stroke_fill', color: fill, borderColor: 'transparent', borderWidth: 0 } });
  });
  figures.push({ type: 'line', attrs: [{ coordinates: extension ? coordinates.slice(0, 3) : [coordinates[0], coordinates[1]] }], styles: { color: line.color || '#00d4f5', size: line.size || 1, style: line.style || 'solid' } });
  levels.forEach((level) => {
    const y = yAxis.convertToPixel(priceAt(level));
    const color = level.color || line.color || '#00d4f5';
    figures.push({ type: 'line', attrs: [{ coordinates: [{ x: xStart, y }, { x: xEnd, y }] }], styles: { color, size: Number(level.size) || 1, style: line.style || 'dashed' } });
    figures.push({ type: 'text', isCheckEvent: false, attrs: [{ x: xEnd + 4, y, text: level.label || String(level.value), align: 'left', baseline: 'middle' }], styles: { color, size: 9, backgroundColor: 'rgba(7,11,16,.86)' } });
  });
  return figures;
}

function rectangleOverlayFigures(payload) {
  const coordinates = payload.coordinates || [];
  if (coordinates.length < 2) return [];
  const line = payload.overlay.styles?.line || {};
  const data = payload.overlay.extendData || {};
  const color = data.fillColor || line.color || '#00d4f5';
  const hex = color.replace('#', '');
  const fill = /^[\da-f]{6}$/i.test(hex) ? `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${Number(data.fillOpacity ?? 0.08)})` : 'rgba(0,212,245,.08)';
  const left = Math.min(coordinates[0].x, coordinates[1].x);
  const top = Math.min(coordinates[0].y, coordinates[1].y);
  return [{ type: 'rect', attrs: [{ x: left, y: top, width: Math.abs(coordinates[1].x - coordinates[0].x), height: Math.abs(coordinates[1].y - coordinates[0].y) }], styles: { style: 'stroke_fill', color: fill, borderColor: line.color || '#00d4f5', borderWidth: line.size || 1, borderStyle: line.style || 'solid' } }];
}

function priceRangeOverlayFigures(payload) {
  const coordinates = payload.coordinates || [];
  const points = payload.overlay.points || [];
  if (coordinates.length < 2 || points.length < 2) return [];
  const start = Number(points[0].value) || 0;
  const end = Number(points[1].value) || 0;
  const change = end - start;
  const color = change >= 0 ? '#00c98b' : '#e35369';
  const left = Math.min(coordinates[0].x, coordinates[1].x);
  const top = Math.min(coordinates[0].y, coordinates[1].y);
  return [
    { type: 'rect', attrs: [{ x: left, y: top, width: Math.abs(coordinates[1].x - coordinates[0].x), height: Math.abs(coordinates[1].y - coordinates[0].y) }], styles: { style: 'stroke_fill', color: change >= 0 ? 'rgba(0,201,139,.08)' : 'rgba(227,83,105,.08)', borderColor: color, borderWidth: 1, borderStyle: 'dashed' } },
    { type: 'line', attrs: [{ coordinates: [coordinates[0], coordinates[1]] }], styles: { color, size: 1.5, style: 'dashed' } },
    { type: 'text', isCheckEvent: false, attrs: [{ x: left + 4, y: top - 4, text: `${change >= 0 ? '+' : ''}${(start ? change / Math.abs(start) * 100 : 0).toFixed(2)}%`, align: 'left', baseline: 'bottom' }], styles: { color, size: 11, weight: '600', backgroundColor: 'rgba(7,11,16,.88)' } },
  ];
}

function positionOverlayFigures(payload, isLong) {
  const coordinates = payload.coordinates || [];
  const points = payload.overlay.points || [];
  if (!coordinates.length || !points.length) return [];
  const data = payload.overlay.extendData || {};
  const entry = Number(points[0].value) || 0;
  const target = Number(points[1]?.value ?? entry);
  const stop = Number(points[2]?.value ?? entry);
  const left = coordinates[0].x;
  const right = Math.max(left + 90, ...coordinates.map((point) => point.x));
  const entryY = coordinates[0].y;
  const targetY = coordinates[1]?.y ?? entryY;
  const stopY = coordinates[2]?.y ?? entryY;
  const profitColor = data.profitColor || '#00c98b';
  const riskColor = data.riskColor || '#e35369';
  const entryColor = payload.overlay.styles?.line?.color || '#d9e2dc';
  const rgba = (hex, alpha) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha})`;
  const figures = [
    { type: 'rect', attrs: [{ x: left, y: Math.min(entryY, targetY), width: right - left, height: Math.max(1, Math.abs(entryY - targetY)) }], styles: { style: 'stroke_fill', color: rgba(profitColor, 0.16), borderColor: rgba(profitColor, 0.72), borderWidth: 1 } },
    { type: 'line', attrs: [{ coordinates: [{ x: left, y: entryY }, { x: right, y: entryY }] }], styles: { color: entryColor, size: 1.5 } },
  ];
  if (coordinates[1]) figures.push({ type: 'line', attrs: [{ coordinates: [{ x: left, y: targetY }, { x: right, y: targetY }] }], styles: { color: profitColor, size: 1.2, style: 'dashed' } });
  if (coordinates[2]) {
    figures.push({ type: 'rect', attrs: [{ x: left, y: Math.min(entryY, stopY), width: right - left, height: Math.max(1, Math.abs(entryY - stopY)) }], styles: { style: 'stroke_fill', color: rgba(riskColor, 0.17), borderColor: rgba(riskColor, 0.78), borderWidth: 1 } });
    figures.push({ type: 'line', attrs: [{ coordinates: [{ x: left, y: stopY }, { x: right, y: stopY }] }], styles: { color: riskColor, size: 1.2, style: 'dashed' } });
  }
  const reward = Math.max(0, isLong ? target - entry : entry - target);
  const risk = Math.max(0, isLong ? entry - stop : stop - entry);
  const ratio = risk ? (reward / risk).toFixed(2) : '∞';
  if (coordinates[2]) figures.push({ type: 'text', isCheckEvent: false, attrs: [{ x: left + 6, y: (targetY + stopY) / 2, width: Math.max(80, right - left - 12), height: 20, text: `R:R 1:${ratio}`, align: 'center', baseline: 'middle' }], styles: { color: '#f4f7f5', size: 11, weight: 'bold', backgroundColor: 'rgba(10,14,17,.74)' } });
  return figures;
}

if (window.klinecharts) {
  try {
    window.klinecharts.registerOverlay({ name: 'fibonacciLine', totalStep: 3, needDefaultPointFigure: true, needDefaultXAxisFigure: true, needDefaultYAxisFigure: true, mode: 'weak_magnet', createPointFigures: (payload) => fibOverlayFigures(payload, false) });
    window.klinecharts.registerOverlay({ name: 'fibExtension', totalStep: 4, needDefaultPointFigure: true, needDefaultXAxisFigure: true, needDefaultYAxisFigure: true, mode: 'weak_magnet', createPointFigures: (payload) => fibOverlayFigures(payload, true) });
    window.klinecharts.registerOverlay({
      name: 'drawText', totalStep: 2, needDefaultPointFigure: true, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false, mode: 'weak_magnet',
      createPointFigures: (payload) => {
        const point = payload.coordinates?.[0];
        if (!point) return [];
        const data = payload.overlay.extendData || {};
        const size = Number(data.size) || 14;
        return [{ type: 'text', attrs: [{ x: point.x, y: point.y, width: Math.max(100, String(data.text || '').length * size * 0.65 + 16), height: size + 12, text: data.text || 'یادداشت', align: 'left', baseline: 'bottom' }], styles: { color: data.color || '#edf7f4', size, weight: data.bold ? 'bold' : 'normal', family: 'Vazirmatn,sans-serif', backgroundColor: 'rgba(20,25,37,.9)', borderSize: 1, borderColor: 'rgba(0,212,245,.25)', borderRadius: 4, paddingLeft: 6, paddingRight: 6, paddingTop: 3, paddingBottom: 3, opacity: data.opacity == null ? 1 : data.opacity } }];
      },
    });
    window.klinecharts.registerOverlay({ name: 'longPosition', totalStep: 4, needDefaultPointFigure: true, needDefaultXAxisFigure: true, needDefaultYAxisFigure: true, mode: 'weak_magnet', createPointFigures: (payload) => positionOverlayFigures(payload, true) });
    window.klinecharts.registerOverlay({ name: 'shortPosition', totalStep: 4, needDefaultPointFigure: true, needDefaultXAxisFigure: true, needDefaultYAxisFigure: true, mode: 'weak_magnet', createPointFigures: (payload) => positionOverlayFigures(payload, false) });
    window.klinecharts.registerOverlay({ name: 'drawRect', totalStep: 3, needDefaultPointFigure: true, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false, mode: 'weak_magnet', createPointFigures: rectangleOverlayFigures });
    window.klinecharts.registerOverlay({ name: 'drawPriceRange', totalStep: 3, needDefaultPointFigure: true, needDefaultXAxisFigure: true, needDefaultYAxisFigure: true, mode: 'weak_magnet', createPointFigures: priceRangeOverlayFigures });
    window.klinecharts.registerOverlay({ name: 'drawCross', totalStep: 1, needDefaultPointFigure: false, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false, mode: 'weak_magnet', createPointFigures: (payload) => { const point = payload.coordinates?.[0]; return point ? [{ type: 'line', attrs: [{ coordinates: [{ x: point.x, y: 0 }, { x: point.x, y: payload.bounding.height }] }, { coordinates: [{ x: 0, y: point.y }, { x: payload.bounding.width, y: point.y }] }], styles: { color: payload.overlay.styles?.line?.color || '#ff3b69', size: payload.overlay.styles?.line?.size || 1, style: payload.overlay.styles?.line?.style || 'dashed' } }] : []; } });
  } catch (error) {}
}

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function closeJournalChart() {
  if (journalChartInstance && window.klinecharts) window.klinecharts.dispose('journal-chart-canvas');
  journalChartInstance = null;
  journalChartOverlayIds = [];
  journalChartOverlayState = new Map();
  journalSelectedOverlayId = null;
  document.getElementById('journalChartModal')?.remove();
}

function drawJournalOverlay(name) {
  if (!journalChartInstance) return;
  const isFib = name === 'fibonacciLine' || name === 'fibExtension';
  const defaultLevels = name === 'fibExtension' ? FIB_EXTENSION_CONFIG : FIB_RETRACE_CONFIG;
  const overlay = {
    name,
    styles: { line: { color: '#00d4f5', size: 1.5, style: 'dashed' } },
    extendData: isFib ? { fibDirection: 'bearish', fibLevels: defaultLevels.map((level) => ({ ...level })) } : name === 'drawText' ? { text: 'یادداشت', color: '#edf7f4', size: 14, bold: false, italic: false, opacity: 1 } : {},
    onClick: (event) => selectJournalOverlay(event?.overlay),
    onDrawEnd: (event) => selectJournalOverlay(event?.overlay),
    onRemoved: (event) => {
      const id = event?.overlay?.id;
      journalChartOverlayIds = journalChartOverlayIds.filter((item) => item !== id);
      journalChartOverlayState.delete(id);
      if (journalSelectedOverlayId === id) journalSelectedOverlayId = null;
      renderJournalToolPanel();
    },
  };
  const id = journalChartInstance.createOverlay(overlay);
  if (id) {
    journalChartOverlayIds.push(id);
    journalChartOverlayState.set(id, { locked: false, hidden: false });
    journalSelectedOverlayId = id;
    renderJournalToolPanel();
  }
}

function selectJournalOverlay(overlay) {
  if (!overlay?.id) return;
  journalSelectedOverlayId = overlay.id;
  renderJournalToolPanel();
}

function updateJournalOverlay(changes, redrawPanel = true) {
  if (!journalChartInstance || !journalSelectedOverlayId) return;
  const overlay = journalChartInstance.getOverlayById(journalSelectedOverlayId);
  if (!overlay) return;
  const patch = { ...changes };
  if (patch.styles?.line) patch.styles = { ...overlay.styles, line: { ...overlay.styles?.line, ...patch.styles.line } };
  if (patch.extendData) patch.extendData = { ...overlay.extendData, ...patch.extendData };
  journalChartInstance.overrideOverlay({ id: overlay.id, ...patch });
  if (redrawPanel) renderJournalToolPanel();
}

function renderJournalToolPanel() {
  const panel = document.getElementById('journal-chart-tool-settings');
  if (!panel) return;
  if (!journalSelectedOverlayId || !journalChartInstance) {
    panel.innerHTML = '<span class="chart-tool-hint">یک ابزار انتخاب کن یا روی یکی از خطوط بزن تا تنظیماتش باز شود.</span>';
    return;
  }
  const overlay = journalChartInstance.getOverlayById(journalSelectedOverlayId);
  if (!overlay) { panel.replaceChildren(); return; }
  const stateForOverlay = journalChartOverlayState.get(overlay.id) || { locked: false, hidden: false };
  const styles = overlay.styles?.line || {};
  const extendData = overlay.extendData || {};
  const isFib = overlay.name === 'fibonacciLine' || overlay.name === 'fibExtension';
  const isText = overlay.name === 'drawText';
  panel.innerHTML = `<span class="chart-tool-selected">${escapeHtml(JOURNAL_CHART_TOOLS.find((tool) => tool.id === overlay.name)?.label || overlay.name)}</span>
    <label class="chart-tool-field">رنگ <input data-overlay-color type="color" value="${/^#[\da-f]{6}$/i.test(styles.color || '') ? styles.color : '#00d4f5'}"></label>
    <label class="chart-tool-field">ضخامت <select data-overlay-size>${[1, 1.5, 2, 3, 4].map((size) => `<option value="${size}" ${Number(styles.size || 1) === size ? 'selected' : ''}>${size}px</option>`).join('')}</select></label>
    <label class="chart-tool-field">خط <select data-overlay-style><option value="solid" ${styles.style === 'solid' ? 'selected' : ''}>پیوسته</option><option value="dashed" ${styles.style === 'dashed' ? 'selected' : ''}>چین‌چین</option><option value="dotted" ${styles.style === 'dotted' ? 'selected' : ''}>نقطه‌ای</option></select></label>
    ${isText ? `<label class="chart-tool-field chart-text-field">متن <input data-overlay-text value="${escapeHtml(extendData.text || '')}" maxlength="100"></label><label class="chart-tool-field">اندازه متن <select data-text-size>${[10,12,14,16,18,22,28,32].map((size) => `<option value="${size}" ${Number(extendData.size || 14) === size ? 'selected' : ''}>${size}px</option>`).join('')}</select></label>` : ''}
    ${isFib ? `<label class="chart-tool-field">جهت <select data-fib-direction><option value="bearish" ${extendData.fibDirection === 'bearish' ? 'selected' : ''}>نزولی</option><option value="bullish" ${extendData.fibDirection === 'bullish' ? 'selected' : ''}>صعودی</option></select></label><button type="button" data-fib-settings>تنظیم سطح‌های فیب</button>` : ''}
    <button type="button" data-overlay-lock>${stateForOverlay.locked ? 'بازکردن قفل' : 'قفل'}</button>
    <button type="button" data-overlay-hide>${stateForOverlay.hidden ? 'نمایش' : 'مخفی'}</button>
    <button type="button" data-overlay-delete class="chart-danger">حذف</button>`;
  panel.querySelector('[data-overlay-color]').addEventListener('input', (event) => updateJournalOverlay({ styles: { line: { color: event.target.value } } }, false));
  panel.querySelector('[data-overlay-color]').addEventListener('change', renderJournalToolPanel);
  panel.querySelector('[data-overlay-size]').addEventListener('change', (event) => updateJournalOverlay({ styles: { line: { ...styles, size: Number(event.target.value) } } }));
  panel.querySelector('[data-overlay-style]').addEventListener('change', (event) => updateJournalOverlay({ styles: { line: { ...styles, style: event.target.value } } }));
  panel.querySelector('[data-overlay-lock]').addEventListener('click', () => {
    stateForOverlay.locked = !stateForOverlay.locked;
    journalChartOverlayState.set(overlay.id, stateForOverlay);
    journalChartInstance.overrideOverlay({ id: overlay.id, lock: stateForOverlay.locked });
    renderJournalToolPanel();
  });
  panel.querySelector('[data-overlay-hide]').addEventListener('click', () => {
    stateForOverlay.hidden = !stateForOverlay.hidden;
    journalChartOverlayState.set(overlay.id, stateForOverlay);
    journalChartInstance.overrideOverlay({ id: overlay.id, visible: !stateForOverlay.hidden });
    renderJournalToolPanel();
  });
  panel.querySelector('[data-overlay-delete]').addEventListener('click', () => journalChartInstance.removeOverlay({ id: overlay.id }));
  if (isText) {
    const textInput = panel.querySelector('[data-overlay-text]');
    const textSize = panel.querySelector('[data-text-size]');
    if (textInput) {
      textInput.addEventListener('change', (event) => updateJournalOverlay({ extendData: { text: event.target.value } }));
    }
    if (textSize) textSize.addEventListener('change', (event) => updateJournalOverlay({ extendData: { ...extendData, size: Number(event.target.value) } }));
  }
  if (isFib) {
    panel.querySelector('[data-fib-direction]').addEventListener('change', (event) => updateJournalOverlay({ extendData: { ...extendData, fibDirection: event.target.value } }));
    panel.querySelector('[data-fib-settings]').addEventListener('click', () => openJournalFibSettings(overlay));
  }
}

function openJournalFibSettings(overlay) {
  const modal = document.getElementById('journalChartModal');
  if (!modal) return;
  modal.querySelector('[data-fib-levels-modal]')?.remove();
  const extension = overlay.name === 'fibExtension';
  const config = Array.isArray(overlay.extendData?.fibLevels) ? overlay.extendData.fibLevels : extension ? FIB_EXTENSION_CONFIG : FIB_RETRACE_CONFIG;
  const activeConfig = config.filter((level) => level.enabled !== false).slice().sort((left, right) => Number(left.value) - Number(right.value));
  const zones = overlay.extendData?.fibZones || {};
  const panel = document.createElement('div');
  panel.dataset.fibLevelsModal = 'true';
  panel.className = 'chart-fib-modal';
  panel.innerHTML = `<section><header><strong>${extension ? 'فیبوناچی گسترشی' : 'فیبوناچی بازگشتی'}</strong><button type="button" data-fib-close>بستن</button></header>
    <div class="fib-level-list">${config.map((level, index) => `<div class="fib-level-row" data-fib-row="${index}"><input data-fib-enabled type="checkbox" ${level.enabled !== false ? 'checked' : ''}><input data-fib-color type="color" value="${/^#[\da-f]{6}$/i.test(level.color || '') ? level.color : '#ff6b2b'}"><input data-fib-label value="${escapeHtml(level.label || level.value)}"><span>${Number(level.value)}</span><select data-fib-size>${[1,2,3].map(size => `<option value="${size}" ${Number(level.size || 1) === size ? 'selected' : ''}>${size}px</option>`).join('')}</select></div>`).join('')}</div>
    <details class="fib-zone-settings"><summary>ناحیه‌های رنگی فیبو</summary><div class="fib-level-list">${activeConfig.slice(0, -1).map((level, index) => { const next = activeConfig[index + 1]; const key = `${level.value}-${next.value}`; const zone = zones[key] || {}; return `<div class="fib-level-row" data-fib-zone="${escapeHtml(key)}"><input data-zone-enabled type="checkbox" ${zone.enabled ? 'checked' : ''}><span>${escapeHtml(level.label || level.value)} ↔ ${escapeHtml(next.label || next.value)}</span><input data-zone-color type="color" value="${/^#[\da-f]{6}$/i.test(zone.color || '') ? zone.color : '#7b61ff'}"><input data-zone-opacity type="range" min="0.02" max="0.4" step="0.01" value="${Number(zone.opacity ?? 0.12)}"></div>`; }).join('')}</div></details>
    <footer><button type="button" data-fib-add>افزودن سطح</button><button type="button" data-fib-save>ذخیره تنظیمات</button></footer></section>`;
  modal.append(panel);
  panel.querySelector('[data-fib-close]').addEventListener('click', () => panel.remove());
  panel.querySelector('[data-fib-add]').addEventListener('click', () => {
    const next = [...config, { value: 1.272, label: '1.272', enabled: true, color: extension ? '#00d4f5' : '#ff6b2b', size: 1 }];
    panel.remove();
    journalChartInstance.overrideOverlay({ id: overlay.id, extendData: { ...overlay.extendData, fibLevels: next } });
    openJournalFibSettings(journalChartInstance.getOverlayById(overlay.id));
  });
  panel.querySelector('[data-fib-save]').addEventListener('click', () => {
    const next = [...panel.querySelectorAll('[data-fib-row]')].map((row, index) => ({
      ...config[index], enabled: row.querySelector('[data-fib-enabled]').checked,
      color: row.querySelector('[data-fib-color]').value,
      label: row.querySelector('[data-fib-label]').value,
      size: Number(row.querySelector('[data-fib-size]').value),
    }));
    const nextZones = { ...zones };
    panel.querySelectorAll('[data-fib-zone]').forEach((row) => {
      nextZones[row.dataset.fibZone] = { enabled: row.querySelector('[data-zone-enabled]').checked, color: row.querySelector('[data-zone-color]').value, opacity: Number(row.querySelector('[data-zone-opacity]').value) };
    });
    journalChartInstance.overrideOverlay({ id: overlay.id, extendData: { ...overlay.extendData, fibLevels: next, fibZones: nextZones } });
    panel.remove();
    renderJournalToolPanel();
  });
}

function clearJournalDrawings() {
  if (!journalChartInstance) return;
  journalChartOverlayIds.slice().forEach((id) => {
    const stateForOverlay = journalChartOverlayState.get(id);
    if (!stateForOverlay?.locked) journalChartInstance.removeOverlay({ id });
  });
  journalSelectedOverlayId = null;
  renderJournalToolPanel();
}

function applyJournalCrosshair() {
  if (!journalChartInstance) return;
  journalChartInstance.setStyles({ crosshair: { show: true, horizontal: { show: true, line: { show: true, color: journalCrosshair.color, size: journalCrosshair.width, style: journalCrosshair.style } }, vertical: { show: true, line: { show: true, color: journalCrosshair.color, size: journalCrosshair.width, style: journalCrosshair.style } } } });
}

function mountJournalChart(snapshot) {
  if (!window.klinecharts || !snapshot?.candles?.length) return;
  if (journalChartInstance) window.klinecharts.dispose('journal-chart-canvas');
  journalChartOverlayIds = [];
  journalChartOverlayState = new Map();
  journalSelectedOverlayId = null;
  journalChartInstance = window.klinecharts.init('journal-chart-canvas');
  journalChartInstance.setPriceVolumePrecision(8, 2);
  journalChartInstance.setStyles({
    grid: { horizontal: { color: 'rgba(255,255,255,.06)' }, vertical: { color: 'rgba(255,255,255,.04)' } },
    candle: { type: 'candle_solid', bar: { upColor: '#00f5a0', downColor: '#ff4a6b', noChangeColor: '#8b93a7', upBorderColor: '#00f5a0', downBorderColor: '#ff4a6b', upWickColor: '#00f5a0', downWickColor: '#ff4a6b' } },
  });
  journalChartInstance.applyNewData(snapshot.candles.map((candle) => ({
    timestamp: candle.time * 1000, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume || 0,
  })));
  journalCrosshair = { ...journalCrosshair, ...(snapshot.crosshair || {}) };
  (snapshot.overlays || []).forEach((overlay) => {
    const callbacks = {
      onClick: (event) => selectJournalOverlay(event?.overlay),
      onDrawEnd: (event) => selectJournalOverlay(event?.overlay),
      onRemoved: (event) => {
        const id = event?.overlay?.id;
        journalChartOverlayIds = journalChartOverlayIds.filter((item) => item !== id);
        journalChartOverlayState.delete(id);
        if (journalSelectedOverlayId === id) journalSelectedOverlayId = null;
        renderJournalToolPanel();
      },
    };
    const id = journalChartInstance.createOverlay({ name: overlay.name, points: overlay.points, styles: overlay.styles || {}, extendData: overlay.extendData || {}, lock: !!overlay.lock, visible: overlay.hide !== true, ...callbacks });
    if (id) {
      journalChartOverlayIds.push(id);
      journalChartOverlayState.set(id, { locked: !!overlay.lock, hidden: overlay.hide === true });
    }
  });
  journalChartInstance.scrollToRealTime();
  applyJournalCrosshair();
}

function openTradeChart(trade) {
  if (!trade.address) {
    window.alert('برای دریافت چارت، ابتدا آدرس قرارداد توکن را در معامله ثبت کن.');
    return;
  }
  closeJournalChart();
  const chartData = trade.chart || { activeTimeframe: '5m', timeframes: {} };
  const timeframe = chartData.activeTimeframe || '5m';
  const intervalSeconds = timeframe === '15m' ? 900 : 300;
  const existing = chartData.timeframes?.[timeframe];
  let fullCandles = [];
  let selectionConfirmed = Boolean(existing?.candles?.length);
  const modal = document.createElement('div');
  modal.id = 'journalChartModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.82);';
  modal.innerHTML = `<section class="journal-chart-modal-section" style="width:min(1100px,100%);height:min(760px,94vh);display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#0d1418;color:#edf7f4;direction:rtl;font-family:Vazirmatn,Tahoma,sans-serif;">
    <header style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>چارت ${escapeHtml(trade.token)} · ${escapeHtml(trade.address)}</strong><button type="button" data-close-chart style="padding:7px 10px;border:1px solid rgba(255,255,255,.15);border-radius:6px;background:#182126;color:#edf7f4">بستن</button></header>
    <div class="journal-chart-controls">
      <label>تایم‌فریم <select data-chart-timeframe><option value="5m">۵ دقیقه</option><option value="15m">۱۵ دقیقه</option></select></label>
      <label>از کندل <input data-chart-from type="number" min="1" value="1" style="width:70px"></label>
      <label>تا کندل <input data-chart-to type="number" min="1" value="13" style="width:70px"></label>
      <button type="button" data-load-chart style="padding:7px 10px;border:1px solid rgba(0,212,245,.3);border-radius:6px;background:rgba(0,212,245,.08);color:#00d4f5">دریافت چارت کامل</button>
      <button type="button" data-confirm-range disabled style="padding:7px 10px;border:1px solid rgba(255,213,74,.28);border-radius:6px;background:rgba(255,213,74,.07);color:#ffd54a">تأیید و ذخیرهٔ کندل‌ها</button>
      <label class="chart-tool-field">رنگ صلیب‌نما <input data-crosshair-color type="color" value="${journalCrosshair.color}"></label>
      <label class="chart-tool-field">ضخامت صلیب‌نما <select data-crosshair-width><option value="1" ${journalCrosshair.width === 1 ? 'selected' : ''}>۱px</option><option value="2" ${journalCrosshair.width === 2 ? 'selected' : ''}>۲px</option><option value="3" ${journalCrosshair.width === 3 ? 'selected' : ''}>۳px</option></select></label>
      <label class="chart-tool-field">خط صلیب‌نما <select data-crosshair-style><option value="solid" ${journalCrosshair.style === 'solid' ? 'selected' : ''}>پیوسته</option><option value="dashed" ${journalCrosshair.style === 'dashed' ? 'selected' : ''}>چین‌چین</option><option value="dotted" ${journalCrosshair.style === 'dotted' ? 'selected' : ''}>نقطه‌ای</option></select></label>
        <button type="button" data-clear-drawings class="chart-danger" ${selectionConfirmed ? '' : 'disabled'}>پاک‌کردن ترسیم‌ها</button>
      <button type="button" data-save-chart ${selectionConfirmed ? '' : 'disabled'} class="chart-save">ذخیره چارت</button>
    </div>
    <nav class="journal-chart-toolbar" aria-label="ابزارهای ترسیم">${JOURNAL_CHART_TOOLS.map((tool) => `<button type="button" data-draw="${tool.id}" title="${tool.label}" aria-label="${tool.label}" ${selectionConfirmed ? '' : 'disabled'}>${tool.glyph}</button>`).join('')}</nav>
    <div id="journal-chart-tool-settings" class="journal-chart-tool-settings"><span class="chart-tool-hint">یک ابزار انتخاب کن یا روی یکی از خطوط بزن تا تنظیماتش باز شود.</span></div>
    <div data-chart-status style="min-height:18px;color:#91a19c;font-size:11px"></div>
    <div id="journal-chart-canvas" style="flex:1;min-height:300px;width:100%"></div>
    <small style="color:#71817c">کندل‌ها و خطوط تحلیل در رکورد معامله ذخیره و با دستگاه دیگر همگام می‌شوند.</small>
  </section>`;
  document.body.append(modal);
  const timeframeSelect = modal.querySelector('[data-chart-timeframe]');
  const fromInput = modal.querySelector('[data-chart-from]');
  const toInput = modal.querySelector('[data-chart-to]');
  const status = modal.querySelector('[data-chart-status]');
  timeframeSelect.value = timeframe;
  modal.querySelector('[data-close-chart]').addEventListener('click', closeJournalChart);
  modal.querySelectorAll('[data-draw]').forEach((button) => button.addEventListener('click', () => drawJournalOverlay(button.dataset.draw)));
  modal.querySelector('[data-clear-drawings]').addEventListener('click', clearJournalDrawings);
  const updateCrosshair = () => {
    journalCrosshair = { color: modal.querySelector('[data-crosshair-color]').value, width: Number(modal.querySelector('[data-crosshair-width]').value), style: modal.querySelector('[data-crosshair-style]').value };
    applyJournalCrosshair();
  };
  modal.querySelectorAll('[data-crosshair-color], [data-crosshair-width], [data-crosshair-style]').forEach((control) => control.addEventListener('change', updateCrosshair));
  const loadSnapshot = (snapshot) => {
    if (!snapshot?.candles?.length) return false;
    mountJournalChart(snapshot);
    status.textContent = `${snapshot.candles.length} کندل · ${timeframeSelect.value}`;
    return true;
  };
  if (!loadSnapshot(existing)) status.textContent = 'ابتدا چارت کامل را بگیر؛ سپس شمارهٔ کندل شروع و پایان را وارد کن.';
  timeframeSelect.addEventListener('change', () => {
    fullCandles = [];
    selectionConfirmed = false;
    modal.querySelector('[data-confirm-range]').disabled = true;
    modal.querySelectorAll('[data-draw], [data-save-chart]').forEach((button) => { button.disabled = true; });
    const saved = chartData.timeframes?.[timeframeSelect.value];
    if (saved?.candles?.length) {
      selectionConfirmed = true;
      fromInput.value = '1';
      toInput.value = String(saved.candles.length);
      loadSnapshot(saved);
      modal.querySelectorAll('[data-draw], [data-save-chart]').forEach((button) => { button.disabled = false; });
    } else {
      if (journalChartInstance) window.klinecharts.dispose('journal-chart-canvas');
      journalChartInstance = null;
      status.textContent = 'برای این تایم‌فریم هنوز کندلی ذخیره نشده است.';
    }
  });
  modal.querySelector('[data-load-chart]').addEventListener('click', async () => {
    const selectedTimeframe = timeframeSelect.value;
    const intervalSeconds = selectedTimeframe === '15m' ? 900 : 300;
    const to = Math.floor(Date.now() / (intervalSeconds * 1000)) * intervalSeconds + intervalSeconds;
    const from = to - 1500 * intervalSeconds;
    const legacyCount = 200;
    const legacyStart = to - legacyCount * intervalSeconds;
    const chain = ({ solana: 'solana', ethereum: 'ethereum', base: 'base', bsc: 'bsc', arbitrum: 'arbitrum' })[String(trade.network || '').toLowerCase()] || 'solana';
    status.textContent = 'در حال دریافت کندل‌های اخیر چارت...';
    try {
      const query = new URLSearchParams({ address: trade.address, timeframe: selectedTimeframe, chain, from: String(from), to: String(to), start: String(legacyStart), count: String(legacyCount) });
      const response = await apiFetch(`/api/chart/candles?${query}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'دریافت کندل ناموفق بود.');
      if (!payload.candles?.length) throw new Error('Birdeye برای این توکن در تایم‌فریم انتخابی کندلی برنگرداند؛ آدرس قرارداد یا تایم‌فریم را بررسی کن.');
      fullCandles = payload.candles;
      selectionConfirmed = false;
      modal.querySelectorAll('[data-draw], [data-save-chart], [data-clear-drawings]').forEach((button) => { button.disabled = true; });
      fromInput.value = '1';
      toInput.value = String(Math.min(13, fullCandles.length));
      modal.querySelector('[data-confirm-range]').disabled = false;
      mountJournalChart({ candles: fullCandles, overlays: [] });
      const limitedMessage = payload.truncated ? ' (فقط ۱۵۰۰ کندل آخر)' : '';
      status.textContent = `${fullCandles.length} کندل اخیر در تاریخچه${limitedMessage}؛ شمارهٔ بازه را وارد و تأیید کن.`;
    } catch (error) {
      status.textContent = error.message;
    }
  });
  modal.querySelector('[data-confirm-range]').addEventListener('click', async () => {
    const from = Number(fromInput.value);
    const to = Number(toInput.value);
    if (!fullCandles.length) { status.textContent = 'ابتدا چارت کامل را دریافت کن.'; return; }
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > fullCandles.length) {
      status.textContent = `شماره‌ها باید بین ۱ تا ${fullCandles.length} باشند و کندل پایان بعد از شروع باشد.`;
      return;
    }
    const candles = fullCandles.slice(from - 1, to);
    selectionConfirmed = true;
    const snapshot = { start: candles[0].time, count: candles.length, fromIndex: from, toIndex: to, candles, overlays: [] };
    chartData.timeframes[timeframeSelect.value] = snapshot;
    chartData.activeTimeframe = timeframeSelect.value;
    const updatedTrade = { ...trade, chart: chartData, updatedAt: new Date().toISOString() };
    status.textContent = 'در حال ذخیرهٔ کندل‌های انتخابی...';
    try {
      const response = await apiFetch(`/api/trades/${encodeURIComponent(trade.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chart: chartData }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'ذخیرهٔ کندل‌ها ناموفق بود.');
      state.trades = state.trades.map((item) => item.id === trade.id ? payload.trade : item);
      saveLocalTrades(state.trades);
    } catch (error) {
      state.trades = state.trades.map((item) => item.id === trade.id ? updatedTrade : item);
      saveLocalTrades(state.trades);
      syncLocalTradesToServer(state.trades);
    }
    loadSnapshot(snapshot);
    modal.querySelectorAll('[data-draw], [data-save-chart], [data-clear-drawings]').forEach((button) => { button.disabled = false; });
    status.textContent = `کندل ${from} تا ${to} ذخیره شد؛ حالا تحلیل کن و ترسیم‌ها را ذخیره کن.`;
  });
  modal.querySelector('[data-save-chart]').addEventListener('click', async () => {
    const selectedTimeframe = timeframeSelect.value;
    const snapshot = chartData.timeframes[selectedTimeframe];
    if (!selectionConfirmed || !snapshot?.candles?.length) { status.textContent = 'ابتدا شمارهٔ کندل شروع و پایان را تأیید کن.'; return; }
    snapshot.overlays = journalChartOverlayIds.map((id) => journalChartInstance?.getOverlayById(id)).filter(Boolean).map((overlay) => {
      const stateForOverlay = journalChartOverlayState.get(overlay.id) || {};
      return { name: overlay.name, points: overlay.points, styles: overlay.styles, extendData: overlay.extendData || {}, lock: !!stateForOverlay.locked, hide: !!stateForOverlay.hidden };
    });
    snapshot.crosshair = { ...journalCrosshair };
    chartData.activeTimeframe = selectedTimeframe;
    const updated = { ...trade, chart: chartData, updatedAt: new Date().toISOString() };
    status.textContent = 'در حال ذخیره و همگام‌سازی...';
    try {
      const response = await apiFetch(`/api/trades/${encodeURIComponent(trade.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chart: chartData }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'ذخیرهٔ چارت ناموفق بود.');
      state.trades = state.trades.map((item) => item.id === trade.id ? payload.trade : item);
      saveLocalTrades(state.trades);
      renderAll();
      status.textContent = 'چارت ذخیره و همگام شد.';
      window.setTimeout(closeJournalChart, 500);
    } catch (error) {
      updated.chart = chartData;
      state.trades = state.trades.map((item) => item.id === trade.id ? updated : item);
      saveLocalTrades(state.trades);
      renderAll();
      syncLocalTradesToServer(state.trades);
      status.textContent = 'روی این دستگاه ذخیره شد؛ همگام‌سازی ابری ناموفق بود.';
    }
  });
}

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

function dayPnlPercent(trades) {
  const closedTrades = trades.filter((trade) => trade.status === 'closed');
  const invested = closedTrades.reduce((sum, trade) => {
    const amount = Number(trade.investAmount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  if (invested > 0) return closedTrades.reduce((sum, trade) => sum + tradePnl(trade), 0) / invested * 100;
  return closedTrades.reduce((sum, trade) => {
    const percent = trade.pnlPercent;
    return percent !== '' && percent != null && Number.isFinite(Number(percent)) ? sum + Number(percent) : sum;
  }, 0);
}

function formatDayPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  return `${rounded >= 0 ? '+' : '-'}${display}%`;
}

function renderCalendar() {
  monthLabel.textContent = state.currentMonth.toLocaleDateString('fa-IR-u-ca-gregory', { month: 'long', year: 'numeric' });

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
      const date = new Date(year, month, dayNumber);
      const dateKey = localDateKey(date);
      const dayTrades = groups[dateKey] || [];
      const dayPnl = dayTrades.reduce((sum, trade) => sum + tradePnl(trade), 0);
      const dayPercent = dayPnlPercent(dayTrades);
      const wins = dayTrades.filter((trade) => tradePnl(trade) > 0).length;
      const losses = dayTrades.filter((trade) => tradePnl(trade) < 0).length;
      const openCount = dayTrades.filter((trade) => trade.status === 'open').length;
      const selected = dateKey === state.selectedDate ? 'selected' : '';
      const today = dateKey === localDateKey(new Date()) ? 'today' : '';
      const tone = dayPnl > 0 ? 'green' : dayPnl < 0 ? 'red' : '';

      return `
        <button class="day-cell ${selected} ${today} ${tone}" data-date="${dateKey}">
          <div class="day-num">${dayNumber}</div>
          <div class="day-badges">
            ${wins ? `<span class="badge-win">+${wins}</span>` : ''}
            ${losses ? `<span class="badge-loss">-${losses}</span>` : ''}
            ${openCount ? `<span class="badge-open">${openCount}●</span>` : ''}
          </div>
          ${dayTrades.some((trade) => trade.status === 'closed') ? `<div class="day-percent" style="color:${dayPnl > 0 ? 'var(--green)' : dayPnl < 0 ? 'var(--red)' : 'var(--text-dim)'}">${formatDayPercent(dayPercent)}</div>` : '<div class="day-percent day-percent-empty"></div>'}
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

  selectedDayLabel.textContent = new Date(`${key}T00:00:00`).toLocaleDateString('fa-IR-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
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
          <button class="mini-btn" data-chart="${escapeHtml(trade.id)}">${trade.chart?.timeframes?.[trade.chart?.activeTimeframe]?.candles?.length ? 'بازکردن چارت' : 'چارت کندلی'}</button>
          <button class="mini-btn" data-edit="${escapeHtml(trade.id)}">ویرایش</button>
          <button class="mini-btn" data-delete="${escapeHtml(trade.id)}">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openFormForEdit(btn.dataset.edit));
  });

  document.querySelectorAll('[data-chart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const trade = state.trades.find((item) => item.id === btn.dataset.chart);
      if (trade) openTradeChart(trade);
    });
  });

  document.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteTrade(btn.dataset.delete));
  });
}

function fillForm(trade) {
  document.getElementById('tradeId').value = trade.id || '';
  document.getElementById('journalDate').value = trade.journalDate || getTradeDateKey(trade) || localDateKey(new Date());
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
    if (payload.trade.address) window.setTimeout(() => openTradeChart(payload.trade), 0);
  } catch (error) {
    saveStatus.textContent = `${error.message}؛ فعلاً داده فقط در همین دستگاه نگه داشته شد و به دستگاه دیگر نرسیده است.`;
    saveStatus.style.color = 'var(--red)';
    saveLocalTrades([nextTrade, ...state.trades.filter((trade) => trade.id !== nextTrade.id)]);
    state.trades = readLocalTrades();
    renderAll();
    updateSyncStatus(false);
    if (nextTrade.address) window.setTimeout(() => openTradeChart(nextTrade), 0);
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

  state.selectedDate = localDateKey(new Date());
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
