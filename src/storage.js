import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'

export const cloudEnabled = Boolean(supabase)

let pending = 0
let lastFailed = false
const listeners = new Set()

function computeStatus() {
  if (pending > 0) return 'saving'
  if (lastFailed) return 'error'
  return 'saved'
}

let status = 'idle'

function setStatus(next) {
  if (next === status) return
  status = next
  listeners.forEach((listener) => listener())
}

export function subscribeStatus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStatus() {
  return status
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (pending > 0) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
}

let currentUserId = null
let cache = {}
const saveQueues = {}

export async function loadUserState(userId) {
  const { data, error } = await supabase
    .from('app_state')
    .select('key, value')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  const loaded = {}
  ;(data || []).forEach((row) => {
    loaded[row.key] = row.value
  })

  cache = loaded
  currentUserId = userId
  pending = 0
  lastFailed = false
  setStatus('saved')
}

export function clearUserState() {
  cache = {}
  currentUserId = null
  pending = 0
  lastFailed = false
  setStatus('idle')
}

function saveToCloud(key, value) {
  const userId = currentUserId
  if (!userId) return

  pending += 1
  setStatus(computeStatus())

  const previous = saveQueues[key] || Promise.resolve()

  saveQueues[key] = previous
    .then(async () => {
      const { error } = await supabase.from('app_state').upsert(
        {
          user_id: userId,
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      )
      lastFailed = Boolean(error)
    })
    .catch(() => {
      lastFailed = true
    })
    .then(() => {
      pending -= 1
      setStatus(computeStatus())
    })
}

function readInitial(key, initialValue, isValid) {
  try {
    let saved
    if (cloudEnabled) {
      saved = key in cache ? cache[key] : undefined
    } else {
      const text = window.localStorage.getItem(key)
      saved = text === null ? undefined : JSON.parse(text)
    }

    if (saved !== undefined && (!isValid || isValid(saved))) {
      return saved
    }
  } catch (error) {
    /* Corrupt or blocked storage fallback */
  }

  return initialValue
}

export function usePersistentState(key, initialValue, isValid) {
  const [value, setValue] = useState(() =>
    readInitial(key, initialValue, isValid)
  )

  const lastSaved = useRef(null)

  if (lastSaved.current === null) {
    lastSaved.current = JSON.stringify(value)
  }

  useEffect(() => {
    const json = JSON.stringify(value)
    if (json === lastSaved.current) return

    lastSaved.current = json

    if (cloudEnabled) {
      cache[key] = value
      saveToCloud(key, value)
      return
    }

    try {
      window.localStorage.setItem(key, json)
    } catch (error) {
      /* LocalStorage error fallback */
    }
  }, [key, value])

  return [value, setValue]
}