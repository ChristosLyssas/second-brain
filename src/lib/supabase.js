// src/lib/supabase.js
// npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Auth helpers ─────────────────────────────────────────────
export const auth = {
  signUp: (email, password) =>
    supabase.auth.signUp({ email, password }),

  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
}

// ─── Data helpers ─────────────────────────────────────────────

// GOALS
export const goalsDB = {
  async fetch(userId) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw error
    // Map snake_case DB columns → camelCase app format
    return data.map(g => ({
      id: g.id,
      titleEl: g.title_el,
      titleEn: g.title_en,
      areaIdx: g.area_idx,
      priority: g.priority,
      progress: g.progress,
      due: g.due,
      tasks: g.tasks,
      // undefined if the column doesn't exist yet → never sent back, so nothing breaks before the migration
      targetAmount: g.target_amount,
    }))
  },

  async insert(userId, goal) {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id:  userId,
        title_el: goal.titleEl,
        title_en: goal.titleEn,
        area_idx: goal.areaIdx,
        priority: goal.priority,
        progress: goal.progress ?? 0,
        due:      goal.due ?? '',
        tasks:    goal.tasks ?? [],
        ...(goal.targetAmount != null ? { target_amount: goal.targetAmount } : {}),
      })
      .select()
      .single()
    if (error) throw error
    return { ...goal, id: data.id }
  },

  async update(goalId, patch) {
    const dbPatch = {}
    if (patch.titleEl  !== undefined) dbPatch.title_el = patch.titleEl
    if (patch.titleEn  !== undefined) dbPatch.title_en = patch.titleEn
    if (patch.areaIdx  !== undefined) dbPatch.area_idx = patch.areaIdx
    if (patch.priority !== undefined) dbPatch.priority = patch.priority
    if (patch.progress !== undefined) dbPatch.progress = patch.progress
    if (patch.due      !== undefined) dbPatch.due      = patch.due
    if (patch.tasks    !== undefined) dbPatch.tasks    = patch.tasks
    if (patch.targetAmount !== undefined) dbPatch.target_amount = patch.targetAmount

    const { error } = await supabase
      .from('goals')
      .update(dbPatch)
      .eq('id', goalId)
    if (error) throw error
  },

  async delete(goalId) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
    if (error) throw error
  },
}

// NOTES
export const notesDB = {
  async fetch(userId) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(n => ({
      id:        n.id,
      content:   n.content,
      contentEn: n.content_en,
      tags:      n.tags,
      pinned:    n.pinned,
      date:      new Date(n.created_at).toLocaleDateString('el-GR', { day:'numeric', month:'short', year:'numeric' }),
      createdAt: n.created_at, // the UI formats this in the current language
    }))
  },

  async insert(userId, note) {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id:    userId,
        content:    note.content,
        content_en: note.contentEn ?? note.content,
        tags:       note.tags ?? [],
        pinned:     note.pinned ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return { ...note, id: data.id, createdAt: data.created_at }
  },

  async update(noteId, patch) {
    const dbPatch = {}
    if (patch.content   !== undefined) dbPatch.content    = patch.content
    if (patch.contentEn !== undefined) dbPatch.content_en = patch.contentEn
    if (patch.tags      !== undefined) dbPatch.tags       = patch.tags
    if (patch.pinned    !== undefined) dbPatch.pinned     = patch.pinned

    const { error } = await supabase
      .from('notes')
      .update(dbPatch)
      .eq('id', noteId)
    if (error) throw error
  },

  async delete(noteId) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
    if (error) throw error
  },
}

// TRANSACTIONS
export const txnsDB = {
  async fetch(userId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(t => ({
      id:     t.id,
      label:  t.label,
      amount: Number(t.amount),
      type:   t.type,
      catIdx: t.cat_idx,
      date:   t.txn_date,
      createdAt: t.created_at,
    }))
  },

  async insert(userId, txn) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id:  userId,
        label:    txn.label,
        amount:   txn.amount,
        type:     txn.type,
        cat_idx:  txn.catIdx,
        txn_date: txn.date,
      })
      .select()
      .single()
    if (error) throw error
    return { ...txn, id: data.id, createdAt: data.created_at }
  },

  async update(txnId, patch) {
    const dbPatch = {}
    if (patch.label  !== undefined) dbPatch.label    = patch.label
    if (patch.amount !== undefined) dbPatch.amount   = patch.amount
    if (patch.type   !== undefined) dbPatch.type     = patch.type
    if (patch.catIdx !== undefined) dbPatch.cat_idx  = patch.catIdx
    if (patch.date   !== undefined) dbPatch.txn_date = patch.date
    const { data, error } = await supabase
      .from('transactions')
      .update(dbPatch)
      .eq('id', txnId)
      .select()
    if (error) throw error
    // RLS silently filters rows it doesn't allow — surface that instead of failing quietly
    if (!data || data.length === 0) throw new Error('Transaction update affected 0 rows (check UPDATE policy on "transactions")')
  },

  async delete(txnId) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txnId)
    if (error) throw error
  },
}