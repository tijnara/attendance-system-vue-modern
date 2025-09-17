// Dynamic API base resolution with robust fallbacks (mirrors login script behavior)
const FALLBACKS = ['http://goatedcodoer:8080']

// Simple localStorage helpers for offline logs
const LS_KEY = 'attendance.offlineLogs'
function readOfflineLogs() {
    try {
        const raw = localStorage.getItem(LS_KEY)
        const arr = raw ? JSON.parse(raw) : []
        return Array.isArray(arr) ? arr : []
    } catch (_) {
        return []
    }
}
function writeOfflineLogs(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr || [])) } catch (_) {}
}
function addOfflineLog(entry) {
    const list = readOfflineLogs()
    list.unshift(entry)
    // cap to reasonable number to avoid bloat
    if (list.length > 1000) list.length = 1000
    writeOfflineLogs(list)
    return entry
}

// Normalize status/action strings to backend-accepted enum codes (CamelCase)
// Maps variants like "OnTime"/"On Time"/"ON_TIME" -> "OnTime", "Half Day"/"HALF_DAY" -> "HalfDay"
export function normalizeStatus(input) {
    const s = String(input || '').trim()
    if (!s) return 'OnTime'
    // unify to upper snake case first for easy matching
    const upper = s
        .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase -> snake_case
        .replace(/[\s-]+/g, '_')            // spaces/hyphens -> underscore
        .toUpperCase()

    // Direct map to backend enum names
    const directMap = {
        'ON_TIME': 'OnTime',
        'LATE': 'Late',
        'ABSENT': 'Absent',
        'HALF_DAY': 'HalfDay',
        'INCOMPLETE': 'Incomplete',
        'LEAVE': 'Leave',
        'HOLIDAY': 'Holiday',
    }
    if (upper in directMap) return directMap[upper]

    // Heuristic: common synonyms/actions -> default to OnTime status
    const synonyms = new Set([
        'TIME_IN','TIME_OUT','LUNCH_START','LUNCH_END','BREAK_START','BREAK_END','IN','OUT','LUNCH','BREAK'
    ])
    if (synonyms.has(upper)) return 'OnTime'

    // Another heuristic: half day forms
    if (/^HALF(_|\s)*DAY$/.test(upper)) return 'HalfDay'

    // Fallback
    return 'OnTime'
}

// Convert normalized status names to compact numeric codes expected by some backends
// Defaults to 1 (OnTime) to be permissive and avoid SQL truncation on numeric columns
function statusToCode(name) {
    const map = {
        OnTime: 1,
        Late: 2,
        Absent: 3,
        HalfDay: 4,
        Incomplete: 5,
        Leave: 6,
        Holiday: 7,
    }
    return map[name] ?? 1
}

// Normalize action strings to canonical enum values used by the backend
// Accepts synonyms and varied casing: 'time in', 'Time-In', 'IN' -> 'TIME_IN', etc.
export function normalizeAction(input) {
    const s = String(input || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
    const map = {
        'TIME_IN': 'TIME_IN', 'IN': 'TIME_IN', 'CHECK_IN': 'TIME_IN', 'CLOCK_IN': 'TIME_IN',
        'TIME_OUT': 'TIME_OUT', 'OUT': 'TIME_OUT', 'CHECK_OUT': 'TIME_OUT', 'CLOCK_OUT': 'TIME_OUT',
        'LUNCH_START': 'LUNCH_START', 'START_LUNCH': 'LUNCH_START', 'LUNCH_IN': 'LUNCH_START', 'LUNCH': 'LUNCH_START',
        'LUNCH_END': 'LUNCH_END', 'END_LUNCH': 'LUNCH_END', 'LUNCH_OUT': 'LUNCH_END',
        'BREAK_START': 'BREAK_START', 'START_BREAK': 'BREAK_START', 'BREAK': 'BREAK_START',
        'BREAK_END': 'BREAK_END', 'END_BREAK': 'BREAK_END',
    }
    return map[s] || 'TIME_IN'
}

function actionToField(actionEnum) {
    switch (normalizeAction(actionEnum)) {
        case 'TIME_OUT': return 'timeOut'
        case 'LUNCH_START': return 'lunchStart'
        case 'LUNCH_END': return 'lunchEnd'
        case 'BREAK_START': return 'breakStart'
        case 'BREAK_END': return 'breakEnd'
        case 'TIME_IN':
        default:
            return 'timeIn'
    }
}

function resolveApiBase() {
    const strip = (s) => (s || '').replace(/\/$/, '')
    try {
        const href = typeof window !== 'undefined' ? window.location?.href : ''
        const u = new URL(href)
        const isKnown = (u.port === '3011' || u.port === '8080' || u.hostname === 'goatedcodoer')
        if (isKnown) return strip(window.location.origin)
    } catch (_) {}
    const hintedRaw = strip(typeof window !== 'undefined' ? (window.__API_BASE__ || '') : '')
    if (hintedRaw) {
        try {
            const h = new URL(hintedRaw)
            const hintedKnown = (h.port === '3011' || h.port === '8080' || h.hostname === 'goatedcodoer')
            if (hintedKnown) return hintedRaw
        } catch (_) {
            try {
                const origin = strip(typeof window !== 'undefined' ? (window.location?.origin || '') : '')
                if (hintedRaw && hintedRaw !== origin) return hintedRaw
            } catch (_) {}
        }
    }
    return FALLBACKS[0]
}

const API_BASE = resolveApiBase()

async function http(path, options = {}) {
    const urlPath = path.startsWith('/') ? path : `/${path}`
    const attempts = []
    const used = new Set()
    const pushAttempt = (base) => {
        const b = (base || '').replace(/\/$/, '')
        if (b && !used.has(b)) {
            used.add(b)
            attempts.push(`${b}${urlPath}`)
        }
    }
    // Prefer same-origin first to leverage Vite proxy and avoid CORS
    try {
        const origin = typeof window !== 'undefined' ? window.location?.origin?.replace(/\/$/, '') : ''
        pushAttempt(origin)
    } catch (_) {}
    // Then try configured API base and fallbacks (direct hosts)
    pushAttempt(API_BASE)
    for (const f of FALLBACKS) pushAttempt(f)

    let lastErr
    for (const url of attempts) {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            })
            if (res && res.ok) {
                const ct = res.headers.get('content-type') || ''
                return ct.includes('application/json') ? res.json() : null
            } else if (res) {
                const txt = await res.text().catch(() => '')
                lastErr = new Error(`${res.status} ${res.statusText}: ${txt}`)
            }
        } catch (e) {
            lastErr = e
        }
    }
    throw lastErr || new Error('Network error')
}

/* ----------------- Attendance Logs ----------------- */

// Helpers for idempotent attendance logging to avoid duplicate-key errors
function isDuplicateErrorText(txt) {
    const s = String(txt || '').toLowerCase()
    return s.includes('duplicate entry') || s.includes('uq_user_date') || s.includes('sqlstate: 23000') || s.includes('constraint')
}

async function findExistingLog(userId, logDate) {
    const dateStr = String(logDate).slice(0, 10)
    try {
        const res = await getLogs({ userId, from: dateStr, to: dateStr })
        const arr = Array.isArray(res) ? res : (res?.content || [])
        const match = arr.find(r => {
            const uid = String(r.userId ?? r.user?.userId ?? r.user?.id ?? r.user_id)
            const d = (r.logDate || (r.timeIn || r.timeOut || r.lunchStart || r.lunchEnd || r.breakStart || r.breakEnd || '')).slice(0,10)
            return uid === String(userId) && d === dateStr
        })
        return match || null
    } catch (_) {
        return null
    }
}

async function updateLogById(id, patch) {
    // Fetch existing to preserve immutable/required fields (e.g., createdAt) and avoid nulling others
    async function fetchExisting() {
        const abs = `http://goatedcodoer:8080/api/attendance/logs/${encodeURIComponent(id)}`
        try {
            const res = await fetch(abs, { method: 'GET' })
            if (res && res.ok) {
                const ct = res.headers.get('content-type') || ''
                return ct.includes('application/json') ? res.json() : null
            }
        } catch (_) {}
        const relatives = [
            `/api/attendance/logs/${id}`,
            `/api/logs/${id}`,
            `/attendance/logs/${id}`,
            `/api/attendance/${id}`,
        ]
        for (const rel of relatives) {
            try { return await http(rel, { method: 'GET' }) } catch (_) {}
        }
        return null
    }

    const existing = await fetchExisting()
    const now = getCurrentDateTime()
    const body = {
        // preserve from existing when available
        logId: existing?.logId ?? existing?.id ?? id,
        userId: Number(patch?.userId ?? existing?.userId ?? existing?.user?.userId ?? existing?.user_id),
        logDate: String(patch?.logDate ?? existing?.logDate ?? existing?.log_date ?? '').slice(0,10),
        departmentId: patch?.departmentId ?? existing?.departmentId ?? existing?.department?.departmentId ?? existing?.department_id,
        status: patch?.status ?? existing?.status,
        timeIn: patch?.timeIn ?? existing?.timeIn,
        timeOut: patch?.timeOut ?? existing?.timeOut,
        lunchStart: patch?.lunchStart ?? existing?.lunchStart,
        lunchEnd: patch?.lunchEnd ?? existing?.lunchEnd,
        breakStart: patch?.breakStart ?? existing?.breakStart,
        breakEnd: patch?.breakEnd ?? existing?.breakEnd,
        createdAt: patch?.createdAt ?? existing?.createdAt ?? now, // never null
        updatedAt: now,
        action: patch?.action,
        type: patch?.type,
    }
    // include minimal nested refs for JPA backends
    if (body.userId != null) body.user = { userId: body.userId }
    if (body.departmentId != null) body.department = { departmentId: Number(body.departmentId) }

    const urlAbs = `http://goatedcodoer:8080/api/attendance/logs/${encodeURIComponent(id)}`
    try {
        // Prefer PUT (backend does not support PATCH per logs)
        let res = await fetch(urlAbs, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (res && res.ok) {
            const ct = res.headers.get('content-type') || ''
            return ct.includes('application/json') ? res.json() : null
        }
        // Fallback to PATCH if PUT somehow fails
        res = await fetch(urlAbs, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (res && res.ok) {
            const ct = res.headers.get('content-type') || ''
            return ct.includes('application/json') ? res.json() : null
        }
    } catch (_) {}

    const relatives = [
        `/api/attendance/logs/${id}`,
        `/api/logs/${id}`,
        `/attendance/logs/${id}`,
        `/api/attendance/${id}`,
    ]
    for (const rel of relatives) {
        try {
            return await http(rel, { method: 'PUT', body: JSON.stringify(body) })
        } catch (_) {
            try {
                return await http(rel, { method: 'PATCH', body: JSON.stringify(body) })
            } catch (_) {}
        }
    }
    return null
}

async function updateLogByComposite(userId, logDate, patch) {
    const existing = await findExistingLog(userId, logDate)
    const now = getCurrentDateTime()
    if (existing && (existing.logId || existing.id)) {
        const id = existing.logId ?? existing.id
        // Merge into existing and delegate to id-based updater
        const merged = {
            ...existing,
            ...patch,
            userId: Number(userId),
            logDate: String(logDate).slice(0,10),
            createdAt: existing.createdAt ?? existing.created_at ?? patch?.createdAt ?? now,
            updatedAt: now,
        }
        return await updateLogById(id, merged)
    }

    // No ID path: build a comprehensive body to avoid nulling columns on the server
    const body = {
        userId: Number(userId),
        logDate: String(logDate).slice(0,10),
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
    }
    if (body.userId != null) body.user = { userId: body.userId }
    if (body.departmentId != null) body.department = { departmentId: Number(body.departmentId) }

    const absolutes = [
        'http://goatedcodoer:8080/api/attendance/logs/update',
        'http://goatedcodoer:8080/api/attendance/logs',
    ]
    for (const abs of absolutes) {
        for (const method of ['PUT','PATCH','POST']) {
            try {
                const res = await fetch(abs, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                if (res && res.ok) {
                    const ct = res.headers.get('content-type') || ''
                    return ct.includes('application/json') ? res.json() : null
                }
            } catch (_) {}
        }
    }
    const relatives = [
        '/api/attendance/logs/update',
        '/api/attendance/logs',
        '/api/attendance',
        '/attendance/logs',
        '/attendance',
    ]
    for (const rel of relatives) {
        for (const method of ['PUT','PATCH','POST']) {
            try {
                const d = await http(rel, { method, body: JSON.stringify(body) })
                if (d != null) return d
            } catch (_) {}
        }
    }
    return null
}

// POST /api/attendance/logs (idempotent: create or update)
export async function postLog(payload) {
    // Always try the explicit host first as required
    const absoluteCandidates = [
        'http://goatedcodoer:8080/api/attendance/logs'
    ]

    // Align payload with backend schema and map action -> proper time field
    const actionEnum = normalizeAction(payload.action || payload.type || 'TIME_IN')
    const whenIso = toIsoNoMillis(
            payload.timeIn || payload.timeOut || payload.lunchStart || payload.lunchEnd || payload.breakStart || payload.breakEnd ||
            payload.time || payload.timestamp
        )
    const logDate = (payload.logDate && String(payload.logDate)) || whenIso.slice(0, 10)
    const serverPayload = {
        userId: (payload.userId != null ? Number(payload.userId) : undefined),
        logDate: logDate,
        status: statusToCode(normalizeStatus(payload.status ?? payload.action)),
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        // Include action and a generic time for backends that expect them
        action: actionEnum,
        time: whenIso,
        type: payload.type || undefined,
    }
    // Put the correct time field only (avoid nulling other fields on the server)
    const field = actionToField(actionEnum)
    serverPayload[field] = whenIso

    // For JPA-style backends expecting an entity reference, include minimal nested object too
    if (serverPayload.userId != null) {
        serverPayload.user = { userId: serverPayload.userId }
    }
    if (payload.departmentId != null) serverPayload.departmentId = Number(payload.departmentId)

    // Validate user existence against server to avoid FK errors
    if (serverPayload.userId == null || Number.isNaN(serverPayload.userId)) {
        throw new Error('A valid numeric userId is required to create an attendance log.')
    }
    try {
        const confirmed = await getUserById(serverPayload.userId, { noMock: true })
        if (!confirmed) {
            const err = new Error(`User #${serverPayload.userId} not found on server. Please verify the ID or register the user.`)
            err.code = 'USER_NOT_FOUND'
            throw err
        }
    } catch (e) {
        // bubble up — caller (Scanner) will show a friendly message
        throw e
    }

    // Attempt to resolve department if missing to satisfy backends requiring department_id
    if (serverPayload.departmentId == null) {
        try {
            const info = await resolveDepartmentForUser(serverPayload.userId)
            if (info && info.departmentId != null) {
                serverPayload.departmentId = Number(info.departmentId)
                serverPayload.departmentName = info.departmentName
            }
        } catch (_) {}
    }
    // If departmentId is present, also include a minimal nested object for backends expecting an entity reference
    if (serverPayload.departmentId != null) {
        try {
            serverPayload.department = { departmentId: serverPayload.departmentId }
        } catch (_) {}
    } else {
        // No department resolvable: store offline to avoid server 500 due to NOT NULL or FK constraints
        try {
            const offline = {
                id: Date.now(),
                logId: Date.now(),
                userId: payload.userId,
                logDate: logDate,
                departmentId: undefined,
                departmentName: undefined,
                type: payload.type,
                action: actionEnum,
                status: statusToCode(normalizeStatus(payload.status ?? payload.action)),
                offline: true,
            }
            // Record the correct time field for this action
            offline[field] = whenIso
            addOfflineLog(offline)
            console.warn('[API] No departmentId resolved; stored offline:', offline)
            return offline
        } catch (_) {
            // continue to remote attempts if offline store fails
        }
    }

    // 0) Idempotent check: if a log for this user and date exists, do an update instead of create
    try {
        const existing = await findExistingLog(serverPayload.userId, logDate)
        if (existing && (existing.logId || existing.id)) {
            const id = existing.logId ?? existing.id
            const patch = {
                [field]: whenIso,
                action: actionEnum,
                status: serverPayload.status,
                createdAt: existing.createdAt ?? existing.created_at,
                updatedAt: getCurrentDateTime(),
                userId: serverPayload.userId,
                logDate,
            }
            const updated = await updateLogById(id, patch)
            if (updated != null) return updated
        } else if (existing) {
            // Found but no ID in payload - update via composite
            const patch = {
                [field]: whenIso,
                action: actionEnum,
                status: serverPayload.status,
                createdAt: existing.createdAt ?? existing.created_at,
                userId: serverPayload.userId,
                logDate,
            }
            const updated = await updateLogByComposite(serverPayload.userId, logDate, patch)
            if (updated != null) return updated
        }
    } catch (_) { /* best-effort */ }

    let lastErr

    // 1) Try absolute URL(s) first (create)
    for (const abs of absoluteCandidates) {
        try {
            console.log('[API] POST', abs, serverPayload)
            const res = await fetch(abs, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverPayload),
            })
            if (res && res.ok) {
                const ct = res.headers.get('content-type') || ''
                return ct.includes('application/json') ? res.json() : null
            } else if (res) {
                const txt = await res.text().catch(() => '')
                const lower = String(txt).toLowerCase()
                if (lower.includes('foreign key constraint') || lower.includes('fk_att_user')) {
                    const err = new Error(`User #${serverPayload.userId} not found on server (FK violation). Please verify the ID or register the user.`)
                    err.code = 'FK_USER'
                    lastErr = err
                } else if (isDuplicateErrorText(lower)) {
                    // Duplicate: convert to update
                    try {
                        const existing = await findExistingLog(serverPayload.userId, logDate)
                        const basePatch = {
                            [field]: whenIso,
                            action: actionEnum,
                            status: serverPayload.status,
                            createdAt: existing?.createdAt ?? existing?.created_at,
                            userId: serverPayload.userId,
                            logDate,
                        }
                        if (existing && (existing.logId || existing.id)) {
                            const id = existing.logId ?? existing.id
                            const updated = await updateLogById(id, basePatch)
                            if (updated != null) return updated
                        } else {
                            const updated = await updateLogByComposite(serverPayload.userId, logDate, basePatch)
                            if (updated != null) return updated
                        }
                    } catch (_) {}
                    lastErr = new Error('Existing log updated instead of creating a duplicate.')
                } else {
                    lastErr = new Error(`${res.status} ${res.statusText}: ${txt}`)
                }
            }
        } catch (e) {
            lastErr = e
            console.warn('[API] POST absolute failed on', abs, '->', e?.message || e)
        }
    }

    // 2) Fallback to relative path via http() helper (proxy/same-origin)
    // Try several likely endpoint shapes to accommodate different backends
    const relativeCandidates = [
        '/api/attendance/logs',     // original
        '/api/logs',                // common simplified path
        '/attendance/logs',         // without /api prefix
        '/api/attendanceLogs',      // camelCase variant
        '/api/attendancelogs',      // lowercase variant
        '/api/attendance',          // singular resource
        '/attendance'               // bare path
    ]
    for (const rel of relativeCandidates) {
        try {
            return await http(rel, {
                method: 'POST',
                body: JSON.stringify(serverPayload),
            })
        } catch (e) {
            // On failure, if looks like duplicate, try update via composite as a last resort
            const msg = e?.message || ''
            if (isDuplicateErrorText(msg)) {
                const existing = await findExistingLog(serverPayload.userId, logDate)
                const basePatch = {
                    [field]: whenIso,
                    action: actionEnum,
                    status: serverPayload.status,
                    createdAt: existing?.createdAt ?? existing?.created_at,
                    userId: serverPayload.userId,
                    logDate,
                }
                if (existing && (existing.logId || existing.id)) {
                    const id = existing.logId ?? existing.id
                    const updated = await updateLogById(id, basePatch)
                    if (updated != null) return updated
                } else {
                    const updated = await updateLogByComposite(serverPayload.userId, logDate, basePatch)
                    if (updated != null) return updated
                }
            }
            lastErr = e
            console.warn('[API] POST relative failed on', rel, '->', msg)
        }
    }

    // 3) Offline fallback removed: do not persist locally; surface the error
    // Previously stored logs offline when POST failed; this behavior has been disabled per requirements.

    throw lastErr || new Error('Failed to POST attendance log')
}

// GET /api/attendance/logs (force goatedcodoer host; no offline merge)
export async function getLogs(params = {}) {
    const absBase = 'http://goatedcodoer:8080/api/attendance/logs'
    const qs = new URLSearchParams(params || {}).toString()
    const url = qs ? `${absBase}?${qs}` : absBase
    console.log('[API] GET', url)
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        if (!res.ok) {
            const txt = await res.text().catch(() => '')
            throw new Error(`${res.status} ${res.statusText}: ${txt}`)
        }
        const json = await res.json().catch(() => null)
        if (Array.isArray(json)) return json
        if (json && Array.isArray(json.content)) return json.content
        return []
    } catch (e) {
        console.warn('[API] getLogs failed:', e?.message || e)
        throw e
    }
}

/* ----------------- Departments ----------------- */

// GET /api/departments (optionally with params)
export async function getDepartments(params = {}) {
    const qs = new URLSearchParams(params).toString()
    const url = qs ? `/api/departments?${qs}` : '/api/departments'
    console.log('[API] GET', url)
    try {
        const res = await http(url)
        // Do not force a shape here; callers can normalize content vs array
        return res
    } catch (e) {
        console.warn('[API] getDepartments failed:', e?.message || e)
        // Fallback to empty list to allow UI manual entry
        return []
    }
}

/* ----------------- Users ----------------- */

// GET /api/users (optionally with params)
export async function getUsers(params = {}) {
    const qs = new URLSearchParams(params).toString()
    const url = qs ? `/api/users?${qs}` : '/api/users'
    console.log('[API] GET', url)
    try {
        return await http(url)
    } catch (e) {
        console.warn('[API] getUsers failed, returning offline mock users:', e?.message || e)
    }
    // Offline-safe mock users as a final fallback when backend is unavailable
    const MOCK_USERS = [
        {
            userId: 133,
            email: 'aranjit_archita@men2corp.com',
            password: 'jit123',
            fullName: 'Aranjit Archita',
            branchId: null,
            departmentName: 'M.I.S',
            position: 'Developer',
            isActive: true,
            mobileNumber: '',
            branchName: null,
            operationId: null,
            token: null
        },
        {
            userId: 75,
            email: 'bimbo_castro@men2corp.com',
            password: 'kUyfOFVA',
            fullName: 'Bimbo Castro',
            branchId: null,
            departmentName: 'Logistics',
            position: 'Logistics Head',
            isActive: true,
            mobileNumber: '',
            branchName: null,
            operationId: null,
            token: null
        },
        {
            userId: 81,
            email: 'wilmar_bautista@men2corp.com',
            password: 'wilmar123',
            fullName: 'Wilmar Bautista',
            branchId: null,
            departmentName: 'Sales',
            position: 'Salesman',
            isActive: true,
            mobileNumber: '09123456789',
            branchName: null,
            operationId: null,
            token: null
        }
    ]
    return MOCK_USERS
}

// GET user by id with robust fallbacks for backends that don't support /api/users/:id
export async function getUserById(id, opts = {}) {
    if (!id && id !== 0) throw new Error('User ID required')
    const sid = String(id)
    const noMock = opts.noMock === true
    console.log('[API] GET user by id ->', id, noMock ? '(noMock)' : '')

    const pickMatch = (data) => {
        if (!data) return null
        if (Array.isArray(data)) return data.find(u => String(u.userId ?? u.id) === sid) || null
        if (data.content && Array.isArray(data.content)) return data.content.find(u => String(u.userId ?? u.id) === sid) || null
        if (data.userId || data.id) return (String(data.userId ?? data.id) === sid) ? data : null
        return null
    }

    // 1) Prefer list-based lookups first to support backends without /api/users/:id
    try {
        const res = await http(`/api/users?userId=${encodeURIComponent(id)}`)
        const match = pickMatch(res)
        if (match) return match
    } catch (e) {
        console.warn('[API] /api/users?userId= not available or no match:', e.message)
    }

    // 1b) Try /api/users?id=ID (some backends use id instead of userId)
    try {
        const res = await http(`/api/users?id=${encodeURIComponent(id)}`)
        const match = pickMatch(res)
        if (match) return match
    } catch (e) {
        console.warn('[API] /api/users?id= not available or no match:', e.message)
    }

    // 2) Fallback: fetch all and find locally
    try {
        const res = await http('/api/users')
        const match = pickMatch(res)
        if (match) return match
    } catch (e) {
        console.warn('[API] /api/users full list fetch failed:', e.message)
    }

    // 3) As a last resort, try /api/users/:id for servers that do support it
    try {
        const res = await http(`/api/users/${encodeURIComponent(id)}`)
        const match = pickMatch(res)
        if (match) return match
    } catch (e) {
        console.warn('[API] /api/users/:id failed:', e.message)
    }

    // 4) Offline mock users (skip when noMock)
    if (!noMock) {
        try {
            const res = await getUsers()
            const match = pickMatch(res)
            if (match) return match
        } catch (_) {}
    }

    return null
}

// Find user by RFID or Barcode
export async function resolveDepartmentForUser(userId) {
    try {
        const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        const user = await getUserById(userId)
        if (!user) return null

        // Try direct ids from various backend shapes
        const directId = user.departmentId ?? user.department_id ?? user?.department?.departmentId ?? user?.department?.id
        const directName = user.departmentName ?? user.department_name ?? user?.department?.departmentName ?? user?.department?.name
        if (directId) return { departmentId: Number(directId), departmentName: directName }

        const targetName = directName
        if (!targetName) return null

        // Fetch departments and match by name
        let list = []
        try {
            const res = await getDepartments()
            list = Array.isArray(res) ? res : (res?.content || [])
        } catch (_) {
            list = []
        }
        if (!Array.isArray(list) || !list.length) return null

        const t = norm(targetName)
        const match = list.find(d => norm(d.departmentName || d.name) === t)
        if (match) {
            const id = match.departmentId ?? match.id
            return id ? { departmentId: Number(id), departmentName: match.departmentName || match.name } : null
        }
        return null
    } catch (_) {
        return null
    }
}

export async function findUserByRfidOrBarcode(value) {
    if (!value) return null

    // helper to normalize backend response
    const normalize = (res) => {
        if (!res) return null
        if (Array.isArray(res) && res.length) return res[0]
        if (res?.content?.length) return res.content[0]
        return null
    }

    try {
        const byRfid = await http(`/api/users?rfid=${encodeURIComponent(value)}`)
        const u = normalize(byRfid)
        if (u) return u
    } catch (e) {
        console.warn('[API] RFID search failed:', e.message)
    }

    try {
        const byBarcode = await http(`/api/users?barcode=${encodeURIComponent(value)}`)
        const u = normalize(byBarcode)
        if (u) return u
    } catch (e) {
        console.warn('[API] Barcode search failed:', e.message)
    }

    return null
}

/* ----------------- Department Schedules ----------------- */

function normalizeSchedule(raw) {
    if (!raw) return null
    const s = {
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
    }
    return s
}

const MANILA_TZ = 'Asia/Manila'

function manilaIsoNoMillis(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-PH', {
        timeZone: MANILA_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc }, {})
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

function getCurrentDateTime() {
    // Philippines local wall time (Asia/Manila), ISO without milliseconds or trailing Z
    return manilaIsoNoMillis()
}

function nowIsoNoMillis() {
    // Matches the component logic: ISO without milliseconds or trailing Z (Asia/Manila)
    return manilaIsoNoMillis()
}

function toIsoNoMillis(input) {
    try {
        if (!input) return manilaIsoNoMillis()
        const d = new Date(input)
        if (isNaN(d)) return manilaIsoNoMillis()
        return manilaIsoNoMillis(d)
    } catch (_) {
        return manilaIsoNoMillis()
    }
}

function buildSchedulePayload(data, { isUpdate = false } = {}) {
    const createdAt = data.createdAt ?? data.created_at ?? nowIsoNoMillis()
    const updatedAt = data.updatedAt ?? data.updated_at ?? nowIsoNoMillis()

    const base = {
        // camelCase version
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

        createdAt: createdAt,
        updatedAt: updatedAt,
    }

    // duplicate snake_case keys for backends expecting them
    const snake = {
        schedule_id: base.scheduleId,
        department_id: base.departmentId,
        working_days: base.workingDays,
        work_start: base.workStart,
        work_end: base.workEnd,
        lunch_start: base.lunchStart,
        lunch_end: base.lunchEnd,
        break_start: base.breakStart,
        break_end: base.breakEnd,
        workdays_note: base.workdaysNote,
        created_at: base.createdAt,
        updated_at: base.updatedAt,
    }

    return { ...base, ...snake }
}

// GET schedule by departmentId with several endpoint fallbacks
export async function getScheduleByDepartment(departmentId) {
    if (!departmentId && departmentId !== 0) return null
    const did = encodeURIComponent(departmentId)

    const candidates = [
        `/api/schedules?departmentId=${did}`,
        `/api/department-schedules?departmentId=${did}`,
        `/api/schedule?departmentId=${did}`,
        `/api/departments/${did}/schedule`,
    ]

    let lastErr
    for (const url of candidates) {
        try {
            const res = await http(url)
            // Normalize various shapes
            let rec = null
            if (Array.isArray(res)) {
                rec = res.find(r => String(r.departmentId ?? r.department_id ?? r.deptId ?? r.dept_id) === String(departmentId)) || res[0] || null
            } else if (res?.content && Array.isArray(res.content)) {
                rec = res.content.find(r => String(r.departmentId ?? r.department_id ?? r.deptId ?? r.dept_id) === String(departmentId)) || res.content[0] || null
            } else if (res && typeof res === 'object') {
                // Some backends return a single record
                rec = res
            }
            if (rec) return normalizeSchedule(rec)
        } catch (e) {
            lastErr = e
            console.warn('[API] getScheduleByDepartment failed on', url, '->', e?.message || e)
        }
    }
    if (lastErr) throw lastErr
    return null
}

export async function createSchedule(data) {
    const body = JSON.stringify(buildSchedulePayload(data, { isUpdate: false }))
    const candidates = ['/api/schedules', '/api/department-schedules', '/api/schedule']
    let lastErr
    for (const url of candidates) {
        try {
            const res = await http(url, { method: 'POST', body })
            return res ? normalizeSchedule(res) : null
        } catch (e) {
            lastErr = e
            console.warn('[API] createSchedule failed on', url, '->', e?.message || e)
        }
    }
    throw lastErr || new Error('Failed to create schedule')
}

export async function updateSchedule(id, data) {
    if (!id && id !== 0) throw new Error('schedule id required')
    const sid = encodeURIComponent(id)
    const body = JSON.stringify(buildSchedulePayload(data, { isUpdate: true }))
    const candidates = [
        `/api/schedules/${sid}`,
        `/api/department-schedules/${sid}`,
        `/api/schedule/${sid}`,
    ]
    let lastErr
    for (const url of candidates) {
        for (const method of ['PUT', 'PATCH']) {
            try {
                const res = await http(url, { method, body })
                return res ? normalizeSchedule(res) : null
            } catch (e) {
                lastErr = e
                console.warn(`[API] updateSchedule ${method} failed on`, url, '->', e?.message || e)
            }
        }
    }
    throw lastErr || new Error('Failed to update schedule')
}

export async function deleteSchedule(id) {
    if (!id && id !== 0) throw new Error('schedule id required')
    const sid = encodeURIComponent(id)
    const candidates = [
        `/api/schedules/${sid}`,
        `/api/department-schedules/${sid}`,
        `/api/schedule/${sid}`,
    ]
    let lastErr
    for (const url of candidates) {
        try {
            const res = await http(url, { method: 'DELETE' })
            return res ?? true
        } catch (e) {
            lastErr = e
            console.warn('[API] deleteSchedule failed on', url, '->', e?.message || e)
        }
    }
    throw lastErr || new Error('Failed to delete schedule')
}


export async function getDepartmentSchedules() {
    const candidates = [
        '/api/departments/schedules',
        '/api/schedules',
        '/api/department-schedules',
        '/api/schedule'
    ]
    let lastErr
    for (const url of candidates) {
        try {
            const res = await http(url)
            const list = Array.isArray(res) ? res : (res?.content || [])
            return list.map(normalizeSchedule)
        } catch (e) {
            lastErr = e
            console.warn('[API] getDepartmentSchedules failed on', url, '->', e?.message || e)
        }
    }
    throw lastErr || new Error('Failed to load department schedules')
}
