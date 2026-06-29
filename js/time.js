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
