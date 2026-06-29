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
  selectedMonth: getMonthKey(),
  lessons: loadMap('vt_lessons'),
  reported: loadMap('vt_reported_months'),
  goalStatus: loadMap('vt_goal_status')
};
var editingSessionId = null;
var editCat = 'main';
var deductRows = [];

function sessionsForMonth(monthKey) {
  return state.sessions.filter(s => s.month === monthKey);
}
function thisMonthSessions() { return sessionsForMonth(getMonthKey()); }
function selectedMonthSessions() { return sessionsForMonth(state.selectedMonth); }
function sumHours(arr) { return arr.reduce((a, s) => a + sessionMinutes(s), 0) / 60; }
function mainHours(monthKey = getMonthKey()) { return sumHours(sessionsForMonth(monthKey).filter(s => s.cat === 'main')); }
function otherHours(monthKey = getMonthKey()) { return sumHours(sessionsForMonth(monthKey).filter(s => s.cat === 'other')); }
function allHours(monthKey = getMonthKey()) { return mainHours(monthKey) + otherHours(monthKey); }

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
      const totalMin = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
      const dates = sessions.map(s => s.dateKey).sort();
      const period = dates.length ? dates[0].replace(/-/g, '/') + '〜' + dates[dates.length - 1].replace(/-/g, '/') : '記録なし';
      const msg = 'このバックアップを復元しますか？\n\n記録数：' + sessions.length + '件\n対象期間：' + period + '\n合計時間：' + fmtHours(totalMin / 60) + '\n\n現在の記録は上書きされます。';
      if (!confirm(msg)) return;
      storeSafetyBackup('vt_pre_restore_backup', 'before-restore');
      state.sessions = sessions;
      state.goal = Number.isFinite(goal) && goal > 0 ? goal : 30;
      state.lessons = data.lessons && typeof data.lessons === 'object' && !Array.isArray(data.lessons) ? data.lessons : {};
      state.reported = data.reported && typeof data.reported === 'object' && !Array.isArray(data.reported) ? data.reported : {};
      state.goalStatus = data.goalStatus && typeof data.goalStatus === 'object' && !Array.isArray(data.goalStatus) ? data.goalStatus : {};
      persistSessions();
      localStorage.setItem('vt_goal', state.goal);
      saveMap('vt_lessons', state.lessons);
      saveMap('vt_reported_months', state.reported);
      saveMap('vt_goal_status', state.goalStatus);
      editingSessionId = null;
      updateProgress();
      renderSummary();
      renderLog();
      document.getElementById('goal-input').value = state.goal;
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
  storeSafetyBackup('vt_pre_update_backup', 'before-update');
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(reg => reg.update())
      .catch(err => console.warn('Service Worker registration failed', err));
  });
}

function initApp() {
  initPressFeedback();
  updateHeader();
  restoreActiveTimer();
  updateProgress();
  updateAppInfo();
  updateMonthLabels();
  checkGoalAchievement();
  registerSW();
  setTimeout(showReportNoticeIfNeeded, 250);
}

initApp();

Object.assign(window, {
  selectCat, showManual, hideManual, toggleTimer, applyLiveStartTime, applyLiveEndTime,
  submitManual, addDeductRow, removeDeduct, confirmSession,
  selectEditCat, startEditSession, cancelEditSession, saveEditSession, deleteEditSession,
  exportBackup, openImportBackup, importBackupFile, reloadLatestApp,
  changeSelectedMonth, saveLessonCount, markReportDone, openPendingReport, snoozeReportNotice,
  saveGoal, showTab, hideGoalBanner,
  deductRows
});
