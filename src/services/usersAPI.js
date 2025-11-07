// src/services/usersApi.js
import { supabase } from './supabase'

/**
 * Get user by RFID – rewritten for Supabase
 */
export async function getUserByRfid(rfid) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('rf_id', rfid)
      .limit(1)
      .single()
    if (error) {
      console.error('Error fetching user by RFID:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}

/**
 * List users – rewritten for Supabase
 */
export async function listUsers(params = {}) {
  try {
    let query = supabase.from('user').select('*')
    // Add filters if present in params
    if (params.rf_id) query = query.eq('rf_id', params.rf_id)
    if (params.email) query = query.eq('email', params.email)
    if (params.limit) query = query.limit(Number(params.limit))
    if (params.offset) query = query.range(Number(params.offset), Number(params.offset) + Number(params.limit || 10) - 1)
    const { data, error } = await query
    if (error) {
      console.error('Error listing users:', error.message)
      return []
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return []
  }
}

/**
 * Get user by email – rewritten for Supabase
 */
export async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .limit(1)
      .single()
    if (error) {
      console.error('Error fetching user by email:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}

/**
 * Create user – rewritten for Supabase
 */
export async function createUser(user) {
  try {
    const { data, error } = await supabase
      .from('user')
      .insert([user])
      .single()
    if (error) {
      console.error('Error creating user:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}

/**
 * Update user by id – rewritten for Supabase
 */
export async function updateUser(id, patch) {
  try {
    const { data, error } = await supabase
      .from('user')
      .update(patch)
      .eq('id', id)
      .single()
    if (error) {
      console.error('Error updating user:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}
