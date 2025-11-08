// src/services/adminDataAPI.js
import { supabase } from '../utils/supabase'

/**
 * ====================================================
 * Department Functions
 * ====================================================
 */

/**
 * List all departments and their related schedule (if one exists)
 */
export async function listDepartmentsWithSchedules() {
  try {
    // Use explicit join to resolve relationship ambiguity
    const { data, error } = await supabase
      .from('department')
      .select(`*, department_schedule:department_schedule!department_id(*)`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error listing departments:', error.message)
      return []
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return []
  }
}

/**
 * Add a new department
 */
export async function addDepartment(department) {
  try {
    // department = { name: 'Engineering' }
    const { data, error } = await supabase
      .from('department')
      .insert([department])
      .select()
      .single()

    if (error) {
      console.error('Error creating department:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}

/**
 * ====================================================
 * Department Schedule Functions
 * ====================================================
 */

/**
 * Create a new department schedule.
 * Assumes schedule object matches table columns.
 */
export async function createDepartmentSchedule(schedule) {
  try {
    const { data, error } = await supabase
      .from('department_schedule')
      .insert([schedule])
      .select()
      .single()

    if (error) {
      console.error('Error creating schedule:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}

/**
 * Update a department schedule by its ID.
 * Assumes schedulePatch object matches table columns.
 */
export async function updateDepartmentSchedule(id, schedulePatch) {
  try {
    const { data, error } = await supabase
      .from('department_schedule')
      .update(schedulePatch)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating schedule:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Request failed:', err)
    return null
  }
}
