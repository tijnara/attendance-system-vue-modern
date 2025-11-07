// ======================= api.js (updated) =======================

import { supabase } from './supabase'

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
    if (params.userId) query = query.eq('user_id', params.userId)
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
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .insert([log])
      .single()
    if (error) {
      console.error('Error posting log:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
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
  const qs = new URLSearchParams(params || {}).toString();
  const candidates = [
    qs ? `/items/department?${qs}` : '/items/department',
    qs ? `/api/department?${qs}` : '/api/department',
    qs ? `/api/departments?${qs}` : '/api/departments',
  ];
  let lastErr;
  for (const url of candidates) {
    console.log('[API] GET', url);
    try {
      const res = await http(url);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      if (Array.isArray(res?.content)) return res.content;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.records)) return res.records;
      if (res && typeof res === 'object') return [res];
      return [];
    } catch (e) { lastErr = e; console.warn('[API] getDepartments failed on', url, '->', e?.message || e); }
  }
  return [];
}

export async function getUsers(params = {}) {
    const qs = new URLSearchParams(params || {}).toString();
    const candidates = [ qs ? `/items/user?${qs}` : '/items/user' ];
    for (const url of candidates) {
        console.log('[API] GET', url);
        try {
            const res = await http(url);
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res?.content)) return res.content;
            if (Array.isArray(res?.items)) return res.items;
            if (Array.isArray(res?.records)) return res.records;
            if (res && typeof res === 'object') {
                if (res.data && !Array.isArray(res.data)) return [res.data];
                return [res];
            }
            return [];
        } catch (e) { console.warn('[API] getUsers failed on', url, '->', e?.message || e); }
    }
    console.warn('[API] getUsers: all attempts failed, returning []');
    return [];
}

export async function getUserById(id, opts = {}) {
    if (!id && id !== 0) throw new Error('User ID required');
    const sid = String(id);
    const noMock = opts.noMock === true;
    console.log('[API] GET user by id ->', id, noMock ? '(noMock)' : '');

    const pickMatch = (data) => {
        if (!data) return null;
        const idOf = (u) => String(u?.userId ?? u?.user_id ?? u?.id);
        if (Array.isArray(data)) return data.find(u => idOf(u) === sid) || null;
        if (data.data && Array.isArray(data.data)) return data.data.find(u => idOf(u) === sid) || null;
        if (data.data && !Array.isArray(data.data) && typeof data.data === 'object') return (idOf(data.data) === sid) ? data.data : null;
        if (data.content && Array.isArray(data.content)) return data.content.find(u => idOf(u) === sid) || null;
        if (data.userId || data.user_id || data.id) return (idOf(data) === sid) ? data : null;
        return null;
    };

    try {
        const res = await http(`/items/user?userId=${encodeURIComponent(id)}`);
        const match = pickMatch(res);
        if (match) return match;
    } catch (e) { console.warn('[API] /items/user?userId= not available or no match:', e.message); }

    try {
        const res = await http(`/items/user?id=${encodeURIComponent(id)}`);
        const match = pickMatch(res);
        if (match) return match;
    } catch (e) { console.warn('[API] /items/user?id= not available or no match:', e.message); }

    try {
        const res = await http('/items/user');
        const match = pickMatch(res);
        if (match) return match;
    } catch (e) { console.warn('[API] /items/user full list fetch failed:', e.message); }

    try {
        const res = await http(`/items/user/${encodeURIComponent(id)}`);
        const match = pickMatch(res);
        if (match) return match;
    } catch (e) { console.warn('[API] /items/user/:id failed:', e.message); }

    const directusAttempts = [
        `/items/user/${encodeURIComponent(id)}`,
        `/items/user?filter[user_id][_eq]=${encodeURIComponent(id)}&limit=1`,
        `/items/user?filter[id][_eq]=${encodeURIComponent(id)}&limit=1`,
        `/items/user?user_id=${encodeURIComponent(id)}`,
        `/items/user?id=${encodeURIComponent(id)}`,
    ];
    for (const path of directusAttempts) {
        try {
            const res = await http(path);
            const match = pickMatch(res);
            if (match) return match;
        } catch (_) {}
    }

    if (!noMock) {
        try {
            const res = await getUsers();
            const match = pickMatch(res);
            if (match) return match;
        } catch (_) {}
    }
    return null;
}

export async function resolveDepartmentForUser(userId) {
    try {
        const user = await getUserById(userId);
        if (!user) return null;

        const directId = user.departmentId ?? user.department_id ?? user?.department?.departmentId ?? user?.department?.id;
        const directName = user.departmentName ?? user.department_name ?? user?.department?.departmentName ?? user?.department?.name;
        if (directId != null) return { departmentId: Number(directId), departmentName: directName ?? null };
        if (!directName) return null;

        const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const target = norm(directName);

        let list = [];
        try {
            const res = await getDepartments();
            if (Array.isArray(res)) list = res;
            else if (Array.isArray(res?.data)) list = res.data;
            else if (Array.isArray(res?.data?.data)) list = res.data.data;
            else if (Array.isArray(res?.content)) list = res.content;
        } catch (_) { list = []; }
        if (!list.length) return null;

        const match = list.find(d => norm(d.departmentName || d.name) === target);
        if (!match) return null;
        const id = match.departmentId ?? match.id;
        return id != null ? { departmentId: Number(id), departmentName: match.departmentName || match.name || null } : null;
    } catch (_) { return null; }
}

export async function findUserByRfidOrBarcode(value) {
    if (!value) return null;

    const normalizeUser = (u) => {
        if (!u) return null;
        return {
            id: u.id ?? u.user_id ?? u.userId ?? null,
            userId: u.user_id ?? u.userId ?? u.id ?? null,
            email: u.user_email ?? u.email ?? null,
            password: u.user_password ?? u.password ?? null,
            fullName: [u.user_fname, u.user_mname, u.user_lname].filter(Boolean).join(' ') || u.fullName || null,
            position: u.user_position ?? u.position ?? null,
            departmentId: u.user_department ?? u.departmentId ?? null,
            departmentName: u.departmentName ?? null,
            branchId: u.branchId ?? null,
            branchName: u.branchName ?? null,
            operationId: u.operationId ?? null,
            isActive: u.isActive ?? true,
            mobileNumber: u.user_contact ?? u.mobileNumber ?? null,
            image: u.user_image ?? u.image ?? null,
            externalId: u.external_id ?? u.externalId ?? null,
            rfId: u.rf_id ?? u.rfId ?? u.rfid ?? null,
            dateOfHire: u.user_dateOfHire ?? u.dateOfHire ?? null,
            tags: u.user_tags ?? u.tags ?? null,
            province: u.user_province ?? u.province ?? null,
            city: u.user_city ?? u.city ?? null,
            barangay: u.user_brgy ?? u.barangay ?? null,
            sss: u.user_sss ?? u.sss ?? null,
            philhealth: u.user_philhealth ?? u.philhealth ?? null,
            tin: u.user_tin ?? u.tin ?? null,
            birthday: u.user_bday ?? u.birthday ?? null,
            updatedAt: u.updateAt ?? u.update_at ?? u.updatedAt ?? null,
            isDeleted: u.is_deleted ?? u.isDeleted ?? null,
            roleId: u.role_id ?? u.roleId ?? null,
            token: u.token ?? null,
        };
    };

    const rf = encodeURIComponent(value);
    async function tryFetch(path) { try { return await http(path); } catch (_) { return null; } }

    const attempts = [
        `/items/user?filter[rf_id][_eq]=${rf}&limit=1`,
        `/items/user?rf_id=${rf}`,
        `/items/user?rfid=${rf}`,
    ];

    for (const path of attempts) {
        const res = await tryFetch(path);
        if (!res) continue;
        let userRaw = null;
        if (Array.isArray(res)) userRaw = res[0];
        else if (res?.data && Array.isArray(res.data)) userRaw = res.data[0];
        else if (res?.content && Array.isArray(res.content)) userRaw = res.content[0];
        else userRaw = res;
        const user = normalizeUser(userRaw);
        if (user && (user.userId || user.fullName || user.rfId)) {
            console.log('[API] normalized user object:', user);
            return user;
        }
    }
    console.warn('[API] rfid search failed: user not found');
    return null;
}

// ----------------- Department Schedules -----------------
function normalizeSchedule(raw) {
    if (!raw) return null;
    return {
        scheduleId: raw.scheduleId ?? raw.schedule_id ?? raw.id ?? null,
        departmentId: raw.departmentId ?? raw.department_id ?? raw.deptId ?? raw.dept_id ?? null,
        workingDays: raw.workingDays ?? raw.working_days ?? raw.days ?? null,
        workStart: raw.workStart ?? raw.work_start ?? raw.start ?? null,
        workEnd: raw.workEnd ?? raw.work_end ?? raw.end ?? null,
        lunchStart: raw.lunchStart ?? raw.lunch_start ?? null,
        lunchEnd: raw.lunchEnd ?? raw.lunch_end ?? null,
        breakStart: raw.breakStart ?? raw.break_start ?? null,
        breakEnd: raw.breakEnd ?? raw.break_end ?? null,
        workdaysNote: raw.workdaysNote ?? raw.workdays_note ?? raw.note ?? '',
        createdAt: raw.createdAt ?? raw.created_at ?? null,
        updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    };
}

function buildSchedulePayload(data, {isUpdate = false} = {}) {
    const createdAt = data.createdAt ?? data.created_at ?? nowIsoNoMillis();
    const updatedAt = data.updatedAt ?? data.updated_at ?? nowIsoNoMillis();
    const base = {
        scheduleId: data.scheduleId ?? undefined,
        departmentId: data.departmentId != null ? Number(data.departmentId) : undefined,
        workingDays: data.workingDays != null ? Number(data.workingDays) : undefined,
        workStart: data.workStart != null ? `${String(data.workStart).slice(0,5)}:00` : undefined,
        workEnd: data.workEnd != null ? `${String(data.workEnd).slice(0,5)}:00` : undefined,
        lunchStart: data.lunchStart != null ? `${String(data.lunchStart).slice(0,5)}:00` : undefined,
        lunchEnd: data.lunchEnd != null ? `${String(data.lunchEnd).slice(0,5)}:00` : undefined,
        breakStart: data.breakStart != null ? `${String(data.breakStart).slice(0,5)}:00` : undefined,
        breakEnd: data.breakEnd != null ? `${String(data.breakEnd).slice(0,5)}:00` : undefined,
        workdaysNote: (data.workdaysNote ?? null),
        createdAt, updatedAt,
    };
    const snake = {
        schedule_id: base.scheduleId, department_id: base.departmentId, working_days: base.workingDays,
        work_start: base.workStart, work_end: base.workEnd, lunch_start: base.lunchStart, lunch_end: base.lunchEnd,
        break_start: base.breakStart, break_end: base.breakEnd, workdays_note: base.workdaysNote,
        created_at: base.createdAt, updated_at: base.updatedAt,
    };
    return { ...base, ...snake };
}

export async function getScheduleByDepartment(departmentId) {
    if (!departmentId && departmentId !== 0) return null;
    const did = encodeURIComponent(departmentId);
    const candidates = [
        `/items/department_schedule?filter[department_id][_eq]=${did}&limit=1`,
        `/api/schedules?departmentId=${did}`,
        `/api/department-schedules?departmentId=${did}`,
        `/api/schedule?departmentId=${did}`,
        `/api/departments/${did}/schedule`,
    ];
    let lastErr;
    for (const url of candidates) {
        try {
            const res = await http(url);
            let rec = null;
            if (res?.data && Array.isArray(res.data)) rec = res.data.find(r => String(r.departmentId ?? r.department_id ?? r.deptId ?? r.dept_id) === String(departmentId)) || res.data[0] || null;
            else if (Array.isArray(res)) rec = res.find(r => String(r.departmentId ?? r.department_id ?? r.deptId ?? r.dept_id) === String(departmentId)) || res[0] || null;
            else if (res?.content && Array.isArray(res.content)) rec = res.content.find(r => String(r.departmentId ?? r.department_id ?? r.deptId ?? r.dept_id) === String(departmentId)) || res.content[0] || null;
            else if (res && typeof res === 'object') rec = res;
            if (rec) return normalizeSchedule(rec);
        } catch (e) { lastErr = e; console.warn('[API] getScheduleByDepartment failed on', url, '->', e?.message || e); }
    }
    if (lastErr) throw lastErr;
    return null;
}

export async function createSchedule(data) {
    const body = JSON.stringify(buildSchedulePayload(data, {isUpdate:false}));
    const candidates = ['/items/department_schedule', '/api/schedules', '/api/department-schedules', '/api/schedule'];
    let lastErr;
    for (const url of candidates) {
        try {
            const res = await http(url, {method:'POST', body});
            const payload = res?.data ?? res;
            return payload ? normalizeSchedule(payload) : null;
        } catch (e) { lastErr = e; console.warn('[API] createSchedule failed on', url, '->', e?.message || e); }
    }
    throw lastErr || new Error('Failed to create schedule');
}

export async function updateSchedule(id, data) {
    if (!id && id !== 0) throw new Error('schedule id required');
    const sid = encodeURIComponent(id);
    const body = JSON.stringify(buildSchedulePayload(data, {isUpdate:true}));
    const candidates = [
        `/items/department_schedule/${sid}`, `/api/schedules/${sid}`, `/api/department-schedules/${sid}`, `/api/schedule/${sid}`,
    ];
    let lastErr;
    for (const url of candidates) {
        for (const method of ['PUT','PATCH']) {
            try {
                const res = await http(url, {method, body});
                const payload = res?.data ?? res;
                return payload ? normalizeSchedule(payload) : null;
            } catch (e) { lastErr = e; console.warn(`[API] updateSchedule ${method} failed on`, url, '->', e?.message || e); }
        }
    }
    throw lastErr || new Error('Failed to update schedule');
}

export async function deleteSchedule(id) {
    if (!id && id !== 0) throw new Error('schedule id required');
    const sid = encodeURIComponent(id);
    const candidates = [
        `/items/department_schedule/${sid}`, `/api/schedules/${sid}`, `/api/department-schedules/${sid}`, `/api/schedule/${sid}`,
    ];
    let lastErr;
    for (const url of candidates) {
        try { const res = await http(url, {method:'DELETE'}); return res ?? true; }
        catch (e) { lastErr = e; console.warn('[API] deleteSchedule failed on', url, '->', e?.message || e); }
    }
    throw lastErr || new Error('Failed to delete schedule');
}

export async function getDepartmentSchedules() {
    const candidates = ['/items/department_schedule', '/api/departments/schedules', '/api/schedules', '/api/department-schedules', '/api/schedule'];
    let lastErr;
    for (const url of candidates) {
        try {
            const res = await http(url);
            const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.content || []));
            return list.map(normalizeSchedule);
        } catch (e) { lastErr = e; console.warn('[API] getDepartmentSchedules failed on', url, '->', e?.message || e); }
    }
    throw lastErr || new Error('Failed to load department schedules');
}

/**
 * Get existing attendance log for a user and date (Supabase version)
 */
export async function getExistingAttendanceLog(userId, logDate) {
  if (!userId) return null;
  const dateStr = String(logDate).slice(0, 10);
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', dateStr)
      .limit(1)
      .single();
    if (error) {
      // If not found, Supabase returns error, but that's not a real error
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
  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .update(patch)
      .eq('id', id)
      .single();
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
