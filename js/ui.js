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
