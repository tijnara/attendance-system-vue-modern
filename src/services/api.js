// ======================= api.js (updated) =======================

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

    // Always prioritize the configured API_BASE and FALLBACKS for all request types.
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

export async function getLogs(params = {}) {
    const origParams = params || {};

    // Build Directus-compliant query
    const q = new URLSearchParams();
    const uid = origParams.userId ?? origParams.user_id ?? origParams.user;
    const from = origParams.from ?? origParams.dateFrom ?? origParams.start ?? origParams.logDate;
    const to = origParams.to ?? origParams.dateTo ?? origParams.end ?? origParams.logDate;

    if (uid != null) q.append('filter[user_id][_eq]', String(uid));

    const fromStr = from ? String(from).slice(0, 10) : null;
    const toStr = to ? String(to).slice(0, 10) : null;

    if (fromStr && toStr) {
        if (fromStr === toStr) {
            q.append('filter[log_date][_eq]', fromStr);
        } else {
            q.append('filter[log_date][_between]', JSON.stringify([fromStr, toStr]));
        }
    } else if (fromStr) {
        q.append('filter[log_date][_eq]', fromStr);
    }

    // Carry through some passthrough options
    const passthroughKeys = ['limit', 'offset', 'sort', 'fields', 'page'];
    for (const k of passthroughKeys) {
        if (origParams[k] != null) q.append(k, String(origParams[k]));
    }

    const qs = new URLSearchParams(origParams || {}).toString();
    const url = q.toString() ? `/items/attendance_log?${q.toString()}` : '/items/attendance_log';
    console.log('[API] GET', url);

    const toStatusName = (v) => {
        if (v == null) return v;
        const n = Number(v);
        if (!Number.isNaN(n)) { const map = {1:'OnTime',2:'Late',3:'Absent',4:'HalfDay',5:'Incomplete',6:'Leave',7:'Holiday'}; return map[n] || String(v); }
        return String(v);
    };
    const normalizeRow = (r) => {
        if (!r || typeof r !== 'object') return r;
        const timeIn = r.timeIn ?? r.time_in ?? r.checkIn ?? r.in ?? r.timein;
        const timeOut = r.timeOut ?? r.time_out ?? r.checkOut ?? r.out ?? r.timeout;
        const lunchStart = r.lunchStart ?? r.lunch_start ?? r.lunchIn ?? r.lunchin;
        const lunchEnd = r.lunchEnd ?? r.lunch_end ?? r.lunchOut ?? r.lunchout;
        const breakStart = r.breakStart ?? r.break_start ?? r.breakIn ?? r.breakin;
        const breakEnd = r.breakEnd ?? r.break_end ?? r.breakOut ?? r.breakout;
        const userId = r.userId ?? r.user_id ?? r.user?.userId ?? r.user?.id ?? r.user;
        const logDateRaw = r.logDate ?? r.log_date ?? r.date;
        const anyTime = timeIn || timeOut || lunchStart || lunchEnd || breakStart || breakEnd || '';
        const logDate = (logDateRaw ? String(logDateRaw) : String(anyTime)).slice(0,10);
        const status = toStatusName(r.status ?? r.log_status);
        const departmentId = r.departmentId ?? r.department_id ?? r.department?.departmentId ?? r.department?.id;
        return {
            ...r,
            logId: r.logId ?? r.log_id ?? r.id,
            userId: userId != null ? Number(userId) : undefined,
            logDate,
            timeIn, timeOut, lunchStart, lunchEnd, breakStart, breakEnd,
            status,
            departmentId: departmentId != null ? Number(departmentId) : undefined,
        };
    };

    const pickList = (json) => {
        if (!json) return [];
        if (Array.isArray(json)) return json;
        if (Array.isArray(json.data)) return json.data;
        if (Array.isArray(json.content)) return json.content;
        if (Array.isArray(json.items)) return json.items;
        if (Array.isArray(json.records)) return json.records;
        return [];
    };

    try {
        const json = await http(url);
        return pickList(json).map(normalizeRow);
    } catch (e) {
        console.warn('[API] getLogs failed first attempt:', e?.message || e);
        try {
            const legacyUrl = qs ? `/items/attendance_log?${qs}` : '/items/attendance_log';
            const json = await http(legacyUrl);
            return pickList(json).map(normalizeRow);
        } catch (e2) {
            console.warn('[API] getLogs legacy failed:', e2?.message || e2);
            throw e2;
        }
    }
}

async function findExistingLog(userId, logDate) {
    const dateStr = String(logDate).slice(0, 10);
    try {
        const res = await getLogs({ userId, from: dateStr, to: dateStr });
        const arr = Array.isArray(res) ? res : (res?.content || []);
        const match = arr.find(r => {
            const uid = String(r.userId ?? r.user?.userId ?? r.user?.id ?? r.user_id);
            const d = (r.logDate || (r.timeIn || r.timeOut || r.lunchStart || r.lunchEnd || r.breakStart || r.breakEnd || '')).slice(0, 10);
            return uid === String(userId) && d === dateStr;
        });
        return match || null;
    } catch (_) { return null; }
}

async function updateLogById(id, patch) {
    async function fetchExisting() {
        const relatives = [ `/items/attendance_log/${encodeURIComponent(id)}` ];
        for (const rel of relatives) { try { return await http(rel, {method:'GET'}); } catch (_) {} }
        return null;
    }

    const existing = await fetchExisting();
    const now = getCurrentDateTime();
    const body = {
        logId: existing?.logId ?? existing?.id ?? id,
        userId: Number(patch?.userId ?? existing?.userId ?? existing?.user?.userId ?? existing?.user_id),
        logDate: String(patch?.logDate ?? existing?.logDate ?? existing?.log_date ?? '').slice(0, 10),
        departmentId: patch?.departmentId ?? existing?.departmentId ?? existing?.department?.departmentId ?? existing?.department_id,
        status: patch?.status ?? existing?.status,
        timeIn: patch?.timeIn ?? existing?.timeIn,
        timeOut: patch?.timeOut ?? existing?.timeOut,
        lunchStart: patch?.lunchStart ?? existing?.lunchStart,
        lunchEnd: patch?.lunchEnd ?? existing?.lunchEnd,
        breakStart: patch?.breakStart ?? existing?.breakStart,
        breakEnd: patch?.breakEnd ?? existing?.breakEnd,
        createdAt: patch?.createdAt ?? existing?.createdAt ?? now,
        updatedAt: now,
        action: patch?.action,
        type: patch?.type,
    };
    if (body.userId != null) body.user = { userId: body.userId };
    if (body.departmentId != null) body.department = { departmentId: Number(body.departmentId) };

    try {
        const dirData = await mapAttendanceToDirectus(body, { actionEnum: normalizeAction(body?.action), logDate: body?.logDate }).build();
        // Ensure required keys
        if (body.userId != null) dirData.user_id = Number(body.userId);
        if (body.logDate) dirData.log_date = String(body.logDate).slice(0,10);
        try { const fmap = await inferAttendanceFieldMap(); const tk = fmap?.timeKeys?.[normalizeAction(body?.action)]; const when = body.timeIn || body.timeOut || body.lunchStart || body.lunchEnd || body.breakStart || body.breakEnd || null; if (tk && when && !dirData[tk]) dirData[tk] = when; } catch {}
        const patchRes = await http(`/items/attendance_log/${encodeURIComponent(id)}`, {
            method:'PATCH', body: JSON.stringify(dirData)
        });
        if (patchRes != null) return patchRes;
    } catch (_) {}
    try {
        const dirData2 = await mapAttendanceToDirectus(body, { actionEnum: normalizeAction(body?.action), logDate: body?.logDate }).build();
        if (body.userId != null) dirData2.user_id = Number(body.userId);
        if (body.logDate) dirData2.log_date = String(body.logDate).slice(0,10);
        const putRes = await http(`/items/attendance_log/${encodeURIComponent(id)}`, {
            method:'PUT', body: JSON.stringify(dirData2)
        });
        if (putRes != null) return putRes;
    } catch (_) {}

    const relatives = [ `/items/attendance_log/${id}` ];
    for (const rel of relatives) {
        try { return await http(rel, {method:'PUT', body: JSON.stringify(body)}); }
        catch (_) {
            try { return await http(rel, {method:'PATCH', body: JSON.stringify(body)}); }
            catch (_) {}
        }
    }
    return null;
}

async function updateLogByComposite(userId, logDate, patch) {
    const existing = await findExistingLog(userId, logDate);
    const now = getCurrentDateTime();
    if (existing && (existing.logId || existing.id)) {
        const id = existing.logId ?? existing.id;
        const merged = {
            ...existing, ...patch, userId: Number(userId),
            logDate: String(logDate).slice(0,10),
            createdAt: existing.createdAt ?? existing.created_at ?? patch?.createdAt ?? now,
            updatedAt: now,
        };
        return await updateLogById(id, merged);
    }

    const body = {
        userId: Number(userId),
        logDate: String(logDate).slice(0, 10),
        status: patch?.status ?? existing?.status,
        timeIn: patch?.timeIn ?? existing?.timeIn,
        timeOut: patch?.timeOut ?? existing?.timeOut,
        lunchStart: patch?.lunchStart ?? existing?.lunchStart,
        lunchEnd: patch?.lunchEnd ?? existing?.lunchEnd,
        breakStart: patch?.breakStart ?? existing?.breakStart,
        breakEnd: patch?.breakEnd ?? existing?.breakEnd,
        departmentId: patch?.departmentId ?? existing?.departmentId ?? existing?.department?.departmentId,
        createdAt: existing?.createdAt ?? existing?.created_at ?? now,
        updatedAt: now,
        action: patch?.action,
        type: patch?.type,
    };
    if (body.userId != null) body.user = { userId: body.userId };
    if (body.departmentId != null) body.department = { departmentId: Number(body.departmentId) };

    try {
        const dData = await mapAttendanceToDirectus(body, { actionEnum: normalizeAction(body?.action), logDate: body?.logDate }).build();
        dData.user_id = Number(body.userId);
        dData.log_date = String(body.logDate).slice(0,10);
        const res = await http('/items/attendance_log', {
            method: 'PATCH',
            body: JSON.stringify({
                filter: {
                    user_id: { _eq: Number(body.userId) },
                    log_date: { _eq: String(body.logDate).slice(0,10) }
                },
                data: dData
            })
        });
        if (res != null) return res;
    } catch (_) {}

    return null;
}

// ----------------- USERS / DEPARTMENTS -----------------
export async function getDepartments(params = {}) {
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

// ----------------- POST Attendance (HARDENED) -----------------
export async function postLog(payload) {
    // 1) Derive core fields
    const derivedUserId =
        (payload?.userId != null ? Number(payload.userId) : undefined) ??
        (payload?.user?.userId != null ? Number(payload.user.userId) : undefined) ??
        (payload?.user?.id != null ? Number(payload.user.id) : undefined) ??
        (payload?.id != null ? Number(payload.id) : undefined);

    if (!Number.isFinite(derivedUserId)) {
        throw new Error('A valid numeric userId is required to create an attendance log.');
    }

    const actionEnum = normalizeAction(payload?.action || payload?.type || 'TIME_IN');
    const whenIso = toIsoNoMillis(
        payload?.timeIn || payload?.timeOut || payload?.lunchStart || payload?.lunchEnd ||
        payload?.breakStart || payload?.breakEnd || payload?.time || payload?.timestamp
    );
    const logDate = String(payload?.logDate || whenIso.slice(0, 10));

    // Validate user
    const confirmedUser = await getUserById(derivedUserId, { noMock: true });
    if (!confirmedUser) {
        const err = new Error(`User #${derivedUserId} not found on server. Please verify the ID or register the user.`);
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    // Department
    let derivedDeptId =
        (payload?.departmentId != null ? Number(payload.departmentId) : undefined) ??
        (payload?.department?.departmentId != null ? Number(payload.department.departmentId) : undefined) ??
        (payload?.user?.departmentId != null ? Number(payload.user.departmentId) : undefined) ??
        (payload?.user?.department?.departmentId != null ? Number(payload.user.department.departmentId) : undefined);

    if (derivedDeptId == null) {
        try {
            const r = await resolveDepartmentForUser(derivedUserId);
            if (r?.departmentId != null) derivedDeptId = Number(r.departmentId);
        } catch (_) {}
    }

    const serverPayload = {
        userId: derivedUserId,
        departmentId: derivedDeptId,
        logDate,
        status: statusToCode(normalizeStatus(payload?.status ?? payload?.action)),
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        action: actionEnum,
        time: whenIso,
        type: payload?.type || undefined,
    };
    const timeField = actionToField(actionEnum);
    serverPayload[timeField] = whenIso;

    // 2) Idempotent update if exists
    try {
        const existing = await findExistingLog(serverPayload.userId, logDate);
        if (existing && (existing.logId || existing.id)) {
            const id = existing.logId ?? existing.id;
            const patch = {
                [timeField]: whenIso,
                action: actionEnum,
                status: serverPayload.status,
                createdAt: existing.createdAt ?? existing.created_at,
                updatedAt: getCurrentDateTime(),
                userId: serverPayload.userId,
                logDate,
                departmentId: serverPayload.departmentId,
            };
            const updated = await updateLogById(id, patch);
            if (updated != null) return updated;
        } else if (existing) {
            const patch = {
                [timeField]: whenIso,
                action: actionEnum,
                status: serverPayload.status,
                createdAt: existing.createdAt ?? existing.created_at,
                userId: serverPayload.userId,
                logDate,
                departmentId: serverPayload.departmentId,
            };
            const updated = await updateLogByComposite(serverPayload.userId, logDate, patch);
            if (updated != null) return updated;
        }
    } catch (_) {}

    // 3) Create (Directus) — build and FORCE required snake_case keys
    let lastErr;
    try {
        const dirData = await mapAttendanceToDirectus(
            { ...serverPayload }, { actionEnum, whenIso, logDate }
        ).build();

        // Safety: enforce required keys even if inference failed
        dirData.user_id = Number(serverPayload.userId);
        dirData.log_date = String(logDate).slice(0, 10);
        if (serverPayload.departmentId != null) dirData.department_id = Number(serverPayload.departmentId);

        // Ensure the correct time field key exists
        try {
            const fmap = await inferAttendanceFieldMap();
            const tk = fmap?.timeKeys?.[actionEnum];
            if (tk && !dirData[tk] && whenIso) dirData[tk] = whenIso;
        } catch (_) {}

        // >>> QUICK DEBUG: print exactly what will be sent to Directus
        console.debug('[API] POST /items/attendance_log payload:', dirData);

        return await http('/items/attendance_log', {
            method: 'POST',
            body: JSON.stringify(dirData),
        });
    } catch (e) { lastErr = e; }

    // 4) Absolute fallback (if you enable it later) with debug as well
    // (Disabled by default due to CORS; keep here for reference)
    /*
    try {
      const abs = 'http://100.119.3.44:8055/items/attendance_log';
      const dirData = await mapAttendanceToDirectus({ ...serverPayload }, { actionEnum, whenIso, logDate }).build();
      dirData.user_id = Number(serverPayload.userId);
      dirData.log_date = String(logDate).slice(0, 10);
      if (serverPayload.departmentId != null) dirData.department_id = Number(serverPayload.departmentId);
      const fmap = await inferAttendanceFieldMap();
      const tk = fmap?.timeKeys?.[actionEnum];
      if (tk && !dirData[tk] && whenIso) dirData[tk] = whenIso;

      // >>> QUICK DEBUG for absolute:
      console.debug('[API] POST (ABS) /items/attendance_log payload:', { data: dirData });

      const res = await fetch(abs, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ data: dirData }),
      });
      if (res?.ok) {
        const ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : null;
      } else {
        const txt = await res.text().catch(() => '');
        if (String(txt).toLowerCase().includes('foreign key constraint')) {
          const err = new Error(`User #${serverPayload.userId} not found on server (FK violation). Please verify the ID or register the user.`);
          err.code = 'FK_USER';
          throw err;
        } else if (isDuplicateErrorText(txt)) {
          const existing = await findExistingLog(serverPayload.userId, logDate);
          const basePatch = {
            [timeField]: whenIso, action: actionEnum, status: serverPayload.status,
            createdAt: existing?.createdAt ?? existing?.created_at, userId: serverPayload.userId, logDate,
          };
          if (existing && (existing.logId || existing.id)) {
            const id = existing.logId ?? existing.id;
            const updated = await updateLogById(id, basePatch);
            if (updated != null) return updated;
          } else {
            const updated = await updateLogByComposite(serverPayload.userId, logDate, basePatch);
            if (updated != null) return updated;
          }
          throw new Error('Existing log updated instead of creating a duplicate.');
        } else {
          throw new Error(`${res.status} ${res.statusText}: ${txt}`);
        }
      }
    } catch (e) { lastErr = e; }
    */

    throw lastErr || new Error('Failed to POST attendance log');
}

// Convenience exports for check-then-update flow
export async function getExistingAttendanceLog(userId, logDate) {
  if (userId == null) return null;
  const dateStr = String(logDate || nowIsoNoMillis()).slice(0,10);
  return await findExistingLog(userId, dateStr);
}

export async function updateLog(id, data) {
  if (id == null) throw new Error('log id required');
  return await updateLogById(id, data || {});
}

// ======================= end api.js =======================