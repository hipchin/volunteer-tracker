// ==== storage.js ====
const CAT_LABEL = { main: '野外奉仕', other: 'その他の奉仕' };
const APP_VERSION = '2026.07.26.no-startup-log-1';
const BACKUP_SCHEMA_VERSION = 2;
const SESSION_NORMALIZED_VERSION = 2;

function makeSessionId() {
  return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function sessionMinutes(s) {
  if (Number.isFinite(Number(s.totalMin))) return Number(s.totalMin);
  return Math.round((Number(s.hours) || 0) * 60);
}

function loadSessions() {
  let sessions = [];
  try {
    const saved = JSON.parse(localStorage.getItem('vt_sessions') || '[]');
    if (Array.isArray(saved)) sessions = saved;
  } catch (e) {
    sessions = [];
  }

  const normalizedVersion = localStorage.getItem('vt_sessions_normalized_version');
  if (normalizedVersion === String(SESSION_NORMALIZED_VERSION)) {
    return sessions;
  }

  let changed = false;
  sessions = sessions.map(s => {
    const copy = { ...s };
    if (!copy.id) { copy.id = makeSessionId(); changed = true; }
    if (!copy.dateKey && typeof copy.date === 'string') { copy.dateKey = copy.date.replace(/\//g, '-'); changed = true; }
    if (!copy.month && copy.dateKey) { copy.month = dateToMonthKey(copy.dateKey); changed = true; }
    if (!copy.date && copy.dateKey) { copy.date = copy.dateKey.replace(/-/g, '/'); changed = true; }
    if (!copy.cat || !CAT_LABEL[copy.cat]) { copy.cat = 'main'; changed = true; }
    if (!Number.isFinite(Number(copy.deductMin))) { copy.deductMin = 0; changed = true; }
    if (!Number.isFinite(Number(copy.totalMin))) { copy.totalMin = sessionMinutes(copy); changed = true; }
    if (!Number.isFinite(Number(copy.hours))) { copy.hours = copy.totalMin / 60; changed = true; }
    copy.manual = Boolean(copy.manual);
    copy.edited = Boolean(copy.edited);
    return copy;
  });

  if (changed) localStorage.setItem('vt_sessions', JSON.stringify(sessions));
  localStorage.setItem('vt_sessions_normalized_version', String(SESSION_NORMALIZED_VERSION));
  return sessions;
}

function persistSessions() {
  localStorage.setItem('vt_sessions', JSON.stringify(state.sessions));
  localStorage.setItem('vt_sessions_normalized_version', String(SESSION_NORMALIZED_VERSION));
  if (typeof invalidateSessionStatsCache === 'function') invalidateSessionStatsCache();
}

function loadMap(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

function saveMap(key, value) {
  localStorage.setItem(key, JSON.stringify(value || {}));
}

function saveActiveTimer() {
  if (!state.running || !state.startTime) return;
  const payload = {
    running: true,
    startTime: state.startTime.toISOString(),
    category: state.category || 'main',
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('vt_active_timer', JSON.stringify(payload));
}

function clearActiveTimer() {
  localStorage.removeItem('vt_active_timer');
}

function loadActiveTimer() {
  try {
    const raw = localStorage.getItem('vt_active_timer');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.running !== true || !data.startTime) return null;
    const start = new Date(data.startTime);
    if (isNaN(start.getTime())) return null;
    return { startTime: start, category: CAT_LABEL[data.category] ? data.category : 'main' };
  } catch (e) {
    return null;
  }
}

function buildBackupObject(reason = 'manual') {
  return {
    app: 'volunteer-tracker',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    reason,
    exportedAt: new Date().toISOString(),
    goal: state.goal,
    annualGoal: state.annualGoal,
    lessons: { ...state.lessons },
    reported: { ...state.reported },
    goalStatus: { ...state.goalStatus },
    sessions: state.sessions.map(s => ({ ...s }))
  };
}

function storeSafetyBackup(key, reason) {
  try {
    localStorage.setItem(key, JSON.stringify(buildBackupObject(reason)));
    localStorage.setItem(key + '_saved_at', new Date().toISOString());
    return true;
  } catch (e) {
    return false;
  }
}

// ==== time.js ====
function todayStr() {
  const d = new Date();
  return formatDateKeyFromDate(d);
}

function getMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function dateToMonthKey(value) {
  return String(value || '').slice(0, 7);
}

function parseMonthKey(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  return { year, month };
}

function addMonths(monthKey, delta) {
  const { year, month } = parseMonthKey(monthKey);
  const d = new Date(year, month - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return year + '年' + month + '月';
}

function monthShortLabel(monthKey) {
  return parseMonthKey(monthKey).month + '月';
}

function fiscalYearOf(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return month >= 9 ? year : year - 1;
}

function fiscalLabel(monthKey) {
  const fy = fiscalYearOf(monthKey);
  return fy + '年度（' + fy + '年9月〜' + (fy + 1) + '年8月）';
}

function fiscalMonthKeys(monthKey) {
  const fy = fiscalYearOf(monthKey);
  const keys = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(fy, 8 + i, 1);
    keys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return keys;
}

function previousMonthKey() {
  return addMonths(getMonthKey(), -1);
}

function formatDateKeyFromDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function isSameLocalDate(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function parseHM(str) {
  if (!str) return null;
  const parts = String(str).split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function fmtHours(h) {
  const totalMin = Math.round((Number(h) || 0) * 60);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs === 0) return min + '分';
  if (min === 0) return hrs + '時間';
  return hrs + '時間' + min + '分';
}

function fmtGoalHours(h) {
  const num = Number(h);
  if (!Number.isFinite(num)) return '0時間';
  return (Number.isInteger(num) ? String(num) : String(num).replace(/\.0$/, '')) + '時間';
}

// ==== ui.js ====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function updateHeader() {
  const d = new Date();
  document.getElementById('header-month').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
}

function updateMonthLabels() {
  const label = monthLabel(state.selectedMonth);
  const fiscal = fiscalLabel(state.selectedMonth);
  const pairs = [
    ['log-title', label + 'の履歴'],
    ['summary-title', label + 'の集計'],
    ['log-month-label', '＜ ' + label + ' ＞'],
    ['summary-month-label', '＜ ' + label + ' ＞'],
    ['log-fiscal-label', fiscal],
    ['summary-fiscal-label', fiscal]
  ];
  pairs.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function updateProgress() {
  const total = allHours();
  const remaining = Math.max(0, state.goal - total);
  const pct = state.goal > 0 ? Math.min(100, Math.round(total / state.goal * 100)) : 0;
  document.getElementById('total-display').textContent = fmtHours(total);
  document.getElementById('goal-label').textContent = '目標 ' + fmtGoalHours(state.goal);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-remain').textContent = '残り ' + fmtHours(remaining);
}

function selectCat(cat) {
  state.category = CAT_LABEL[cat] ? cat : 'main';
  document.getElementById('btn-main').classList.toggle('active', state.category === 'main');
  document.getElementById('btn-other').classList.toggle('active', state.category === 'other');
}

function updateLiveStartEditVisibility() {
  const liveEdit = document.getElementById('live-start-edit');
  const liveInput = document.getElementById('live-start-time');
  if (!liveEdit || !liveInput) return;
  if (state.running && state.startTime) {
    liveEdit.classList.add('show');
    liveInput.value = fmtTime(state.startTime);
  } else {
    liveEdit.classList.remove('show');
  }
}

function updateLiveEndEditVisibility() {
  const endEdit = document.getElementById('live-end-edit');
  const endInput = document.getElementById('live-end-time');
  if (!endEdit || !endInput) return;
  if (!state.running && state.startTime && state.endTime) {
    endEdit.classList.add('show');
    endInput.value = fmtTime(state.endTime);
  } else {
    endEdit.classList.remove('show');
  }
}

function updateTimerDisplay() {
  if (!state.startTime) return;
  const diff = Math.max(0, Math.floor((new Date() - state.startTime) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  document.getElementById('timer-display').textContent =
    String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function resetTimerInputUI() {
  clearActiveTimer();
  state.running = false;
  state.startTime = null;
  state.endTime = null;
  state.manualDate = null;
  state.isManual = false;
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = null;
  const btn = document.getElementById('start-btn');
  btn.style.display = 'block';
  btn.textContent = '開始';
  btn.className = 'btn-primary btn-green';
  document.getElementById('timer-display').textContent = '00:00:00';
  document.getElementById('timer-display').classList.remove('running');
  document.getElementById('timer-label').textContent = '開始ボタンを押してください';
  const liveEdit = document.getElementById('live-start-edit');
  if (liveEdit) liveEdit.classList.remove('show');
  const endEdit = document.getElementById('live-end-edit');
  if (endEdit) endEdit.classList.remove('show');
}

function renderDeductList() {
  const container = document.getElementById('deduct-list');
  container.innerHTML = '';
  deductRows.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'deduct-row';
    div.innerHTML = '<input type="time" value="' + (row.from || '') + '" onchange="deductRows[' + i + '].from=this.value">' +
      '<span class="deduct-sep">〜</span>' +
      '<input type="time" value="' + (row.to || '') + '" onchange="deductRows[' + i + '].to=this.value">' +
      '<button class="deduct-del" onclick="removeDeduct(' + i + ')">×</button>';
    container.appendChild(div);
  });
}

function renderLog() {
  const container = document.getElementById('log-list');
  updateMonthLabels();
  const sessions = selectedMonthSessions().slice().sort((a, b) => {
    if (a.dateKey !== b.dateKey) return b.dateKey > a.dateKey ? 1 : -1;
    if (a.start !== b.start) return b.start > a.start ? 1 : -1;
    return String(b.id).localeCompare(String(a.id));
  });
  if (sessions.length === 0) {
    container.innerHTML = '<div class="empty">記録がまだありません</div>';
    cancelEditSession(false);
    return;
  }
  container.innerHTML = '';
  sessions.forEach(s => {
    const div = document.createElement('div');
    div.className = 'log-item';
    if (s.id === editingSessionId) div.classList.add('editing');
    const deductNote = Number(s.deductMin) > 0 ? '（-' + Number(s.deductMin) + '分）' : '';
    const manualBadge = s.manual ? '<span class="badge badge-manual">手動</span>' : '';
    const editedBadge = s.edited ? '<span class="badge badge-edited">編集済</span>' : '';
    div.innerHTML = '<div class="log-left"><div class="log-date-str">' + s.date + '</div>' +
      '<div class="log-time-str">' + s.start + ' 〜 ' + s.end + deductNote + '</div>' +
      '<div class="log-actions"><button class="log-edit-btn" type="button">編集</button></div></div>' +
      '<div class="log-right"><div><span class="badge badge-' + (s.cat === 'main' ? 'main' : 'other') + '">' + CAT_LABEL[s.cat] + '</span>' + manualBadge + editedBadge + '</div>' +
      '<div class="log-hours">' + fmtHours(sessionMinutes(s) / 60) + '</div></div>';
    div.querySelector('.log-edit-btn').addEventListener('click', () => startEditSession(s.id));
    container.appendChild(div);
  });
}

function renderSummary() {
  updateMonthLabels();
  const main = mainHours(state.selectedMonth);
  const other = otherHours(state.selectedMonth);
  const total = main + other;
  const remaining = Math.max(0, state.goal - total);
  document.getElementById('sum-total').innerHTML = fmtHours(total);
  document.getElementById('sum-main').textContent = fmtHours(main);
  document.getElementById('sum-other').textContent = fmtHours(other);
  document.getElementById('sum-remain').textContent = '目標まで残り ' + fmtHours(remaining);

  const annualTotal = annualHours(state.selectedMonth);
  const annualRemaining = Math.max(0, state.annualGoal - annualTotal);
  const annualPct = state.annualGoal > 0 ? Math.min(100, Math.round(annualTotal / state.annualGoal * 100)) : 0;
  const annualFiscalLabel = document.getElementById('annual-fiscal-label');
  const annualGoalLabel = document.getElementById('annual-goal-label');
  const annualTotalEl = document.getElementById('annual-total');
  const annualRemainEl = document.getElementById('annual-remain');
  const annualProgressEl = document.getElementById('annual-progress-fill');
  if (annualFiscalLabel) annualFiscalLabel.textContent = fiscalLabel(state.selectedMonth);
  if (annualGoalLabel) annualGoalLabel.textContent = '目標 ' + fmtGoalHours(state.annualGoal);
  if (annualTotalEl) annualTotalEl.textContent = fmtHours(annualTotal);
  if (annualRemainEl) annualRemainEl.textContent = annualRemaining > 0 ? '年度目標まで残り ' + fmtHours(annualRemaining) : '年度目標を達成しています';
  if (annualProgressEl) annualProgressEl.style.width = annualPct + '%';

  const lessonInput = document.getElementById('lesson-input');
  if (lessonInput) lessonInput.value = getLessonCount(state.selectedMonth);
  const reportTitle = document.getElementById('report-title');
  const reportSummaryText = document.getElementById('report-summary-text');
  const reportStatus = document.getElementById('report-status');
  const reportDoneBtn = document.getElementById('report-done-btn');
  if (reportTitle) reportTitle.textContent = monthShortLabel(state.selectedMonth) + '奉仕報告';
  if (reportSummaryText) reportSummaryText.textContent = reportTextForMonth(state.selectedMonth);
  if (reportStatus) reportStatus.textContent = isReported(state.selectedMonth) ? '報告済み' : '未報告';
  if (reportDoneBtn) reportDoneBtn.style.display = isReported(state.selectedMonth) ? 'none' : 'block';
}

function showTab(tab) {
  ['record', 'log', 'summary', 'settings'].forEach(t => {
    document.getElementById('view-' + t).style.display = t === tab ? 'block' : 'none';
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  if (tab !== 'log') cancelEditSession();
  if (tab === 'log') renderLog();
  if (tab === 'summary') renderSummary();
  if (tab === 'settings') {
    document.getElementById('goal-input').value = state.goal;
    const annualGoalInput = document.getElementById('annual-goal-input');
    if (annualGoalInput) annualGoalInput.value = state.annualGoal;
    updateAppInfo();
  }
}

function updateAppInfo() {
  const label = document.getElementById('app-version-label');
  if (label) label.textContent = APP_VERSION;
}

// ==== app.js ====
var vtHadControllerAtLoad = ('serviceWorker' in navigator) && !!navigator.serviceWorker.controller;
var state = {
  running: false,
  startTime: null,
  endTime: null,
  manualDate: null,
  category: 'main',
  isManual: false,
  timerInterval: null,
  sessions: loadSessions(),
  goal: parseFloat(localStorage.getItem('vt_goal') || '30'),
  annualGoal: (() => {
    const value = parseFloat(localStorage.getItem('vt_annual_goal') || '600');
    return Number.isFinite(value) && value > 0 ? value : 600;
  })(),
  selectedMonth: getMonthKey(),
  lessons: loadMap('vt_lessons'),
  reported: loadMap('vt_reported_months'),
  goalStatus: loadMap('vt_goal_status')
};
var editingSessionId = null;
var editCat = 'main';
var deductRows = [];
var sessionStatsCache = null;

function invalidateSessionStatsCache() {
  sessionStatsCache = null;
}

function emptyMonthStats() {
  return { mainMin: 0, otherMin: 0, totalMin: 0, count: 0 };
}

function buildSessionStatsCache() {
  const months = {};
  const fiscalYears = {};
  state.sessions.forEach(s => {
    const monthKey = s.month || (s.dateKey ? dateToMonthKey(s.dateKey) : '');
    if (!monthKey) return;
    const minutes = sessionMinutes(s);
    if (!months[monthKey]) months[monthKey] = emptyMonthStats();
    months[monthKey].totalMin += minutes;
    months[monthKey].count += 1;
    if (s.cat === 'other') months[monthKey].otherMin += minutes;
    else months[monthKey].mainMin += minutes;

    const fy = fiscalYearOf(monthKey);
    if (!fiscalYears[fy]) fiscalYears[fy] = 0;
    fiscalYears[fy] += minutes;
  });
  sessionStatsCache = { months, fiscalYears };
  return sessionStatsCache;
}

function getSessionStatsCache() {
  return sessionStatsCache || buildSessionStatsCache();
}

function getMonthStats(monthKey) {
  return getSessionStatsCache().months[monthKey] || emptyMonthStats();
}

function sessionsForMonth(monthKey) {
  return state.sessions.filter(s => s.month === monthKey);
}
function thisMonthSessions() { return sessionsForMonth(getMonthKey()); }
function selectedMonthSessions() { return sessionsForMonth(state.selectedMonth); }
function sumHours(arr) { return arr.reduce((a, s) => a + sessionMinutes(s), 0) / 60; }
function mainHours(monthKey = getMonthKey()) { return getMonthStats(monthKey).mainMin / 60; }
function otherHours(monthKey = getMonthKey()) { return getMonthStats(monthKey).otherMin / 60; }
function allHours(monthKey = getMonthKey()) { return getMonthStats(monthKey).totalMin / 60; }
function sessionsForFiscalYear(monthKey = state.selectedMonth) {
  const fy = fiscalYearOf(monthKey);
  return state.sessions.filter(s => {
    const key = s.month || (s.dateKey ? dateToMonthKey(s.dateKey) : '');
    if (!key) return false;
    return fiscalYearOf(key) === fy;
  });
}
function annualHours(monthKey = state.selectedMonth) {
  const fy = fiscalYearOf(monthKey);
  return (getSessionStatsCache().fiscalYears[fy] || 0) / 60;
}

function getLessonCount(monthKey) {
  const n = parseInt(state.lessons[monthKey] || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function setLessonCount(monthKey, count) {
  state.lessons[monthKey] = Math.max(0, parseInt(count || '0', 10) || 0);
  saveMap('vt_lessons', state.lessons);
}
function isReported(monthKey) { return state.reported[monthKey] === true; }
function setReported(monthKey, value) {
  if (value) state.reported[monthKey] = true;
  else delete state.reported[monthKey];
  saveMap('vt_reported_months', state.reported);
}

function showManual() {
  if (state.running) { showToast('計測中は終了してから手動入力してください'); return; }
  const liveEdit = document.getElementById('live-start-edit');
  if (liveEdit) liveEdit.classList.remove('show');
  document.getElementById('manual-date').value = todayStr();
  document.getElementById('timer-section').style.display = 'none';
  document.getElementById('manual-section').style.display = 'block';
  document.getElementById('deduct-card').style.display = 'none';
  const endEdit = document.getElementById('live-end-edit');
  if (endEdit) endEdit.classList.remove('show');
}
function hideManual() {
  document.getElementById('manual-section').style.display = 'none';
  document.getElementById('timer-section').style.display = 'block';
}

function toggleTimer() {
  if (!state.running) {
    state.running = true;
    state.startTime = new Date();
    saveActiveTimer();
    const btn = document.getElementById('start-btn');
    btn.textContent = '終了';
    btn.className = 'btn-primary btn-red';
    document.getElementById('timer-label').textContent = '計測中... 開始 ' + fmtTime(state.startTime);
    document.getElementById('timer-display').classList.add('running');
    updateLiveStartEditVisibility();
    updateTimerDisplay();
    state.timerInterval = setInterval(updateTimerDisplay, 1000);
  } else {
    state.running = false;
    state.endTime = new Date();
    clearActiveTimer();
    state.manualDate = formatDateKeyFromDate(state.startTime);
    state.isManual = false;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    if (!isSameLocalDate(state.startTime, state.endTime)) {
      const startDate = formatDateKeyFromDate(state.startTime);
      const startTime = fmtTime(state.startTime);
      alert('日付をまたいでいます。\nこのままでは正しく記録できません。\n\n手動入力で正しい日付・開始時刻・終了時刻を入力してください。');
      resetTimerInputUI();
      showManual();
      document.getElementById('manual-date').value = startDate;
      document.getElementById('manual-start').value = startTime;
      document.getElementById('manual-end').value = '';
      return;
    }
    document.getElementById('timer-display').classList.remove('running');
    document.getElementById('start-btn').style.display = 'none';
    const liveEdit = document.getElementById('live-start-edit');
    if (liveEdit) liveEdit.classList.remove('show');
    document.getElementById('timer-label').textContent = fmtTime(state.startTime) + ' 〜 ' + fmtTime(state.endTime);
    deductRows = [];
    document.getElementById('deduct-card').style.display = 'block';
    updateLiveEndEditVisibility();
    renderDeductList();
  }
}

function restoreActiveTimer() {
  const active = loadActiveTimer();
  if (!active) return false;
  state.running = true;
  state.startTime = active.startTime;
  state.endTime = null;
  state.manualDate = null;
  state.isManual = false;
  selectCat(active.category);
  const btn = document.getElementById('start-btn');
  btn.style.display = 'block';
  btn.textContent = '終了';
  btn.className = 'btn-primary btn-red';
  document.getElementById('timer-section').style.display = 'block';
  document.getElementById('manual-section').style.display = 'none';
  document.getElementById('deduct-card').style.display = 'none';
  document.getElementById('timer-label').textContent = '計測中... 開始 ' + fmtTime(state.startTime);
  document.getElementById('timer-display').classList.add('running');
  updateLiveStartEditVisibility();
  updateTimerDisplay();
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateTimerDisplay, 1000);
  return true;
}

function applyLiveStartTime() {
  if (!state.running || !state.startTime) { showToast('計測中のみ修正できます'); return; }
  const input = document.getElementById('live-start-time');
  const value = input ? input.value : '';
  const mins = parseHM(value);
  if (mins === null) { showToast('開始時刻を正しく入力してください'); return; }
  const now = new Date();
  if (!isSameLocalDate(state.startTime, now)) {
    alert('日付をまたいでいます。\nこのままでは正しく記録できません。\n\n手動入力で正しい日付・開始時刻・終了時刻を入力してください。');
    resetTimerInputUI();
    showManual();
    return;
  }
  const newStart = new Date(state.startTime);
  newStart.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  if (newStart > now) { showToast('現在時刻より後には修正できません'); return; }
  state.startTime = newStart;
  saveActiveTimer();
  updateTimerDisplay();
  document.getElementById('timer-label').textContent = '計測中... 開始 ' + fmtTime(state.startTime);
  showToast('開始時刻を修正しました');
}

function applyLiveEndTime() {
  if (state.running || !state.startTime || !state.endTime) { showToast('終了後のみ修正できます'); return; }
  const input = document.getElementById('live-end-time');
  const value = input ? input.value : '';
  const mins = parseHM(value);
  if (mins === null) { showToast('終了時刻を正しく入力してください'); return; }
  if (!isSameLocalDate(state.startTime, state.endTime)) { showToast('日付をまたいだ記録は手動入力してください'); return; }
  const newEnd = new Date(state.endTime);
  newEnd.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  if (!isSameLocalDate(state.startTime, newEnd)) { showToast('同じ日付内で入力してください'); return; }
  if (newEnd <= state.startTime) { showToast('終了時刻は開始より後にしてください'); return; }
  state.endTime = newEnd;
  document.getElementById('timer-label').textContent = fmtTime(state.startTime) + ' 〜 ' + fmtTime(state.endTime);
  updateLiveEndEditVisibility();
  showToast('終了時刻を修正しました');
}

function submitManual() {
  clearActiveTimer();
  const dv = document.getElementById('manual-date').value;
  const sv = document.getElementById('manual-start').value;
  const ev = document.getElementById('manual-end').value;
  if (!dv || !sv || !ev) { showToast('日付・開始・終了を入力してください'); return; }
  const startMin = parseHM(sv);
  const endMin = parseHM(ev);
  if (startMin === null || endMin === null) { showToast('時刻を正しく入力してください'); return; }
  if (endMin <= startMin) { showToast('終了時刻は開始より後にしてください'); return; }
  const [yr, mo, dy] = dv.split('-').map(Number);
  state.startTime = new Date(yr, mo - 1, dy, Math.floor(startMin / 60), startMin % 60);
  state.endTime = new Date(yr, mo - 1, dy, Math.floor(endMin / 60), endMin % 60);
  state.manualDate = dv;
  state.isManual = true;
  deductRows = [];
  document.getElementById('manual-section').style.display = 'none';
  document.getElementById('timer-section').style.display = 'block';
  document.getElementById('timer-label').textContent = dv.replace(/-/g, '/') + ' ' + sv + ' 〜 ' + ev;
  document.getElementById('timer-display').textContent = '00:00:00';
  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('deduct-card').style.display = 'block';
  updateLiveEndEditVisibility();
  renderDeductList();
}

function addDeductRow() { deductRows.push({ from: '', to: '' }); renderDeductList(); }
function removeDeduct(i) { deductRows.splice(i, 1); renderDeductList(); }

function confirmSession() {
  if (!state.startTime || !state.endTime || !state.manualDate) { showToast('記録する時間が見つかりません'); return; }
  if (!isSameLocalDate(state.startTime, state.endTime)) { showToast('日付をまたいだ記録は手動入力してください'); return; }
  const startMin = state.startTime.getHours() * 60 + state.startTime.getMinutes();
  const endMin = state.endTime.getHours() * 60 + state.endTime.getMinutes();
  let netMin = endMin - startMin;
  let deductMin = 0;
  for (const row of deductRows) {
    const from = parseHM(row.from);
    const to = parseHM(row.to);
    if (from !== null && to !== null && to > from) deductMin += to - from;
  }
  netMin = Math.max(0, netMin - deductMin);
  const dateStr = state.manualDate;
  const session = {
    id: makeSessionId(),
    month: dateToMonthKey(dateStr),
    date: dateStr.replace(/-/g, '/'),
    dateKey: dateStr,
    cat: state.category,
    start: fmtTime(state.startTime),
    end: fmtTime(state.endTime),
    deductMin,
    totalMin: netMin,
    hours: netMin / 60,
    manual: state.isManual,
    edited: false
  };
  state.sessions.push(session);
  persistSessions();
  deductRows = [];
  document.getElementById('deduct-card').style.display = 'none';
  resetTimerInputUI();
  document.getElementById('manual-start').value = '';
  document.getElementById('manual-end').value = '';
  updateProgress();
  showToast(fmtHours(session.hours) + ' を記録しました');
  checkGoalAchievement();
}

function selectEditCat(cat) {
  editCat = CAT_LABEL[cat] ? cat : 'main';
  document.getElementById('edit-cat-main').classList.toggle('active', editCat === 'main');
  document.getElementById('edit-cat-other').classList.toggle('active', editCat === 'other');
}
function startEditSession(id) {
  const session = state.sessions.find(s => s.id === id);
  if (!session) { showToast('編集する記録が見つかりません'); return; }
  editingSessionId = id;
  selectEditCat(session.cat || 'main');
  document.getElementById('edit-date').value = session.dateKey;
  document.getElementById('edit-start').value = session.start;
  document.getElementById('edit-end').value = session.end;
  document.getElementById('edit-deduct').value = Number(session.deductMin) || 0;
  document.getElementById('edit-sub').textContent = session.date + ' ' + session.start + ' 〜 ' + session.end;
  document.getElementById('edit-card').style.display = 'block';
  renderLog();
  document.getElementById('edit-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function cancelEditSession(resetId = true) {
  const editCard = document.getElementById('edit-card');
  if (editCard) editCard.style.display = 'none';
  if (resetId) editingSessionId = null;
}
function getEditValues() {
  const dateStr = document.getElementById('edit-date').value;
  const start = document.getElementById('edit-start').value;
  const end = document.getElementById('edit-end').value;
  const deductMin = parseInt(document.getElementById('edit-deduct').value || '0', 10);
  if (!dateStr || !start || !end) { showToast('日付・開始・終了を入力してください'); return null; }
  const startMin = parseHM(start);
  const endMin = parseHM(end);
  if (startMin === null || endMin === null) { showToast('時刻を正しく入力してください'); return null; }
  if (endMin <= startMin) { showToast('終了時刻は開始より後にしてください'); return null; }
  if (isNaN(deductMin) || deductMin < 0) { showToast('中断時間は0分以上で入力してください'); return null; }
  const grossMin = endMin - startMin;
  if (deductMin >= grossMin) { showToast('中断時間が全体時間以上です'); return null; }
  return { dateStr, start, end, deductMin, netMin: grossMin - deductMin };
}
function saveEditSession() {
  if (!editingSessionId) { showToast('編集する記録が選択されていません'); return; }
  const values = getEditValues();
  if (!values) return;
  const index = state.sessions.findIndex(s => s.id === editingSessionId);
  if (index === -1) { showToast('編集する記録が見つかりません'); return; }
  const prev = state.sessions[index];
  state.sessions[index] = {
    ...prev,
    month: dateToMonthKey(values.dateStr),
    date: values.dateStr.replace(/-/g, '/'),
    dateKey: values.dateStr,
    cat: editCat,
    start: values.start,
    end: values.end,
    deductMin: values.deductMin,
    totalMin: values.netMin,
    hours: values.netMin / 60,
    edited: true
  };
  persistSessions();
  updateProgress();
  renderSummary();
  renderLog();
  cancelEditSession();
  showToast('記録を更新しました');
  checkGoalAchievement();
}
function deleteEditSession() {
  if (!editingSessionId) { showToast('削除する記録が選択されていません'); return; }
  const session = state.sessions.find(s => s.id === editingSessionId);
  if (!session) { showToast('削除する記録が見つかりません'); return; }
  if (!confirm(session.date + ' ' + session.start + ' 〜 ' + session.end + ' の記録を削除しますか？')) return;
  state.sessions = state.sessions.filter(s => s.id !== editingSessionId);
  persistSessions();
  updateProgress();
  renderSummary();
  checkGoalAchievement();
  cancelEditSession();
  renderLog();
  showToast('記録を削除しました');
}

function backupFileName(prefix = 'volunteer-backup') {
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  return prefix + '-' + stamp + '.json';
}
async function saveJsonFile(fileName, jsonText) {
  const blob = new Blob([jsonText], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: '奉仕記録バックアップ' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
function exportBackup() {
  const backup = buildBackupObject('manual-export');
  saveJsonFile(backupFileName(), JSON.stringify(backup, null, 2));
  showToast('バックアップを書き出しました');
}
function openImportBackup() {
  const input = document.getElementById('backup-file-input');
  if (!input) { showToast('読み込み欄が見つかりません'); return; }
  input.value = '';
  input.click();
}
function normalizeImportedSessions(rawSessions) {
  if (!Array.isArray(rawSessions)) throw new Error('sessionsが配列ではありません');
  return rawSessions.map(raw => {
    const s = { ...raw };
    if (!s.id) s.id = makeSessionId();
    if (!s.dateKey && typeof s.date === 'string') s.dateKey = s.date.replace(/\//g, '-');
    if (!s.dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(s.dateKey)) throw new Error('日付形式が正しくありません');
    if (!s.month) s.month = dateToMonthKey(s.dateKey);
    if (!s.date) s.date = s.dateKey.replace(/-/g, '/');
    if (!s.cat || !CAT_LABEL[s.cat]) s.cat = 'main';
    if (!s.start || !s.end || parseHM(s.start) === null || parseHM(s.end) === null) throw new Error('時刻形式が正しくありません');
    if (!Number.isFinite(Number(s.deductMin))) s.deductMin = 0;
    s.deductMin = Math.max(0, parseInt(s.deductMin, 10));
    if (!Number.isFinite(Number(s.totalMin))) s.totalMin = sessionMinutes(s);
    s.totalMin = Math.max(0, parseInt(s.totalMin, 10));
    s.hours = s.totalMin / 60;
    s.manual = Boolean(s.manual);
    s.edited = Boolean(s.edited);
    return s;
  });
}
function importBackupFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ''));
      if (!data || data.app !== 'volunteer-tracker') throw new Error('奉仕記録のバックアップではありません');
      const sessions = normalizeImportedSessions(data.sessions);
      const goal = parseFloat(data.goal);
      const annualGoal = parseFloat(data.annualGoal);
      const totalMin = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
      const dates = sessions.map(s => s.dateKey).sort();
      const period = dates.length ? dates[0].replace(/-/g, '/') + '〜' + dates[dates.length - 1].replace(/-/g, '/') : '記録なし';
      const msg = 'このバックアップを復元しますか？\n\n記録数：' + sessions.length + '件\n対象期間：' + period + '\n合計時間：' + fmtHours(totalMin / 60) + '\n\n現在の記録は上書きされます。';
      if (!confirm(msg)) return;
      storeSafetyBackup('vt_pre_restore_backup', 'before-restore');
      state.sessions = sessions;
      state.goal = Number.isFinite(goal) && goal > 0 ? goal : 30;
      state.annualGoal = Number.isFinite(annualGoal) && annualGoal > 0 ? annualGoal : 600;
      state.lessons = data.lessons && typeof data.lessons === 'object' && !Array.isArray(data.lessons) ? data.lessons : {};
      state.reported = data.reported && typeof data.reported === 'object' && !Array.isArray(data.reported) ? data.reported : {};
      state.goalStatus = data.goalStatus && typeof data.goalStatus === 'object' && !Array.isArray(data.goalStatus) ? data.goalStatus : {};
      persistSessions();
      localStorage.setItem('vt_goal', state.goal);
      localStorage.setItem('vt_annual_goal', state.annualGoal);
      saveMap('vt_lessons', state.lessons);
      saveMap('vt_reported_months', state.reported);
      saveMap('vt_goal_status', state.goalStatus);
      editingSessionId = null;
      updateProgress();
      renderSummary();
      renderLog();
      document.getElementById('goal-input').value = state.goal;
      const annualGoalInput = document.getElementById('annual-goal-input');
      if (annualGoalInput) annualGoalInput.value = state.annualGoal;
      showToast('バックアップを復元しました');
    } catch (e) {
      showToast('バックアップを読み込めませんでした');
      alert('バックアップを読み込めませんでした。\n' + (e && e.message ? e.message : 'ファイル形式を確認してください。'));
    }
  };
  reader.onerror = () => showToast('ファイルの読み込みに失敗しました');
  reader.readAsText(file);
}

function reloadLatestApp() {
  const ok = confirm('最新版を読み込みますか？\n\n更新前に現在の記録を端末内へ自動退避します。');
  if (!ok) return;
  const saved = storeSafetyBackup('vt_pre_update_backup', 'before-update');
  if (!saved) {
    alert('更新前バックアップの作成に失敗しました。\n端末の空き容量を確認してから、もう一度試してください。');
    return;
  }
  const baseUrl = location.origin + location.pathname;
  location.href = baseUrl + '?v=' + Date.now();
}

function changeSelectedMonth(delta) {
  state.selectedMonth = addMonths(state.selectedMonth, delta);
  cancelEditSession();
  renderLog();
  renderSummary();
}
function saveLessonCount() {
  const input = document.getElementById('lesson-input');
  if (!input) return;
  const val = parseInt(input.value || '0', 10);
  setLessonCount(state.selectedMonth, val);
  renderSummary();
  showToast('レッスン件数を保存しました');
}
function reportTextForMonth(monthKey) {
  const main = mainHours(monthKey);
  const other = otherHours(monthKey);
  const lessons = getLessonCount(monthKey);
  return monthShortLabel(monthKey) + '奉仕報告\n\n野外奉仕 ' + fmtHours(main) + '\nその他の奉仕 ' + fmtHours(other) + '\nレッスン ' + lessons + '件';
}
function markReportDone() {
  setReported(state.selectedMonth, true);
  renderSummary();
  showToast(monthLabel(state.selectedMonth) + 'を報告済みにしました');
}
function pendingReportMonth() {
  const prev = previousMonthKey();
  return isReported(prev) ? null : prev;
}
function reportNoticeSnoozeKey(monthKey) { return 'vt_report_notice_snoozed_' + monthKey; }
function shouldShowReportNotice() {
  const monthKey = pendingReportMonth();
  if (!monthKey) return null;
  const snoozed = localStorage.getItem(reportNoticeSnoozeKey(monthKey));
  if (snoozed === todayStr()) return null;
  return monthKey;
}
function showReportNoticeIfNeeded() {
  const monthKey = shouldShowReportNotice();
  if (!monthKey) return;
  const el = document.getElementById('report-notice-overlay');
  if (el) { el.dataset.month = monthKey; el.classList.add('show'); }
}
function hideReportNotice() {
  const el = document.getElementById('report-notice-overlay');
  if (el) el.classList.remove('show');
}
function openPendingReport() {
  const el = document.getElementById('report-notice-overlay');
  const monthKey = (el && el.dataset.month) || pendingReportMonth() || previousMonthKey();
  hideReportNotice();
  state.selectedMonth = monthKey;
  showTab('summary');
}
function snoozeReportNotice() {
  const el = document.getElementById('report-notice-overlay');
  const monthKey = (el && el.dataset.month) || pendingReportMonth();
  if (monthKey) localStorage.setItem(reportNoticeSnoozeKey(monthKey), todayStr());
  hideReportNotice();
}

function saveGoal() {
  const val = parseFloat(document.getElementById('goal-input').value);
  if (!isNaN(val) && val > 0) {
    state.goal = val;
    localStorage.setItem('vt_goal', val);
    updateProgress();
    renderSummary();
    showToast('目標を保存しました');
    checkGoalAchievement();
  }
}

function saveAnnualGoal() {
  const input = document.getElementById('annual-goal-input');
  const val = parseFloat(input ? input.value : '');
  if (!Number.isFinite(val) || val <= 0) {
    showToast('年次目標を正しく入力してください');
    return;
  }
  state.annualGoal = val;
  localStorage.setItem('vt_annual_goal', val);
  renderSummary();
  showToast('年次目標を保存しました');
}

function checkGoalAchievement(monthKey = getMonthKey()) {
  const total = allHours(monthKey);
  const achieved = total >= state.goal;
  const hasModernStatus = Object.prototype.hasOwnProperty.call(state.goalStatus, monthKey);
  const legacyAchieved = localStorage.getItem('vt_goal_achieved_' + monthKey) === 'true';
  const wasAchieved = state.goalStatus[monthKey] === true || (!hasModernStatus && legacyAchieved);
  if (achieved && !wasAchieved) {
    state.goalStatus[monthKey] = true;
    saveMap('vt_goal_status', state.goalStatus);
    if (monthKey === getMonthKey()) showGoalBanner();
    return;
  }
  if (!achieved && wasAchieved) {
    state.goalStatus[monthKey] = false;
    saveMap('vt_goal_status', state.goalStatus);
    return;
  }
  if (achieved && !hasModernStatus && legacyAchieved) {
    state.goalStatus[monthKey] = true;
    saveMap('vt_goal_status', state.goalStatus);
  }
}
function showGoalBanner() {
  const el = document.getElementById('goal-overlay');
  if (el) el.classList.add('show');
}
function hideGoalBanner() {
  const el = document.getElementById('goal-overlay');
  if (el) el.classList.remove('show');
}

function showUpdateBanner() {
  const el = document.getElementById('update-banner');
  if (el) el.classList.add('show');
}
function dismissUpdateBanner() {
  const el = document.getElementById('update-banner');
  if (el) el.classList.remove('show');
}
function applyUpdateNow() {
  dismissUpdateBanner();
  location.reload();
}

function softHaptic() {
  try { if ('vibrate' in navigator) navigator.vibrate(8); } catch (e) {}
}
function initPressFeedback() {
  const pressSelector = 'button, .tab';
  let activeEl = null;
  let releaseTimer = null;
  function clearPress(delay = 0) {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (activeEl) activeEl.classList.remove('is-pressing');
      activeEl = null;
    }, delay);
  }
  function startPress(el) {
    clearPress(0);
    activeEl = el;
    activeEl.classList.add('is-pressing');
    softHaptic();
  }
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest(pressSelector);
    if (!el) return;
    startPress(el);
  }, { passive: true });
  document.addEventListener('pointerup', () => clearPress(90), { passive: true });
  document.addEventListener('pointercancel', () => clearPress(0), { passive: true });
  document.addEventListener('scroll', () => clearPress(0), { passive: true });
  document.addEventListener('visibilitychange', () => clearPress(0));
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (vtHadControllerAtLoad) showUpdateBanner();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(reg => reg.update())
      .catch(err => console.warn('Service Worker registration failed', err));
  });
}

function initDeferredStartupTasks() {
  setTimeout(() => {
    checkGoalAchievement();
    showReportNoticeIfNeeded();
  }, 300);
}

function initApp() {
  initPressFeedback();
  updateHeader();
  restoreActiveTimer();
  updateProgress();
  updateAppInfo();
  updateMonthLabels();
  registerSW();
  initDeferredStartupTasks();
}

initApp();

Object.assign(window, {
  selectCat, showManual, hideManual, toggleTimer, applyLiveStartTime, applyLiveEndTime,
  submitManual, addDeductRow, removeDeduct, confirmSession,
  selectEditCat, startEditSession, cancelEditSession, saveEditSession, deleteEditSession,
  exportBackup, openImportBackup, importBackupFile, reloadLatestApp,
  changeSelectedMonth, saveLessonCount, markReportDone, openPendingReport, snoozeReportNotice,
  saveGoal, saveAnnualGoal, showTab, hideGoalBanner,
  applyUpdateNow, dismissUpdateBanner,
  deductRows
});

// ==== app-version.js ====
// 次回以降の更新では、まずこの2つだけを変更する。
window.VT_APP_BUILD = '20260726-3';
window.VT_APP_VERSION_LABEL = '2026.07.26.no-startup-log-1';

// ==== carryover-update.js ====
// volunteer-tracker carryover + robust update patch
// This file intentionally does not change vt_sessions.
// Carryover rule:
// - Other service can never carry its remainder into the next month, and its remainder may
//   not be pooled with the main-service remainder to make up an hour. Each month you choose
//   what happens to the other-service remainder: merge it into main service, or drop it.
//   Either way other service itself is reported in whole hours.
// - A month's carry-out is what is left over after reporting whole hours from everything it
//   has available (carry-in plus its own minutes) — the carry-in is consumed first, so any
//   full hour it helped complete is reported here rather than carried again. Only minutes
//   originating in this month may carry: if carry-in plus own minutes never reach an hour,
//   the unused carry-in is dropped, since a remainder can only ever be carried into the
//   immediately next month.
// - Until a month's other-service remainder choice is made, that month carries nothing
//   forward: the amount isn't determined yet.

(function () {
  const CARRYOVER_ENABLED_KEY = 'vt_main_carryover_enabled';
  const CARRYOVER_MAP_KEY = 'vt_main_carryovers';
  const OTHER_MODE_MAP_KEY = 'vt_other_remainder_modes';

  function appBuild() {
    return String(window.VT_APP_BUILD || 'dev');
  }

  function appVersionLabel() {
    return String(window.VT_APP_VERSION_LABEL || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : appBuild()));
  }

  function carryoverEnabled() {
    return localStorage.getItem(CARRYOVER_ENABLED_KEY) !== 'false';
  }

  function setCarryoverEnabled(value) {
    localStorage.setItem(CARRYOVER_ENABLED_KEY, value ? 'true' : 'false');
  }

  function loadCarryoverMap() {
    try {
      const value = JSON.parse(localStorage.getItem(CARRYOVER_MAP_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (e) {
      return {};
    }
  }

  function saveCarryoverMap(map) {
    localStorage.setItem(CARRYOVER_MAP_KEY, JSON.stringify(map || {}));
  }

  function loadOtherModeMap() {
    try {
      const value = JSON.parse(localStorage.getItem(OTHER_MODE_MAP_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (e) {
      return {};
    }
  }

  // 'merge' | 'discard' | null (not decided yet)
  function otherRemainderMode(monthKey) {
    const value = loadOtherModeMap()[monthKey];
    return value === 'merge' || value === 'discard' ? value : null;
  }

  function setOtherRemainderMode(monthKey, mode) {
    const map = loadOtherModeMap();
    if (mode === 'merge' || mode === 'discard') map[monthKey] = mode;
    else delete map[monthKey];
    localStorage.setItem(OTHER_MODE_MAP_KEY, JSON.stringify(map));
  }

  function safeSessionMinutes(session) {
    if (typeof sessionMinutes === 'function') return sessionMinutes(session);
    if (Number.isFinite(Number(session.totalMin))) return Number(session.totalMin);
    return Math.round((Number(session.hours) || 0) * 60);
  }

  function rawMainMinutesForMonth(monthKey) {
    return state.sessions
      .filter(s => s.month === monthKey && s.cat === 'main')
      .reduce((sum, s) => sum + safeSessionMinutes(s), 0);
  }

  function rawOtherMinutesForMonth(monthKey) {
    return state.sessions
      .filter(s => s.month === monthKey && s.cat === 'other')
      .reduce((sum, s) => sum + safeSessionMinutes(s), 0);
  }

  function confirmedCarryInMinutes(monthKey) {
    if (!carryoverEnabled()) return 0;
    const entry = loadCarryoverMap()[monthKey];
    if (Number.isFinite(Number(entry))) return Math.max(0, parseInt(entry, 10) || 0);
    if (entry && typeof entry === 'object' && Number.isFinite(Number(entry.minutes))) {
      return Math.max(0, parseInt(entry.minutes, 10) || 0);
    }
    return 0;
  }

  function confirmedCarryOutEntry(monthKey) {
    const nextMonth = addMonths(monthKey, 1);
    const entry = loadCarryoverMap()[nextMonth];
    if (!entry || typeof entry !== 'object') return null;
    return entry.fromMonth === monthKey ? entry : null;
  }

  function hasConfirmedCarryOut(monthKey) {
    return Boolean(confirmedCarryOutEntry(monthKey));
  }

  function otherRemainderMinutes(monthKey) {
    return rawOtherMinutesForMonth(monthKey) % 60;
  }

  // Other service has a sub-hour remainder but no decision on it yet, so this month's
  // figures can't be finalized.
  function needsOtherModeChoice(monthKey) {
    if (!carryoverEnabled()) return false;
    return otherRemainderMinutes(monthKey) > 0 && !otherRemainderMode(monthKey);
  }

  // Splits a month's available minutes into what gets reported as whole hours, what may
  // carry into the next month, and what has to be dropped. The carry-in is spent first, so
  // once it has helped complete an hour that hour is reported here; whatever is left over
  // belongs to this month and carries. If the month never reaches a full hour, the carry-in
  // has nowhere left to go and is lost — it cannot be carried a second time.
  function carryBreakdownFor(monthKey) {
    const merged = otherRemainderMode(monthKey) === 'merge' ? otherRemainderMinutes(monthKey) : 0;
    const ownMin = rawMainMinutesForMonth(monthKey) + merged;
    const leftover = (confirmedCarryInMinutes(monthKey) + ownMin) % 60;
    return {
      ownMin,
      leftover,
      carryOut: Math.min(leftover, ownMin),
      dropped: Math.max(0, leftover - ownMin)
    };
  }

  // Per-category totals for this month's own display/goal progress: they include the
  // confirmed carry-in and any not-yet-carried-out remainder, so a month's own total
  // (and whether it hit its goal) reflects everything actually worked in it. The
  // carry-in is always main-service time — other service never receives a carryover.
  function displayMainMinutesForMonth(monthKey) {
    const raw = rawMainMinutesForMonth(monthKey);
    if (!carryoverEnabled()) return raw;
    const merged = otherRemainderMode(monthKey) === 'merge' ? otherRemainderMinutes(monthKey) : 0;
    return raw + confirmedCarryInMinutes(monthKey) + merged;
  }

  // Once decided, other service is reported in whole hours either way: the remainder has
  // moved into main service (merge) or been dropped (discard).
  function displayOtherMinutesForMonth(monthKey) {
    const raw = rawOtherMinutesForMonth(monthKey);
    if (!carryoverEnabled() || !otherRemainderMode(monthKey)) return raw;
    return raw - otherRemainderMinutes(monthKey);
  }

  function mainCarryoverInfo(monthKey) {
    const carryInMin = confirmedCarryInMinutes(monthKey);
    const rawMin = rawMainMinutesForMonth(monthKey);
    const outEntry = confirmedCarryOutEntry(monthKey);
    return {
      enabled: carryoverEnabled(),
      monthKey,
      carryInMin,
      rawMin,
      totalMin: carryInMin + rawMin,
      carryOutMin: outEntry ? Math.max(0, parseInt(outEntry.minutes, 10) || 0) : 0,
      carryOutConfirmed: Boolean(outEntry),
      pendingOtherChoice: needsOtherModeChoice(monthKey),
      droppedMin: carryBreakdownFor(monthKey).dropped
    };
  }

  function mainHoursPatched(monthKey = getMonthKey()) {
    return displayMainMinutesForMonth(monthKey) / 60;
  }

  function otherHoursPatched(monthKey = getMonthKey()) {
    return displayOtherMinutesForMonth(monthKey) / 60;
  }

  function allHoursPatched(monthKey = getMonthKey()) {
    return mainHoursPatched(monthKey) + otherHoursPatched(monthKey);
  }

  // Annual total sums raw minutes per month rather than carry-adjusted totals, so that
  // carryover moving minutes across a month boundary doesn't count them twice. Minutes that
  // are gone for good — dropped by a 'discard' choice, or a carry-in a settled month could
  // not absorb — don't count at all.
  function annualHoursPatched(monthKey = state.selectedMonth) {
    const keys = fiscalMonthKeys(monthKey);
    const totalMin = keys.reduce((sum, key) => {
      const discarded = otherRemainderMode(key) === 'discard' ? otherRemainderMinutes(key) : 0;
      const settled = key < getMonthKey() && !needsOtherModeChoice(key);
      const unusable = settled ? carryBreakdownFor(key).dropped : 0;
      return sum + rawMainMinutesForMonth(key) + rawOtherMinutesForMonth(key) - discarded - unusable;
    }, 0);
    return totalMin / 60;
  }

  function confirmCarryoverForMonth(monthKey, reason = 'reported') {
    if (!carryoverEnabled()) return 0;

    // Undecided other-service remainder means the carry-out amount isn't determined yet.
    if (needsOtherModeChoice(monthKey)) return 0;

    const remainder = carryBreakdownFor(monthKey).carryOut;
    const nextMonth = addMonths(monthKey, 1);
    const map = loadCarryoverMap();

    if (remainder > 0) {
      map[nextMonth] = {
        fromMonth: monthKey,
        minutes: remainder,
        confirmedAt: new Date().toISOString(),
        reason
      };
    } else {
      const existing = map[nextMonth];
      if (existing && typeof existing === 'object' && existing.fromMonth === monthKey) {
        delete map[nextMonth];
      }
    }

    saveCarryoverMap(map);
    return remainder;
  }

  function earliestSessionMonthKey() {
    const months = state.sessions.filter(s => s.month).map(s => s.month);
    if (!months.length) return null;
    return months.sort()[0];
  }

  function autoConfirmElapsedMonths() {
    if (!carryoverEnabled() || !state) return;
    const current = getMonthKey();
    const start = earliestSessionMonthKey();
    if (!start || start >= current) return;
    let cursor = start;
    let guard = 0;
    while (cursor < current && guard < 2400) {
      confirmCarryoverForMonth(cursor, 'auto-month-end');
      cursor = addMonths(cursor, 1);
      guard++;
    }
  }

  function firstMainSessionOfMonth(monthKey) {
    const mains = state.sessions.filter(s => s.month === monthKey && s.cat === 'main');
    if (!mains.length) return null;
    return mains.slice().sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      return String(a.id).localeCompare(String(b.id));
    })[0];
  }

  function ensureCarryoverSummaryRow() {
    if (document.getElementById('carryover-summary-row')) return;
    const otherRow = document.getElementById('sum-other')?.closest('.summary-row');
    if (!otherRow || !otherRow.parentNode) return;

    const row = document.createElement('div');
    row.className = 'summary-row carryover-row';
    row.id = 'carryover-summary-row';
    row.innerHTML = '<span class="summary-row-label">野外奉仕の繰越</span><span class="summary-row-val" id="sum-main-carryover">-</span>';
    otherRow.insertAdjacentElement('afterend', row);
  }

  function updateCarryoverSummary() {
    ensureCarryoverSummaryRow();
    const el = document.getElementById('sum-main-carryover');
    const row = document.getElementById('carryover-summary-row');
    if (!el || !row) return;

    const info = mainCarryoverInfo(state.selectedMonth);
    if (!info.enabled) {
      row.style.display = 'none';
      return;
    }

    row.style.display = 'flex';

    const parts = [];
    if (info.carryInMin > 0) parts.push('前月から +' + fmtHours(info.carryInMin / 60));
    else parts.push('前月から 0分');

    // A past month's carry-out is settled even when it came out to zero; the month still
    // in progress — or one still waiting on its other-service choice — is undecided.
    if (!info.pendingOtherChoice && (info.carryOutConfirmed || info.monthKey < getMonthKey())) {
      let out = '次月へ ' + fmtHours(info.carryOutMin / 60);
      // 1時間に届かず、前月から来た分を使いきれなかった場合は消える
      if (info.droppedMin > 0) out += '（' + fmtHours(info.droppedMin / 60) + 'は繰越不可）';
      parts.push(out);
    } else {
      parts.push('次月へ 未確定');
    }

    el.textContent = parts.join(' / ');
  }

  function ensureOtherRemainderNotice() {
    let el = document.getElementById('other-remainder-notice');
    if (el) return el;
    const summaryCard = document.getElementById('sum-total')?.closest('.card');
    if (!summaryCard || !summaryCard.parentNode) return null;

    el = document.createElement('div');
    el.className = 'card other-remainder-notice';
    el.id = 'other-remainder-notice';
    summaryCard.insertAdjacentElement('beforebegin', el);
    return el;
  }

  function chooseOtherRemainderMode(monthKey, mode) {
    setOtherRemainderMode(monthKey, mode);
    autoConfirmElapsedMonths();
    updateProgress();
    renderSummary();
    if (mode === 'merge') showToast('その他の奉仕の端数を野外奉仕に合算しました');
    else if (mode === 'discard') showToast('その他の奉仕の端数を切り捨てました');
  }

  function updateOtherRemainderNotice() {
    const el = ensureOtherRemainderNotice();
    if (!el) return;

    const monthKey = state.selectedMonth;
    const remainder = otherRemainderMinutes(monthKey);
    if (!carryoverEnabled() || remainder <= 0) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';

    const mode = otherRemainderMode(monthKey);
    const remainLabel = fmtHours(remainder / 60);

    if (!mode) {
      el.classList.add('is-pending');
      el.innerHTML =
        '<div class="orn-msg">その他の奉仕の端数(分数)は報告できません。野外奉仕に合算するか切り捨てるか選択してください</div>' +
        '<div class="orn-sub">今月のその他の奉仕の端数: ' + remainLabel + '</div>' +
        '<div class="orn-actions">' +
        '<button type="button" class="orn-btn orn-merge">野外奉仕に合算</button>' +
        '<button type="button" class="orn-btn orn-discard">切り捨てる</button>' +
        '</div>';
      el.querySelector('.orn-merge').addEventListener('click', () => chooseOtherRemainderMode(monthKey, 'merge'));
      el.querySelector('.orn-discard').addEventListener('click', () => chooseOtherRemainderMode(monthKey, 'discard'));
      return;
    }

    el.classList.remove('is-pending');
    const label = mode === 'merge' ? '野外奉仕に合算' : '切り捨て';
    el.innerHTML =
      '<div class="orn-decided">' +
      '<span>その他の奉仕の端数 ' + remainLabel + '：' + label + '</span>' +
      '<button type="button" class="orn-change">変更</button>' +
      '</div>';
    el.querySelector('.orn-change').addEventListener('click', () => chooseOtherRemainderMode(monthKey, null));
  }

  function ensureCarryoverSetting() {
    if (document.getElementById('carryover-setting-row')) return;
    const annualGoalSection = document.querySelector('#annual-goal-input')?.closest('.card');
    if (!annualGoalSection || !annualGoalSection.parentNode) return;

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header carryover-setting-header';
    sectionHeader.textContent = '繰り越し';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<div class="setting-row" id="carryover-setting-row">' +
      '<div><div class="setting-label">野外奉仕の分数繰越</div>' +
      '<div class="setting-desc">野外奉仕の1時間未満の端数を、翌月の最初の記録へ繰り越します。</div></div>' +
      '<label class="toggle-switch"><input type="checkbox" id="carryover-enabled-input"><span></span></label>' +
      '</div>';

    const hint = document.createElement('div');
    hint.className = 'carryover-setting-note';
    hint.textContent = '繰り越せるのは翌月までです。その他の奉仕の端数は繰り越せないため、集計画面で毎月「合算」か「切り捨て」を選びます。記録データそのものは変更しません。';

    annualGoalSection.nextElementSibling?.insertAdjacentElement('afterend', hint);
    hint.insertAdjacentElement('beforebegin', card);
    card.insertAdjacentElement('beforebegin', sectionHeader);

    const input = document.getElementById('carryover-enabled-input');
    if (input) {
      input.checked = carryoverEnabled();
      input.addEventListener('change', () => {
        setCarryoverEnabled(input.checked);
        if (input.checked) autoConfirmElapsedMonths();
        updateProgress();
        renderSummary();
        checkGoalAchievement();
        showToast(input.checked ? '分数繰越を有効にしました' : '分数繰越を無効にしました');
      });
    }
  }

  function patchMarkReportDone() {
    const originalMarkReportDone = window.markReportDone;
    window.markReportDone = function patchedMarkReportDone() {
      const monthKey = state.selectedMonth;
      const carryMin = confirmCarryoverForMonth(monthKey, 'mark-report-done');

      if (typeof originalMarkReportDone === 'function') {
        originalMarkReportDone();
      } else {
        setReported(monthKey, true);
      }

      updateProgress();
      renderSummary();

      if (carryoverEnabled() && carryMin > 0) {
        showToast(monthLabel(monthKey) + 'を報告済みにし、' + fmtHours(carryMin / 60) + 'を翌月へ繰り越しました');
      } else if (carryoverEnabled()) {
        showToast(monthLabel(monthKey) + 'を報告済みにしました。繰り越し分はありません');
      }
    };
    markReportDone = window.markReportDone;
  }

  function patchRenderSummary() {
    const originalRenderSummary = window.renderSummary;
    window.renderSummary = function patchedRenderSummary() {
      if (typeof originalRenderSummary === 'function') originalRenderSummary();
      updateCarryoverSummary();
      updateOtherRemainderNotice();
    };
    renderSummary = window.renderSummary;
  }

  function patchRenderLog() {
    window.renderLog = function renderLogWithCarryover() {
      const container = document.getElementById('log-list');
      updateMonthLabels();
      const monthKey = state.selectedMonth;
      const sessions = selectedMonthSessions().slice().sort((a, b) => {
        if (a.dateKey !== b.dateKey) return b.dateKey > a.dateKey ? 1 : -1;
        if (a.start !== b.start) return b.start > a.start ? 1 : -1;
        return String(b.id).localeCompare(String(a.id));
      });
      if (sessions.length === 0) {
        container.innerHTML = '<div class="empty">記録がまだありません</div>';
        cancelEditSession(false);
        return;
      }

      const carryInMin = carryoverEnabled() ? confirmedCarryInMinutes(monthKey) : 0;
      const carryTarget = carryInMin > 0 ? firstMainSessionOfMonth(monthKey) : null;

      container.innerHTML = '';
      sessions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'log-item';
        if (s.id === editingSessionId) div.classList.add('editing');
        const deductNote = Number(s.deductMin) > 0 ? '（-' + Number(s.deductMin) + '分）' : '';
        const manualBadge = s.manual ? '<span class="badge badge-manual">手動</span>' : '';
        const editedBadge = s.edited ? '<span class="badge badge-edited">編集済</span>' : '';
        const isCarryTarget = Boolean(carryTarget) && s.id === carryTarget.id;
        const carryBadge = isCarryTarget ? '<span class="badge badge-carryover">前月繰越+' + fmtHours(carryInMin / 60) + '</span>' : '';
        const displayMin = sessionMinutes(s) + (isCarryTarget ? carryInMin : 0);
        div.innerHTML = '<div class="log-left"><div class="log-date-str">' + s.date + '</div>' +
          '<div class="log-time-str">' + s.start + ' 〜 ' + s.end + deductNote + '</div>' +
          '<div class="log-actions"><button class="log-edit-btn" type="button">編集</button></div></div>' +
          '<div class="log-right"><div><span class="badge badge-' + (s.cat === 'main' ? 'main' : 'other') + '">' + CAT_LABEL[s.cat] + '</span>' + manualBadge + editedBadge + carryBadge + '</div>' +
          '<div class="log-hours">' + fmtHours(displayMin / 60) + '</div></div>';
        div.querySelector('.log-edit-btn').addEventListener('click', () => startEditSession(s.id));
        container.appendChild(div);
      });
    };
    renderLog = window.renderLog;
  }

  function patchShowTab() {
    const originalShowTab = window.showTab;
    window.showTab = function patchedShowTab(tab) {
      if (typeof originalShowTab === 'function') originalShowTab(tab);
      if (tab === 'settings') ensureCarryoverSetting();
      if (tab === 'summary') updateCarryoverSummary();
    };
    showTab = window.showTab;
  }

  function patchReportText() {
    window.reportTextForMonth = function patchedReportTextForMonth(monthKey) {
      const main = mainHoursPatched(monthKey);
      const other = otherHoursPatched(monthKey);
      const lessons = getLessonCount(monthKey);
      return monthShortLabel(monthKey) + '奉仕報告\n\n野外奉仕 ' + fmtHours(main) + '\nその他の奉仕 ' + fmtHours(other) + '\nレッスン ' + lessons + '件';
    };
    reportTextForMonth = window.reportTextForMonth;
  }

  async function clearAppCachesAndServiceWorkers() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(key => key.startsWith('volunteer-tracker-'))
            .map(key => caches.delete(key))
        );
      }
    } catch (e) {
      console.warn('Cache clear failed', e);
    }

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('./');
        if (reg) await reg.unregister();
      }
    } catch (e) {
      console.warn('Service Worker unregister failed', e);
    }
  }

  async function robustReloadLatestApp() {
    const ok = confirm('最新版を読み込みますか？\n\n更新前に現在の記録を端末内へ自動退避します。');
    if (!ok) return;
    const saved = storeSafetyBackup('vt_pre_update_backup', 'before-update');
    if (!saved) {
      alert('更新前バックアップの作成に失敗しました。\n端末の空き容量を確認してから、もう一度試してください。');
      return;
    }
    showToast('最新版を確認しています');

    await clearAppCachesAndServiceWorkers();

    try {
      await fetch('./index.html?cache-bust=' + encodeURIComponent(appBuild()) + '-' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
    } catch (e) {
      console.warn('Fresh fetch failed', e);
    }

    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    location.replace(base + '?v=' + encodeURIComponent(appBuild()) + '-' + Date.now());
  }

  function injectCarryoverStyles() {
    if (document.getElementById('carryover-patch-style')) return;
    const style = document.createElement('style');
    style.id = 'carryover-patch-style';
    style.textContent = `
      .carryover-row { background: #fbfffd; }
      .toggle-switch { position: relative; display: inline-block; width: 52px; height: 30px; flex-shrink: 0; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-switch span { position: absolute; cursor: pointer; inset: 0; background: #c7c7cc; border-radius: 999px; transition: .18s; }
      .toggle-switch span:before { position: absolute; content: ''; height: 26px; width: 26px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: .18s; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
      .toggle-switch input:checked + span { background: #1D9E75; }
      .toggle-switch input:checked + span:before { transform: translateX(22px); }
      .carryover-setting-note { font-size: 13px; color: #8e8e93; padding: 8px 4px; }
      .badge-carryover { background: #d1f0e7; color: #0f6e56; margin-left: 4px; }
      .other-remainder-notice { padding: 16px; }
      .other-remainder-notice.is-pending { border-left: 3px solid #ff9500; }
      .orn-msg { font-size: 14px; line-height: 1.55; font-weight: 500; }
      .orn-sub { font-size: 13px; color: #8e8e93; margin-top: 6px; }
      .orn-actions { display: flex; gap: 8px; margin-top: 12px; }
      .orn-btn { flex: 1; border: none; border-radius: 10px; padding: 11px 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
      .orn-merge { background: #1D9E75; color: #fff; }
      .orn-discard { background: #f2f2f7; color: #1c1c1e; }
      .orn-decided { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; }
      .orn-change { border: none; background: #f2f2f7; color: #1D9E75; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  }

  function patchCoreCalculations() {
    window.rawMainHours = function rawMainHours(monthKey = getMonthKey()) {
      return rawMainMinutesForMonth(monthKey) / 60;
    };
    window.mainCarryoverInfo = mainCarryoverInfo;
    window.confirmMainCarryoverForMonth = confirmCarryoverForMonth;
    window.mainHours = mainHoursPatched;
    window.otherHours = otherHoursPatched;
    window.allHours = allHoursPatched;
    window.annualHours = annualHoursPatched;

    mainHours = window.mainHours;
    otherHours = window.otherHours;
    allHours = window.allHours;
    annualHours = window.annualHours;
  }

  function patchUpdateAppInfo() {
    const originalUpdateAppInfo = window.updateAppInfo;
    window.updateAppInfo = function patchedUpdateAppInfo() {
      if (typeof originalUpdateAppInfo === 'function') originalUpdateAppInfo();
      const label = document.getElementById('app-version-label');
      if (label) label.textContent = appVersionLabel();
    };
    updateAppInfo = window.updateAppInfo;
  }

  function initCarryoverPatch() {
    injectCarryoverStyles();
    patchCoreCalculations();
    patchUpdateAppInfo();
    patchReportText();
    patchMarkReportDone();
    patchRenderSummary();
    patchRenderLog();
    patchShowTab();
    window.reloadLatestApp = robustReloadLatestApp;
    reloadLatestApp = window.reloadLatestApp;

    autoConfirmElapsedMonths();

    updateProgress();
    updateAppInfo();
    if (document.getElementById('view-summary')?.style.display !== 'none') renderSummary();
    if (document.getElementById('view-log')?.style.display !== 'none') renderLog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarryoverPatch);
  } else {
    initCarryoverPatch();
  }
})();
