const STORAGE_KEY = 'xayno-local-journal';
const TRADE_BASELINE_STORAGE_KEY = 'xayno-local-trade-baseline-v1';
const DEFERRED_TRADES_STORAGE_KEY = 'xayno-deferred-local-trades-v1';
const CHECKIN_STORAGE_KEY = 'xayno-daily-checkins-v1';
const TRADING_PROFILE_STORAGE_KEY = 'xayno-trading-profile-v1';
const PERSONAL_RULES_STORAGE_KEY = 'xayno-personal-trading-rules-v1';
const LESSON_LIBRARY_STORAGE_KEY = 'xayno-lesson-library-v1';
const CENTRAL_TOMBSTONES_STORAGE_KEY = 'xayno-central-record-tombstones-v1';
const TRADING_PROFILE_CATEGORIES = [
  ['triggers', 'محرک‌های احساسی'],
  ['moneyBeliefs', 'باورهای احتمالی دربارهٔ پول'],
  ['strengths', 'نقاط قوت'],
  ['growthAreas', 'زمینه‌های قابل‌تقویت'],
  ['biases', 'سوگیری‌ها با نمونه از معامله‌های تو'],
];
const telegramWebApp = window.Telegram?.WebApp || null;
const telegramInitData = String(telegramWebApp?.initData || '');
const coachLaunchParams = new URLSearchParams(window.location.search);
const coachLaunchConversationId = String(coachLaunchParams.get('coachConversation') || '');
const coachLaunchStartsSession = coachLaunchParams.get('coachSession') === '1';
let telegramUserId = '';
const appStorage = {
  getItem(key) {
    return telegramUserId ? localStorage.getItem(`xayno-tg-${telegramUserId}:${key}`) : null;
  },
  setItem(key, value) {
    if (!telegramUserId) throw new Error('ورود تلگرام تأیید نشده است.');
    localStorage.setItem(`xayno-tg-${telegramUserId}:${key}`, value);
  },
  removeItem(key) {
    if (!telegramUserId) throw new Error('ورود تلگرام تأیید نشده است.');
    localStorage.removeItem(`xayno-tg-${telegramUserId}:${key}`);
  },
};
function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const state = {
  trades: [],
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: localDateKey(new Date()),
  formImages: [],
  remoteEnabled: false,
  dailyCheckins: [],
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
const pushToast = document.getElementById('pushToast');
const overviewView = document.getElementById('overviewView');
const apiSettingsView = document.getElementById('apiSettingsView');
const calendarWrap = document.querySelector('.calendar-wrap');
const summaryGridElement = document.getElementById('summaryGrid');
const masterView = document.getElementById('masterView');
const coachView = document.getElementById('coachView');
const coachChatWelcome = document.getElementById('coachChatWelcome');
const coachSessionView = document.getElementById('coachSessionView');
const coachSessionWelcome = document.getElementById('coachSessionWelcome');
const coachSessionSummary = document.getElementById('coachSessionSummary');
const coachSessionCount = document.getElementById('coachSessionCount');
const coachModeChatButton = document.getElementById('coachModeChat');
const coachModeSessionButton = document.getElementById('coachModeSession');
const coachBackToJournalButton = document.getElementById('coachBackToJournal');
const masterChatLog = document.getElementById('masterChatLog');
const masterChatForm = document.getElementById('masterChatForm');
const masterChatInput = document.getElementById('masterChatInput');
const masterChatSend = document.getElementById('masterChatSend');
const masterReportButton = document.getElementById('masterReportBtn');
const masterReportStatus = document.getElementById('masterReportStatus');
const masterReportResult = document.getElementById('masterReportResult');
const weeklyCoachReportStatus = document.getElementById('weeklyCoachReportStatus');
const weeklyCoachReportResult = document.getElementById('weeklyCoachReportResult');
let weeklyCoachReportBusy = false;
const monthlyComparisonMonth = document.getElementById('monthlyComparisonMonth');
const monthlyComparisonNote = document.getElementById('monthlyComparisonNote');
const monthlyComparisonResult = document.getElementById('monthlyComparisonResult');
const coachSessionStartButton = document.getElementById('coachSessionStart');
const coachSessionStatus = document.getElementById('coachSessionStatus');
const masterChatStatus = document.getElementById('masterChatStatus');
const coachSessionTranscript = document.getElementById('coachSessionLog');
const coachSessionReplyForm = document.getElementById('coachSessionForm');
const coachSessionReplyInput = document.getElementById('coachSessionInput');
const coachSessionSendButton = document.getElementById('coachSessionSend');
const coachSessionFinishButton = document.getElementById('coachSessionFinish');
const coachSessionHistory = document.getElementById('coachSessionHistory');
const coachConversationList = document.getElementById('coachConversationList');
const coachConversationSearch = document.getElementById('coachConversationSearch');
const coachNewConversationButton = document.getElementById('coachNewConversation');
const coachNewConversationDrawerButton = document.getElementById('coachNewConversationDrawer');
const coachLoadOlderMessagesButton = document.getElementById('coachLoadOlderMessages');
const coachChatHistoryToggle = document.getElementById('coachChatHistoryToggle');
const coachChatDrawer = document.getElementById('coachChatDrawer');
const coachChatDrawerBackdrop = document.getElementById('coachChatDrawerBackdrop');
const coachChatActiveTitle = document.getElementById('coachChatActiveTitle');
const coachProactiveFollowup = document.getElementById('coachProactiveFollowup');
const coachProactiveStatus = document.getElementById('coachProactiveStatus');
const masterChatListStatus = document.getElementById('masterChatListStatus');
const coachMemoryList = document.getElementById('coachMemoryList');
const coachMemoryStatus = document.getElementById('coachMemoryStatus');
const afterLossFields = document.getElementById('afterLossFields');
const afterLossStatus = document.getElementById('afterLossStatus');
const afterLossResult = document.getElementById('afterLossResult');
const afterLossStreak = document.getElementById('afterLossStreak');
const tradingProfileGenerateButton = document.getElementById('tradingProfileGenerateBtn');
const tradingProfileEditButton = document.getElementById('tradingProfileEditBtn');
const tradingProfileSaveButton = document.getElementById('tradingProfileSaveBtn');
const tradingProfileDeleteButton = document.getElementById('tradingProfileDeleteBtn');
const tradingProfileStatus = document.getElementById('tradingProfileStatus');
const tradingProfileResult = document.getElementById('tradingProfileResult');
const personalRulesButton = document.getElementById('personalRulesSuggestBtn');
const personalRulesStatus = document.getElementById('personalRulesStatus');
const personalRulesSuggestions = document.getElementById('personalRulesSuggestions');
const personalRulesList = document.getElementById('personalRulesList');
const lessonLibraryForm = document.getElementById('lessonLibraryForm');
const lessonBook = document.getElementById('lessonBook');
const lessonText = document.getElementById('lessonText');
const lessonTags = document.getElementById('lessonTags');
const lessonLibrarySaveButton = document.getElementById('lessonLibrarySaveBtn');
const lessonLibraryCancelButton = document.getElementById('lessonLibraryCancelBtn');
const lessonLibraryStatus = document.getElementById('lessonLibraryStatus');
const lessonLibraryList = document.getElementById('lessonLibraryList');
const preTradeCheck = document.getElementById('preTradeCheck');
const preTradeWhy = document.getElementById('preTradeWhy');
const preTradeStop = document.getElementById('preTradeStop');
const preTradeSimilar = document.getElementById('preTradeSimilar');
const preTradeSetup = document.getElementById('preTradeSetup');
const preTradeEmotion = document.getElementById('preTradeEmotion');
const preTradeSetupField = document.getElementById('preTradeSetupField');
const preTradeEmotionField = document.getElementById('preTradeEmotionField');
const preTradeRuleChecksElement = document.getElementById('preTradeRuleChecks');
const postTradeRuleReview = document.getElementById('postTradeRuleReview');
const postTradeRuleList = document.getElementById('postTradeRuleList');
const postTradeRuleStatus = document.getElementById('postTradeRuleStatus');
const preTradeStatus = document.getElementById('preTradeStatus');
const preTradeResult = document.getElementById('preTradeResult');
let preTradeReviewComplete = false;
let preTradeFromForm = false;
let preTradeReviewBusy = false;
let preTradeUrgencyMode = false;
let preTradeUrgencyCountdown = 0;
let pendingPostTradeReviewId = '';
let afterLossReviewBusy = false;
const dailyCheckinForm = document.getElementById('dailyCheckinForm');
const checkinFeedback = document.getElementById('checkinFeedback');
const checkinHistory = document.getElementById('checkinHistory');
const checkinLocalNote = document.getElementById('checkinLocalNote');
const chatApiState = document.getElementById('chatApiState');
const reportApiState = document.getElementById('reportApiState');
const journalViewButtons = [...document.querySelectorAll('[data-journal-view]')];
let syncInProgress = false;
let cloudTradesVerified = false;
let tradeBaselineReady = false;
let deferredLocalTradeCount = 0;
let centralSyncPromise = null;
let centralSyncRequested = false;
let pushToastTimer = null;
let activeJournalView = 'coach';
let masterChatHistory = [];
let coachingSessions = [];
let coachConversations = [];
let activeConversation = null;
let coachConversationLoadSequence = 0;
let coachConversationSelectionSequence = 0;
let conversationHasMoreMessages = false;
let conversationSearchMatches = {};
let coachMemories = [];
let activeConversationSyncedCount = 0;
const invalidCentralLocalStorage = new Set();
let activeCoachingSession = null;
let activeCoachingQuestion = 0;
let activeCoachMode = 'chat';
let coachSessionBusy = false;
let tradingProfile = null;
let tradingProfileEditing = false;
let tradingProfileBusy = false;
let personalRuleSuggestions = [];
let personalRulesBusy = false;
let personalRules = [];
let lessonLibrary = [];
let lessonLibraryEditingId = '';
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
  syncState.textContent = state.remoteEnabled
    ? (online ? `متصل${deferredLocalTradeCount ? ` · ${deferredLocalTradeCount} محلی` : ''}` : 'قطع')
    : 'فعال';
  syncState.title = deferredLocalTradeCount
    ? `${deferredLocalTradeCount} معاملهٔ موجود روی همین دستگاه حفظ شده و خودکار به Cloudflare منتقل نمی‌شود.`
    : '';
  syncState.style.color = (!state.remoteEnabled || online) ? 'var(--green)' : 'var(--yellow)';
}

async function apiFetch(url, options = {}) {
  if (!telegramInitData) throw new Error('برای ادامه، ژورنال را از داخل مینی‌اپ تلگرام باز کن.');
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `tma ${telegramInitData}`);
  return fetch(url, { ...options, headers, credentials: 'omit', cache: 'no-store' });
}

function showJournalToast(trade, coachFeedback = '') {
  if (!pushToast) return;
  const title = pushToast.querySelector('.push-toast-copy strong');
  const body = pushToast.querySelector('[data-push-toast-body]');
  pushToast.classList.toggle('has-coach-feedback', Boolean(coachFeedback));
  title.textContent = coachFeedback ? 'بازخورد استاد' : 'ژورنال جدید ثبت شد';
  body.textContent = coachFeedback
    ? `${trade?.token ? `${trade.token} · ` : ''}${coachFeedback}`
    : trade?.token ? `${trade.token} به ژورنال اضافه شد` : 'یک ژورنال تازه ثبت شد';
  pushToast.hidden = false;
  requestAnimationFrame(() => pushToast.classList.add('visible'));
  clearTimeout(pushToastTimer);
  pushToastTimer = window.setTimeout(() => {
    pushToast.classList.remove('visible');
    pushToast.classList.remove('has-coach-feedback');
    window.setTimeout(() => { pushToast.hidden = true; }, 250);
  }, coachFeedback ? 9000 : 4200);
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
    const raw = appStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveLocalTrades(trades) {
  appStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function storedTradeIds(key) {
  const raw = appStorage.getItem(key);
  if (key === TRADE_BASELINE_STORAGE_KEY && raw === null) {
    throw new Error('وضعیت اولیهٔ معاملات ثبت نشده؛ همگام‌سازی برای جلوگیری از انتقال ناخواسته متوقف شد.');
  }
  const parsed = JSON.parse(raw || '[]');
  if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string')) {
    throw new Error('فهرست شناسه‌های معاملات محلی معتبر نیست؛ داده‌ها حفظ شدند.');
  }
  return parsed;
}

function establishTradeSyncBaseline(localTrades, cloudTrades) {
  if (!state.remoteEnabled) {
    cloudTradesVerified = true;
    return;
  }
  const cloudIds = new Set(cloudTrades.map((trade) => String(trade.id)));
  const baselineIds = storedTradeIds(TRADE_BASELINE_STORAGE_KEY);
  const deferredIds = new Set(storedTradeIds(DEFERRED_TRADES_STORAGE_KEY));
  for (const trade of localTrades) {
    const id = String(trade.id || '');
    if (id && !cloudIds.has(id) && baselineIds.includes(id)) deferredIds.add(id);
  }
  appStorage.setItem(DEFERRED_TRADES_STORAGE_KEY, JSON.stringify([...deferredIds]));
  tradeBaselineReady = true;
  cloudTradesVerified = true;
}

function mergeCloudAndDeferredTrades(cloudTrades, localTrades) {
  const cloudIds = new Set(cloudTrades.map((trade) => String(trade.id)));
  const deferredIds = new Set(state.remoteEnabled ? storedTradeIds(DEFERRED_TRADES_STORAGE_KEY) : []);
  const deferred = localTrades.filter((trade) => deferredIds.has(String(trade.id)) && !cloudIds.has(String(trade.id)));
  deferredLocalTradeCount = deferred.length;
  return [...cloudTrades, ...deferred];
}

function centralCollectionSpecs() {
  return [
    {
      collection: 'checkins',
      read: () => state.dailyCheckins,
      write: (records) => { state.dailyCheckins = records; renderDailyCheckin(); },
    },
    {
      collection: 'personal_rules',
      read: () => personalRules,
      write: (records) => { personalRules = records; renderPersonalRules(); },
    },
    {
      collection: 'lesson_library',
      read: () => lessonLibrary,
      write: (records) => { lessonLibrary = records; renderLessonLibrary(); },
    },
    {
      collection: 'memories',
      read: () => tradingProfile ? [{ ...tradingProfile, id: 'trading_profile' }] : [],
      write: (records) => {
        const profile = records.find((record) => record.id === 'trading_profile');
        tradingProfile = profile ? Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'id' && key !== 'deleted')) : null;
        tradingProfileSaved = Boolean(tradingProfile);
        renderTradingProfile();
      },
    },
  ];
}

function readCentralTombstones() {
  const records = JSON.parse(appStorage.getItem(CENTRAL_TOMBSTONES_STORAGE_KEY) || '[]');
  if (!Array.isArray(records) || records.some((record) => !record
    || typeof record.collection !== 'string' || typeof record.id !== 'string' || typeof record.updatedAt !== 'string')) {
    throw new Error('نشانگرهای حذف داده‌های ابری قابل خواندن نیستند؛ داده‌ها حفظ شدند.');
  }
  return records;
}

function centralRecordId(record) {
  return String(record?.id || record?.date || '').trim();
}

function centralRecordTime(record) {
  const timestamp = Date.parse(record?.updatedAt || record?.approvedAt || record?.createdAt || record?.generatedAt || record?.date || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function postCentralRecord(collection, record) {
  const response = await apiFetch(`/api/central/${encodeURIComponent(collection)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `همگام‌سازی ${collection} در فضای ابری ناموفق بود.`);
}

async function syncCentralRecordsOnce() {
  const tombstones = readCentralTombstones();
  const nextTombstones = [...tombstones];

  for (const spec of centralCollectionSpecs()) {
    const response = await apiFetch(`/api/central/${encodeURIComponent(spec.collection)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `خواندن ${spec.collection} از فضای ابری ناموفق بود.`);
    if (!Array.isArray(payload.records)) throw new Error(`پاسخ فضای ابری برای ${spec.collection} معتبر نیست.`);

    const localRecords = spec.read().filter((record) => record && centralRecordId(record));
    const candidates = [
      ...payload.records.map((record) => ({ record, source: 'cloud' })),
      ...localRecords.map((record) => ({ record, source: 'local' })),
      ...nextTombstones.filter((record) => record.collection === spec.collection)
        .map((record) => ({ record: { ...record, deleted: true }, source: 'local' })),
    ];
    const winners = new Map();
    for (const candidate of candidates) {
      const id = centralRecordId(candidate.record);
      if (!id) continue;
      const current = winners.get(id);
      const newer = !current
        || centralRecordTime(candidate.record) > centralRecordTime(current.record)
        || (centralRecordTime(candidate.record) === centralRecordTime(current.record)
          && candidate.source === 'cloud' && current.source === 'local');
      if (newer) winners.set(id, candidate);
    }

    const pendingWrites = [];
    for (const [id, winner] of winners) {
      if (winner.source !== 'local') continue;
      const record = { ...winner.record, id };
      if (!record.updatedAt) record.updatedAt = new Date().toISOString();
      pendingWrites.push(postCentralRecord(spec.collection, record));
    }
    for (let index = 0; index < pendingWrites.length; index += 10) {
      await Promise.all(pendingWrites.slice(index, index + 10));
    }

    for (const [id, winner] of winners) {
      if (winner.record.deleted) {
        if (!nextTombstones.some((record) => record.collection === spec.collection && record.id === id)) {
          nextTombstones.push({ collection: spec.collection, id, updatedAt: winner.record.updatedAt || new Date().toISOString() });
        }
      } else {
        for (let index = nextTombstones.length - 1; index >= 0; index -= 1) {
          if (nextTombstones[index].collection === spec.collection && nextTombstones[index].id === id) nextTombstones.splice(index, 1);
        }
      }
    }

    const records = [...winners.values()]
      .filter(({ record }) => !record.deleted)
      .map(({ record }) => record)
      .sort((left, right) => centralRecordTime(right) - centralRecordTime(left));
    spec.write(records);
    const storageKey = {
      checkins: CHECKIN_STORAGE_KEY,
      personal_rules: PERSONAL_RULES_STORAGE_KEY,
      lesson_library: LESSON_LIBRARY_STORAGE_KEY,
      memories: TRADING_PROFILE_STORAGE_KEY,
    }[spec.collection];
    if (invalidCentralLocalStorage.has(spec.collection)) continue;
    if (spec.collection === 'memories') {
      const profile = records.find((record) => record.id === 'trading_profile');
      if (profile) appStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'id'))));
      else appStorage.removeItem(storageKey);
    } else {
      appStorage.setItem(storageKey, JSON.stringify(records));
    }
  }

  appStorage.setItem(CENTRAL_TOMBSTONES_STORAGE_KEY, JSON.stringify(nextTombstones));
}

function syncCentralRecords() {
  if (!state.remoteEnabled) return Promise.resolve();
  if (centralSyncPromise) {
    centralSyncRequested = true;
    return centralSyncPromise;
  }
  centralSyncPromise = (async () => {
    try {
      do {
        centralSyncRequested = false;
        await syncCentralRecordsOnce();
      } while (centralSyncRequested);
      if (checkinLocalNote) {
        checkinLocalNote.textContent = invalidCentralLocalStorage.size
          ? 'داده‌های معتبر با فضای ابری همگام شدند؛ موارد محلیِ ناخوانا دست‌نخورده باقی ماندند.'
          : 'چک‌این‌ها، قوانین، درس‌ها و نقشهٔ شخصیت با فضای ابری همگام شدند.';
      }
    } catch (error) {
      if (checkinLocalNote) checkinLocalNote.textContent = `${error.message} داده‌های روی این دستگاه حفظ شدند و بعداً دوباره تلاش می‌شود.`;
      throw error;
    } finally {
      centralSyncPromise = null;
    }
  })();
  return centralSyncPromise;
}

function queueCentralCollectionSync(collection, previousRecords, nextRecords, statusElement, successMessage) {
  const nextIds = new Set(nextRecords.map(centralRecordId));
  let tombstones;
  try {
    tombstones = readCentralTombstones();
  } catch (error) {
    if (statusElement) statusElement.textContent = error.message;
    return;
  }
  const now = new Date().toISOString();
  for (const record of previousRecords) {
    const id = centralRecordId(record);
    if (id && !nextIds.has(id) && !tombstones.some((item) => item.collection === collection && item.id === id)) {
      tombstones.push({ collection, id, updatedAt: now });
    }
  }
  for (const record of nextRecords) {
    const id = centralRecordId(record);
    for (let index = tombstones.length - 1; index >= 0; index -= 1) {
      if (tombstones[index].collection === collection && tombstones[index].id === id
        && centralRecordTime(record) > centralRecordTime(tombstones[index])) tombstones.splice(index, 1);
    }
  }
  try {
    appStorage.setItem(CENTRAL_TOMBSTONES_STORAGE_KEY, JSON.stringify(tombstones));
  } catch (error) {
    if (statusElement) statusElement.textContent = 'داده روی این دستگاه ذخیره شد، اما ثبت نشانگر حذف در مرورگر ناموفق بود.';
    return;
  }
  if (!state.remoteEnabled) {
    if (statusElement) statusElement.textContent = `${successMessage} فقط روی همین دستگاه؛ اتصال ابری در دسترس نیست.`;
    return;
  }
  syncCentralRecords().then(() => {
    if (statusElement) statusElement.textContent = `${successMessage} با فضای ابری همگام شد.`;
  }).catch((error) => {
    if (statusElement) statusElement.textContent = `روی این دستگاه ذخیره شد؛ همگام‌سازی ابری ناموفق بود: ${error.message}`;
  });
}

async function fetchServerTrades() {
  try {
    const response = await apiFetch('/api/trades');
    if (!response.ok) throw new Error(`خواندن معاملات ابری ناموفق بود (${response.status}).`);
    const payload = await response.json();
    if (!Array.isArray(payload.trades)) throw new Error('فهرست معاملات ابری معتبر نیست.');
    return payload.trades;
  } catch (error) {
    updateSyncStatus(false);
    return null;
  }
}

async function syncLocalTradesToServer() {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    let remoteTrades;
    if (!cloudTradesVerified) {
      remoteTrades = await fetchServerTrades();
      if (!Array.isArray(remoteTrades)) return;
      const localTrades = readLocalTrades();
      establishTradeSyncBaseline(localTrades, remoteTrades);
      const mergedTrades = mergeCloudAndDeferredTrades(remoteTrades, localTrades);
      saveLocalTrades(mergedTrades);
      state.trades = mergedTrades;
      renderAll();
    }
    const pendingTrades = readLocalTrades();
    const deferredIds = new Set(state.remoteEnabled ? storedTradeIds(DEFERRED_TRADES_STORAGE_KEY) : []);
    const uploadTrades = pendingTrades.filter((trade) => !deferredIds.has(String(trade.id)));
    const response = await apiFetch('/api/trades/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: uploadTrades, deleted: [] }),
    });
    if (!response.ok) {
      updateSyncStatus(false);
      return;
    }
    const payload = await response.json();
    if (Array.isArray(payload.trades)) {
      const mergedTrades = mergeCloudAndDeferredTrades(payload.trades, readLocalTrades());
      saveLocalTrades(mergedTrades);
      state.trades = mergedTrades;
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

function getProcessScore(trade) {
  const entryDate = trade.entryTimeProvided && trade.openedAt ? new Date(trade.openedAt) : null;
  const hasEntryTime = entryDate && Number.isFinite(entryDate.getTime());
  const criteria = [
    { label: 'ورود در بازهٔ ۸ تا ۱۱ صبح', available: Boolean(hasEntryTime), passed: Boolean(hasEntryTime && entryDate.getHours() >= 8 && entryDate.getHours() < 11) },
    { label: 'حالت ذهنی ثبت شده', available: Boolean(String(trade.emotion || '').trim()), passed: Boolean(String(trade.emotion || '').trim()) },
    { label: 'ستاپ ثبت شده', available: Boolean(String(trade.setup || '').trim()), passed: Boolean(String(trade.setup || '').trim()) },
    { label: 'حد ضرر ثبت شده', available: Boolean(String(trade.stopLoss || '').trim()), passed: Boolean(String(trade.stopLoss || '').trim()) },
    { label: 'دلیل ورود ثبت شده', available: Boolean(String(trade.entryReason || '').trim()), passed: Boolean(String(trade.entryReason || '').trim()) },
  ];
  const score = criteria.reduce((sum, item) => sum + (item.passed ? 20 : 0), 0);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  return {
    score,
    grade,
    criteria,
    complete: criteria.every((item) => item.available),
    availableCount: criteria.filter((item) => item.available).length,
    passedCount: criteria.filter((item) => item.passed).length,
  };
}

function getPreviousMonthKey(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return '';
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

function summarizeMonthTrades(trades) {
  const closed = trades.filter((trade) => trade.status === 'closed');
  const scored = closed.map(getProcessScore).filter((score) => score.complete);
  const emotionSignals = [
    { label: 'ترس', pattern: /ترس|ترسیدم|می‌ترسم|fear/i },
    { label: 'طمع', pattern: /طمع|حریص|greed/i },
    { label: 'فومو', pattern: /فومو|fomo|جا\s*ماندن|جاماندن/i },
    { label: 'بی‌صبری', pattern: /بی‌صبری|بی صبری|عجله|شتاب‌زده|impatien/i },
  ];
  const emotions = emotionSignals.map(({ label, pattern }) => ({
    label,
    count: trades.filter((trade) => [trade.emotion, trade.mistakes, trade.notes, trade.entryReason, trade.exitReason, trade.lesson]
      .some((value) => pattern.test(String(value || '')))).length,
  })).filter((item) => item.count > 0).sort((left, right) => right.count - left.count);
  const mistakeGroups = new Map();
  for (const trade of trades) {
    const mistake = String(trade.mistakes || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fa-IR');
    if (!mistake) continue;
    const group = mistakeGroups.get(mistake) || { text: String(trade.mistakes).trim(), count: 0 };
    group.count += 1;
    mistakeGroups.set(mistake, group);
  }
  const repeatedMistakes = [...mistakeGroups.values()].filter((item) => item.count > 1)
    .sort((left, right) => right.count - left.count).slice(0, 3);
  const ruleChecks = trades.flatMap((trade) => Array.isArray(trade.personalRuleChecks) ? trade.personalRuleChecks : []);
  const reviewedRuleChecks = ruleChecks.filter((check) => ['complied', 'not-complied', 'not-applicable'].includes(check.outcomeStatus));
  const applicableRuleChecks = reviewedRuleChecks.filter((check) => check.outcomeStatus === 'complied' || check.outcomeStatus === 'not-complied');
  const followedRuleChecks = applicableRuleChecks.filter((check) => check.outcomeStatus === 'complied').length;
  return {
    total: trades.length,
    closed: closed.length,
    pnl: closed.reduce((sum, trade) => sum + tradePnl(trade), 0),
    processAverage: scored.length ? scored.reduce((sum, score) => sum + score.score, 0) / scored.length : null,
    scoredCount: scored.length,
    emotions,
    repeatedMistakes,
    ruleChecks,
    reviewedRuleChecks,
    followedRuleChecks,
    applicableRuleChecks: applicableRuleChecks.length,
  };
}

function renderMonthlyComparison() {
  if (!monthlyComparisonMonth || !monthlyComparisonResult || !monthlyComparisonNote) return;
  const monthKey = monthlyComparisonMonth.value;
  const previousKey = getPreviousMonthKey(monthKey);
  if (!previousKey) {
    monthlyComparisonNote.textContent = 'یک ماه معتبر انتخاب کن تا مقایسه نمایش داده شود.';
    monthlyComparisonResult.replaceChildren();
    return;
  }
  const summaries = [monthKey, previousKey].map((key) => ({
    key,
    trades: state.trades.filter((trade) => getTradeDateKey(trade).slice(0, 7) === key),
  })).map((period) => ({ ...period, summary: summarizeMonthTrades(period.trades) }));
  const [current, previous] = summaries;
  const monthLabel = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString('fa-IR-u-ca-gregory', { year: 'numeric', month: 'long' });
  const formatMoney = (value) => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
  const renderPeriod = ({ key, summary }) => `
    <section class="monthly-comparison-period">
      <h3>${escapeHtml(monthLabel(key))}</h3>
      <p>تعداد معامله: ${summary.total} (بسته: ${summary.closed})</p>
      <p>سود/ضرر بسته‌شده: ${formatMoney(summary.pnl)}</p>
      <p>میانگین نمرهٔ فرآیند: ${summary.processAverage === null ? 'دادهٔ کامل ندارد' : `${summary.processAverage.toFixed(0)}/100`} · ${summary.scoredCount} معاملهٔ دارای اطلاعات کامل</p>
      <p>احساس‌های ثبت‌شده در متن‌ها: ${summary.emotions.length ? summary.emotions.map((item) => `${escapeHtml(item.label)} (${item.count})`).join('، ') : 'پیدا نشد'}</p>
      <p>اشتباه تکراری: ${summary.repeatedMistakes.length ? summary.repeatedMistakes.map((item) => `${escapeHtml(item.text)} (${item.count})`).join('؛ ') : 'تکرار یکسان پیدا نشد'}</p>
      <p>قوانین پس از بستن: رعایت ${summary.followedRuleChecks} از ${summary.applicableRuleChecks} مورد · ${summary.ruleChecks.length - summary.reviewedRuleChecks.length} بررسی‌نشده</p>
    </section>`;
  monthlyComparisonNote.textContent = state.trades.length < 30 || current.summary.total < 30 || previous.summary.total < 30
    ? `دادهٔ یکی از بازه‌ها کمتر از ۳۰ معامله است؛ داده هنوز کمه و این مقایسه فقط توصیفی است، نه نتیجهٔ آماری قطعی. فقط پیگیری‌هایی شمرده می‌شوند که پس از بستن معامله ثبت شده‌اند.`
    : 'این مقایسه توصیفی است و رابطهٔ احساس‌ها یا قوانین با نتیجه را علت‌ومعلولی ثابت نمی‌کند. فقط پیگیری‌های پس از بستن معامله شمرده می‌شوند.';
  monthlyComparisonResult.innerHTML = renderPeriod(current) + renderPeriod(previous);
}

function getOutcomeLabel(trade) {
  if (trade.status === 'open') return 'باز';
  const pnl = tradePnl(trade);
  return pnl > 0 ? 'سود' : pnl < 0 ? 'ضرر' : 'سر به سر';
}

function getProcessOutcomeTag(trade, process) {
  if (!process.complete || trade.status !== 'closed') return '';
  const pnl = tradePnl(trade);
  if (pnl > 0 && process.score <= 80) return 'سود بد';
  if (pnl < 0 && process.score === 100) return 'ضرر خوب';
  return '';
}

function processBadgeMarkup(trade) {
  const process = getProcessScore(trade);
  const tag = getProcessOutcomeTag(trade, process);
  const gradeText = process.complete
    ? `فرآیند ${process.grade} · ${process.score}/100`
    : `فرآیند ناقص · ${process.availableCount}/5`;
  const outcome = getOutcomeLabel(trade);
  const tagMarkup = tag ? ` · ${tag}` : '';
  const tone = process.complete ? (process.score >= 80 ? 'good' : process.score <= 40 ? 'bad' : '') : 'incomplete';
  return `<span class="process-badge ${tone}">${gradeText} · نتیجه: ${outcome}${tagMarkup}</span>`;
}

function processTrendMarkup(trades) {
  const scored = trades
    .map((trade) => ({ trade, process: getProcessScore(trade) }))
    .filter((item) => item.process.complete)
    .sort((left, right) => getTradeDateKey(left.trade).localeCompare(getTradeDateKey(right.trade)))
    .slice(-20);
  if (!scored.length) return '<div class="process-chart-empty">برای رسم روند، اطلاعات فرآیند را در معاملات ثبت یا ویرایش کن.</div>';

  const width = 600;
  const height = 180;
  const padding = { top: 16, right: 18, bottom: 30, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = scored.map(({ process }, index) => {
    const x = scored.length === 1 ? padding.left + chartWidth / 2 : padding.left + index * chartWidth / (scored.length - 1);
    const y = padding.top + chartHeight * (1 - process.score / 100);
    return { x, y, score: process.score };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const average = scored.reduce((sum, item) => sum + item.process.score, 0) / scored.length;
  return `<svg class="process-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="روند نمرهٔ فرآیند در ${scored.length} معامله؛ میانگین ${average.toFixed(0)} از ۱۰۰">
    ${[0, 50, 100].map((score) => {
      const y = padding.top + chartHeight * (1 - score / 100);
      return `<line class="process-chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/><text class="process-chart-label" x="2" y="${y + 3}">${score}</text>`;
    }).join('')}
    <polyline class="process-chart-line" points="${polyline}"/>
    ${points.map((point, index) => `<circle class="process-chart-point" cx="${point.x}" cy="${point.y}" r="5"><title>معامله ${index + 1}: ${point.score}/100</title></circle>`).join('')}
    <text class="process-chart-label" x="${padding.left}" y="${height - 5}">قدیمی‌تر</text><text class="process-chart-label" x="${width - padding.right}" y="${height - 5}" text-anchor="end">جدیدتر</text>
  </svg><div class="overview-empty">میانگین ${average.toFixed(0)} از ۱۰۰ در ${scored.length} معاملهٔ کامل‌شدهٔ اخیر</div>`;
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
  const scoredTrades = state.trades.filter((trade) => getProcessScore(trade).complete);
  const averageProcess = scoredTrades.length
    ? scoredTrades.reduce((sum, trade) => sum + getProcessScore(trade).score, 0) / scoredTrades.length
    : null;
  overviewView.innerHTML = `
    <div class="overview-heading"><div><span>گزارش عملکرد</span><h2>نمای کلی معاملات</h2></div><span class="overview-period">${closed.length} معاملهٔ بسته · ${state.trades.filter((trade) => trade.status === 'open').length} معاملهٔ باز</span></div>
    <div class="overview-grid">
      <section class="overview-block"><h3>عملکرد کلی</h3><div class="overview-stat"><span>میانگین سود/ضرر هر معامله</span><strong class="${average >= 0 ? 'positive' : 'negative'}">${average >= 0 ? '+' : '-'}$${Math.abs(average).toFixed(2)}</strong></div><div class="overview-stat"><span>بیشترین سود</span><strong class="positive">${closed.length ? '+$' + Math.max(...closed.map(tradePnl)).toFixed(2) : '—'}</strong></div><div class="overview-stat"><span>بیشترین ضرر</span><strong class="negative">${closed.length ? '-$' + Math.abs(Math.min(...closed.map(tradePnl))).toFixed(2) : '—'}</strong></div></section>
      <section class="overview-block"><h3>عملکرد بر اساس شبکه</h3>${networkRows.length ? networkRows.map(([name, value]) => `<div class="overview-stat"><span>${escapeHtml(name)} · ${value.count} معامله</span><strong class="${value.pnl >= 0 ? 'positive' : 'negative'}">${value.pnl >= 0 ? '+' : '-'}$${Math.abs(value.pnl).toFixed(2)}</strong></div>`).join('') : '<div class="overview-empty">هنوز معاملهٔ بسته‌ای برای گزارش وجود ندارد.</div>'}</section>
      <section class="overview-block overview-recent"><h3>نمرهٔ فرآیند تصمیم</h3><div class="overview-stat"><span>میانگین معاملات دارای اطلاعات کامل</span><strong class="${averageProcess === null ? 'neutral' : averageProcess >= 80 ? 'positive' : averageProcess <= 40 ? 'negative' : 'neutral'}">${averageProcess === null ? '—' : `${averageProcess.toFixed(0)}/100`}</strong></div><p class="overview-empty">امتیاز از ثبت حالت ذهنی، ستاپ، حد ضرر، دلیل ورود و رعایت ساعت ۸ تا ۱۱ صبح ساخته می‌شود. اطلاعات ناقص نمرهٔ قطعی نمی‌گیرد؛ متن‌ها به‌صورت خودکار قضاوت نمی‌شوند.</p>${processTrendMarkup(state.trades)}</section>
      <section class="overview-block overview-recent"><h3>معاملات اخیر</h3>${recent.length ? `<div class="overview-list">${recent.map((trade) => { const pnl = tradePnl(trade); const isOpen = trade.status === 'open'; return `<div class="overview-trade"><div><strong>${escapeHtml(trade.token || 'بدون نام')}</strong><span>${escapeHtml(trade.network || '—')} · ${escapeHtml(getTradeDateKey(trade) || '—')}</span>${processBadgeMarkup(trade)}</div><strong class="${isOpen ? 'neutral' : pnl >= 0 ? 'positive' : 'negative'}">${isOpen ? 'باز' : `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`}</strong></div>`; }).join('')}</div>` : '<div class="overview-empty">هنوز معامله‌ای ثبت نشده است.</div>'}</section>
    </div>`;
}

function setJournalView(view) {
  activeJournalView = ['overview', 'master', 'coach', 'settings'].includes(view) ? view : 'journal';
  const overview = activeJournalView === 'overview';
  const master = activeJournalView === 'master';
  const coach = activeJournalView === 'coach';
  const settings = activeJournalView === 'settings';
  if (overviewView) overviewView.hidden = !overview;
  if (masterView) masterView.hidden = !master;
  if (coachView) coachView.hidden = !coach;
  if (apiSettingsView) apiSettingsView.hidden = !settings;
  if (calendarWrap) calendarWrap.hidden = overview || master || coach || settings;
  if (summaryGridElement) summaryGridElement.hidden = master || coach || settings;
  if ((overview || master || coach || settings) && tradeForm) tradeForm.style.display = 'none';
  document.body.classList.toggle('coach-active-view', coach);
  if (master) {
    renderDailyCheckin();
    renderAfterLossStreak();
    loadWeeklyCoachReport();
  }
  journalViewButtons.forEach((button) => {
    const active = button.dataset.journalView === activeJournalView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (overview) renderOverview();
  if (!coach) closeCoachChatDrawer({ restoreFocus: false });
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
        ${trade.stopLoss ? `<div class="trade-meta">حد ضرر: ${escapeHtml(trade.stopLoss)}</div>` : ''}
        <div>${processBadgeMarkup(trade)}</div>
        ${trade.riskLevel ? `<div class="trade-meta">ریسک: ${escapeHtml(trade.riskLevel)}</div>` : ''}
        ${safeExternalUrl(trade.txLink) ? `<div class="trade-meta"><a href="${escapeHtml(safeExternalUrl(trade.txLink))}" target="_blank" rel="noopener">لینک تراکنش</a></div>` : ''}
        ${trade.setup ? `<div class="trade-meta">ستاپ: ${escapeHtml(trade.setup)}</div>` : ''}
        ${trade.entryReason ? `<div class="trade-meta">دلیل ورود: ${escapeHtml(trade.entryReason)}</div>` : ''}
        ${trade.exitReason ? `<div class="trade-meta">دلیل خروج: ${escapeHtml(trade.exitReason)}</div>` : ''}
        ${trade.emotion ? `<div class="trade-meta">حالت ذهنی: ${escapeHtml(trade.emotion)}</div>` : ''}
        ${trade.mistakes ? `<div class="trade-meta">اشتباه‌ها: ${escapeHtml(trade.mistakes)}</div>` : ''}
        ${trade.lesson ? `<div class="trade-meta">درس: ${escapeHtml(trade.lesson)}</div>` : ''}
        ${Array.isArray(trade.personalRuleChecks) && trade.personalRuleChecks.length ? `<div class="trade-meta">قوانین: ${trade.personalRuleChecks.map((check) => `${escapeHtml(check.rule)} — پیش از ورود: ${check.status === 'followed' ? 'قصد رعایت داشتم' : check.status === 'not-followed' ? 'قصد رعایت نداشتم' : 'نامربوط'}${check.outcomeStatus ? ` · پس از بستن: ${check.outcomeStatus === 'complied' ? 'رعایت شد' : check.outcomeStatus === 'not-complied' ? 'رعایت نشد' : 'نامربوط'}` : ''}`).join(' · ')}</div>` : ''}
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
  document.getElementById('stopLoss').value = trade.stopLoss || '';
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
  preTradeReviewComplete = false;
  preTradeFromForm = false;
  resetPreTradeUrgencyMode();
  if (preTradeCheck) preTradeCheck.hidden = true;
  document.getElementById('tradeId').value = '';
  document.getElementById('journalDate').value = state.selectedDate;
  state.formImages = [];
  renderImagePreviews();
  saveStatus.hidden = true;
}

function datetimeLocalFromIso(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

async function lookupTradeDetails() {
  const address = document.getElementById('address').value.trim();
  const txLink = document.getElementById('txLink').value.trim();
  const status = document.getElementById('tradeLookupStatus');
  const button = document.getElementById('tradeLookupBtn');
  if (!address && !txLink) {
    status.textContent = 'ابتدا آدرس قرارداد یا لینک تراکنش را وارد کن.';
    return;
  }
  button.disabled = true;
  status.textContent = 'در حال دریافت اطلاعات تاییدشده...';
  try {
    const response = await apiFetch('/api/trade-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, txLink }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'دریافت اطلاعات ناموفق بود.');

    if (payload.address && !document.getElementById('address').value.trim()) {
      document.getElementById('address').value = payload.address;
    }
    if (payload.token) document.getElementById('token').value = payload.token;
    if (payload.network) document.getElementById('network').value = payload.network;
    if (payload.entryMarketCap !== '' && payload.entryMarketCap != null) {
      document.getElementById('entryMarketCap').value = payload.entryMarketCap;
    }
    if (payload.exitMarketCap !== '' && payload.exitMarketCap != null) {
      document.getElementById('exitMarketCap').value = payload.exitMarketCap;
    }
    if (payload.openedAt) document.getElementById('openedAt').value = datetimeLocalFromIso(payload.openedAt);
    if (payload.closedAt) document.getElementById('closedAt').value = datetimeLocalFromIso(payload.closedAt);
    if (payload.investAmount !== '' && payload.investAmount != null) {
      document.getElementById('investAmount').value = payload.investAmount;
    }
    if (payload.pnlPercent !== '' && payload.pnlPercent != null) document.getElementById('pnlPercent').value = payload.pnlPercent;
    if (payload.pnlDollar !== '' && payload.pnlDollar != null) document.getElementById('pnlDollar').value = payload.pnlDollar;
    status.textContent = payload.found
      ? 'اطلاعات تاییدشده دریافت شد؛ فیلدهای ذهنی دست‌نخورده باقی مانده‌اند.'
      : 'دادهٔ تاییدشده‌ای پیدا نشد؛ هیچ مقداری حدس زده نشد.';
  } catch (error) {
    status.textContent = error.message || 'دریافت اطلاعات ناموفق بود.';
  } finally {
    button.disabled = false;
  }
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
    entryTimeProvided: Boolean(document.getElementById('openedAt').value),
    stopLoss: document.getElementById('stopLoss').value.trim(),
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

function normalizeJournalText(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function journalTextSimilarity(left, right) {
  const first = normalizeJournalText(left);
  const second = normalizeJournalText(right);
  if (!first || !second) return false;
  if (first === second) return true;
  const firstWords = new Set(first.split(/\s+/).filter((word) => word.length >= 3));
  const secondWords = new Set(second.split(/\s+/).filter((word) => word.length >= 3));
  if (!firstWords.size || !secondWords.size) return false;
  const shared = [...firstWords].filter((word) => secondWords.has(word)).length;
  return shared >= 2 && shared / new Set([...firstWords, ...secondWords]).size >= 0.5;
}

function findSimilarLosses(setup, emotion) {
  return state.trades.filter((trade) => trade.status === 'closed' && tradePnl(trade) < 0)
    .map((trade) => {
      const matches = [];
      if (journalTextSimilarity(setup, trade.setup)) matches.push('ستاپ');
      if (journalTextSimilarity(emotion, trade.emotion)) matches.push('حالت ذهنی');
      return { trade, matches };
    })
    .filter((item) => item.matches.length)
    .slice(0, 5);
}

function renderPreTradeWarnings() {
  const container = document.getElementById('preTradeWarnings');
  if (!container) return;
  container.replaceChildren();
  if (preTradeUrgencyMode) {
    container.textContent = 'استاد فقط معامله‌های زیان‌ده ثبت‌شده را برای نمونهٔ مشابه بررسی می‌کند؛ تصمیم با خودت است.';
    container.className = 'pretrade-warning neutral';
    return;
  }
  const matches = findSimilarLosses(preTradeSetup.value, preTradeEmotion.value);
  if (!matches.length) {
    container.textContent = preTradeSetup.value.trim() || preTradeEmotion.value.trim()
      ? 'در ضررهای ثبت‌شده، شباهت روشن در ستاپ یا حالت ذهنی پیدا نشد؛ این تضمینِ نبودن شباهت نیست.'
      : 'ستاپ و حالت ذهنی را وارد کن تا با ضررهای ثبت‌شده مقایسه شوند.';
    container.className = 'pretrade-warning neutral';
    return;
  }
  container.className = 'pretrade-warning found';
  const title = document.createElement('strong');
  title.textContent = 'هشدار: این مورد به ضررهای قبلی شباهت دارد';
  container.appendChild(title);
  const list = document.createElement('ul');
  for (const { trade, matches: fields } of matches) {
    const item = document.createElement('li');
    const date = trade.closedAt || trade.openedAt || trade.journalDate || 'تاریخ ثبت نشده';
    item.textContent = `${trade.token || 'معاملهٔ بدون نام'} · ${date} · شباهت در ${fields.join(' و ')}${trade.mistakes ? ` · اشتباه ثبت‌شده: ${trade.mistakes}` : ''}${trade.lesson ? ` · درس: ${trade.lesson}` : ''}`;
    list.appendChild(item);
  }
  container.appendChild(list);
  const note = document.createElement('p');
  note.textContent = 'این فقط یادآوری از ژورنال است؛ تصمیم نهایی با خودت است.';
  container.appendChild(note);
}

function renderPreTradeRuleChecks() {
  preTradeRuleChecksElement.replaceChildren();
  if (!preTradeFromForm || !personalRules.length) {
    preTradeRuleChecksElement.hidden = true;
    return;
  }
  preTradeRuleChecksElement.hidden = false;
  const heading = document.createElement('strong');
  heading.textContent = 'قوانین تأییدشده‌ات را برای این معامله مرور کن:';
  preTradeRuleChecksElement.appendChild(heading);
  for (const rule of personalRules) {
    const label = document.createElement('label');
    label.className = 'pretrade-rule-check';
    const text = document.createElement('span');
    text.textContent = rule.rule;
    const select = document.createElement('select');
    select.dataset.ruleId = rule.id;
    select.innerHTML = '<option value="">انتخاب کن</option><option value="followed">قصد دارم رعایت کنم</option><option value="not-followed">قصد ندارم رعایت کنم</option><option value="not-applicable">این قانون مربوط نیست</option>';
    label.append(text, select);
    preTradeRuleChecksElement.appendChild(label);
  }
}

function showPostTradeRuleReview(tradeId, checks) {
  pendingPostTradeReviewId = tradeId;
  postTradeRuleList.replaceChildren();
  for (const [index, check] of checks.entries()) {
    const label = document.createElement('label');
    const rule = document.createElement('span');
    rule.textContent = check.rule || 'قانون شخصی';
    const select = document.createElement('select');
    select.dataset.ruleId = check.ruleId;
    select.dataset.ruleIndex = String(index);
    select.innerHTML = '<option value="">انتخاب کن</option><option value="complied">بله، رعایت شد</option><option value="not-complied">نه، رعایت نشد</option><option value="not-applicable">این قانون نامربوط بود</option>';
    select.value = check.outcomeStatus || '';
    label.append(rule, select);
    postTradeRuleList.appendChild(label);
  }
  postTradeRuleStatus.textContent = '';
  postTradeRuleReview.hidden = false;
}

async function continuePostTradeRuleReview() {
  const selects = [...postTradeRuleList.querySelectorAll('select')];
  if (selects.some((select) => !select.value)) {
    postTradeRuleStatus.textContent = 'برای هر قانون یک پاسخ انتخاب کن؛ اگر مربوط نبود، «نامربوط» را بزن.';
    return;
  }
  const existingTrade = state.trades.find((trade) => trade.id === pendingPostTradeReviewId);
  if (!existingTrade || !Array.isArray(existingTrade.personalRuleChecks)) {
    postTradeRuleStatus.textContent = 'قوانین این معامله پیدا نشدند؛ اطلاعات ذخیره‌شده تغییر نکرد.';
    return;
  }
  const updatedTrade = {
    ...existingTrade,
    personalRuleChecks: existingTrade.personalRuleChecks.map((check, index) => ({
    ...check,
    outcomeStatus: selects[index].value,
    outcomeRecordedAt: new Date().toISOString(),
    })),
    updatedAt: new Date().toISOString(),
  };
  const saveButton = document.getElementById('savePostTradeRuleReview');
  saveButton.disabled = true;
  postTradeRuleStatus.textContent = 'در حال ذخیرهٔ پیگیری...';
  try {
    const response = await apiFetch(`/api/trades/${encodeURIComponent(updatedTrade.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTrade),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'ذخیرهٔ پیگیری ناموفق بود.');
    state.trades = state.trades.map((trade) => trade.id === updatedTrade.id ? payload.trade : trade);
    saveLocalTrades(state.trades);
    postTradeRuleReview.hidden = true;
    pendingPostTradeReviewId = '';
    renderAll();
    updateSyncStatus(true);
    if (payload.trade.address) window.setTimeout(() => openTradeChart(payload.trade), 0);
  } catch (error) {
    postTradeRuleStatus.textContent = `${error.message}؛ پیگیری ذخیره نشد، دوباره تلاش کن.`;
  } finally {
    saveButton.disabled = false;
  }
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
  if (values.status === 'open' && !values.id && !preTradeReviewComplete) {
    preTradeFromForm = true;
    document.getElementById('continueAfterPreTrade').textContent = 'با تصمیم خودم ادامه می‌دهم';
    preTradeWhy.value = values.entryReason;
    preTradeStop.value = values.stopLoss;
    preTradeSimilar.value = '';
    preTradeSetup.value = values.setup;
    preTradeEmotion.value = values.emotion;
    renderPreTradeRuleChecks();
    preTradeStatus.textContent = '۲۰ ثانیه مکث: دلیل ورود، حد ضرر و شباهت به معامله‌های قبلی را مرور کن.';
    preTradeResult.hidden = true;
    preTradeResult.textContent = '';
    renderPreTradeWarnings();
    preTradeCheck.hidden = false;
    return;
  }

  const existingTrade = state.trades.find((trade) => trade.id === values.id);
  const currentRuleChecks = preTradeReviewComplete
    ? [...preTradeRuleChecksElement.querySelectorAll('select')].map((select) => ({
      ruleId: select.dataset.ruleId,
      rule: personalRules.find((item) => item.id === select.dataset.ruleId)?.rule || '',
      status: select.value,
    }))
    : (existingTrade?.personalRuleChecks || []);
  const tradeRuleChecks = !existingTrade && values.status === 'closed' && !currentRuleChecks.length
    ? personalRules.map((rule) => ({ ruleId: rule.id, rule: rule.rule, status: 'not-applicable' }))
    : currentRuleChecks;
  const shouldReviewAfterSave = values.status === 'closed'
    && tradeRuleChecks.some((check) => !check.outcomeStatus);

  const submitButton = tradeForm.querySelector('button[type="submit"]');
  const nextTrade = {
    id: values.id || `trade_${Date.now()}`,
    ...values,
    personalRuleChecks: tradeRuleChecks,
    createdAt: existingTrade?.createdAt || new Date().toISOString(),
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
      body: JSON.stringify({
        ...nextTrade,
        coachConversationId: activeConversation?.conversationId || '',
      }),
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
    if (existingIndex < 0) {
      const feedback = payload.coachFeedback;
      if (feedback?.message?.content) {
        const conversationIndex = coachConversations.findIndex((item) => item.conversationId === feedback.conversationId);
        const targetConversation = conversationIndex >= 0
          ? Object.assign(coachConversations[conversationIndex], feedback.conversation || {})
          : feedback.conversation;
        if (targetConversation) {
          targetConversation.preview = feedback.message.content.slice(0, 240);
          if (conversationIndex < 0) {
            coachConversations.unshift(targetConversation);
          }
        }
        if (activeConversation?.conversationId === feedback.conversationId) {
          Object.assign(activeConversation, feedback.conversation || {}, {
            preview: feedback.message.content.slice(0, 240),
          });
          masterChatHistory.push(feedback.message);
          renderMasterChatTranscript();
        }
        renderCoachConversationList();
        showJournalToast(payload.trade, feedback.message.content);
      } else {
        showJournalToast(payload.trade, payload.coachFeedbackError
          ? 'معامله ثبت شد؛ بررسی بازخورد خودکار فعلاً انجام نشد.'
          : '');
      }
    }
    if (shouldReviewAfterSave) showPostTradeRuleReview(payload.trade.id, payload.trade.personalRuleChecks);
    else if (payload.trade.address) window.setTimeout(() => openTradeChart(payload.trade), 0);
  } catch (error) {
    saveStatus.textContent = `${error.message}؛ فعلاً داده فقط در همین دستگاه نگه داشته شد و به دستگاه دیگر نرسیده است.`;
    saveStatus.style.color = 'var(--red)';
    saveLocalTrades([nextTrade, ...state.trades.filter((trade) => trade.id !== nextTrade.id)]);
    state.trades = readLocalTrades();
    if (shouldReviewAfterSave) {
      tradeForm.style.display = 'none';
      resetForm();
    }
    renderAll();
    updateSyncStatus(false);
    if (shouldReviewAfterSave) showPostTradeRuleReview(nextTrade.id, nextTrade.personalRuleChecks);
    else if (nextTrade.address) window.setTimeout(() => openTradeChart(nextTrade), 0);
  } finally {
    submitButton.disabled = false;
  }
}

function getRecentLossStreak() {
  const closed = state.trades.filter((trade) => trade.status === 'closed')
    .slice()
    .sort((left, right) => String(right.closedAt || right.openedAt || right.journalDate || right.createdAt || '')
      .localeCompare(String(left.closedAt || left.openedAt || left.journalDate || left.createdAt || '')));
  let streak = 0;
  for (const trade of closed) {
    const hasDollarLoss = trade.pnlDollar !== '' && trade.pnlDollar != null && Number.isFinite(Number(trade.pnlDollar)) && Number(trade.pnlDollar) < 0;
    const hasPercentLoss = trade.pnlPercent !== '' && trade.pnlPercent != null && Number.isFinite(Number(trade.pnlPercent)) && Number(trade.pnlPercent) < 0;
    if (!hasDollarLoss && !hasPercentLoss && tradePnl(trade) >= 0) break;
    streak += 1;
  }
  return streak;
}

function renderAfterLossStreak() {
  if (!afterLossStreak) return;
  const streak = getRecentLossStreak();
  afterLossStreak.textContent = streak >= 2
    ? `${streak} ضرر پیاپی در معاملات بسته‌شدهٔ ثبت‌شده دیده می‌شود؛ اگر الان فشار حس می‌کنی، قبل از هر تصمیم مکث کن.`
    : 'اتاق هر زمان خواستی در دسترس است؛ برای «ضرر بزرگ» حدی را حدس نمی‌زنیم.';
}

async function requestCoachQuickReview(kind, answers) {
  const response = await apiFetch('/api/coach/quick-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, answers }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'مرور با استاد ناموفق بود.');
  return payload;
}

function stopPreTradeUrgencyCountdown() {
  if (preTradeUrgencyCountdown) window.clearInterval(preTradeUrgencyCountdown);
  preTradeUrgencyCountdown = 0;
}

function resetPreTradeUrgencyMode() {
  stopPreTradeUrgencyCountdown();
  preTradeUrgencyMode = false;
  if (preTradeSetupField) preTradeSetupField.hidden = false;
  if (preTradeEmotionField) preTradeEmotionField.hidden = false;
  document.getElementById('preTradeTitle').textContent = 'مکث قبل از ورود';
  document.getElementById('preTradeDescription').textContent = 'بدون عجله، پنج مورد را روشن کن. پاسخ‌ها را با ژورنال مرور می‌کنیم؛ استاد نمی‌گوید وارد معامله بشوی یا نه.';
  document.getElementById('runPreTradeReview').textContent = 'بررسی با استاد';
  document.getElementById('runPreTradeReview').disabled = preTradeReviewBusy;
  document.getElementById('continueAfterPreTrade').textContent = preTradeFromForm
    ? 'با تصمیم خودم ادامه می‌دهم'
    : 'پایان مکث';
  document.getElementById('cancelPreTrade').textContent = 'بازگشت به ثبت';
}

function openUrgentEntryMode() {
  preTradeFromForm = false;
  preTradeWhy.value = '';
  preTradeStop.value = '';
  preTradeSimilar.value = '';
  preTradeSetup.value = '';
  preTradeEmotion.value = '';
  preTradeUrgencyMode = true;
  preTradeSetupField.hidden = true;
  preTradeEmotionField.hidden = true;
  document.getElementById('preTradeTitle').textContent = 'حالت «الان عجله دارم»';
  document.getElementById('preTradeDescription').textContent = '۲۰ ثانیه مکث؛ فقط سه پاسخ کوتاه. استاد نمونه‌های ژورنالت را مرور می‌کند، اما به‌جایت تصمیم نمی‌گیرد.';
  document.getElementById('runPreTradeReview').textContent = 'مرور سریع با استاد';
  document.getElementById('runPreTradeReview').disabled = true;
  document.getElementById('continueAfterPreTrade').textContent = 'پایان مکث؛ تصمیم با من';
  document.getElementById('cancelPreTrade').textContent = 'بازگشت به چت';
  preTradeStatus.textContent = '';
  preTradeResult.hidden = true;
  preTradeResult.textContent = '';
  renderPreTradeRuleChecks();
  renderPreTradeWarnings();
  preTradeCheck.hidden = false;

  const readyAt = Date.now() + 20_000;
  const updateCountdown = () => {
    const remaining = Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
    if (remaining > 0) {
      preTradeStatus.textContent = `${remaining} ثانیه مکث؛ آرام نفس بکش و پاسخ‌ها را بدون عجله بنویس.`;
      return;
    }
    stopPreTradeUrgencyCountdown();
    document.getElementById('runPreTradeReview').disabled = false;
    preTradeStatus.textContent = 'مکث کامل شد؛ اگر خواستی پاسخ‌ها را با ژورنال مرور کن.';
  };
  updateCountdown();
  preTradeUrgencyCountdown = window.setInterval(updateCountdown, 250);
  preTradeWhy.focus();
}

async function reviewAfterLoss() {
  const answers = {
    whatHappened: document.getElementById('afterLossEvent').value.trim(),
    feeling: document.getElementById('afterLossFeeling').value.trim(),
    nextStep: document.getElementById('afterLossNextStep').value.trim(),
  };
  if (Object.values(answers).some((answer) => !answer)) {
    afterLossStatus.textContent = 'برای شروع، هر سه پرسش را کوتاه پاسخ بده.';
    return;
  }
  afterLossReviewBusy = true;
  document.getElementById('sendAfterLossRoom').disabled = true;
  afterLossStatus.textContent = 'استاد دارد پاسخ‌ها را با ژورنال مقایسه می‌کند...';
  afterLossResult.hidden = true;
  try {
    const result = await requestCoachQuickReview('after-loss', answers);
    afterLossResult.textContent = result.reply;
    afterLossResult.hidden = false;
    afterLossStatus.textContent = `${result.tradeCount} معاملهٔ اخیر برای زمینه بررسی شد. پاسخ‌ها و این مکث ذخیره نمی‌شوند.`;
  } catch (error) {
    afterLossStatus.textContent = error.message || 'پاسخ استاد در دسترس نیست؛ پرسش‌ها را به‌عنوان مکث شخصی مرور کن.';
  } finally {
    afterLossReviewBusy = false;
    document.getElementById('sendAfterLossRoom').disabled = false;
  }
}

async function reviewBeforeEntry() {
  const answers = {
    why: preTradeWhy.value.trim(),
    stopLoss: preTradeStop.value.trim(),
    similar: preTradeSimilar.value.trim(),
    setup: preTradeSetup.value.trim(),
    emotion: preTradeEmotion.value.trim(),
  };
  const requiredAnswers = preTradeUrgencyMode
    ? [answers.why, answers.stopLoss, answers.similar]
    : Object.values(answers);
  if (requiredAnswers.some((answer) => !answer)) {
    preTradeStatus.textContent = preTradeUrgencyMode
      ? 'دلیل ورود، حد ضرر و معاملهٔ مشابه را کوتاه پاسخ بده؛ اگر موردی نامشخص است بنویس «نمی‌دانم».'
      : 'هر پنج مورد را پاسخ بده؛ اگر چیزی را نمی‌دانی، صریح بنویس «نمی‌دانم».';
    return;
  }
  preTradeReviewBusy = true;
  document.getElementById('runPreTradeReview').disabled = true;
  preTradeStatus.textContent = preTradeUrgencyMode
    ? 'استاد پاسخ‌ها را فقط با نمونه‌های زیان‌ده ثبت‌شده مقایسه می‌کند...'
    : 'استاد دارد پاسخ‌ها را با الگوهای ژورنال می‌سنجد...';
  preTradeResult.hidden = true;
  try {
    const result = await requestCoachQuickReview(preTradeUrgencyMode ? 'urgent-entry' : 'pre-entry', answers);
    preTradeResult.textContent = result.reply;
    preTradeResult.hidden = false;
    preTradeStatus.textContent = preTradeUrgencyMode
      ? `${result.tradeCount} نمونهٔ زیان‌ده مرور شد؛ از مجموع ${result.totalTradeCount} معامله. پاسخ‌ها ذخیره نمی‌شوند و تصمیم با خودت است.`
      : `${result.tradeCount} معاملهٔ اخیر برای زمینه بررسی شد. تصمیم نهایی با خودت است.`;
  } catch (error) {
    preTradeStatus.textContent = `${error.message || 'پاسخ استاد در دسترس نیست.'} می‌توانی پرسش‌ها را خودت مرور کنی یا به ثبت برگردی.`;
  } finally {
    preTradeReviewBusy = false;
    document.getElementById('runPreTradeReview').disabled = false;
  }
}

function continueAfterPreTrade() {
  const answers = [preTradeWhy.value.trim(), preTradeStop.value.trim(), preTradeSimilar.value.trim()];
  if (answers.some((answer) => !answer)) {
    preTradeStatus.textContent = 'دلیل ورود، حد ضرر و معاملهٔ مشابه را پاسخ بده؛ اگر موردی نامشخص است بنویس «نمی‌دانم». ستاپ و حالت ذهنی را هم وارد کن.';
    return;
  }
  if (preTradeUrgencyMode) {
    preTradeCheck.hidden = true;
    resetPreTradeUrgencyMode();
    return;
  }
  if (!preTradeSetup.value.trim() || !preTradeEmotion.value.trim()) {
    preTradeStatus.textContent = 'ستاپ و حالت ذهنی را هم بنویس؛ اگر مطمئن نیستی بنویس «نمی‌دانم».';
    return;
  }
  if (!preTradeFromForm) {
    preTradeCheck.hidden = true;
    return;
  }
  const ruleSelects = [...preTradeRuleChecksElement.querySelectorAll('select')];
  if (ruleSelects.some((select) => !select.value)) {
    preTradeStatus.textContent = 'وضعیت هر قانون تأییدشده را مشخص کن: رعایت می‌کنی، این بار رعایت نمی‌کنی، یا مربوط نیست.';
    return;
  }
  document.getElementById('entryReason').value = answers[0];
  document.getElementById('stopLoss').value = answers[1];
  document.getElementById('setup').value = preTradeSetup.value.trim();
  document.getElementById('emotion').value = preTradeEmotion.value.trim();
  preTradeReviewComplete = true;
  preTradeCheck.hidden = true;
  tradeForm.requestSubmit();
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
  renderCheckinHistory();
  renderAfterLossStreak();
  renderMonthlyComparison();
}

journalViewButtons.forEach((button) => button.addEventListener('click', () => setJournalView(button.dataset.journalView)));
coachBackToJournalButton?.addEventListener('click', () => {
  setJournalView('journal');
  window.scrollTo({ top: 0, behavior: 'auto' });
});
if (monthlyComparisonMonth) {
  const defaultComparisonDate = new Date();
  defaultComparisonDate.setDate(1);
  defaultComparisonDate.setMonth(defaultComparisonDate.getMonth() - 1);
  monthlyComparisonMonth.value = localDateKey(defaultComparisonDate).slice(0, 7);
  monthlyComparisonMonth.addEventListener('change', renderMonthlyComparison);
}

function updateApiSettingState(element, configured, name) {
  if (!element) return;
  element.classList.toggle('configured', configured);
  element.classList.toggle('missing', !configured);
  element.textContent = configured ? `کلید ${name} روی سرور تنظیم شده است.` : `کلید ${name} روی سرور تنظیم نشده است.`;
}

function renderApiSettingsConfig(config) {
  updateApiSettingState(chatApiState, Boolean(config.aiChatConfigured), 'چت');
  updateApiSettingState(reportApiState, Boolean(config.aiReportConfigured), 'گزارش');
}

document.querySelectorAll('[data-test-api]').forEach((button) => {
  button.addEventListener('click', async () => {
    const section = button.dataset.testApi;
    const stateElement = section === 'chat' ? chatApiState : reportApiState;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'در حال تست...';
    stateElement.classList.remove('configured', 'missing');
    stateElement.textContent = 'در حال بررسی اتصال امن از سمت سرور...';
    try {
      const response = await apiFetch(`/api/ai/test/${encodeURIComponent(section)}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'تست API ناموفق بود.');
      stateElement.classList.add('configured');
      stateElement.textContent = payload.message || 'اتصال موفق است.';
    } catch (error) {
      stateElement.classList.add('missing');
      stateElement.textContent = error.message || 'تست اتصال ناموفق بود.';
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
});

function loadDailyCheckins() {
  const raw = appStorage.getItem(CHECKIN_STORAGE_KEY);
  if (!raw) {
    invalidCentralLocalStorage.delete('checkins');
    return [];
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('ساختار ذخیرهٔ چک‌این قابل خواندن نیست.');
  invalidCentralLocalStorage.delete('checkins');
  return parsed.filter((record) => record
    && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
    && [record.sleep, record.stress, record.mood].every((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5));
}

function getCheckinAssessment(checkin) {
  const sleep = Number(checkin.sleep);
  const stress = Number(checkin.stress);
  const mood = Number(checkin.mood);
  const isRed = sleep === 1 || stress === 5 || mood === 1 || (stress >= 4 && (sleep <= 2 || mood <= 2));
  if (isRed) {
    return {
      status: 'red',
      label: 'قرمز',
      recommendation: 'امروز ترید نکن و دنبال جبران نباش؛ استراحت کن. اگر این فشار یا حال بد ادامه‌دار است، با یک متخصص انسانی صحبت کن.',
    };
  }
  const isYellow = sleep <= 2 || stress >= 4 || mood <= 2 || sleep + mood <= 5;
  if (isYellow) {
    return {
      status: 'yellow',
      label: 'زرد',
      recommendation: 'امروز محتاط باش؛ اگر طبق برنامه‌ات معامله می‌کنی، حداکثر دو معامله با نصف سایز معمول و بدون افزایش ریسک. اگر تمرکزت افت کرد، توقف کن.',
    };
  }
  return {
    status: 'green',
    label: 'سبز',
    recommendation: 'شرایط اولیه مناسب‌تر به نظر می‌رسد؛ طبق برنامهٔ خودت عمل کن. چراغ سبز مجوز افزایش سایز یا شکستن قوانینت نیست.',
  };
}

function getCheckinHistoryInsight(checkins) {
  const dailyPnl = new Map();
  state.trades.forEach((trade) => {
    if (trade.status !== 'closed') return;
    const date = getTradeDateKey(trade);
    if (!date) return;
    dailyPnl.set(date, (dailyPnl.get(date) || 0) + tradePnl(trade));
  });
  const buckets = new Map([
    ['green', { label: 'سبز', count: 0, pnl: 0 }],
    ['yellow', { label: 'زرد', count: 0, pnl: 0 }],
    ['red', { label: 'قرمز', count: 0, pnl: 0 }],
  ]);
  let pairedDays = 0;
  checkins.forEach((checkin) => {
    if (!dailyPnl.has(checkin.date)) return;
    const assessment = getCheckinAssessment(checkin);
    const bucket = buckets.get(assessment.status);
    bucket.count += 1;
    bucket.pnl += dailyPnl.get(checkin.date);
    pairedDays += 1;
  });
  const comparable = [...buckets.entries()]
    .map(([status, value]) => ({ status, ...value, average: value.count ? value.pnl / value.count : 0 }))
    .filter((bucket) => bucket.count >= 5)
    .sort((left, right) => left.average - right.average);
  if (pairedDays < 10 || comparable.length < 2) {
    return `شخصی‌سازی از تاریخچه هنوز انجام نمی‌شود: ${pairedDays}/10 روز دارای چک‌این و معاملهٔ بسته ثبت شده. این مقایسه فقط پس از حداقل ۱۰ روز و ۵ روز در هر یک از دست‌کم دو وضعیت، به‌صورت مشاهدهٔ شخصی و نه علت یا پیش‌بینی نمایش داده می‌شود.`;
  }
  const lower = comparable[0];
  const higher = comparable[comparable.length - 1];
  const average = (value) => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
  return `مشاهدهٔ شخصی ژورنال: میانگین نتیجهٔ روزهای ${lower.label} در ${lower.count} روز ${average(lower.average)} و روزهای ${higher.label} در ${higher.count} روز ${average(higher.average)} بوده است. این فقط همراهی در داده‌های گذشته است، نه علت یا پیش‌بینی؛ آن را برای بازبینی برنامه‌ات ببین، نه سیگنال ورود و خروج.`;
}

function renderDailyCheckin() {
  if (!dailyCheckinForm) return;
  const today = localDateKey(new Date());
  const todayRecord = state.dailyCheckins.find((record) => record.date === today);
  for (const [field, value] of [['sleep', todayRecord?.sleep], ['stress', todayRecord?.stress], ['mood', todayRecord?.mood]]) {
    document.getElementById(`checkin${field[0].toUpperCase()}${field.slice(1)}`).value = value ? String(value) : '';
  }
  const submitButton = document.getElementById('saveCheckinBtn');
  submitButton.textContent = todayRecord ? 'به‌روزرسانی چک‌این امروز' : 'ذخیرهٔ چک‌این امروز';
  if (todayRecord) {
    const assessment = getCheckinAssessment(todayRecord);
    checkinFeedback.className = `checkin-feedback ${assessment.status}`;
    checkinFeedback.textContent = `چراغ ${assessment.label}: ${assessment.recommendation}`;
    checkinFeedback.hidden = false;
  } else {
    checkinFeedback.hidden = true;
    checkinFeedback.textContent = '';
  }

  renderCheckinHistory();
}

function renderCheckinHistory() {
  const recent = [...state.dailyCheckins].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 7);
  checkinHistory.innerHTML = recent.length
    ? recent.map((record) => {
      const assessment = getCheckinAssessment(record);
      const date = new Date(`${record.date}T00:00:00`).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
      return `<div class="checkin-history-row"><span>${date} · خواب ${record.sleep}/۵ · استرس ${record.stress}/۵ · حال ${record.mood}/۵</span><strong class="${assessment.status}">${assessment.label}</strong></div>`;
    }).join('') + `<div class="checkin-history-row"><span>${getCheckinHistoryInsight(state.dailyCheckins)}</span></div>`
    : '<div class="overview-empty">هنوز چک‌این روزانه‌ای ثبت نشده است.</div>';
}

function renderTradingProfile() {
  if (!tradingProfileResult) return;
  tradingProfileResult.replaceChildren();
  const hasProfile = Boolean(tradingProfile);
  tradingProfileEditButton.hidden = !hasProfile || tradingProfileEditing;
  tradingProfileSaveButton.hidden = !hasProfile || !tradingProfileEditing;
  tradingProfileDeleteButton.hidden = !hasProfile || tradingProfileEditing || !tradingProfileSaved;
  tradingProfileGenerateButton.disabled = tradingProfileBusy;
  tradingProfileGenerateButton.textContent = tradingProfileBusy ? 'در حال ساخت نقشه...' : hasProfile ? 'ساخت دوبارهٔ نقشه' : 'ساخت نقشهٔ شخصیت';
  if (!hasProfile) {
    const empty = document.createElement('p');
    empty.className = 'overview-empty';
    empty.textContent = 'هنوز نقشه‌ای ساخته نشده است. ابتدا داده‌های ژورنال و جلسه‌های ذخیره‌شده بررسی می‌شوند.';
    tradingProfileResult.appendChild(empty);
    return;
  }

  const meta = document.createElement('p');
  meta.className = 'trading-profile-meta';
  const generatedAt = tradingProfile.generatedAt ? new Date(tradingProfile.generatedAt).toLocaleString('fa-IR') : '';
  meta.textContent = `${tradingProfile.tradeCount ?? 0} معامله و ${tradingProfile.sessionCount ?? 0} جلسه · ${generatedAt}${tradingProfileSaved ? ' · ذخیره‌شده' : ' · پیش‌نویس؛ هنوز ذخیره نشده'}`;
  tradingProfileResult.appendChild(meta);
  if (tradingProfile.notice) {
    const notice = document.createElement('p');
    notice.className = 'trading-profile-notice';
    notice.textContent = tradingProfile.notice;
    tradingProfileResult.appendChild(notice);
  }
  for (const [key, title] of TRADING_PROFILE_CATEGORIES) {
    const section = document.createElement('section');
    section.className = 'trading-profile-category';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);
    const items = Array.isArray(tradingProfile[key]) ? tradingProfile[key] : [];
    if (tradingProfileEditing) {
      const field = document.createElement('textarea');
      field.dataset.profileCategory = key;
      field.rows = Math.max(3, Math.min(7, items.length + 1));
      field.maxLength = 4000;
      field.value = items.join('\n');
      field.setAttribute('aria-label', `${title}؛ هر مورد را در یک خط بنویس`);
      field.placeholder = 'هر مورد را در یک خط بنویس؛ اگر موردی نیست خالی بگذار.';
      section.appendChild(field);
    } else if (items.length) {
      const list = document.createElement('ul');
      for (const item of items) {
        const row = document.createElement('li');
        row.textContent = item;
        list.appendChild(row);
      }
      section.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.textContent = 'برای این بخش شاهد کافی پیدا نشد.';
      section.appendChild(empty);
    }
    tradingProfileResult.appendChild(section);
  }
}

let tradingProfileSaved = false;

function loadTradingProfile() {
  try {
    const saved = JSON.parse(appStorage.getItem(TRADING_PROFILE_STORAGE_KEY) || 'null');
    if (saved && TRADING_PROFILE_CATEGORIES.every(([key]) => Array.isArray(saved[key]))) {
      tradingProfile = saved;
      tradingProfileSaved = true;
    }
    invalidCentralLocalStorage.delete('memories');
  } catch (error) {
    invalidCentralLocalStorage.add('memories');
    tradingProfileStatus.textContent = 'خواندن نقشهٔ ذخیره‌شده ناموفق بود؛ داده‌ها حذف نشده‌اند. فضای ذخیره‌سازی مرورگر را بررسی کن.';
  }
  renderTradingProfile();
}

tradingProfileGenerateButton?.addEventListener('click', async () => {
  if (tradingProfileBusy) return;
  tradingProfileBusy = true;
  tradingProfileStatus.textContent = 'در حال بررسی یادداشت‌های معامله و خلاصهٔ جلسه‌ها...';
  renderTradingProfile();
  try {
    const response = await apiFetch('/api/coach/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'ساخت نقشه ناموفق بود.');
    tradingProfile = {
      ...payload.profile,
      tradeCount: payload.tradeCount,
      sessionCount: payload.sessionCount,
      generatedAt: payload.generatedAt,
    };
    tradingProfileSaved = false;
    tradingProfileEditing = true;
    tradingProfileStatus.textContent = 'این فقط یک پیشنهاد است؛ موارد را بازبینی یا ویرایش کن و بعد ذخیره را بزن.';
  } catch (error) {
    tradingProfileStatus.textContent = error.message || 'ساخت نقشه ناموفق بود.';
  } finally {
    tradingProfileBusy = false;
    renderTradingProfile();
  }
});

tradingProfileEditButton?.addEventListener('click', () => {
  tradingProfileEditing = true;
  tradingProfileStatus.textContent = 'هر مورد را در یک خط ویرایش کن؛ تغییرات تا زمان ذخیره فقط در این صفحه هستند.';
  renderTradingProfile();
});

tradingProfileSaveButton?.addEventListener('click', () => {
  if (!tradingProfile) return;
  const previous = tradingProfile ? [{ ...tradingProfile, id: 'trading_profile' }] : [];
  for (const [key] of TRADING_PROFILE_CATEGORIES) {
    const field = tradingProfileResult.querySelector(`[data-profile-category="${key}"]`);
    tradingProfile[key] = field.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 5);
  }
  try {
    tradingProfile.updatedAt = new Date().toISOString();
    appStorage.setItem(TRADING_PROFILE_STORAGE_KEY, JSON.stringify(tradingProfile));
    invalidCentralLocalStorage.delete('memories');
    tradingProfileSaved = true;
    tradingProfileEditing = false;
    tradingProfileStatus.textContent = 'نقشهٔ تأییدشده روی همین دستگاه ذخیره شد؛ در حال همگام‌سازی ابری...';
    queueCentralCollectionSync('memories', previous, [{ ...tradingProfile, id: 'trading_profile' }], tradingProfileStatus, 'نقشهٔ تأییدشده');
  } catch (error) {
    tradingProfileStatus.textContent = 'ذخیرهٔ نقشه ناموفق بود؛ فضای ذخیره‌سازی مرورگر را بررسی کن. تغییرات فعلی هنوز روی صفحه هستند.';
  }
  renderTradingProfile();
});

tradingProfileDeleteButton?.addEventListener('click', () => {
  const previous = tradingProfile ? [{ ...tradingProfile, id: 'trading_profile' }] : [];
  try {
    appStorage.removeItem(TRADING_PROFILE_STORAGE_KEY);
    invalidCentralLocalStorage.delete('memories');
    tradingProfile = null;
    tradingProfileSaved = false;
    tradingProfileEditing = false;
    tradingProfileStatus.textContent = 'نقشه از این دستگاه پاک شد؛ در حال همگام‌سازی حذف با ابر...';
    queueCentralCollectionSync('memories', previous, [], tradingProfileStatus, 'حذف نقشه');
    renderTradingProfile();
  } catch (error) {
    tradingProfileStatus.textContent = 'پاک‌کردن نقشه ناموفق بود؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';
  }
});

function savePersonalRules(nextRules) {
  try {
    const previous = personalRules;
    const now = new Date().toISOString();
    const prepared = nextRules.map((rule) => {
      const existing = previous.find((item) => item.id === rule.id);
      return {
        ...rule,
        updatedAt: existing && JSON.stringify(existing) === JSON.stringify(rule)
          ? (rule.updatedAt || existing.updatedAt || existing.approvedAt || now)
          : now,
      };
    });
    appStorage.setItem(PERSONAL_RULES_STORAGE_KEY, JSON.stringify(prepared));
    invalidCentralLocalStorage.delete('personal_rules');
    personalRules = prepared;
    renderPersonalRules();
    queueCentralCollectionSync('personal_rules', previous, prepared, personalRulesStatus, 'قوانین شخصی');
    return true;
  } catch (error) {
    personalRulesStatus.textContent = 'ذخیرهٔ قانون ناموفق بود؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';
    return false;
  }
}

function renderPersonalRules() {
  personalRulesList.replaceChildren();
  if (!personalRules.length) {
    const empty = document.createElement('p');
    empty.className = 'overview-empty';
    empty.textContent = 'هنوز قانونی تأیید نکرده‌ای.';
    personalRulesList.appendChild(empty);
  }
  for (const rule of personalRules) {
    const row = document.createElement('article');
    row.className = 'personal-rule-item';
    const title = document.createElement('strong');
    title.textContent = rule.rule;
    const meta = document.createElement('p');
    meta.textContent = `تأییدشدهٔ ${new Date(rule.approvedAt).toLocaleDateString('fa-IR')}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'حذف قانون';
    remove.addEventListener('click', () => {
      if (savePersonalRules(personalRules.filter((item) => item.id !== rule.id))) {
        personalRulesStatus.textContent = 'قانون حذف شد؛ در حال همگام‌سازی با ابر...';
      }
    });
    row.append(title, meta, remove);
    personalRulesList.appendChild(row);
  }
  personalRulesSuggestions.replaceChildren();
  for (const suggestion of personalRuleSuggestions) {
    const card = document.createElement('article');
    card.className = 'personal-rule-item suggestion';
    const title = document.createElement('strong');
    title.textContent = suggestion.rule;
    const reason = document.createElement('p');
    reason.textContent = suggestion.reason;
    const evidence = document.createElement('p');
    evidence.textContent = `شاهد در ${suggestion.evidenceIds.length} ضرر ثبت‌شده`;
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.textContent = 'تأیید و افزودن قانون';
    approve.addEventListener('click', () => {
      const alreadyExists = personalRules.some((rule) => normalizeJournalText(rule.rule) === normalizeJournalText(suggestion.rule));
      if (alreadyExists) {
        personalRulesStatus.textContent = 'این قانون قبلاً ذخیره شده است.';
        return;
      }
      const next = [...personalRules, {
        id: `rule_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        rule: suggestion.rule,
        evidenceIds: suggestion.evidenceIds,
        approvedAt: new Date().toISOString(),
      }];
      if (savePersonalRules(next)) {
        personalRuleSuggestions = personalRuleSuggestions.filter((item) => item !== suggestion);
        renderPersonalRules();
        personalRulesStatus.textContent = 'قانون با تأیید تو ذخیره شد؛ در حال همگام‌سازی با ابر...';
      }
    });
    card.append(title, reason, evidence, approve);
    personalRulesSuggestions.appendChild(card);
  }
}

function loadPersonalRules() {
  try {
    const saved = JSON.parse(appStorage.getItem(PERSONAL_RULES_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved) || saved.some((rule) => !rule || typeof rule.id !== 'string' || typeof rule.rule !== 'string')) {
      throw new Error('ساختار قوانین شخصی معتبر نیست.');
    }
    personalRules = saved;
    invalidCentralLocalStorage.delete('personal_rules');
  } catch (error) {
    invalidCentralLocalStorage.add('personal_rules');
    personalRulesStatus.textContent = 'خواندن قوانین قبلی ناموفق بود؛ داده‌ها حذف نشده‌اند. فضای ذخیره‌سازی مرورگر را بررسی کن.';
  }
  renderPersonalRules();
}

function saveLessonLibrary(nextLessons) {
  try {
    const previous = lessonLibrary;
    const now = new Date().toISOString();
    const prepared = nextLessons.map((lesson) => ({
      ...lesson,
      updatedAt: lesson.updatedAt || now,
    }));
    appStorage.setItem(LESSON_LIBRARY_STORAGE_KEY, JSON.stringify(prepared));
    invalidCentralLocalStorage.delete('lesson_library');
    lessonLibrary = prepared;
    renderLessonLibrary();
    queueCentralCollectionSync('lesson_library', previous, prepared, lessonLibraryStatus, 'کتاب درس');
    return true;
  } catch (error) {
    lessonLibraryStatus.textContent = 'ذخیرهٔ کتابخانه ناموفق بود؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';
    return false;
  }
}

function renderLessonLibrary() {
  lessonLibraryList.replaceChildren();
  if (!lessonLibrary.length) {
    const empty = document.createElement('p');
    empty.className = 'overview-empty';
    empty.textContent = 'هنوز نکته‌ای به کتابخانه اضافه نکرده‌ای.';
    lessonLibraryList.appendChild(empty);
    return;
  }
  lessonLibrary
    .slice()
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .forEach((lesson) => {
      const row = document.createElement('article');
      row.className = 'lesson-library-item';
      const title = document.createElement('strong');
      title.textContent = lesson.book;
      const text = document.createElement('p');
      text.textContent = lesson.text;
      const tags = document.createElement('div');
      tags.className = 'lesson-library-tags';
      (lesson.tags || []).forEach((tag) => {
        const badge = document.createElement('span');
        badge.className = 'lesson-library-tag';
        badge.textContent = tag;
        tags.appendChild(badge);
      });
      const actions = document.createElement('div');
      actions.className = 'lesson-library-item-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'ویرایش';
      edit.addEventListener('click', () => {
        lessonLibraryEditingId = lesson.id;
        lessonBook.value = lesson.book;
        lessonText.value = lesson.text;
        lessonTags.value = (lesson.tags || []).join('، ');
        lessonLibrarySaveButton.textContent = 'ذخیرهٔ تغییرات';
        lessonLibraryCancelButton.hidden = false;
        lessonLibraryStatus.textContent = 'در حال ویرایش این نکته هستی.';
        lessonBook.focus();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'حذف';
      remove.addEventListener('click', () => {
        if (!window.confirm('این نکته از کتابخانه حذف شود؟')) return;
        if (saveLessonLibrary(lessonLibrary.filter((item) => item.id !== lesson.id))) {
          lessonLibraryStatus.textContent = 'نکته حذف شد؛ در حال همگام‌سازی با ابر...';
        }
      });
      actions.append(edit, remove);
      row.append(title, text, tags, actions);
      lessonLibraryList.appendChild(row);
    });
}

function loadLessonLibrary() {
  try {
    const saved = JSON.parse(appStorage.getItem(LESSON_LIBRARY_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved) || saved.some((item) => !item || typeof item.id !== 'string'
      || typeof item.book !== 'string' || typeof item.text !== 'string')) {
      throw new Error('ساختار کتابخانه معتبر نیست.');
    }
    lessonLibrary = saved.map((item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string').slice(0, 20) : [],
    }));
    invalidCentralLocalStorage.delete('lesson_library');
  } catch (error) {
    invalidCentralLocalStorage.add('lesson_library');
    lessonLibrary = [];
    lessonLibraryStatus.textContent = 'خواندن کتابخانه ناموفق بود؛ داده‌های قدیمی تغییر نکردند.';
  }
  renderLessonLibrary();
}

lessonLibraryForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const book = lessonBook.value.trim();
  const text = lessonText.value.trim();
  if (!book || !text) {
    lessonLibraryStatus.textContent = 'نام کتاب و متن نکته را وارد کن.';
    return;
  }
  const tags = [...new Set(lessonTags.value.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
  let next;
  if (lessonLibraryEditingId) {
    next = lessonLibrary.map((lesson) => lesson.id === lessonLibraryEditingId
      ? { ...lesson, book, text, tags, updatedAt: new Date().toISOString() }
      : lesson);
  } else {
    next = [{
      id: `lesson_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      book,
      text,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, ...lessonLibrary];
  }
  if (saveLessonLibrary(next)) {
    lessonLibraryStatus.textContent = lessonLibraryEditingId ? 'تغییرات نکته ذخیره شد؛ در حال همگام‌سازی با ابر...' : 'نکته اضافه شد؛ در حال همگام‌سازی با ابر...';
    lessonLibraryEditingId = '';
    lessonLibraryForm.reset();
    lessonLibrarySaveButton.textContent = 'افزودن به کتابخانه';
    lessonLibraryCancelButton.hidden = true;
  }
});

lessonLibraryCancelButton?.addEventListener('click', () => {
  lessonLibraryEditingId = '';
  lessonLibraryForm.reset();
  lessonLibrarySaveButton.textContent = 'افزودن به کتابخانه';
  lessonLibraryCancelButton.hidden = true;
  lessonLibraryStatus.textContent = 'ویرایش لغو شد.';
});

personalRulesButton?.addEventListener('click', async () => {
  if (personalRulesBusy) return;
  personalRulesBusy = true;
  personalRulesButton.disabled = true;
  personalRulesButton.textContent = 'در حال بررسی ضررها...';
  personalRulesStatus.textContent = 'فقط ضررهای ثبت‌شده با اشتباه یا درس بررسی می‌شوند؛ قانون بدون شاهد ساخته نمی‌شود.';
  try {
    const response = await apiFetch('/api/coach/rules/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'پیشنهاد قانون ناموفق بود.');
    personalRuleSuggestions = payload.suggestions;
    personalRulesStatus.textContent = `${payload.notice}${payload.lossCount ? ` · ${payload.lossCount} ضرر ثبت‌شده بررسی شد` : ''}`;
    renderPersonalRules();
  } catch (error) {
    personalRulesStatus.textContent = error.message || 'پیشنهاد قانون ناموفق بود.';
  } finally {
    personalRulesBusy = false;
    personalRulesButton.disabled = false;
    personalRulesButton.textContent = 'پیشنهاد قانون از اشتباه‌های تکراری';
  }
});

function coachSessionDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('fa-IR') : 'تاریخ نامشخص';
}

function renderCoachSessionTranscript() {
  const messages = activeCoachingSession?.messages || [];
  coachSessionTranscript.hidden = messages.length === 0;
  coachSessionWelcome.hidden = messages.length > 0;
  coachSessionTranscript.replaceChildren(...messages.map((entry) => {
    const message = document.createElement('div');
    message.className = `master-message ${entry.role === 'assistant' ? 'assistant' : entry.role === 'system' ? 'system' : 'user'}`;
    message.textContent = entry.content;
    return message;
  }));
  coachSessionTranscript.scrollTop = coachSessionTranscript.scrollHeight;
  coachSessionReplyForm.hidden = !activeCoachingSession || activeCoachingSession.status !== 'active';
  coachSessionFinishButton.hidden = !activeCoachingSession || activeCoachingSession.status !== 'active'
    || !messages.some((message) => message.role === 'user');
  coachSessionFinishButton.disabled = coachSessionBusy;
  coachSessionStartButton.disabled = coachSessionBusy;
  coachSessionStartButton.textContent = activeCoachingSession?.status === 'active' ? 'ادامهٔ جلسهٔ فعال' : 'شروع جلسه';
  coachSessionCount.textContent = coachingSessions.length ? `(${coachingSessions.length})` : '';
  coachSessionSummary.hidden = !activeCoachingSession
    || !(activeCoachingSession.summary || activeCoachingSession.insight || activeCoachingSession.homework);
  if (!coachSessionSummary.hidden) {
    coachSessionSummary.textContent = [
      activeCoachingSession.summary ? `جمع‌بندی: ${activeCoachingSession.summary}` : '',
      activeCoachingSession.insight ? `بینش اصلی: ${activeCoachingSession.insight}` : '',
      activeCoachingSession.commitments?.length ? `قول‌های خودت: ${activeCoachingSession.commitments.join(' · ')}` : '',
      activeCoachingSession.homework ? `تمرین: ${activeCoachingSession.homework}` : '',
      activeCoachingSession.followUp ? `پیگیری جلسهٔ بعد: ${activeCoachingSession.followUp}` : '',
    ].filter(Boolean).join('\n\n');
  }
}

function setCoachMode() {
  activeCoachMode = 'chat';
  coachChatWelcome.hidden = masterChatHistory.length > 0;
  masterChatLog.hidden = masterChatHistory.length === 0;
  masterChatForm.hidden = false;
  coachLoadOlderMessagesButton.hidden = !conversationHasMoreMessages;
  document.querySelector('.coach-chat-disclaimer').hidden = false;
  coachChatHistoryToggle.hidden = false;
  coachNewConversationButton.hidden = false;
  masterChatStatus.hidden = false;
  coachChatActiveTitle.textContent = activeConversation?.title || 'استاد';
}

function renderMasterChatTranscript() {
  masterChatLog.hidden = masterChatHistory.length === 0;
  if (coachChatWelcome) coachChatWelcome.hidden = masterChatHistory.length > 0;
  masterChatLog.replaceChildren(...masterChatHistory.map((entry) => {
    const message = document.createElement('div');
    message.className = `master-message ${entry.role === 'assistant' ? 'assistant' : 'user'}`;
    message.textContent = entry.content;
    return message;
  }));
  masterChatLog.scrollTop = masterChatLog.scrollHeight;
}

function newCoachId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `coach_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function renderCoachConversationList() {
  if (!coachConversationList) return;
  coachConversationList.replaceChildren();
  const conversations = coachConversations.filter((conversation) => conversation.conversationType === 'chat');
  if (!conversations.length) {
    const empty = document.createElement('p');
    empty.className = 'coach-chat-empty';
    empty.textContent = coachConversationSearch?.value.trim()
      ? 'گفت‌وگویی با این عبارت پیدا نشد.'
      : 'هنوز گفت‌وگویی نداری. گفت‌وگوی جدید را بزن و از همین‌جا شروع کن.';
    coachConversationList.appendChild(empty);
    return;
  }
  conversations.forEach((conversation) => {
    const item = document.createElement('article');
    item.className = 'coach-chat-row';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'coach-chat-row-open';
    const title = document.createElement('strong');
    title.textContent = conversation.title || 'گفت‌وگوی استاد';
    const preview = document.createElement('span');
    const match = conversationSearchMatches[conversation.conversationId];
    preview.textContent = match?.snippet || conversation.preview || `${Number(conversation.messageCount || 0)} پیام`;
    open.append(title, preview);
    open.addEventListener('click', async () => {
      closeCoachChatDrawer({ restoreFocus: false });
      try {
        await openCoachConversation(conversation.conversationId);
      } catch (error) {
        masterChatStatus.textContent = error.message || 'بارگذاری گفت‌وگو ناموفق بود.';
      }
    });
    const date = document.createElement('span');
    date.textContent = coachSessionDate(conversation.updatedAt || conversation.createdAt);
    date.className = 'coach-chat-row-date';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'coach-chat-row-delete';
    remove.textContent = 'حذف';
    remove.setAttribute('aria-label', `حذف ${title.textContent}`);
    remove.addEventListener('click', async () => {
      try {
        await deleteCoachConversation(conversation);
      } catch (error) {
        masterChatListStatus.textContent = error.message || 'حذف گفت‌وگو ناموفق بود.';
      }
    });
    const meta = document.createElement('div');
    meta.className = 'coach-chat-row-meta';
    meta.append(date, remove);
    item.append(open, meta);
    coachConversationList.appendChild(item);
  });
}

function openCoachChatDrawer() {
  coachChatDrawer.setAttribute('aria-hidden', 'false');
  coachChatDrawerBackdrop.hidden = false;
  coachChatHistoryToggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('coach-drawer-open');
  requestAnimationFrame(() => coachConversationSearch.focus());
  loadCoachProactiveFollowup().catch((error) => {
    coachProactiveStatus.textContent = error.message || 'خواندن تنظیم پیگیری استاد ناموفق بود.';
  });
  loadCoachConversations(coachConversationSearch.value.trim()).catch((error) => {
    masterChatListStatus.textContent = error.message || 'بارگذاری گفت‌وگوها ناموفق بود.';
  });
}

async function loadCoachProactiveFollowup() {
  coachProactiveFollowup.disabled = true;
  try {
    const response = await apiFetch('/api/coach/followups');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.enabled !== 'boolean') {
      throw new Error(payload.message || 'خواندن تنظیم پیگیری استاد ناموفق بود.');
    }
    coachProactiveFollowup.checked = payload.enabled;
    coachProactiveStatus.textContent = payload.enabled
      ? 'پیگیری مهم فعال است؛ بررسی ساعتی انجام می‌شود.'
      : 'پیگیری خودکار خاموش است.';
  } finally {
    coachProactiveFollowup.disabled = false;
  }
}

coachProactiveFollowup?.addEventListener('change', async () => {
  const enabled = coachProactiveFollowup.checked;
  coachProactiveFollowup.disabled = true;
  coachProactiveStatus.textContent = enabled ? 'در حال فعال‌کردن پیگیری تلگرام...' : 'در حال خاموش‌کردن پیگیری...';
  try {
    const response = await apiFetch('/api/coach/followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.enabled !== enabled) {
      throw new Error(payload.message || 'ذخیرهٔ تنظیم پیگیری استاد ناموفق بود.');
    }
    coachProactiveStatus.textContent = enabled
      ? 'پیگیری مهم فعال شد؛ بررسی ساعتی انجام می‌شود. هر زمان بخواهی می‌توانی خاموشش کنی.'
      : 'پیگیری خودکار خاموش شد.';
  } catch (error) {
    coachProactiveFollowup.checked = !enabled;
    coachProactiveStatus.textContent = error.message || 'ذخیرهٔ تنظیم پیگیری استاد ناموفق بود.';
  } finally {
    coachProactiveFollowup.disabled = false;
  }
});

function closeCoachChatDrawer({ restoreFocus = true } = {}) {
  if (!coachChatDrawer || coachChatDrawer.getAttribute('aria-hidden') === 'true') return;
  coachChatDrawer.setAttribute('aria-hidden', 'true');
  coachChatDrawerBackdrop.hidden = true;
  coachChatHistoryToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('coach-drawer-open');
  if (restoreFocus) coachChatHistoryToggle.focus();
}

function showCoachChatThread() {
  closeCoachChatDrawer({ restoreFocus: false });
  requestAnimationFrame(() => masterChatLog.scrollTo({ top: masterChatLog.scrollHeight, behavior: 'smooth' }));
}

async function readCoachApiPayload(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function saveCoachConversation(conversation) {
  const response = await apiFetch('/api/coach/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: conversation.conversationId,
      conversationType: conversation.conversationType,
      title: conversation.title,
      style: conversation.style,
      status: conversation.status || 'active',
      summary: conversation.summary || '',
      insight: conversation.insight || '',
      commitments: conversation.commitments || [],
      homework: conversation.homework || '',
      followUp: conversation.followUp || '',
      preview: conversation.preview || '',
      messageCount: conversation.messageCount || 0,
      legacyMigrated: conversation.legacyMigrated === true,
    }),
  });
  const payload = await readCoachApiPayload(response);
  if (!response.ok || !payload.conversation) {
    const detail = payload.message || (payload.raw ? `پاسخ سرور: ${payload.raw.slice(0, 180)}` : `HTTP ${response.status}`);
    throw new Error(`ذخیرهٔ گفت‌وگو در فضای ابری ناموفق بود (${detail}).`);
  }
  if (activeConversation?.conversationId === conversation.conversationId) {
    activeConversation = payload.conversation;
    coachChatActiveTitle.textContent = activeConversation.title || 'استاد';
  }
  coachConversations = [payload.conversation, ...coachConversations.filter((item) => item.conversationId !== payload.conversation.conversationId)]
    .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)));
  renderCoachConversationList();
  return payload.conversation;
}

async function persistCoachMessage(conversationId, message) {
  if (!message.id) message.id = newCoachId();
  const response = await apiFetch(`/api/coach/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: message.id, role: message.role, content: message.content }),
  });
  const payload = await readCoachApiPayload(response);
  if (!response.ok) {
    const detail = payload.message || (payload.raw ? `پاسخ سرور: ${payload.raw.slice(0, 180)}` : `HTTP ${response.status}`);
    throw new Error(`ذخیرهٔ پیام در فضای ابری ناموفق بود (${detail}).`);
  }
  if (activeConversation?.conversationId === conversationId) {
    activeConversation = payload.conversation;
    activeConversationSyncedCount += 1;
  }
  coachConversations = [payload.conversation, ...coachConversations.filter((item) => item.conversationId !== conversationId)]
    .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)));
  renderCoachConversationList();
  return payload.message;
}

async function loadCoachConversations(query = '') {
  const sequence = ++coachConversationLoadSequence;
  const url = new URLSearchParams();
  if (query) url.set('q', query);
  const search = url.toString();
  const response = await apiFetch(`/api/coach/conversations${search ? `?${search}` : ''}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.conversations)) throw new Error(payload.message || 'بارگذاری گفت‌وگوها ناموفق بود.');
  if (sequence !== coachConversationLoadSequence) return payload.conversations;
  coachConversations = payload.conversations.filter((conversation) => conversation.conversationType === 'chat');
  conversationSearchMatches = payload.matches || {};
  renderCoachConversationList();
  return payload.conversations;
}

async function openCoachConversation(conversationId, { preserveScroll = false } = {}) {
  const conversation = coachConversations.find((item) => item.conversationId === conversationId);
  if (!conversation || conversation.conversationType !== 'chat') return;
  const selectionSequence = ++coachConversationSelectionSequence;
  const url = new URLSearchParams({ limit: '100' });
  const response = await apiFetch(`/api/coach/conversations/${encodeURIComponent(conversationId)}/messages?${url}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.messages)) throw new Error(payload.message || 'خواندن پیام‌های گفت‌وگو ناموفق بود.');
  if (selectionSequence !== coachConversationSelectionSequence) return;
  activeConversation = conversation;
  coachChatActiveTitle.textContent = conversation.title || 'استاد';
  conversationHasMoreMessages = Boolean(payload.hasMore);
  coachLoadOlderMessagesButton.hidden = !conversationHasMoreMessages;
  activeCoachingSession = null;
  activeConversationSyncedCount = payload.messages.length;
  masterChatHistory = payload.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    sequence: message.sequence,
  }));
  masterChatStatus.textContent = '';
  renderMasterChatTranscript();
  renderCoachConversationList();
  showCoachChatThread();
  if (!preserveScroll) masterChatLog.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function createCoachConversation(title = '', { preserveDraft = false } = {}) {
  const selectionSequence = ++coachConversationSelectionSequence;
  coachConversationLoadSequence += 1;
  const id = newCoachId();
  const conversation = {
    conversationId: id,
    conversationType: 'chat',
    title: title || 'گفت‌وگوی جدید',
    style: 'supportive',
    status: 'active',
    messageCount: 0,
    preview: '',
    createdAt: new Date().toISOString(),
  };
  const saved = await saveCoachConversation(conversation);
  if (selectionSequence !== coachConversationSelectionSequence) return saved;
  activeConversation = saved;
  activeConversationSyncedCount = 0;
  conversationHasMoreMessages = false;
  coachLoadOlderMessagesButton.hidden = true;
  activeCoachingSession = null;
  masterChatHistory = [];
  coachChatActiveTitle.textContent = saved.title || 'استاد';
  if (!preserveDraft) masterChatInput.value = '';
  coachConversationSearch.value = '';
  conversationSearchMatches = {};
  renderMasterChatTranscript();
  masterChatStatus.textContent = '';
  showCoachChatThread();
  return saved;
}

async function handleCoachLaunchLink() {
  if (!coachLaunchConversationId && !coachLaunchStartsSession) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('coachConversation');
  url.searchParams.delete('coachSession');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  try {
    let conversationId = coachLaunchConversationId;
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(conversationId)
      || !coachConversations.some((item) => item.conversationId === conversationId)) {
      const conversation = await createCoachConversation('جلسهٔ استاد');
      conversationId = conversation.conversationId;
    } else {
      await openCoachConversation(conversationId);
    }
    if (coachLaunchStartsSession) {
      masterChatInput.value = 'می‌خواهم الان یک جلسهٔ آموزشی شخصی داشته باشیم. از همان موضوع مهمی که باعث این پیگیری شد شروع کن، حرفم را با ژورنال و تمرین‌های قبلی مقایسه کن و تا رسیدن به یک تمرین روشن، جلسه را با سؤال‌های پیگیرانه ادامه بده.';
      await handleFreeMasterChat({ preventDefault() {} });
    }
  } catch (error) {
    masterChatStatus.textContent = error.message || 'بازکردن جلسهٔ استاد از پیام تلگرام ناموفق بود.';
  }
}

async function deleteCoachConversation(conversation) {
  if (!window.confirm(`گفت‌وگوی «${conversation.title || 'بدون عنوان'}» و همهٔ پیام‌هایش برای همیشه حذف شود؟`)) return;
  const response = await apiFetch(`/api/coach/conversations/${encodeURIComponent(conversation.conversationId)}`, { method: 'DELETE' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'حذف گفت‌وگو ناموفق بود.');
  coachConversations = coachConversations.filter((item) => item.conversationId !== conversation.conversationId);
  if (activeConversation?.conversationId === conversation.conversationId) {
    activeConversation = null;
    coachChatActiveTitle.textContent = 'استاد';
    activeConversationSyncedCount = 0;
    conversationHasMoreMessages = false;
    coachLoadOlderMessagesButton.hidden = true;
    masterChatHistory = [];
    renderMasterChatTranscript();
    masterChatStatus.textContent = 'گفت‌وگو و پیام‌هایش حذف شدند.';
  }
  renderCoachConversationList();
}

async function loadOlderCoachMessages() {
  if (!activeConversation || !masterChatHistory.length || !conversationHasMoreMessages) return;
  coachLoadOlderMessagesButton.disabled = true;
  try {
    const oldest = masterChatHistory[0].createdAt;
    const query = new URLSearchParams({
      limit: '100',
      before: oldest,
      beforeId: masterChatHistory[0].id,
      beforeSequence: String(masterChatHistory[0].sequence || 0),
    });
    const response = await apiFetch(`/api/coach/conversations/${encodeURIComponent(activeConversation.conversationId)}/messages?${query}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(payload.messages)) throw new Error(payload.message || 'بارگذاری پیام‌های قدیمی‌تر ناموفق بود.');
    masterChatHistory = [...payload.messages.map((message) => ({
      id: message.id, role: message.role, content: message.content, createdAt: message.createdAt, sequence: message.sequence,
    })), ...masterChatHistory];
    conversationHasMoreMessages = Boolean(payload.hasMore);
    renderMasterChatTranscript();
    masterChatLog.scrollTop = 0;
  } catch (error) {
    masterChatStatus.textContent = error.message || 'بارگذاری پیام‌های قدیمی‌تر ناموفق بود.';
  } finally {
    coachLoadOlderMessagesButton.hidden = !conversationHasMoreMessages;
    coachLoadOlderMessagesButton.disabled = false;
  }
}

function renderCoachMemories() {
  if (!coachMemoryList) return;
  coachMemoryList.replaceChildren();
  if (!coachMemories.length) {
    const empty = document.createElement('p');
    empty.className = 'overview-empty';
    empty.textContent = 'هنوز حافظه‌ای ثبت نشده است.';
    coachMemoryList.appendChild(empty);
    return;
  }
  coachMemories.forEach((memory) => {
    const item = document.createElement('div');
    item.className = 'coach-memory-item';
    const copy = document.createElement('div');
    copy.className = 'coach-memory-copy';
    const source = document.createElement('strong');
    if (memory.memorySource === 'user_statement') {
      source.textContent = 'گفتهٔ مستقیم تو';
      source.className = 'coach-memory-source user-statement';
    } else if (memory.memorySource === 'coach_inference') {
      source.textContent = Number(memory.confidence) < 0.6 || !memory.evidence
        ? 'برداشت استاد · شاهد ثبت‌نشده'
        : `برداشت استاد · اطمینان ${Math.round(Number(memory.confidence) * 100)}٪`;
      source.className = 'coach-memory-source coach-inference';
    } else {
      source.textContent = 'یادداشت کاربر';
      source.className = 'coach-memory-source user-note';
    }
    const content = document.createElement('span');
    content.textContent = memory.content;
    copy.append(source, content);
    if (memory.evidence) {
      const evidence = document.createElement('small');
      evidence.textContent = `شاهد: ${memory.evidence}`;
      copy.appendChild(evidence);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'حذف';
    remove.addEventListener('click', async () => {
      if (!window.confirm('این مورد از حافظهٔ استاد حذف شود؟')) return;
      try {
        const response = await apiFetch(`/api/coach/memories/${encodeURIComponent(memory.id.replace(/^coach_memory_/, ''))}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'حذف حافظه ناموفق بود.');
        coachMemories = coachMemories.filter((entry) => entry.id !== memory.id);
        renderCoachMemories();
        coachMemoryStatus.textContent = 'حافظه حذف شد.';
      } catch (error) {
        coachMemoryStatus.textContent = error.message || 'حذف حافظه ناموفق بود.';
      }
    });
    item.append(copy, remove);
    coachMemoryList.appendChild(item);
  });
}

async function loadCoachMemories() {
  const response = await apiFetch('/api/coach/memories');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.memories)) throw new Error(payload.message || 'بارگذاری حافظهٔ استاد ناموفق بود.');
  coachMemories = payload.memories;
  renderCoachMemories();
  coachMemoryStatus.textContent = `${coachMemories.length} نکته در حافظه است؛ گفته‌های مستقیم و برداشت‌های استاد جداگانه مشخص شده‌اند. اگر برداشتی اشتباه است، در چت اصلاحش کن.`;
}

let coachConversationSearchTimer = 0;
coachConversationSearch?.addEventListener('input', () => {
  window.clearTimeout(coachConversationSearchTimer);
  coachConversationSearchTimer = window.setTimeout(async () => {
    try {
      await loadCoachConversations(coachConversationSearch.value.trim());
      masterChatListStatus.textContent = '';
    } catch (error) {
      masterChatListStatus.textContent = error.message || 'جست‌وجوی گفت‌وگو ناموفق بود.';
    }
  }, 250);
});
coachNewConversationButton?.addEventListener('click', async () => {
  try {
    await createCoachConversation();
    masterChatInput.focus();
  } catch (error) {
    masterChatStatus.textContent = error.message || 'ساخت گفت‌وگوی جدید ناموفق بود.';
  }
});
coachNewConversationDrawerButton?.addEventListener('click', async () => {
  try {
    await createCoachConversation();
    masterChatInput.focus();
  } catch (error) {
    masterChatListStatus.textContent = error.message || 'ساخت گفت‌وگوی جدید ناموفق بود.';
  }
});
coachChatHistoryToggle?.addEventListener('click', () => {
  if (coachChatDrawer.getAttribute('aria-hidden') === 'false') closeCoachChatDrawer();
  else openCoachChatDrawer();
});
document.getElementById('coachChatDrawerClose')?.addEventListener('click', () => closeCoachChatDrawer());
coachChatDrawerBackdrop?.addEventListener('click', () => closeCoachChatDrawer({ restoreFocus: false }));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCoachChatDrawer();
});
document.querySelectorAll('[data-coach-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    masterChatInput.value = button.dataset.coachPrompt || '';
    masterChatForm.requestSubmit();
  });
});
masterChatInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    masterChatForm.requestSubmit();
  }
});
masterChatInput?.addEventListener('input', () => {
  masterChatInput.style.height = 'auto';
  masterChatInput.style.height = `${Math.min(masterChatInput.scrollHeight, 150)}px`;
});
coachSessionReplyInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    coachSessionReplyForm.requestSubmit();
  }
});
coachSessionReplyInput?.addEventListener('input', () => {
  coachSessionReplyInput.style.height = 'auto';
  coachSessionReplyInput.style.height = `${Math.min(coachSessionReplyInput.scrollHeight, 120)}px`;
});
coachLoadOlderMessagesButton?.addEventListener('click', loadOlderCoachMessages);

async function loadCoachSessions() {
  const response = await apiFetch('/api/coach/sessions');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'خواندن جلسه‌های ذخیره‌شده ناموفق بود.');
  if (!Array.isArray(payload.sessions)) throw new Error('فهرست جلسه‌های سرور معتبر نیست.');
  coachingSessions = payload.sessions;
  if (!activeCoachingSession) {
    activeCoachingSession = coachingSessions.find((session) => session.status === 'active') || null;
    if (activeCoachingSession) activeCoachingQuestion = Math.min(activeCoachingSession.answers?.length || 0, 5);
  }
  if (activeCoachingSession) document.getElementById('coachStyle').value = activeCoachingSession.style;
  renderCoachSessionHistory();
  renderCoachSessionTranscript();
}

function renderCoachSessionHistory() {
  if (!coachSessionHistory) return;
  coachSessionHistory.replaceChildren();
  if (!coachingSessions.length) {
    const empty = document.createElement('p');
    empty.className = 'overview-empty';
    empty.textContent = 'هنوز جلسه‌ای ذخیره نشده است.';
    coachSessionHistory.appendChild(empty);
    return;
  }
  coachingSessions.forEach((session) => {
    const item = document.createElement('article');
    item.className = `coach-session-history-item${activeCoachingSession?.id === session.id ? ' active' : ''}`;
    const title = document.createElement('strong');
    title.textContent = `${coachSessionDate(session.createdAt)} · ${session.status === 'completed' ? 'پایان‌یافته' : 'در جریان'} · ${session.style === 'direct' ? 'رک و سخت‌گیر' : 'آرام و حمایتی'}`;
    const summary = document.createElement('p');
    summary.textContent = session.summary
      ? `خلاصه: ${session.summary}`
      : `${(session.messages || []).filter((message) => message.role === 'user').length} پیام · ${session.status === 'active' ? 'قابل ادامه' : 'پایان‌یافته'}`;
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = session.status === 'active' ? 'ادامهٔ جلسه' : 'مشاهدهٔ جلسه';
    open.addEventListener('click', () => {
      activeCoachingSession = { ...session };
      activeCoachingQuestion = Math.min(session.answers?.length || 0, 5);
      document.getElementById('coachStyle').value = session.style;
      coachSessionStatus.textContent = '';
      renderCoachSessionHistory();
      renderCoachSessionTranscript();
      setCoachMode('session');
      requestAnimationFrame(() => coachSessionTranscript.scrollTo({ top: coachSessionTranscript.scrollHeight, behavior: 'smooth' }));
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'حذف';
    remove.addEventListener('click', async () => {
      if (!window.confirm('این جلسه و پیام‌های ذخیره‌شده‌اش حذف شود؟')) return;
      try {
        const response = await apiFetch(`/api/coach/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'حذف جلسه ناموفق بود.');
        coachingSessions = coachingSessions.filter((candidate) => candidate.id !== session.id);
        if (activeCoachingSession?.id === session.id) activeCoachingSession = null;
        coachSessionStatus.textContent = 'جلسه حذف شد.';
        renderCoachSessionHistory();
        renderCoachSessionTranscript();
      } catch (error) {
        coachSessionStatus.textContent = error.message || 'حذف جلسه ناموفق بود.';
      }
    });
    item.append(title, summary, open, remove);
    coachSessionHistory.appendChild(item);
  });
}

async function saveCoachSession(session) {
  const response = await apiFetch('/api/coach/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'ذخیرهٔ جلسه در فضای ابری ناموفق بود.');
  const saved = payload.session;
  coachingSessions = [saved, ...coachingSessions.filter((item) => item.id !== saved.id)]
    .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)));
  activeCoachingSession = saved;
  renderCoachSessionHistory();
  renderCoachSessionTranscript();
  return saved;
}

async function startCoachSession() {
  if (coachSessionBusy) return;
  if (activeCoachingSession?.status === 'active') {
    setCoachMode('session');
    coachSessionReplyInput.focus();
    return;
  }
  coachSessionBusy = true;
  coachSessionStartButton.disabled = true;
  coachSessionStatus.textContent = 'استاد در حال مرور حافظه، ژورنال و جلسه‌های قبلی است...';
  try {
    const style = document.getElementById('coachStyle').value;
    const response = await apiFetch('/api/coach/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'شروع جلسه ناموفق بود.');
    const id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const firstQuestion = payload.questions[0];
    activeCoachingQuestion = 0;
    const session = {
      id,
      createdAt: new Date().toISOString(),
      status: 'active',
      style,
      questions: payload.questions,
      answers: [],
      messages: [
        { role: 'assistant', content: payload.greeting },
        { role: 'assistant', content: firstQuestion },
      ],
      summary: '',
      insight: '',
      commitments: [],
      homework: '',
      followUp: '',
    };
    await saveCoachSession(session);
    coachSessionStatus.textContent = 'جلسه شروع شد و گفت‌وگو به‌صورت پیوسته ذخیره می‌شود.';
    setCoachMode('session');
    renderCoachSessionTranscript();
    coachSessionReplyInput.focus();
  } catch (error) {
    coachSessionStatus.textContent = error.message || 'جلسه شروع نشد.';
    coachSessionStartButton.disabled = false;
  } finally {
    coachSessionBusy = false;
    renderCoachSessionHistory();
    renderCoachSessionTranscript();
  }
}

async function handleCoachSessionReply(event) {
  event.preventDefault();
  if (coachSessionBusy || !activeCoachingSession || activeCoachingSession.status !== 'active') return;
  const answer = coachSessionReplyInput.value.trim();
  if (!answer) return;
  coachSessionBusy = true;
  coachSessionSendButton.disabled = true;
  coachSessionStatus.textContent = 'در حال ذخیرهٔ پاسخ...';
  try {
    const retryingSavedAnswer = activeCoachingSession.messages.at(-1)?.role === 'user'
      && activeCoachingSession.messages.at(-1)?.content === answer;
    if (!retryingSavedAnswer) {
      activeCoachingSession.messages.push({ role: 'user', content: answer });
      if (activeCoachingQuestion < 5) {
        activeCoachingSession.answers.push(answer);
        activeCoachingQuestion += 1;
      }
    }
    await saveCoachSession(activeCoachingSession);
    if (coachSessionReplyInput.value.trim() === answer) coachSessionReplyInput.value = '';
    coachSessionReplyInput.style.height = 'auto';
    const nextGuidedQuestion = activeCoachingQuestion < 5
      ? activeCoachingSession.questions[activeCoachingQuestion]
      : '';
    coachSessionStatus.textContent = 'استاد دارد به حرفت فکر می‌کند...';
    const response = await apiFetch('/api/coach/session/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style: activeCoachingSession.style,
        messages: activeCoachingSession.messages,
        nextGuidedQuestion,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'پاسخ مربی دریافت نشد.');
    activeCoachingSession.messages.push({ role: 'assistant', content: payload.reply });
    await saveCoachSession(activeCoachingSession);
    coachSessionStatus.textContent = 'پاسخ و جلسه ذخیره شدند.';
  } catch (error) {
    coachSessionStatus.textContent = `${error.message || 'ادامهٔ جلسه ناموفق بود.'} پاسخ‌های ثبت‌شده در این صفحه باقی‌اند؛ اتصال را بررسی و دوباره ارسال کن.`;
    if (!coachSessionReplyInput.value.trim()) coachSessionReplyInput.value = answer;
  } finally {
    coachSessionBusy = false;
    coachSessionSendButton.disabled = false;
    renderCoachSessionTranscript();
    coachSessionReplyInput.focus();
  }
}

async function finishCoachSession() {
  if (coachSessionBusy || !activeCoachingSession || !activeCoachingSession.messages.some((message) => message.role === 'user')) return;
  coachSessionBusy = true;
  coachSessionFinishButton.disabled = true;
  coachSessionStatus.textContent = 'در حال ساخت خلاصه، تمرین و پیگیری جلسهٔ بعد...';
  try {
    const response = await apiFetch('/api/coach/session/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: activeCoachingSession.messages }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'جمع‌بندی جلسه ناموفق بود.');
    const completedSession = { ...activeCoachingSession, ...payload, status: 'completed' };
    await saveCoachSession(completedSession);
    coachSessionStatus.textContent = 'جلسه همراه با خلاصه، قول‌ها و تمرین روی فضای ابری ذخیره شد.';
  } catch (error) {
    coachSessionStatus.textContent = error.message || 'ذخیرهٔ جمع‌بندی جلسه ناموفق بود.';
    coachSessionFinishButton.disabled = false;
  } finally {
    coachSessionBusy = false;
    renderCoachSessionHistory();
    renderCoachSessionTranscript();
  }
}

coachSessionStartButton?.addEventListener('click', startCoachSession);
coachSessionFinishButton?.addEventListener('click', finishCoachSession);
coachSessionReplyForm?.addEventListener('submit', handleCoachSessionReply);

dailyCheckinForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const record = {
    date: localDateKey(new Date()),
    sleep: Number(document.getElementById('checkinSleep').value),
    stress: Number(document.getElementById('checkinStress').value),
    mood: Number(document.getElementById('checkinMood').value),
    updatedAt: new Date().toISOString(),
  };
  if (![record.sleep, record.stress, record.mood].every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) {
    checkinLocalNote.textContent = 'هر سه پاسخ را با مقیاس ۱ تا ۵ انتخاب کن.';
    return;
  }
  try {
    const previous = state.dailyCheckins;
    const next = [...state.dailyCheckins.filter((item) => item.date !== record.date), record];
    appStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(next));
    invalidCentralLocalStorage.delete('checkins');
    state.dailyCheckins = next;
    checkinLocalNote.textContent = 'چک‌این روی همین دستگاه ذخیره شد؛ در حال همگام‌سازی ابری...';
    queueCentralCollectionSync('checkins', previous, next, checkinLocalNote, 'چک‌این روزانه');
    renderDailyCheckin();
  } catch (error) {
    checkinLocalNote.textContent = 'ذخیرهٔ چک‌این ناموفق بود؛ فضای ذخیره‌سازی مرورگر را بررسی کن.';
  }
});

masterReportButton?.addEventListener('click', async () => {
  masterReportButton.disabled = true;
  masterReportButton.textContent = 'در حال تحلیل...';
  masterReportStatus.textContent = 'معاملات و تصاویر چارت بررسی می‌شوند؛ ممکن است کمی طول بکشد.';
  try {
    const response = await apiFetch('/api/ai/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'ساخت گزارش ناموفق بود.');
    if (payload.pending) {
      masterReportStatus.textContent = 'گزارش درخواست‌شده هنوز در حال ساخت است؛ چند لحظهٔ دیگر دوباره بررسی کن.';
      return;
    }
    if (typeof payload.report !== 'string' || !payload.report.trim()) {
      throw new Error('گزارش پاسخ خالی داشت؛ اطلاعات قبلی تغییر نکرد.');
    }
    masterReportResult.textContent = payload.report;
    const generatedAt = payload.generatedAt ? new Date(payload.generatedAt).toLocaleString('fa-IR') : '';
    const imageStatus = payload.omittedImages
      ? ` · ${payload.includedImages} تصویر بررسی شد؛ ${payload.omittedImages} تصویر به محدودیت حجم/تعداد خورد`
      : ` · ${payload.includedImages} تصویر بررسی شد`;
    masterReportStatus.textContent = `${payload.tradeCount} معامله · ${generatedAt} · ${payload.cached ? 'از گزارش ذخیره‌شده' : 'گزارش تازه'}${imageStatus}`;
  } catch (error) {
    masterReportStatus.textContent = error.message || 'ساخت گزارش انجام نشد.';
  } finally {
    masterReportButton.disabled = false;
    masterReportButton.textContent = 'بررسی گزارش';
  }
});

async function loadWeeklyCoachReport(attempt = 0) {
  if (!weeklyCoachReportStatus || weeklyCoachReportBusy) return;
  weeklyCoachReportBusy = true;
  weeklyCoachReportStatus.textContent = 'گزارش هفتگی بررسی می‌شود؛ اگر داده‌ای تازه باشد، استاد آن را می‌سازد...';
  try {
    const response = await apiFetch('/api/coach/weekly-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'بارگذاری گزارش هفتگی ناموفق بود.');
    if (payload.pending) {
      weeklyCoachReportStatus.textContent = 'گزارش این هفته در حال آماده‌شدن است...';
      if (attempt < 3 && activeJournalView === 'master') {
        window.setTimeout(() => loadWeeklyCoachReport(attempt + 1), 1500);
      } else {
        weeklyCoachReportStatus.textContent = 'ساخت گزارش هنوز ادامه دارد؛ چند لحظه بعد دوباره این صفحه را باز کن.';
      }
      return;
    }
    if (typeof payload.report !== 'string' || !payload.report.trim()) {
      throw new Error('گزارش هفتگی پاسخ خالی داشت؛ اطلاعات قبلی تغییر نکرد.');
    }
    weeklyCoachReportResult.textContent = payload.report;
    const range = payload.weekStart && payload.weekEnd
      ? `${new Date(`${payload.weekStart}T00:00:00Z`).toLocaleDateString('fa-IR')} تا ${new Date(`${payload.weekEnd}T00:00:00Z`).toLocaleDateString('fa-IR')}`
      : 'این هفته';
    const generatedAt = payload.generatedAt
      ? new Date(payload.generatedAt).toLocaleString('fa-IR')
      : '';
    const cacheNote = payload.cached ? 'از گزارش ذخیره‌شده' : 'گزارش تازه';
    weeklyCoachReportStatus.textContent = `${range} · ${payload.weeklyTradeCount} معاملهٔ این هفته از ${payload.tradeCount} معاملهٔ ژورنال · ${cacheNote}${generatedAt ? ` · ${generatedAt}` : ''}`;
  } catch (error) {
    weeklyCoachReportStatus.textContent = error.message || 'ساخت گزارش هفتگی ناموفق بود.';
  } finally {
    weeklyCoachReportBusy = false;
  }
}

function appendMasterMessage(role, text) {
  if (!masterChatLog) return;
  masterChatLog.hidden = false;
  if (coachChatWelcome) coachChatWelcome.hidden = true;
  const message = document.createElement('div');
  message.className = `master-message ${role}`;
  message.textContent = text;
  masterChatLog.appendChild(message);
  masterChatLog.scrollTop = masterChatLog.scrollHeight;
}

function appendCoachTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'master-message assistant coach-typing';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'استاد در حال نوشتن پاسخ است');
  indicator.innerHTML = '<span></span><span></span><span></span>';
  masterChatLog.appendChild(indicator);
  masterChatLog.scrollTop = masterChatLog.scrollHeight;
  return indicator;
}

async function handleFreeMasterChat(event) {
  event.preventDefault();
  if (masterChatSend.disabled) return;
  const message = masterChatInput?.value.trim();
  if (!message) return;
  masterChatSend.disabled = true;
  masterChatSend.textContent = '…';
  let userMessageSaved = false;
  let typingIndicator = null;
  let conversationId = '';
  try {
    if (!activeConversation) await createCoachConversation(message.slice(0, 80), { preserveDraft: true });
    conversationId = activeConversation.conversationId;
    const nextHistory = (activeConversation?.conversationId === conversationId ? masterChatHistory : [])
      .concat([{ role: 'user', content: message }]).slice(-12);
    const userMessage = { id: newCoachId(), role: 'user', content: message };
    await persistCoachMessage(conversationId, userMessage);
    userMessageSaved = true;
    if (masterChatInput.value.trim() === message) {
      masterChatInput.value = '';
      masterChatInput.style.height = 'auto';
    }
    if (activeConversation?.conversationId === conversationId) {
      masterChatHistory = nextHistory;
      renderMasterChatTranscript();
      typingIndicator = appendCoachTypingIndicator();
    }
    const response = await apiFetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: nextHistory, conversationId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'پاسخ هوش مصنوعی دریافت نشد.');
    const assistantMessage = {
      id: newCoachId(),
      role: 'assistant',
      content: payload.reply,
    };
    typingIndicator?.remove();
    typingIndicator = null;
    const conversationHistory = nextHistory.concat([{ role: 'assistant', content: payload.reply }]).slice(-12);
    if (activeConversation?.conversationId === conversationId) {
      appendMasterMessage('assistant', payload.reply);
      masterChatHistory = conversationHistory;
    }
    try {
      await persistCoachMessage(conversationId, assistantMessage);
    } catch (error) {
      if (activeConversation?.conversationId === conversationId) {
        masterChatStatus.textContent = `پاسخ استاد نمایش داده شد، اما ذخیرهٔ ابری آن ناموفق بود: ${error.message || 'خطای نامشخص'}`;
      }
      return;
    }
    if (Number.isFinite(payload.tradeCount) && activeConversation?.conversationId === conversationId) {
      const contextNote = `زمینهٔ پاسخ: ${payload.includedTradeCount} معاملهٔ اخیر از مجموع ${payload.tradeCount} معامله.`;
      appendMasterMessage('system', contextNote);
    }
    if (payload.automaticUpdateFailed && activeConversation?.conversationId === conversationId) {
      masterChatStatus.textContent = 'پاسخ ذخیره شد، اما حافظه یا تمرین پذیرفته‌شده خودکار به‌روزرسانی نشد.';
    }
  } catch (error) {
    typingIndicator?.remove();
    if ((!conversationId || activeConversation?.conversationId === conversationId)
      && (!activeConversation || masterChatInput.value.trim() === message)) {
      masterChatStatus.textContent = userMessageSaved
        ? `پیامت ذخیره شد، اما پاسخ دریافت نشد: ${error.message || 'خطای نامشخص'}`
        : `پیام ذخیره نشد؛ دوباره تلاش کن. ${error.message || ''}`;
    }
    if (!userMessageSaved && (!conversationId || activeConversation?.conversationId === conversationId)
      && !masterChatInput.value.trim()) {
      masterChatInput.value = message;
      masterChatInput.dispatchEvent(new Event('input'));
    }
  } finally {
    typingIndicator?.remove();
    masterChatSend.disabled = false;
    masterChatSend.textContent = '↑';
  }
}

masterChatForm?.addEventListener('submit', (event) => {
  handleFreeMasterChat(event);
});

document.getElementById('openAfterLossRoom')?.addEventListener('click', () => {
  afterLossFields.hidden = false;
  afterLossResult.hidden = true;
  afterLossStatus.textContent = 'این سه پاسخ فقط برای همین گفت‌وگو استفاده می‌شوند و ذخیره نمی‌شوند.';
  document.getElementById('afterLossEvent').focus();
});
document.getElementById('openPreTradeRoom')?.addEventListener('click', () => {
  resetPreTradeUrgencyMode();
  preTradeFromForm = false;
  document.getElementById('continueAfterPreTrade').textContent = 'پایان مکث';
  preTradeWhy.value = '';
  preTradeStop.value = '';
  preTradeSimilar.value = '';
  preTradeSetup.value = '';
  preTradeEmotion.value = '';
  renderPreTradeRuleChecks();
  preTradeStatus.textContent = '۲۰ ثانیه مکث: دلیل ورود، حد ضرر و شباهت به معامله‌های قبلی را مرور کن.';
  preTradeResult.hidden = true;
  preTradeResult.textContent = '';
  preTradeCheck.hidden = false;
  renderPreTradeWarnings();
});
document.getElementById('openUrgentEntryMode')?.addEventListener('click', openUrgentEntryMode);
preTradeSetup?.addEventListener('input', renderPreTradeWarnings);
preTradeEmotion?.addEventListener('input', renderPreTradeWarnings);
document.getElementById('sendAfterLossRoom')?.addEventListener('click', reviewAfterLoss);
document.getElementById('runPreTradeReview')?.addEventListener('click', reviewBeforeEntry);
document.getElementById('continueAfterPreTrade')?.addEventListener('click', continueAfterPreTrade);
document.getElementById('savePostTradeRuleReview')?.addEventListener('click', continuePostTradeRuleReview);
document.getElementById('cancelPostTradeRuleReview')?.addEventListener('click', () => {
  const trade = state.trades.find((item) => item.id === pendingPostTradeReviewId);
  postTradeRuleReview.hidden = true;
  pendingPostTradeReviewId = '';
  if (trade) {
    fillForm(trade);
    openTradeForm();
    postTradeRuleStatus.textContent = 'معامله ذخیره شده است؛ برای ادامهٔ پیگیری، دوباره ذخیره را بزن.';
  }
});
document.getElementById('cancelPreTrade')?.addEventListener('click', () => {
  preTradeCheck.hidden = true;
  preTradeFromForm = false;
  preTradeReviewComplete = false;
  resetPreTradeUrgencyMode();
});

document.getElementById('newTradeBtn').addEventListener('click', () => {
  setJournalView('journal');
  resetForm();
  openTradeForm();
});

document.getElementById('cancelFormBtn').addEventListener('click', () => {
  tradeForm.style.display = 'none';
  resetForm();
});

document.getElementById('tradeForm').addEventListener('submit', saveTrade);
document.getElementById('tradeLookupBtn')?.addEventListener('click', lookupTradeDetails);
document.getElementById('address')?.addEventListener('change', lookupTradeDetails);
document.getElementById('txLink')?.addEventListener('change', lookupTradeDetails);
document.getElementById('prevMonthBtn').addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('nextMonthBtn').addEventListener('click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

function showTelegramGate(message) {
  document.body.classList.add('telegram-required-mode');
  document.getElementById('telegramRequiredMessage').textContent = message;
}

async function hydrateApp() {
  if (!telegramWebApp || !telegramInitData) {
    showTelegramGate('این ژورنال فقط به‌صورت مینی‌اپ داخل تلگرام باز می‌شود. از دکمهٔ ربات وارد شو.');
    return;
  }
  telegramWebApp.ready();
  telegramWebApp.expand();
  try {
    telegramWebApp.setHeaderColor?.('#070b10');
    telegramWebApp.setBackgroundColor?.('#070b10');
  } catch (error) {
    console.warn('Telegram Mini App theme could not be applied.', error);
  }

  try {
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();
    if (!configResponse.ok || !config.telegramMiniApp) throw new Error('پیکربندی مینی‌اپ تلگرام در سرور در دسترس نیست.');
    state.remoteEnabled = true;
    renderApiSettingsConfig(config);
    const identityResponse = await apiFetch('/api/me');
    const identity = await identityResponse.json().catch(() => ({}));
    if (!identityResponse.ok || !identity.user?.id) throw new Error(identity.message || 'ورود تلگرام تأیید نشد.');
    telegramUserId = String(identity.user.id);
  } catch (error) {
    showTelegramGate(error.message || 'ورود امن تلگرام انجام نشد؛ مینی‌اپ را از دکمهٔ ربات دوباره باز کن.');
    return;
  }
  updateSyncStatus(false);
  try {
    state.dailyCheckins = loadDailyCheckins();
  } catch (error) {
    state.dailyCheckins = [];
    invalidCentralLocalStorage.add('checkins');
    checkinLocalNote.textContent = 'خواندن چک‌این‌های قبلی ناموفق بود؛ داده‌ها حذف نشده‌اند. فضای ذخیره‌سازی مرورگر را بررسی کن.';
  }
  loadTradingProfile();
  loadPersonalRules();
  loadLessonLibrary();
  const pendingLocalTrades = readLocalTrades();
  if (!state.remoteEnabled) {
    tradeBaselineReady = true;
  } else if (appStorage.getItem(TRADE_BASELINE_STORAGE_KEY) === null) {
    try {
      appStorage.setItem(TRADE_BASELINE_STORAGE_KEY, JSON.stringify(pendingLocalTrades.map((trade) => String(trade.id || '')).filter(Boolean)));
      tradeBaselineReady = true;
    } catch (error) {
      checkinLocalNote.textContent = 'ثبت وضعیت اولیهٔ معاملات انجام نشد؛ برای جلوگیری از انتقال ناخواستهٔ معاملات قدیمی، همگام‌سازی معامله‌ها متوقف می‌شود.';
    }
  } else {
    try {
      storedTradeIds(TRADE_BASELINE_STORAGE_KEY);
      tradeBaselineReady = true;
    } catch (error) {
      checkinLocalNote.textContent = error.message;
    }
  }
  const serverTrades = await fetchServerTrades();
  if (Array.isArray(serverTrades)) {
    if (tradeBaselineReady) {
      establishTradeSyncBaseline(pendingLocalTrades, serverTrades);
      state.trades = mergeCloudAndDeferredTrades(serverTrades, pendingLocalTrades);
    } else {
      state.trades = pendingLocalTrades;
    }
    saveLocalTrades(state.trades);
  } else {
    state.trades = pendingLocalTrades;
  }

  state.selectedDate = localDateKey(new Date());
  resetForm();
  renderAll();
  try {
    await loadCoachConversations();
    masterChatListStatus.textContent = '';
    await handleCoachLaunchLink();
  } catch (error) {
    masterChatListStatus.textContent = `${error.message} وضعیت اتصال Cloudflare و پایگاه D1 را بررسی کن.`;
  }
  try {
    await loadCoachMemories();
  } catch (error) {
    coachMemoryStatus.textContent = error.message || 'بارگذاری حافظهٔ استاد ناموفق بود.';
  }
  try {
    await syncCentralRecords();
  } catch (error) {
    console.error('Cloud journal coaching data sync failed:', error.message);
  }
  syncLocalTradesToServer();
  window.setInterval(() => {
    if (!document.hidden) syncLocalTradesToServer();
  }, 20000);
  window.setInterval(() => {
    if (!document.hidden) syncCentralRecords().catch((error) => console.error('Cloud journal coaching data sync failed:', error.message));
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncLocalTradesToServer();
    if (!document.hidden) syncCentralRecords().catch((error) => console.error('Cloud journal coaching data sync failed:', error.message));
  });
}

hydrateApp();
