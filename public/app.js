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
const pushEnableButton = document.getElementById('pushEnableBtn');
const pushToast = document.getElementById('pushToast');
const overviewView = document.getElementById('overviewView');
const calendarWrap = document.querySelector('.calendar-wrap');
const journalViewButtons = [...document.querySelectorAll('[data-journal-view]')];
let accessKey = localStorage.getItem(ACCESS_KEY_STORAGE) || '';
let syncInProgress = false;
let pushToastTimer = null;
let activeJournalView = 'journal';
let journalChartInstance = null;
let journalChartOverlayIds = [];
let journalChartOverlayState = new Map();
let journalSelectedOverlayId = null;
let journalCrosshair = { color: '#91a19c', width: 1, style: 'dashed' };

const JOURNAL_CHART_TOOLS = [
  { id: 'segment', label: 'خط روند', group: 'خطوط', icon: 'trend' },
  { id: 'longPosition', label: 'پوزیشن لانگ', group: 'پوزیشن', icon: 'long' },
  { id: 'shortPosition', label: 'پوزیشن شورت', group: 'پوزیشن', icon: 'short' },
  { id: 'horizontalStraightLine', label: 'خط افقی', group: 'خطوط', icon: 'horizontal' },
  { id: 'horizontalRayLine', label: 'نیم‌خط افقی', group: 'خطوط', icon: 'ray' },
  { id: 'verticalStraightLine', label: 'خط عمودی', group: 'خطوط', icon: 'vertical' },
  { id: 'fibonacciLine', label: 'فیبوناچی', group: 'فیبوناچی', icon: 'fib' },
  { id: 'fibExtension', label: 'فیبوناچی گسترشی', group: 'فیبوناچی', icon: 'fib-extension' },
  { id: 'drawPriceRange', label: 'محدوده قیمت', group: 'شکل و یادداشت', icon: 'range' },
  { id: 'drawRect', label: 'مستطیل', group: 'شکل و یادداشت', icon: 'rectangle' },
  { id: 'drawText', label: 'متن', group: 'شکل و یادداشت', icon: 'text' },
  { id: 'drawCross', label: 'علامت ضربدر', group: 'شکل و یادداشت', icon: 'cross' },
];

const JOURNAL_TOOL_ICON_PATHS = {
  trend: '<path d="M4 19 19 4"/><circle cx="4" cy="19" r="1.5"/><circle cx="19" cy="4" r="1.5"/>',
  horizontal: '<path d="M3 12h18"/><path d="m7 8-4 4 4 4m10-8 4 4-4 4"/>',
  ray: '<path d="M3 12h17m-5-5 5 5-5 5"/>',
  vertical: '<path d="M12 3v18"/><path d="m8 7 4-4 4 4m-8 10 4 4 4-4"/>',
  fib: '<path d="M4 19 19 5M5 7h14M5 11h14M5 15h14M5 19h14"/>',
  'fib-extension': '<path d="m3 18 6-10 5 5M14 13h7M14 8h7M14 18h7"/>',
  long: '<path d="M6 20V4m0 0L2 8m4-4 4 4M14 17l4-4 4 4M18 13v7"/>',
  short: '<path d="M6 4v16m0 0-4-4m4 4 4-4M14 7l4 4 4-4m-4 4V4"/>',
  range: '<path d="M5 5h14v14H5zM8 9v6m4-8v10m4-8v6"/>',
  rectangle: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M8 5v14m8-14v14" opacity=".55"/>',
  text: '<path d="M4 6h16M12 6v13m-4 0h8"/><path d="M7 3h10" opacity=".55"/>',
  cross: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/>',
};

function journalToolIcon(icon) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${JOURNAL_TOOL_ICON_PATHS[icon] || JOURNAL_TOOL_ICON_PATHS.trend}</g></svg>`;
}

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
  window.removeEventListener('orientationchange', handleJournalViewportChange);
  window.removeEventListener('resize', handleJournalViewportChange);
  if (journalChartInstance && window.klinecharts) window.klinecharts.dispose('journal-chart-canvas');
  journalChartInstance = null;
  journalChartOverlayIds = [];
  journalChartOverlayState = new Map();
  journalSelectedOverlayId = null;
  document.getElementById('journalChartModal')?.remove();
  if (screen.orientation?.unlock) screen.orientation.unlock();
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  if (document.body.classList.contains('journal-chart-open')) {
    const scrollY = Number(document.body.dataset.chartScrollY || 0);
    document.body.classList.remove('journal-chart-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    delete document.body.dataset.chartScrollY;
    window.scrollTo(0, scrollY);
  }
}

function handleJournalViewportChange() {
  requestAnimationFrame(() => {
    try { journalChartInstance?.resize?.(); } catch (error) {}
  });
}

function resizeJournalChart() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    handleJournalViewportChange();
    window.dispatchEvent(new Event('resize'));
  }));
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
  const content = panel.querySelector('[data-tool-settings-content]');
  if (!journalSelectedOverlayId || !journalChartInstance) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const overlay = journalChartInstance.getOverlayById(journalSelectedOverlayId);
  if (!overlay) { panel.replaceChildren(); return; }
  const stateForOverlay = journalChartOverlayState.get(overlay.id) || { locked: false, hidden: false };
  const styles = overlay.styles?.line || {};
  const extendData = overlay.extendData || {};
  const isFib = overlay.name === 'fibonacciLine' || overlay.name === 'fibExtension';
  const isText = overlay.name === 'drawText';
  const selectedTool = JOURNAL_CHART_TOOLS.find((tool) => tool.id === overlay.name);
  content.innerHTML = `<span class="chart-tool-selected">${journalToolIcon(selectedTool?.icon)}${escapeHtml(selectedTool?.label || overlay.name)}</span>
    <label class="chart-tool-field">رنگ <input data-overlay-color type="color" value="${/^#[\da-f]{6}$/i.test(styles.color || '') ? styles.color : '#00d4f5'}"></label>
    <label class="chart-tool-field">ضخامت <select data-overlay-size>${[1, 1.5, 2, 3, 4].map((size) => `<option value="${size}" ${Number(styles.size || 1) === size ? 'selected' : ''}>${size}px</option>`).join('')}</select></label>
    <label class="chart-tool-field">خط <select data-overlay-style><option value="solid" ${styles.style === 'solid' ? 'selected' : ''}>پیوسته</option><option value="dashed" ${styles.style === 'dashed' ? 'selected' : ''}>چین‌چین</option><option value="dotted" ${styles.style === 'dotted' ? 'selected' : ''}>نقطه‌ای</option></select></label>
    ${isText ? `<label class="chart-tool-field chart-text-field">متن <input data-overlay-text value="${escapeHtml(extendData.text || '')}" maxlength="100"></label><label class="chart-tool-field">اندازه متن <select data-text-size>${[10,12,14,16,18,22,28,32].map((size) => `<option value="${size}" ${Number(extendData.size || 14) === size ? 'selected' : ''}>${size}px</option>`).join('')}</select></label>` : ''}
    ${isFib ? `<label class="chart-tool-field">جهت <select data-fib-direction><option value="bearish" ${extendData.fibDirection === 'bearish' ? 'selected' : ''}>نزولی</option><option value="bullish" ${extendData.fibDirection === 'bullish' ? 'selected' : ''}>صعودی</option></select></label><button type="button" data-fib-settings>تنظیم سطح‌های فیب</button>` : ''}
    <button type="button" data-overlay-lock>${stateForOverlay.locked ? 'بازکردن قفل' : 'قفل'}</button>
    <button type="button" data-overlay-hide>${stateForOverlay.hidden ? 'نمایش' : 'مخفی'}</button>
    <button type="button" data-overlay-delete class="chart-danger">حذف</button>`;
  content.querySelector('[data-overlay-color]').addEventListener('input', (event) => updateJournalOverlay({ styles: { line: { color: event.target.value } } }, false));
  content.querySelector('[data-overlay-color]').addEventListener('change', renderJournalToolPanel);
  content.querySelector('[data-overlay-size]').addEventListener('change', (event) => updateJournalOverlay({ styles: { line: { ...styles, size: Number(event.target.value) } } }));
  content.querySelector('[data-overlay-style]').addEventListener('change', (event) => updateJournalOverlay({ styles: { line: { ...styles, style: event.target.value } } }));
  content.querySelector('[data-overlay-lock]').addEventListener('click', () => {
    stateForOverlay.locked = !stateForOverlay.locked;
    journalChartOverlayState.set(overlay.id, stateForOverlay);
    journalChartInstance.overrideOverlay({ id: overlay.id, lock: stateForOverlay.locked });
    renderJournalToolPanel();
  });
  content.querySelector('[data-overlay-hide]').addEventListener('click', () => {
    stateForOverlay.hidden = !stateForOverlay.hidden;
    journalChartOverlayState.set(overlay.id, stateForOverlay);
    journalChartInstance.overrideOverlay({ id: overlay.id, visible: !stateForOverlay.hidden });
    renderJournalToolPanel();
  });
  content.querySelector('[data-overlay-delete]').addEventListener('click', () => journalChartInstance.removeOverlay({ id: overlay.id }));
  if (isText) {
    const textInput = content.querySelector('[data-overlay-text]');
    const textSize = content.querySelector('[data-text-size]');
    if (textInput) {
      textInput.addEventListener('change', (event) => updateJournalOverlay({ extendData: { text: event.target.value } }));
    }
    if (textSize) textSize.addEventListener('change', (event) => updateJournalOverlay({ extendData: { ...extendData, size: Number(event.target.value) } }));
  }
  if (isFib) {
    content.querySelector('[data-fib-direction]').addEventListener('change', (event) => updateJournalOverlay({ extendData: { ...extendData, fibDirection: event.target.value } }));
    content.querySelector('[data-fib-settings]').addEventListener('click', () => openJournalFibSettings(overlay));
  }
}

function enableJournalSettingsDrag(modal) {
  const panel = modal.querySelector('#journal-chart-tool-settings');
  const handle = panel.querySelector('[data-settings-drag]');
  const workspace = modal.querySelector('[data-chart-workspace]');
  let drag = null;
  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[data-settings-close]')) return;
    const panelRect = panel.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    drag = { pointerId: event.pointerId, x: event.clientX - panelRect.left, y: event.clientY - panelRect.top, workspace: workspaceRect };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  handle.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const maxLeft = Math.max(0, drag.workspace.width - panel.offsetWidth);
    const maxTop = Math.max(0, drag.workspace.height - panel.offsetHeight);
    panel.style.left = `${Math.max(0, Math.min(maxLeft, event.clientX - drag.workspace.left - drag.x))}px`;
    panel.style.top = `${Math.max(0, Math.min(maxTop, event.clientY - drag.workspace.top - drag.y))}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });
  const stop = (event) => { if (drag?.pointerId === event.pointerId) drag = null; };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
  panel.querySelector('[data-settings-close]').addEventListener('click', () => { panel.hidden = true; });
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

function journalPnlSummary(trade) {
  const signedValue = (value) => {
    if (value === '' || value == null || !Number.isFinite(Number(value))) return null;
    const number = Number(value);
    return Math.abs(number) * (trade.pnlOutcome === 'loss' || number < 0 ? -1 : 1);
  };
  const entry = Number(trade.entryMarketCap);
  const exit = Number(trade.exitMarketCap);
  const direction = String(trade.direction || 'buy').toLowerCase();
  const derivedPercent = entry > 0 && exit > 0
    ? (direction === 'sell' ? (entry - exit) / entry : (exit - entry) / entry) * 100
    : null;
  const percent = signedValue(trade.pnlPercent) ?? derivedPercent;
  const dollar = signedValue(trade.pnlDollar)
    ?? (percent != null && Number(trade.investAmount) > 0 ? Number(trade.investAmount) * percent / 100 : null);
  const format = (value, suffix) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
  return { percent: format(percent, '%'), dollar: dollar == null ? '—' : `${dollar > 0 ? '+' : dollar < 0 ? '-' : ''}$${Math.abs(dollar).toFixed(2)}`, entry, exit, positive: (dollar ?? percent ?? 0) >= 0 };
}

function mountJournalChart(snapshot, trade) {
  if (!window.klinecharts || !snapshot?.candles?.length) return;
  if (journalChartInstance) window.klinecharts.dispose('journal-chart-canvas');
  journalChartOverlayIds = [];
  journalChartOverlayState = new Map();
  journalSelectedOverlayId = null;
  journalChartInstance = window.klinecharts.init('journal-chart-canvas');
  journalChartInstance.setPriceVolumePrecision(0, 2);
  journalChartInstance.setZoomEnabled(true);
  journalChartInstance.setScrollEnabled(true);
  journalChartInstance.setPaneOptions({ id: 'candle_pane', axisOptions: { name: 'default', scrollZoomEnabled: true } });
  journalChartInstance.setStyles({
    grid: { horizontal: { color: 'rgba(255,255,255,.06)' }, vertical: { color: 'rgba(255,255,255,.04)' } },
    candle: { type: 'candle_solid', bar: { upColor: '#00f5a0', downColor: '#ff4a6b', noChangeColor: '#8b93a7', upBorderColor: '#00f5a0', downBorderColor: '#ff4a6b', upWickColor: '#00f5a0', downWickColor: '#ff4a6b' } },
  });
  journalChartInstance.applyNewData(snapshot.candles.map((candle) => ({
    timestamp: candle.time * 1000, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume || 0,
  })));
  const firstTimestamp = snapshot.candles[0].time * 1000;
  [
    { value: Number(trade?.entryMarketCap), color: '#00f5a0' },
    { value: Number(trade?.exitMarketCap), color: '#ff4a6b' },
  ].filter((level) => Number.isFinite(level.value) && level.value > 0).forEach((level) => {
    journalChartInstance.createOverlay({ name: 'horizontalStraightLine', points: [{ timestamp: firstTimestamp, value: level.value }], styles: { line: { color: level.color, size: 2, style: 'dashed' } }, lock: true });
  });
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

function recalculateTradePnl() {
  const entry = Number(document.getElementById('entryMarketCap').value);
  const exit = Number(document.getElementById('exitMarketCap').value);
  const invest = Number(document.getElementById('investAmount').value);
  const percentField = document.getElementById('pnlPercent');
  const dollarField = document.getElementById('pnlDollar');
  const outcomeField = document.getElementById('pnlOutcome');
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(exit) || exit <= 0) {
    percentField.value = '';
    dollarField.value = '';
    outcomeField.value = 'profit';
    return;
  }
  const percent = (exit - entry) / entry * 100;
  percentField.value = (Math.abs(percent) < 0.005 ? 0 : percent).toFixed(2);
  dollarField.value = Number.isFinite(invest) && invest > 0
    ? (Math.abs(invest * percent / 100) < 0.005 ? 0 : invest * percent / 100).toFixed(2)
    : '';
  outcomeField.value = percent < 0 ? 'loss' : 'profit';
}

['entryMarketCap', 'exitMarketCap', 'investAmount'].forEach((id) => {
  document.getElementById(id).addEventListener('input', recalculateTradePnl);
});

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
  let selectionConfirmed = Boolean(existing?.candles?.length && existing.valueType === 'marketCap');
  const modal = document.createElement('div');
  modal.id = 'journalChartModal';
  const pageScrollY = window.scrollY;
  document.body.dataset.chartScrollY = String(pageScrollY);
  document.body.classList.add('journal-chart-open');
  document.body.style.position = 'fixed';
  document.body.style.top = `-${pageScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;width:100vw;height:100vh;height:100dvh;padding:0;overflow:hidden;overscroll-behavior:none;touch-action:none;background:#070b10;';
  modal.innerHTML = `<section class="journal-chart-modal-section" style="width:100%;height:100%;max-height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:0;border-radius:0;background:#0d1418;color:#edf7f4;direction:rtl;font-family:Vazirmatn,Tahoma,sans-serif;overflow:hidden">
    <header class="journal-chart-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong>چارت ${escapeHtml(trade.token)} <span class="journal-chart-address">· ${escapeHtml(trade.address)}</span></strong><div class="journal-chart-page-actions"><button type="button" data-market-cap-zoom="out" title="کوچک‌نمایی عمودی؛ نمایش بازهٔ بزرگ‌تر مارکت‌کپ" aria-label="کوچک‌نمایی عمودی مارکت‌کپ">−</button><button type="button" data-market-cap-zoom="in" title="بزرگ‌نمایی عمودی؛ نمایش بازهٔ کوچک‌تر مارکت‌کپ" aria-label="بزرگ‌نمایی عمودی مارکت‌کپ">+</button><button type="button" data-market-cap-reset title="بازنشانی مقیاس به همهٔ کندل‌ها" aria-label="بازنشانی مقیاس مارکت‌کپ">↺</button><button type="button" data-chart-fullscreen title="تمام‌صفحه فقط چارت" aria-label="نمایش تمام‌صفحهٔ چارت">⛶</button><button type="button" data-chart-landscape title="حالت افقی 16:9" aria-label="حالت افقی 16:9">16:9</button><button type="button" data-close-chart title="خروج از چارت" aria-label="خروج از چارت">×</button></div></header>
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
    <div data-chart-status style="min-height:18px;color:#91a19c;font-size:11px"></div>
    <div class="journal-chart-workspace" data-chart-workspace>
      <aside class="journal-tool-shelf" data-tool-shelf>
        <div class="journal-shelf-head"><span class="journal-shelf-title">ابزارهای ترسیم</span><button type="button" class="journal-shelf-toggle" data-shelf-toggle title="جمع‌کردن پنل ابزارها" aria-label="جمع‌کردن پنل ابزارها">‹</button></div>
        <div class="journal-shelf-body">${['خطوط', 'فیبوناچی', 'پوزیشن', 'شکل و یادداشت'].map((group) => `<div class="journal-tool-group"><strong>${group}</strong>${JOURNAL_CHART_TOOLS.filter((tool) => tool.group === group).map((tool) => `<button type="button" class="journal-shelf-tool" data-draw="${tool.id}" title="${tool.label}" aria-label="${tool.label}" ${selectionConfirmed ? '' : 'disabled'}>${journalToolIcon(tool.icon)}<span>${tool.label}</span></button>`).join('')}</div>`).join('')}</div>
      </aside>
      <div id="journal-chart-canvas"></div>
      <section id="journal-chart-tool-settings" class="journal-floating-settings" hidden>
        <header class="journal-settings-drag" data-settings-drag><span>${journalToolIcon('trend')}<span>تنظیمات ترسیم</span></span><button type="button" data-settings-close title="بستن پنل" aria-label="بستن پنل">×</button></header>
        <div class="journal-chart-tool-settings" data-tool-settings-content></div>
      </section>
    </div>
    <small class="journal-chart-footnote" style="color:#71817c">کندل‌ها و خطوط تحلیل در رکورد معامله ذخیره و با دستگاه دیگر همگام می‌شوند.</small>
  </section>`;
  document.body.append(modal);
  const pnlSummary = journalPnlSummary(trade);
  const pnlBanner = document.createElement('div');
  pnlBanner.dataset.pnlBanner = '';
  pnlBanner.style.cssText = `display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:9px 12px;border:1px solid rgba(255,255,255,.09);border-radius:6px;background:rgba(255,255,255,.025);font-size:11px;color:#91a19c`;
  pnlBanner.innerHTML = `<strong style="color:${pnlSummary.positive ? '#00f5a0' : '#ff4a6b'}">PnL ${escapeHtml(pnlSummary.percent)} · ${escapeHtml(pnlSummary.dollar)}</strong><span style="color:#00f5a0">ورود ${Number.isFinite(pnlSummary.entry) && pnlSummary.entry > 0 ? '$' + pnlSummary.entry.toLocaleString('en-US') : '—'}</span><span style="color:#ff4a6b">خروج ${Number.isFinite(pnlSummary.exit) && pnlSummary.exit > 0 ? '$' + pnlSummary.exit.toLocaleString('en-US') : '—'}</span><span>محور: مارکت‌کپ</span>`;
  modal.querySelector('header').insertAdjacentElement('afterend', pnlBanner);
  enableJournalSettingsDrag(modal);
  const timeframeSelect = modal.querySelector('[data-chart-timeframe]');
  const fromInput = modal.querySelector('[data-chart-from]');
  const toInput = modal.querySelector('[data-chart-to]');
  const status = modal.querySelector('[data-chart-status]');
  function applyMarketCapRange(from, to) {
    const axis = journalChartInstance?.getDrawPaneById?.('candle_pane')?.getAxisComponent?.();
    if (!axis || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return;
    axis.setAutoCalcTickFlag?.(false);
    const realFrom = axis.convertToRealValue(from);
    const realTo = axis.convertToRealValue(to);
    axis.setRange({ from, to, range: to - from, realFrom, realTo, realRange: realTo - realFrom });
    if (typeof journalChartInstance.updatePane === 'function') journalChartInstance.updatePane(1);
    else journalChartInstance.resize?.();
  }
  function adjustMarketCapRange(factor) {
    const axis = journalChartInstance?.getDrawPaneById?.('candle_pane')?.getAxisComponent?.();
    const range = axis?.getRange?.();
    if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from) return;
    const center = (range.from + range.to) / 2;
    const nextRange = Math.max(1, Math.min(range.range * factor, Math.max(Math.abs(center) * 100, 1)));
    applyMarketCapRange(center - nextRange / 2, center + nextRange / 2);
  }
  function resetMarketCapRange() {
    const candles = chartData.timeframes?.[timeframeSelect.value]?.candles || fullCandles;
    const values = (candles || []).flatMap((candle) => [Number(candle.low), Number(candle.high)]).filter((value) => Number.isFinite(value) && value > 0);
    [Number(trade.entryMarketCap), Number(trade.exitMarketCap)].filter((value) => Number.isFinite(value) && value > 0).forEach((value) => values.push(value));
    if (!values.length) return;
    const low = Math.min(...values);
    const high = Math.max(...values);
    const padding = Math.max((high - low) * 0.06, high * 0.01, 1);
    applyMarketCapRange(Math.max(0, low - padding), high + padding);
  }
  timeframeSelect.value = timeframe;
  modal.querySelector('[data-close-chart]').addEventListener('click', closeJournalChart);
  modal.querySelector('[data-market-cap-zoom="in"]').addEventListener('click', () => adjustMarketCapRange(0.8));
  modal.querySelector('[data-market-cap-zoom="out"]').addEventListener('click', () => adjustMarketCapRange(1.25));
  modal.querySelector('[data-market-cap-reset]').addEventListener('click', resetMarketCapRange);
  window.addEventListener('orientationchange', handleJournalViewportChange);
  window.addEventListener('resize', handleJournalViewportChange);
  const fullscreenButton = modal.querySelector('[data-chart-fullscreen]');
  fullscreenButton.addEventListener('click', () => {
    const chartOnly = modal.classList.toggle('is-chart-only');
    fullscreenButton.textContent = chartOnly ? '⤢' : '⛶';
    fullscreenButton.title = chartOnly ? 'بازگشت به ابزارهای چارت' : 'تمام‌صفحه فقط چارت';
    fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
    resizeJournalChart();
    if (chartOnly && !document.fullscreenElement && modal.requestFullscreen) modal.requestFullscreen().catch(() => {});
    else if (!chartOnly && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
  modal.querySelector('[data-chart-landscape]').addEventListener('click', async () => {
    const landscapeButton = modal.querySelector('[data-chart-landscape]');
    const enabling = !modal.classList.contains('is-landscape');
    if (!enabling) {
      modal.classList.remove('is-landscape');
      landscapeButton.textContent = '16:9';
      if (screen.orientation?.unlock) screen.orientation.unlock();
      if (!modal.classList.contains('is-chart-only')) {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
      resizeJournalChart();
      return;
    }
    modal.classList.add('is-chart-only', 'is-landscape');
    fullscreenButton.textContent = '⤢';
    fullscreenButton.title = 'بازگشت به ابزارهای چارت';
    fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
    landscapeButton.textContent = 'عمودی';
    if (!document.fullscreenElement && modal.requestFullscreen) {
      try { await modal.requestFullscreen(); } catch (error) {}
    }
    try {
      if (!screen.orientation?.lock) throw new Error('orientation-lock-unavailable');
      await screen.orientation.lock('landscape');
    } catch (error) {
      window.alert('برای نمای افقی، گوشی را بچرخان. اگر قفل جهت کار نکرد، چرخش صفحهٔ آیفون را از Control Center باز کن.');
    }
    resizeJournalChart();
  });
  modal.querySelectorAll('[data-draw]').forEach((button) => button.addEventListener('click', () => drawJournalOverlay(button.dataset.draw)));
  modal.querySelector('[data-tool-shelf]').addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-shelf-toggle]');
    if (toggle) {
      const collapsed = modal.querySelector('[data-tool-shelf]').classList.toggle('collapsed');
      toggle.textContent = collapsed ? '›' : '‹';
      toggle.title = collapsed ? 'بازکردن پنل ابزارها' : 'جمع‌کردن پنل ابزارها';
      toggle.setAttribute('aria-label', toggle.title);
      return;
    }
    const button = event.target.closest('[data-draw]');
    if (button) modal.querySelectorAll('[data-draw]').forEach((item) => item.classList.toggle('active', item === button));
  });
  modal.querySelector('[data-clear-drawings]').addEventListener('click', clearJournalDrawings);
  const updateCrosshair = () => {
    journalCrosshair = { color: modal.querySelector('[data-crosshair-color]').value, width: Number(modal.querySelector('[data-crosshair-width]').value), style: modal.querySelector('[data-crosshair-style]').value };
    applyJournalCrosshair();
  };
  modal.querySelectorAll('[data-crosshair-color], [data-crosshair-width], [data-crosshair-style]').forEach((control) => control.addEventListener('change', updateCrosshair));
  const loadSnapshot = (snapshot) => {
    if (!snapshot?.candles?.length || snapshot.valueType !== 'marketCap') return false;
    mountJournalChart(snapshot, trade);
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
    if (saved?.candles?.length && saved.valueType === 'marketCap') {
      selectionConfirmed = true;
      fromInput.value = '1';
      toInput.value = String(saved.candles.length);
      loadSnapshot(saved);
      modal.querySelectorAll('[data-draw], [data-save-chart]').forEach((button) => { button.disabled = false; });
    } else {
      if (journalChartInstance) window.klinecharts.dispose('journal-chart-canvas');
      journalChartInstance = null;
      status.textContent = saved?.candles?.length ? 'چارت ذخیره‌شده مربوط به قیمت است؛ برای نمایش مارکت‌کپ دوباره چارت کامل را دریافت کن.' : 'برای این تایم‌فریم هنوز کندلی ذخیره نشده است.';
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
      if (!response.ok) throw new Error(payload.message || (response.status === 503 ? 'سرویس چارت موقتاً محدود شده؛ کمی بعد دوباره تلاش کن.' : 'دریافت کندل ناموفق بود.'));
      if (payload.valueType !== 'marketCap') throw new Error('سرویس چارت هنوز مارکت‌کپ برنمی‌گرداند؛ API ژورنال وب را به‌روزرسانی کن.');
      if (!payload.candles?.length) throw new Error('Birdeye برای این توکن در تایم‌فریم انتخابی کندلی برنگرداند؛ آدرس قرارداد یا تایم‌فریم را بررسی کن.');
      fullCandles = payload.candles;
      selectionConfirmed = false;
      modal.querySelectorAll('[data-draw], [data-save-chart], [data-clear-drawings]').forEach((button) => { button.disabled = true; });
      fromInput.value = '1';
      toInput.value = String(Math.min(13, fullCandles.length));
      modal.querySelector('[data-confirm-range]').disabled = false;
      mountJournalChart({ candles: fullCandles, overlays: [] }, trade);
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
    const snapshot = { start: candles[0].time, count: candles.length, fromIndex: from, toIndex: to, valueType: 'marketCap', candles, overlays: [] };
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

function showJournalToast(trade) {
  if (!pushToast) return;
  pushToast.querySelector('[data-push-toast-body]').textContent = trade?.token ? `${trade.token} به ژورنال اضافه شد` : 'یک ژورنال تازه ثبت شد';
  pushToast.hidden = false;
  requestAnimationFrame(() => pushToast.classList.add('visible'));
  clearTimeout(pushToastTimer);
  pushToastTimer = window.setTimeout(() => {
    pushToast.classList.remove('visible');
    window.setTimeout(() => { pushToast.hidden = true; }, 250);
  }, 4200);
}

function decodePushKey(value) {
  const padded = value + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
}

async function setupJournalPush(config) {
  if (!pushEnableButton || !config.pushEnabled || !config.pushPublicKey) return;
  pushEnableButton.hidden = false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    pushEnableButton.textContent = 'اعلان روی این مرورگر پشتیبانی نمی‌شود';
    pushEnableButton.disabled = true;
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await apiFetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
      pushEnableButton.textContent = 'اعلان ژورنال فعال است';
      pushEnableButton.disabled = true;
    }
  } catch (error) {
    pushEnableButton.textContent = 'فعال‌سازی اعلان';
  }
}

async function enableJournalPush() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone) {
    window.alert('برای اعلان در آیفون، ابتدا از منوی اشتراک‌گذاری Safari گزینهٔ «Add to Home Screen» را بزن و ژورنال را از صفحهٔ اصلی باز کن.');
    return;
  }
  try {
    pushEnableButton.disabled = true;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('اجازهٔ اعلان داده نشد.');
    const [configResponse, registration] = await Promise.all([
      fetch('/api/config').then((response) => response.json()),
      navigator.serviceWorker.register('/service-worker.js'),
    ]);
    if (!configResponse.pushEnabled || !configResponse.pushPublicKey) throw new Error('اعلان وب هنوز در سرور تنظیم نشده است.');
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePushKey(configResponse.pushPublicKey) });
    const response = await apiFetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'ثبت اشتراک اعلان ناموفق بود.');
    pushEnableButton.textContent = 'اعلان ژورنال فعال است';
    showJournalToast({ token: 'اعلان‌ها فعال شدند' });
  } catch (error) {
    pushEnableButton.disabled = false;
    pushEnableButton.textContent = 'فعال‌سازی دوبارهٔ اعلان';
    window.alert(error.message || 'فعال‌سازی اعلان انجام نشد.');
  }
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

function renderOverview() {
  if (!overviewView) return;
  const closed = state.trades.filter((trade) => trade.status === 'closed');
  const networkRows = Object.entries(closed.reduce((groups, trade) => {
    const name = String(trade.network || 'سایر').trim() || 'سایر';
    if (!groups[name]) groups[name] = { count: 0, pnl: 0, wins: 0 };
    groups[name].count += 1;
    groups[name].pnl += tradePnl(trade);
    if (tradePnl(trade) > 0) groups[name].wins += 1;
    return groups;
  }, {})).sort((left, right) => right[1].pnl - left[1].pnl);
  const recent = [...state.trades].sort((left, right) => getTradeDateKey(right).localeCompare(getTradeDateKey(left))).slice(0, 6);
  const average = closed.length ? closed.reduce((sum, trade) => sum + tradePnl(trade), 0) / closed.length : 0;
  overviewView.innerHTML = `
    <div class="overview-heading"><div><span>گزارش عملکرد</span><h2>نمای کلی معاملات</h2></div><span class="overview-period">${closed.length} معاملهٔ بسته · ${state.trades.filter((trade) => trade.status === 'open').length} معاملهٔ باز</span></div>
    <div class="overview-grid">
      <section class="overview-block"><h3>عملکرد کلی</h3><div class="overview-stat"><span>میانگین سود/ضرر هر معامله</span><strong class="${average >= 0 ? 'positive' : 'negative'}">${average >= 0 ? '+' : '-'}$${Math.abs(average).toFixed(2)}</strong></div><div class="overview-stat"><span>بیشترین سود</span><strong class="positive">${closed.length ? '+$' + Math.max(...closed.map(tradePnl)).toFixed(2) : '—'}</strong></div><div class="overview-stat"><span>بیشترین ضرر</span><strong class="negative">${closed.length ? '-$' + Math.abs(Math.min(...closed.map(tradePnl))).toFixed(2) : '—'}</strong></div></section>
      <section class="overview-block"><h3>عملکرد بر اساس شبکه</h3>${networkRows.length ? networkRows.map(([name, value]) => `<div class="overview-stat"><span>${escapeHtml(name)} · ${value.count} معامله</span><strong class="${value.pnl >= 0 ? 'positive' : 'negative'}">${value.pnl >= 0 ? '+' : '-'}$${Math.abs(value.pnl).toFixed(2)}</strong></div>`).join('') : '<div class="overview-empty">هنوز معاملهٔ بسته‌ای برای گزارش وجود ندارد.</div>'}</section>
      <section class="overview-block overview-recent"><h3>معاملات اخیر</h3>${recent.length ? `<div class="overview-list">${recent.map((trade) => { const pnl = tradePnl(trade); const isOpen = trade.status === 'open'; return `<div class="overview-trade"><div><strong>${escapeHtml(trade.token || 'بدون نام')}</strong><span>${escapeHtml(trade.network || '—')} · ${escapeHtml(getTradeDateKey(trade) || '—')}</span></div><strong class="${isOpen ? 'neutral' : pnl >= 0 ? 'positive' : 'negative'}">${isOpen ? 'باز' : `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`}</strong></div>`; }).join('')}</div>` : '<div class="overview-empty">هنوز معامله‌ای ثبت نشده است.</div>'}</section>
    </div>`;
}

function setJournalView(view) {
  activeJournalView = view === 'overview' ? 'overview' : 'journal';
  const overview = activeJournalView === 'overview';
  if (overviewView) overviewView.hidden = !overview;
  if (calendarWrap) calendarWrap.hidden = overview;
  if (overview && tradeForm) tradeForm.style.display = 'none';
  journalViewButtons.forEach((button) => {
    const active = button.dataset.journalView === activeJournalView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (overview) renderOverview();
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
    if (existingIndex < 0) showJournalToast(payload.trade);
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
  renderOverview();
  renderCalendar();
  renderSelectedDay();
}

journalViewButtons.forEach((button) => button.addEventListener('click', () => setJournalView(button.dataset.journalView)));

document.getElementById('newTradeBtn').addEventListener('click', () => {
  setJournalView('journal');
  resetForm();
  openTradeForm();
});

document.getElementById('syncKeyBtn').addEventListener('click', changeJournalAccessKey);

document.getElementById('cancelFormBtn').addEventListener('click', () => {
  tradeForm.style.display = 'none';
  resetForm();
});

document.getElementById('tradeForm').addEventListener('submit', saveTrade);
pushEnableButton?.addEventListener('click', enableJournalPush);
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
    setupJournalPush(config);
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
