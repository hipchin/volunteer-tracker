const CAT_LABEL = { main: '野外奉仕', other: 'その他の奉仕' };
const APP_VERSION = '2026.06.29.split-1';
const BACKUP_SCHEMA_VERSION = 1;

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
  return sessions;
}

function persistSessions() {
  localStorage.setItem('vt_sessions', JSON.stringify(state.sessions));
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
    lessons: { ...state.lessons },
    reported: { ...state.reported },
    goalStatus: { ...state.goalStatus },
    sessions: state.sessions.map(s => ({ ...s }))
  };
}

function storeSafetyBackup(key, reason) {
  try {
    localStorage.setItem(key, JSON.stringify(buildBackupObject(reason)));
    return true;
  } catch (e) {
    return false;
  }
}
