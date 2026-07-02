// volunteer-tracker carryover + robust update patch
// Loaded after app.js. This file intentionally does not change vt_sessions.
// Carryover rule:
// - Do NOT carry over the current month's remainder automatically.
// - When a month is marked as reported, only that month's main-service remainder is confirmed
//   and carried into the next month.
// - Other service is never carried over.

(function () {
  const CARRYOVER_ENABLED_KEY = 'vt_main_carryover_enabled';
  const CARRYOVER_MAP_KEY = 'vt_main_carryovers';

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

  function baseMainTotalMinutes(monthKey) {
    return confirmedCarryInMinutes(monthKey) + rawMainMinutesForMonth(monthKey);
  }

  function displayMainMinutesForMonth(monthKey) {
    const total = baseMainTotalMinutes(monthKey);
    if (!carryoverEnabled()) return rawMainMinutesForMonth(monthKey);

    // If this month has already been finalized and its remainder was sent forward,
    // show only whole-hour main-service time for this reported month.
    if (hasConfirmedCarryOut(monthKey)) return total - (total % 60);

    // Before reporting, show the actual accumulated total including confirmed carry-in.
    return total;
  }

  function mainCarryoverInfo(monthKey) {
    const carryInMin = confirmedCarryInMinutes(monthKey);
    const rawMin = rawMainMinutesForMonth(monthKey);
    const totalMin = carryInMin + rawMin;
    const outEntry = confirmedCarryOutEntry(monthKey);
    return {
      enabled: carryoverEnabled(),
      monthKey,
      carryInMin,
      rawMin,
      totalMin,
      displayMin: displayMainMinutesForMonth(monthKey),
      carryOutMin: outEntry ? Math.max(0, parseInt(outEntry.minutes, 10) || 0) : 0,
      carryOutConfirmed: Boolean(outEntry)
    };
  }

  function mainHoursPatched(monthKey = getMonthKey()) {
    return displayMainMinutesForMonth(monthKey) / 60;
  }

  function otherHoursPatched(monthKey = getMonthKey()) {
    return rawOtherMinutesForMonth(monthKey) / 60;
  }

  function allHoursPatched(monthKey = getMonthKey()) {
    return mainHoursPatched(monthKey) + otherHoursPatched(monthKey);
  }

  function annualHoursPatched(monthKey = state.selectedMonth) {
    const keys = fiscalMonthKeys(monthKey);
    const totalMin = keys.reduce((sum, key) => {
      return sum + displayMainMinutesForMonth(key) + rawOtherMinutesForMonth(key);
    }, 0);
    return totalMin / 60;
  }

  function confirmCarryoverForMonth(monthKey, reason = 'reported') {
    if (!carryoverEnabled()) return 0;

    const total = baseMainTotalMinutes(monthKey);
    const remainder = total % 60;
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

  function migrateReportedCarryovers() {
    if (!carryoverEnabled() || !state || !state.reported) return;

    const map = loadCarryoverMap();
    let changed = false;

    Object.keys(state.reported)
      .filter(monthKey => state.reported[monthKey] === true)
      .sort()
      .forEach(monthKey => {
        const nextMonth = addMonths(monthKey, 1);
        const existing = map[nextMonth];
        const alreadyFromThisMonth = existing && typeof existing === 'object' && existing.fromMonth === monthKey;
        if (alreadyFromThisMonth) return;

        const total = confirmedCarryInMinutes(monthKey) + rawMainMinutesForMonth(monthKey);
        const remainder = total % 60;

        if (remainder > 0) {
          map[nextMonth] = {
            fromMonth: monthKey,
            minutes: remainder,
            confirmedAt: new Date().toISOString(),
            reason: 'migration-from-reported-month'
          };
          changed = true;
        }
      });

    if (changed) saveCarryoverMap(map);
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

    if (info.carryOutConfirmed) parts.push('次月へ ' + fmtHours(info.carryOutMin / 60));
    else parts.push('次月へ 未確定');

    el.textContent = parts.join(' / ');
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
      '<div class="setting-desc">報告済みにした月の野外奉仕端数だけを、翌月へ繰り越します。</div></div>' +
      '<label class="toggle-switch"><input type="checkbox" id="carryover-enabled-input"><span></span></label>' +
      '</div>';

    const hint = document.createElement('div');
    hint.className = 'carryover-setting-note';
    hint.textContent = 'その他の奉仕は繰り越し対象外です。記録データそのものは変更しません。';

    annualGoalSection.nextElementSibling?.insertAdjacentElement('afterend', hint);
    hint.insertAdjacentElement('beforebegin', card);
    card.insertAdjacentElement('beforebegin', sectionHeader);

    const input = document.getElementById('carryover-enabled-input');
    if (input) {
      input.checked = carryoverEnabled();
      input.addEventListener('change', () => {
        setCarryoverEnabled(input.checked);
        if (input.checked) migrateReportedCarryovers();
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
    };
    renderSummary = window.renderSummary;
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
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (e) {
      console.warn('Cache clear failed', e);
    }

    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      }
    } catch (e) {
      console.warn('Service Worker unregister failed', e);
    }
  }

  async function robustReloadLatestApp() {
    const ok = confirm('最新版を読み込みますか？\n\n更新前に現在の記録を端末内へ自動退避します。');
    if (!ok) return;
    storeSafetyBackup('vt_pre_update_backup', 'before-update');
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
    patchShowTab();
    window.reloadLatestApp = robustReloadLatestApp;
    reloadLatestApp = window.reloadLatestApp;

    migrateReportedCarryovers();

    updateProgress();
    updateAppInfo();
    if (document.getElementById('view-summary')?.style.display !== 'none') renderSummary();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarryoverPatch);
  } else {
    initCarryoverPatch();
  }
})();
