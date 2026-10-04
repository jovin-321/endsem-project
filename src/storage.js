import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'

/* =========================================================
   STORAGE LAYER

   One hook, `usePersistentState`, is used everywhere the app keeps
   data. It behaves exactly like useState, plus saving:

   - Supabase configured  -> data is saved to the user's own rows in the
                             `app_state` table (one row per key).
   - Supabase not set up  -> data is saved in the browser (localStorage),
                             which is how the original MVP worked.

   The rest of the app does not need to know which one is in use.
   ========================================================= */

export const cloudEnabled = Boolean(supabase)


/* ---------------------------------------------------------
   Save status (tiny store so the header badge can show it)
   --------------------------------------------------------- */

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
  /* Warn before closing the tab while a save is still on its way. */
  window.addEventListener('beforeunload', (event) => {
    if (pending > 0) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
}


/* ---------------------------------------------------------
   Cloud mode
   --------------------------------------------------------- */

let currentUserId = null
let cache = {}
const saveQueues = {}

/* Load every saved value for this user, once, right after login. */
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

  if (!userId) {
    return
  }

  pending += 1
  setStatus(computeStatus())

  /*
    Saves for the same key run one after another, so an older
    save can never arrive after (and overwrite) a newer one.
  */

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


/* ---------------------------------------------------------
   The hook
   --------------------------------------------------------- */

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
    /* Corrupt or blocked storage: fall back to the default. */
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

    /* Nothing changed since load/last save – nothing to do. */
    if (json === lastSaved.current) {
      return
    }

    lastSaved.current = json

    if (cloudEnabled) {
      cache[key] = value
      saveToCloud(key, value)
      return
    }

    try {
      window.localStorage.setItem(key, json)
    } catch (error) {
      /* Storage full or blocked: the app keeps working in memory. */
    }
  }, [key, value])

  return [value, setValue]
}