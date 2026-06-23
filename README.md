
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="奉仕記録">
<title>奉仕時間記録</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; background: #f2f2f7; color: #1c1c1e; min-height: 100vh; }
  .app { max-width: 430px; margin: 0 auto; padding: 0 0 80px 0; }

  /* Tab bar */
  .tab-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 0.5px solid #c6c6c8; display: flex; z-index: 100; padding-bottom: env(safe-area-inset-bottom); }
  .tab { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0 4px; font-size: 10px; color: #8e8e93; cursor: pointer; gap: 3px; }
  .tab.active { color: #1D9E75; }
  .tab svg { width: 24px; height: 24px; }

  /* Header */
  .header { background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 16px 20px 12px; border-bottom: 0.5px solid #c6c6c8; position: sticky; top: 0; z-index: 50; }
  .header-title { font-size: 17px; font-weight: 600; }
  .header-sub { font-size: 13px; color: #8e8e93; margin-top: 2px; }

  /* Cards */
  .section { padding: 20px 16px 0; }
  .card { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
  .card-inner { padding: 16px; }
  .card-row { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid #f2f2f7; }
  .card-row:last-child { border-bottom: none; }
  .row-label { font-size: 16px; }
  .row-value { font-size: 16px; color: #8e8e93; }

  /* Progress */
  .progress-wrap { padding: 16px; }
  .progress-nums { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .progress-main { font-size: 32px; font-weight: 600; color: #1D9E75; }
  .progress-goal { font-size: 14px; color: #8e8e93; }
  .progress-bar { height: 6px; background: #e5e5ea; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: #1D9E75; border-radius: 3px; transition: width 0.4s ease; }
  .progress-remain { font-size: 13px; color: #8e8e93; margin-top: 6px; }

  /* Category buttons */
  .cat-row { display: flex; gap: 8px; padding: 0 16px 16px; }
  .cat-btn { flex: 1; padding: 10px 8px; border-radius: 10px; border: none; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; background: #f2f2f7; color: #8e8e93; }
  .cat-btn.active { background: #1D9E75; color: #fff; }

  /* Timer */
  .timer-area { padding: 8px 16px 16px; text-align: center; }
  .timer-label { font-size: 13px; color: #8e8e93; margin-bottom: 4px; min-height: 18px; }
  .timer-display { font-size: 48px; font-weight: 200; letter-spacing: 2px; color: #1c1c1e; margin-bottom: 16px; font-variant-numeric: tabular-nums; }
  .timer-display.running { color: #1D9E75; }

  /* Buttons */
  .btn-primary { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 17px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .btn-green { background: #1D9E75; color: #fff; }
  .btn-green:active { background: #158a63; }
  .btn-red { background: #ff3b30; color: #fff; }
  .btn-red:active { background: #d93025; }
  .btn-gray { background: #f2f2f7; color: #1c1c1e; }
  .btn-gray:active { background: #e5e5ea; }
  .btn-link { background: none; border: none; font-size: 15px; color: #1D9E75; cursor: pointer; padding: 10px 0; display: block; width: 100%; text-align: center; }
  .btn-link.muted { color: #8e8e93; }

  /* Divider */
  .divider { display: flex; align-items: center; gap: 10px; padding: 4px 0 8px; }
  .divider-line { flex: 1; height: 0.5px; background: #e5e5ea; }
  .divider-text { font-size: 12px; color: #c7c7cc; }

  /* Manual input */
  .manual-area { padding: 0 16px 16px; }
  .input-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .input-row label { font-size: 15px; color: #8e8e93; width: 38px; flex-shrink: 0; }
  .input-row input { flex: 1; font-size: 16px; padding: 10px 12px; border: 0.5px solid #c6c6c8; border-radius: 10px; background: #fff; color: #1c1c1e; -webkit-appearance: none; }
  .input-row input:focus { outline: none; border-color: #1D9E75; }

  /* Deduct */
  .deduct-area { padding: 0 16px; }
  .deduct-title { font-size: 13px; color: #8e8e93; margin-bottom: 10px; }
  .deduct-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .deduct-row input { flex: 1; font-size: 15px; padding: 8px 10px; border: 0.5px solid #c6c6c8; border-radius: 10px; background: #fff; color: #1c1c1e; -webkit-appearance: none; }
  .deduct-row input:focus { outline: none; border-color: #1D9E75; }
  .deduct-sep { font-size: 13px; color: #c7c7cc; }
  .deduct-del { width: 28px; height: 28px; border-radius: 50%; background: #ff3b30; border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .btn-add-deduct { background: none; border: none; font-size: 15px; color: #1D9E75; cursor: pointer; padding: 6px 0 12px; display: block; }

  /* Log */
  .log-item { padding: 12px 16px; border-bottom: 0.5px solid #f2f2f7; display: flex; align-items: center; justify-content: space-between; }
  .log-item:last-child { border-bottom: none; }
  .log-date-str { font-size: 15px; font-weight: 500; }
  .log-time-str { font-size: 13px; color: #8e8e93; margin-top: 2px; }
  .log-right { text-align: right; }
  .log-hours { font-size: 20px; font-weight: 600; color: #1c1c1e; }
  .log-hours span { font-size: 13px; font-weight: 400; color: #8e8e93; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; }
  .badge-main { background: #d1f0e7; color: #0f6e56; }
  .badge-other { background: #fef0cc; color: #854f0b; }
  .badge-manual { background: #f2f2f7; color: #8e8e93; margin-left: 4px; }

  /* Summary */
  .summary-big { padding: 16px; }
  .summary-label { font-size: 13px; color: #8e8e93; margin-bottom: 4px; }
  .summary-num { font-size: 40px; font-weight: 600; color: #1D9E75; }
  .summary-unit { font-size: 18px; font-weight: 400; color: #8e8e93; }
  .summary-row { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 0.5px solid #f2f2f7; }
  .summary-row:last-child { border-bottom: none; }
  .summary-row-label { font-size: 15px; }
  .summary-row-val { font-size: 15px; font-weight: 500; }
  .summary-remain { font-size: 13px; color: #8e8e93; padding: 12px 16px; }

  /* Settings */
  .setting-row { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid #f2f2f7; }
  .setting-row:last-child { border-bottom: none; }
  .setting-label { font-size: 16px; }
  .setting-input { width: 80px; font-size: 16px; padding: 6px 10px; border: 0.5px solid #c6c6c8; border-radius: 8px; text-align: right; color: #1c1c1e; background: #fff; }
  .setting-unit { font-size: 15px; color: #8e8e93; margin-left: 6px; }
  .setting-save { background: #1D9E75; color: #fff; border: none; border-radius: 8px; padding: 7px 16px; font-size: 15px; font-weight: 500; cursor: pointer; }

  /* Toast */
  .toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.75); color: #fff; padding: 10px 20px; border-radius: 20px; font-size: 14px; opacity: 0; transition: opacity 0.25s; pointer-events: none; white-space: nowrap; z-index: 200; }
  .toast.show { opacity: 1; }

  .empty { padding: 32px 16px; text-align: center; font-size: 15px; color: #c7c7cc; }
  .section-header { font-size: 13px; color: #8e8e93; padding: 16px 16px 6px; text-transform: uppercase; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="app">

  <!-- 記録タブ -->
  <div id="view-record">
    <div class="header">
      <div class="header-title">奉仕時間記録</div>
      <div class="header-sub" id="header-month"></div>
    </div>
    <div class="section">
      <!-- Progress card -->
      <div class="card">
        <div class="progress-wrap">
          <div class="progress-nums">
            <div class="progress-main" id="total-display">0.0 h</div>
            <div class="progress-goal" id="goal-label">目標 30 h</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
          <div class="progress-remain" id="progress-remain">残り 30.0 h</div>
        </div>
      </div>

      <!-- Record card -->
      <div class="card">
        <div style="padding:16px 16px 8px">
          <div style="font-size:13px;color:#8e8e93;margin-bottom:10px">カテゴリ</div>
          <div class="cat-row" style="padding:0;margin-bottom:0">
            <button class="cat-btn active" id="btn-main" onclick="selectCat('main')">野外奉仕</button>
            <button class="cat-btn" id="btn-other" onclick="selectCat('other')">その他の奉仕</button>
          </div>
        </div>

        <div id="timer-section">
          <div class="timer-area">
            <div class="timer-label" id="timer-label">開始ボタンを押してください</div>
            <div class="timer-display" id="timer-display">00:00:00</div>
            <button class="btn-primary btn-green" id="start-btn" onclick="toggleTimer()">開始</button>
          </div>
          <div style="padding:0 16px">
            <div class="divider"><div class="divider-line"></div><div class="divider-text">または</div><div class="divider-line"></div></div>
            <button class="btn-link" onclick="showManual()">時刻を手動で入力する</button>
          </div>
        </div>

        <div id="manual-section" style="display:none">
          <div class="manual-area">
            <div class="input-row"><label>日付</label><input type="date" id="manual-date"></div>
            <div class="input-row"><label>開始</label><input type="time" id="manual-start"></div>
            <div class="input-row"><label>終了</label><input type="time" id="manual-end"></div>
            <button class="btn-primary btn-green" onclick="submitManual()">次へ</button>
            <button class="btn-link muted" onclick="hideManual()">タイマーに戻る</button>
          </div>
        </div>
      </div>

      <!-- Deduct card -->
      <div class="card" id="deduct-card" style="display:none">
        <div style="padding:16px 16px 4px">
          <div class="deduct-title">中断時間を差し引く（任意）</div>
          <div id="deduct-list"></div>
          <button class="btn-add-deduct" onclick="addDeductRow()">＋ 中断時間を追加</button>
        </div>
        <div style="padding:0 16px 16px">
          <button class="btn-primary btn-gray" onclick="confirmSession()">記録を確定する</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 履歴タブ -->
  <div id="view-log" style="display:none">
    <div class="header"><div class="header-title">今月の履歴</div></div>
    <div class="card" style="margin:16px">
      <div id="log-list"><div class="empty">記録がまだありません</div></div>
    </div>
  </div>

  <!-- 集計タブ -->
  <div id="view-summary" style="display:none">
    <div class="header"><div class="header-title">今月の集計</div></div>
    <div style="margin:16px">
      <div class="card">
        <div class="summary-big">
          <div class="summary-label">合計時間</div>
          <div class="summary-num" id="sum-total">0.0<span class="summary-unit"> h</span></div>
        </div>
        <div class="summary-row"><span class="summary-row-label">野外奉仕</span><span class="summary-row-val" id="sum-main">0.0 h</span></div>
        <div class="summary-row"><span class="summary-row-label">その他の奉仕</span><span class="summary-row-val" id="sum-other">0.0 h</span></div>
        <div class="summary-remain" id="sum-remain">目標まで残り 30.0 h</div>
      </div>
    </div>
  </div>

  <!-- 設定タブ -->
  <div id="view-settings" style="display:none">
    <div class="header"><div class="header-title">設定</div></div>
    <div style="margin:16px">
      <div class="section-header">月次目標</div>
      <div class="card">
        <div class="setting-row">
          <span class="setting-label">目標時間</span>
          <div style="display:flex;align-items:center">
            <input type="number" class="setting-input" id="goal-input" value="30" min="1" max="999">
            <span class="setting-unit">時間</span>
            <button class="setting-save" onclick="saveGoal()" style="margin-left:10px">保存</button>
          </div>
        </div>
      </div>
      <div style="font-size:13px;color:#8e8e93;padding:8px 4px">毎月この値がデフォルト目標として適用されます。</div>
    </div>
  </div>

</div>

<!-- Tab bar -->
<nav class="tab-bar">
  <div class="tab active" onclick="showTab('record')" id="tab-record">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    記録
  </div>
  <div class="tab" onclick="showTab('log')" id="tab-log">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    履歴
  </div>
  <div class="tab" onclick="showTab('summary')" id="tab-summary">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    集計
  </div>
  <div class="tab" onclick="showTab('settings')" id="tab-settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    設定
  </div>
</nav>

<div class="toast" id="toast"></div>

<script>
const CAT_LABEL = { main: '野外奉仕', other: 'その他の奉仕' };

let state = {
  running: false,
  startTime: null,
  endTime: null,
  manualDate: null,
  category: 'main',
  isManual: false,
  timerInterval: null,
  sessions: JSON.parse(localStorage.getItem('vt_sessions') || '[]'),
  goal: parseFloat(localStorage.getItem('vt_goal') || '30')
};

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function getMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function dateToMonthKey(s) { return s.slice(0,7); }
function thisMonthSessions() { return state.sessions.filter(s => s.month === getMonthKey()); }
function sumHours(arr) { return arr.reduce((a,s) => a + s.hours, 0); }
function mainHours() { return sumHours(thisMonthSessions().filter(s=>s.cat==='main')); }
function otherHours() { return sumHours(thisMonthSessions().filter(s=>s.cat==='other')); }
function allHours() { return mainHours() + otherHours(); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function updateHeader() {
  const d = new Date();
  document.getElementById('header-month').textContent = d.getFullYear() + '年' + (d.getMonth()+1) + '月';
}

function updateProgress() {
  const total = allHours();
  const remaining = Math.max(0, state.goal - total);
  const pct = Math.min(100, Math.round(total / state.goal * 100));
  document.getElementById('total-display').textContent = total.toFixed(1) + ' h';
  document.getElementById('goal-label').textContent = '目標 ' + state.goal + ' h';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-remain').textContent = '残り ' + remaining.toFixed(1) + ' h';
}

function selectCat(cat) {
  state.category = cat;
  document.getElementById('btn-main').classList.toggle('active', cat==='main');
  document.getElementById('btn-other').classList.toggle('active', cat==='other');
}

function showManual() {
  document.getElementById('manual-date').value = todayStr();
  document.getElementById('timer-section').style.display = 'none';
  document.getElementById('manual-section').style.display = 'block';
  document.getElementById('deduct-card').style.display = 'none';
}
function hideManual() {
  document.getElementById('manual-section').style.display = 'none';
  document.getElementById('timer-section').style.display = 'block';
}

function toggleTimer() {
  if (!state.running) {
    state.running = true;
    state.startTime = new Date();
    const btn = document.getElementById('start-btn');
    btn.textContent = '終了';
    btn.className = 'btn-primary btn-red';
    document.getElementById('timer-label').textContent = '計測中...';
    document.getElementById('timer-display').classList.add('running');
    state.timerInterval = setInterval(updateTimerDisplay, 1000);
  } else {
    state.running = false;
    state.endTime = new Date();
    state.manualDate = todayStr();
    state.isManual = false;
    clearInterval(state.timerInterval);
    document.getElementById('timer-display').classList.remove('running');
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('timer-label').textContent = fmtTime(state.startTime) + ' 〜 ' + fmtTime(state.endTime);
    deductRows = [];
    document.getElementById('deduct-card').style.display = 'block';
    renderDeductList();
  }
}

function fmtTime(d) {
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function updateTimerDisplay() {
  const diff = Math.floor((new Date() - state.startTime) / 1000);
  const h = Math.floor(diff/3600);
  const m = Math.floor((diff%3600)/60);
  const s = diff % 60;
  document.getElementById('timer-display').textContent =
    String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function submitManual() {
  const dv = document.getElementById('manual-date').value;
  const sv = document.getElementById('manual-start').value;
  const ev = document.getElementById('manual-end').value;
  if (!dv || !sv || !ev) { showToast('日付・開始・終了を入力してください'); return; }
  const [sh,sm] = sv.split(':').map(Number);
  const [eh,em] = ev.split(':').map(Number);
  if (eh*60+em <= sh*60+sm) { showToast('終了時刻は開始より後にしてください'); return; }
  const [yr,mo,dy] = dv.split('-').map(Number);
  state.startTime = new Date(yr, mo-1, dy, sh, sm);
  state.endTime   = new Date(yr, mo-1, dy, eh, em);
  state.manualDate = dv;
  state.isManual = true;
  deductRows = [];
  document.getElementById('manual-section').style.display = 'none';
  document.getElementById('timer-section').style.display = 'block';
  document.getElementById('timer-label').textContent = dv.replace(/-/g,'/') + '  ' + sv + ' 〜 ' + ev;
  document.getElementById('timer-display').textContent = '00:00:00';
  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('deduct-card').style.display = 'block';
  renderDeductList();
}

let deductRows = [];
function renderDeductList() {
  const container = document.getElementById('deduct-list');
  container.innerHTML = '';
  deductRows.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'deduct-row';
    div.innerHTML =
      '<input type="time" value="'+row.from+'" onchange="deductRows['+i+'].from=this.value">' +
      '<span class="deduct-sep">〜</span>' +
      '<input type="time" value="'+row.to+'" onchange="deductRows['+i+'].to=this.value">' +
      '<button class="deduct-del" onclick="removeDeduct('+i+')">×</button>';
    container.appendChild(div);
  });
}
function addDeductRow() { deductRows.push({from:'',to:''}); renderDeductList(); }
function removeDeduct(i) { deductRows.splice(i,1); renderDeductList(); }

function parseHM(str) {
  if (!str) return null;
  const p = str.split(':');
  if (p.length !== 2) return null;
  const h = parseInt(p[0]), m = parseInt(p[1]);
  if (isNaN(h)||isNaN(m)) return null;
  return h*60+m;
}

function confirmSession() {
  const startMin = state.startTime.getHours()*60 + state.startTime.getMinutes();
  const endMin   = state.endTime.getHours()*60   + state.endTime.getMinutes();
  let netMin = endMin - startMin;
  let deductMin = 0;
  for (const row of deductRows) {
    const f = parseHM(row.from), t = parseHM(row.to);
    if (f !== null && t !== null && t > f) deductMin += (t - f);
  }
  netMin = Math.max(0, netMin - deductMin);
  const dateStr = state.manualDate;
  const session = {
    month: dateToMonthKey(dateStr),
    date: dateStr.replace(/-/g,'/'),
    dateKey: dateStr,
    cat: state.category,
    start: fmtTime(state.startTime),
    end: fmtTime(state.endTime),
    deductMin: deductMin,
    hours: Math.round(netMin / 60 * 10) / 10,
    manual: state.isManual
  };
  state.sessions.push(session);
  localStorage.setItem('vt_sessions', JSON.stringify(state.sessions));
  deductRows = [];
  document.getElementById('deduct-card').style.display = 'none';
  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('start-btn').textContent = '開始';
  document.getElementById('start-btn').className = 'btn-primary btn-green';
  document.getElementById('timer-display').textContent = '00:00:00';
  document.getElementById('timer-label').textContent = '開始ボタンを押してください';
  document.getElementById('manual-start').value = '';
  document.getElementById('manual-end').value = '';
  updateProgress();
  showToast(session.hours.toFixed(1) + ' h を記録しました');
}

function renderLog() {
  const container = document.getElementById('log-list');
  const sessions = thisMonthSessions().slice().sort((a,b) => b.dateKey > a.dateKey ? 1 : -1);
  if (sessions.length === 0) {
    container.innerHTML = '<div class="empty">記録がまだありません</div>';
    return;
  }
  container.innerHTML = '';
  sessions.forEach(s => {
    const div = document.createElement('div');
    div.className = 'log-item';
    const deductNote = s.deductMin > 0 ? '（-'+s.deductMin+'分）' : '';
    const manualBadge = s.manual ? '<span class="badge badge-manual">手動</span>' : '';
    div.innerHTML =
      '<div><div class="log-date-str">'+s.date+'</div>' +
      '<div class="log-time-str">'+s.start+' 〜 '+s.end+deductNote+'</div></div>' +
      '<div class="log-right">' +
      '<div><span class="badge badge-'+(s.cat==='main'?'main':'other')+'">'+CAT_LABEL[s.cat]+'</span>'+manualBadge+'</div>' +
      '<div class="log-hours">'+s.hours.toFixed(1)+'<span> h</span></div>' +
      '</div>';
    container.appendChild(div);
  });
}

function renderSummary() {
  const main = mainHours();
  const other = otherHours();
  const total = main + other;
  const remaining = Math.max(0, state.goal - total);
  document.getElementById('sum-total').innerHTML = total.toFixed(1) + '<span class="summary-unit"> h</span>';
  document.getElementById('sum-main').textContent = main.toFixed(1) + ' h';
  document.getElementById('sum-other').textContent = other.toFixed(1) + ' h';
  document.getElementById('sum-remain').textContent = '目標まで残り ' + remaining.toFixed(1) + ' h';
}

function saveGoal() {
  const val = parseFloat(document.getElementById('goal-input').value);
  if (!isNaN(val) && val > 0) {
    state.goal = val;
    localStorage.setItem('vt_goal', val);
    updateProgress();
    renderSummary();
    showToast('目標を保存しました');
  }
}

function showTab(tab) {
  ['record','log','summary','settings'].forEach(t => {
    document.getElementById('view-'+t).style.display = t===tab ? 'block' : 'none';
    document.getElementById('tab-'+t).classList.toggle('active', t===tab);
  });
  if (tab==='log') renderLog();
  if (tab==='summary') renderSummary();
  if (tab==='settings') document.getElementById('goal-input').value = state.goal;
}

updateHeader();
updateProgress();
</script>
</body>
</html>
