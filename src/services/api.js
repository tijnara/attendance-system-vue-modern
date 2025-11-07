// ======================= api.js (updated) =======================

import { supabase } from '../utils/supabase'

// Dynamic API base resolution with robust fallbacks (mirrors login script behavior)
const FALLBACKS = [import.meta.env.VITE_API_BASE_URL || 'http://100.119.3.44:8055/'];

// Simple localStorage helpers for offline logs
const LS_KEY = 'attendance.offlineLogs';

function readOfflineLogs() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
}

function writeOfflineLogs(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr || [])); } catch (_) {}
}

function addOfflineLog(entry) {
    const list = readOfflineLogs();
    list.unshift(entry);
    if (list.length > 1000) list.length = 1000;
    writeOfflineLogs(list);
    return entry;
}

// ----------------- Status / Action helpers -----------------
export function normalizeStatus(input) {
    const s = String(input || '').trim();
    if (!s) return 'OnTime';
    const upper = s.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toUpperCase();
    const directMap = {
        'ON_TIME':'OnTime','LATE':'Late','ABSENT':'Absent','HALF_DAY':'HalfDay','INCOMPLETE':'Incomplete','LEAVE':'Leave','HOLIDAY':'Holiday'
    };
    if (upper in directMap) return directMap[upper];
    const synonyms = new Set(['TIME_IN','TIME_OUT','LUNCH_START','LUNCH_END','BREAK_START','BREAK_END','IN','OUT','LUNCH','BREAK']);
    if (synonyms.has(upper)) return 'OnTime';
    if (/^HALF(_|\s)*DAY$/.test(upper)) return 'HalfDay';
    return 'OnTime';
}

function statusToCode(name) {
    const map = { OnTime:1, Late:2, Absent:3, HalfDay:4, Incomplete:5, Leave:6, Holiday:7 };
    return map[name] ?? 1;
}

export function normalizeAction(input) {
    const s = String(input || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const map = {
        'TIME_IN':'TIME_IN','IN':'TIME_IN','CHECK_IN':'TIME_IN','CLOCK_IN':'TIME_IN',
        'TIME_OUT':'TIME_OUT','OUT':'TIME_OUT','CHECK_OUT':'TIME_OUT','CLOCK_OUT':'TIME_OUT',
        'LUNCH_START':'LUNCH_START','START_LUNCH':'LUNCH_START','LUNCH_IN':'LUNCH_START','LUNCH':'LUNCH_START',
        'LUNCH_END':'LUNCH_END','END_LUNCH':'LUNCH_END','LUNCH_OUT':'LUNCH_END',
        'BREAK_START':'BREAK_START','START_BREAK':'BREAK_START','BREAK':'BREAK_START',
        'BREAK_END':'BREAK_END','END_BREAK':'BREAK_END',
    };
    return map[s] || 'TIME_IN';
}

function actionToField(actionEnum) {
    switch (normalizeAction(actionEnum)) {
        case 'TIME_OUT': return 'timeOut';
        case 'LUNCH_START': return 'lunchStart';
        case 'LUNCH_END': return 'lunchEnd';
        case 'BREAK_START': return 'breakStart';
        case 'BREAK_END': return 'breakEnd';
        case 'TIME_IN':
        default: return 'timeIn';
    }
}

// ----------------- Base HTTP + API base -----------------
function resolveApiBase() {
    const strip = (s) => (s || '').replace(/\/$/, '');
    try {
        const href = typeof window !== 'undefined' ? window.location?.href : '';
        const u = new URL(href);
        const isKnown = (u.port === '3011' || u.port === '8055' || u.hostname === '100.119.3.44');
        if (isKnown) return strip(window.location.origin);
    } catch (_) {}
    const hintedRaw = strip(typeof window !== 'undefined' ? (window.__API_BASE__ || '') : '');
    if (hintedRaw) {
        try {
            const h = new URL(hintedRaw);
            const hintedKnown = (h.port === '3011' || h.port === '8055' || h.hostname === '100.119.3.44');
            if (hintedKnown) return hintedRaw;
        } catch (_) {
            try {
                const origin = strip(typeof window !== 'undefined' ? (window.location?.origin || '') : '');
                if (hintedRaw && hintedRaw !== origin) return hintedRaw;
            } catch (_) {}
        }
    }
    return FALLBACKS[0];
}

const API_BASE = resolveApiBase();

async function http(path, options = {}) {
    const urlPath = path.startsWith('/') ? path : `/${path}`;
    const attempts = [];
    const used = new Set();
    const pushAttempt = (base) => {
        const b = (base || '').replace(/\/$/, '');
        if (b && !used.has(b)) { used.add(b); attempts.push(`${b}${urlPath}`); }
    };

    // First try relative path (lets Vite proxy handle CORS in dev)
    attempts.push(urlPath);

    // Then try the configured API_BASE and FALLBACKS for all request types.
    pushAttempt(API_BASE);
    for (const f of FALLBACKS) {
        pushAttempt(f);
    }

    // Also try the browser's origin for safe methods only (avoid hitting dev server for writes).
    try {
        const method = String(options.method || 'GET').toUpperCase();
        if (method === 'GET' || method === 'HEAD') {
            const origin = typeof window !== 'undefined' ? window.location?.origin?.replace(/\/$/, '') : '';
            pushAttempt(origin);
        }
    } catch (_) {}

    let lastErr;
    for (const url of attempts) {
        try {
            const res = await fetch(url, { headers: {'Content-Type':'application/json'}, ...options });
            if (!res) throw new Error('No response');
            const ct = res.headers.get('content-type') || '';
            if (res.ok) {
                return ct.includes('application/json') ? res.json() : null;
            } else {
                // On any HTTP response (even non-2xx), do not try other bases to avoid CORS fallbacks.
                const txt = await res.text().catch(() => '');
                const err = new Error(`${res.status} ${res.statusText}: ${txt}`);
                err.status = res.status;
                throw err;
            }
        } catch (e) {
            lastErr = e;
            // If the error came from an HTTP response above (has status), stop retrying.
            if (e && typeof e === 'object' && 'status' in e) break;
            // Otherwise (network/CORS error), continue to next attempt.
        }
    }
    throw lastErr || new Error('Network error');
}

// ----------------- Date helpers (Asia/Manila) -----------------
const MANILA_TZ = 'Asia/Manila';

function manilaIsoNoMillis(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-PH', {
        timeZone: MANILA_TZ, year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false,
    }).formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function getCurrentDateTime() { return manilaIsoNoMillis(); }
function nowIsoNoMillis() { return manilaIsoNoMillis(); }
function toIsoNoMillis(input) {
    try { if (!input) return manilaIsoNoMillis(); const d = new Date(input); if (isNaN(d)) return manilaIsoNoMillis(); return manilaIsoNoMillis(d); }
    catch (_) { return manilaIsoNoMillis(); }
}

// ----------------- Directus attendance mapping / inference -----------------
let ATTENDANCE_FIELD_MAP = null;
async function inferAttendanceFieldMap() {
    if (ATTENDANCE_FIELD_MAP) return ATTENDANCE_FIELD_MAP;
    const defaultMap = {
        userKey:'user_id', dateKey:'log_date', statusKey:'status', departmentKey:'department_id',
        timeKeys: { TIME_IN:'time_in', TIME_OUT:'time_out', LUNCH_START:'lunch_start', LUNCH_END:'lunch_end', BREAK_START:'break_start', BREAK_END:'break_end' }
    };
    try {
        console.log('[API] inferring attendance field map via /items/attendance_log?limit=1');
        const raw = await http('/items/attendance_log?limit=1', { method:'GET' });
        const row =
            (Array.isArray(raw?.data) && raw.data[0]) ||
            (Array.isArray(raw) && raw[0]) ||
            raw?.items?.[0] || raw?.records?.[0] || null;
        if (!row || typeof row !== 'object') { ATTENDANCE_FIELD_MAP = defaultMap; return ATTENDANCE_FIELD_MAP; }
        const has = (k) => Object.prototype.hasOwnProperty.call(row, k);
        const pick = (cands, fallback) => (cands.find(k => has(k)) || fallback);
        ATTENDANCE_FIELD_MAP = {
            userKey:       pick(['user_id','user','userId'], 'user_id'),
            dateKey:       pick(['log_date','date','logDate'], 'log_date'),
            statusKey:     pick(['status','log_status'], 'status'),
            departmentKey: pick(['department_id','department','departmentId'], 'department_id'),
            timeKeys: {
                TIME_IN:     pick(['time_in','timeIn','checkIn','in','timein'], 'time_in'),
                TIME_OUT:    pick(['time_out','timeOut','checkOut','out','timeout'], 'time_out'),
                LUNCH_START: pick(['lunch_start','lunchStart','lunchIn','lunchin'], 'lunch_start'),
                LUNCH_END:   pick(['lunch_end','lunchEnd','lunchOut','lunchout'], 'lunch_end'),
                BREAK_START: pick(['break_start','breakStart','breakIn','breakin'], 'break_start'),
                BREAK_END:   pick(['break_end','breakEnd','breakOut','breakout'], 'break_end'),
            }
        };
    } catch (_) { ATTENDANCE_FIELD_MAP = defaultMap; }
    return ATTENDANCE_FIELD_MAP;
}

function mapAttendanceToDirectus(data, {actionEnum, whenIso, logDate} = {}) {
    const mapped = {};
    const safeSet = (k, v) => { if (k && v != null) mapped[k] = v; };
    const chooseTime = async () => {
        const m = await inferAttendanceFieldMap();
        // Force required keys
        if (data.userId != null) safeSet('user_id', Number(data.userId));
        if (data.logDate != null || logDate != null) safeSet('log_date', String(data.logDate || logDate).slice(0,10));
        if (data.departmentId != null) safeSet('department_id', Number(data.departmentId));
        if (data.status != null) safeSet(m.statusKey || 'status', data.status);
        // Time key
        const ak = (m.timeKeys && m.timeKeys[actionEnum]) || undefined;
        const value = whenIso || data.timeIn || data.timeOut || data.lunchStart || data.lunchEnd || data.breakStart || data.breakEnd;
        if (ak && value) safeSet(ak, value);
    };
    return { async build(){ await chooseTime(); return mapped; } };
}

// ----------------- Attendance helpers -----------------
function isDuplicateErrorText(txt) {
    const s = String(txt || '').toLowerCase();
    return s.includes('duplicate entry') || s.includes('uq_user_date') || s.includes('sqlstate: 23000') || s.includes('constraint');
}

/**
 * Get logs – rewritten for Supabase
 */
export async function getLogs(params = {}) {
  try {
    let query = supabase.from('attendance_log').select('*')
    if (params.user_id) query = query.eq('user_id', params.user_id)
    if (params.from && params.to) {
      query = query.gte('log_date', params.from).lte('log_date', params.to)
    } else if (params.from) {
      query = query.eq('log_date', params.from)
    }
    if (params.limit) query = query.limit(Number(params.limit))
    if (params.offset) query = query.range(Number(params.offset), Number(params.offset) + Number(params.limit || 10) - 1)
    const { data, error } = await query
    if (error) {
      console.error('Error fetching logs:', error.message)
      return []
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return []
  }
}

/**
 * Post log – rewritten for Supabase
 */
export async function postLog(log) {
  // Only keep fields that exist in your attendance_log table
  const allowed = ['user_id', 'log_date', 'department_id', 'status', 'time_in', 'time_out', 'lunch_start', 'lunch_end', 'break_start', 'break_end', 'created_at', 'updated_at'];
  const filtered = Object.fromEntries(Object.entries(log).filter(([k]) => allowed.includes(k)));
  if (!filtered.user_id || !filtered.log_date) {
    console.error('[postLog] Missing required fields:', { user_id: filtered.user_id, log_date: filtered.log_date, original: log });
    throw new Error('user_id and log_date are required for attendance_log');
  }
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .insert([filtered])
      .single();
    if (error) {
      console.error('Error posting log:', error.message, error.details, filtered);
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err, filtered);
    return null
  }
}

/**
 * Get departments – rewritten for Supabase
 */
export async function getDepartments(params = {}) {
  // If params is empty or not used, use Supabase directly
  if (!params || Object.keys(params).length === 0) {
    try {
      const { data, error } = await supabase
        .from('department')
        .select('*')
      if (error) {
        console.error('Error fetching departments:', error.message)
        return []
      }
      return data
    } catch (err) {
      console.error('Request failed:', err)
      return []
    }
  }
  // Otherwise, fallback to legacy HTTP logic for advanced queries
  return [];
}

// --- Department Schedule ---
export async function getDepartmentSchedules() {
    try {
        const { data, error } = await supabase
            .from('department_schedule')
            .select('*');
        if (error) {
            console.error('[API] getDepartmentSchedules failed (Supabase):', error.message);
            throw error;
        }
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('[API] getDepartmentSchedules failed (Supabase):', err?.message || err);
        throw err;
    }
}

/**
 * Get existing attendance log for a user and date (Supabase version)
 */
export async function getExistingAttendanceLog(userId, logDate) {
  if (!userId || isNaN(Number(userId))) {
    console.error('[getExistingAttendanceLog] Invalid userId:', userId);
    return null;
  }
  if (!logDate || typeof logDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    console.error('[getExistingAttendanceLog] Invalid logDate:', logDate);
    return null;
  }
  const dateStr = logDate.slice(0, 10);
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .select('*')
      .eq('user_id', Number(userId))
      .eq('log_date', dateStr)
      .limit(1)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching existing attendance log:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Request failed:', err);
    return null;
  }
}

/**
 * Update an attendance log by id (Supabase version)
 */
export async function updateLog(id, patch) {
  if (!id) return null;
  // Only keep fields that exist in your attendance_log table
  const allowed = ['user_id', 'log_date', 'department_id', 'status', 'time_in', 'time_out', 'lunch_start', 'lunch_end', 'break_start', 'break_end', 'created_at', 'updated_at'];
  const filtered = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .update(filtered)
      .eq('id', id);
    if (error) {
      console.error('Error updating attendance log:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Request failed:', err);
    return null;
  }
}

// --- User ---
export async function getUsers(params = {}) {
    try {
        let query = supabase.from('user').select('*');
        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (["id","rf_id","fullName","email","position","department_id","image"].includes(key)) {
                        query = query.eq(key, value);
                    }
                }
            });
        }
        const { data, error } = await query;
        if (error) {
            console.error('[API] getUsers failed (Supabase):', error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('[API] getUsers failed (Supabase):', err?.message || err);
        return [];
    }
}

export async function getUserById(id) {
    if (!id && id !== 0) throw new Error('User ID required');
    const sid = String(id);
    try {
        const { data, error } = await supabase
            .from('user')
            .select('*')
            .eq('id', sid)
            .limit(1)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error('[API] getUserById failed (Supabase):', error.message);
            return null;
        }
        return data;
    } catch (err) {
        console.error('[API] getUserById failed (Supabase):', err?.message || err);
        return null;
    }
}

export async function findUserByRfidOrBarcode(value) {
    if (!value) return null;
    const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('rf_id', value)
        .limit(1)
        .single();
    if (error) {
        console.error('Error fetching user by RFID or Barcode:', error.message);
        return null;
    }
    return data;
}

export async function resolveDepartmentForUser(userId) {
    if (!userId) return null;
    const user = await supabase
        .from('user')
        .select('department_id')
        .eq('id', userId)
        .single();
    if (user.error || !user.data) return null;
    const departmentId = user.data.department_id;
    if (!departmentId) return null;
    const department = await supabase
        .from('department')
        .select('*')
        .eq('id', departmentId)
        .single();
    if (department.error || !department.data) return null;
    return department.data;
}

/**
 * Gets all attendance logs for a specific user for the current day.
 */
export async function getLogsForUserToday(userId) {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Get tomorrow's date at midnight
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data, error } = await supabase
      .from('attendance_log')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', today.toISOString())
      .lt('timestamp', tomorrow.toISOString())
      .order('timestamp', { ascending: true });
    if (error) {
      console.error('Error fetching logs for user today:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Request failed:', err);
    return [];
  }
}

/**
 * Creates a new attendance log entry.
 */
export async function createLog(logData) {
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .insert([
        {
          user_id: logData.user_id,
          action: logData.action,
          timestamp: logData.timestamp || new Date().toISOString(),
          department_id: logData.department_id,
          // Add any other columns you need
        },
      ])
      .select()
      .single();
    if (error) {
      console.error('Error creating log:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Request failed:', err);
    return null;
  }
}
