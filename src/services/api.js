// ======================= api.js (Supabase only) =======================

import { supabase } from '../utils/supabase'

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

// ----------------- Attendance helpers -----------------
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

export async function getDepartments(params = {}) {
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
  return [];
}

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

export async function updateLog(id, patch) {
  if (!id) return null;
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
            if (error.code === 'PGRST116') return null;
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

export async function getLogsForUserToday(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
