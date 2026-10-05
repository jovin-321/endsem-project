import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabaseClient.js'
import {
  cloudEnabled,
  loadUserState,
  clearUserState,
  subscribeStatus,
  getStatus,
} from './storage.js'

function SyncBadge() {
  const status = useSyncExternalStore(subscribeStatus, getStatus)

  const labels = {
    idle: '☁ Cloud sync on',
    saving: '⏳ Saving…',
    saved: '✓ Saved to cloud',
    error: '⚠ Not saved – check your connection',
  }

  return (
    <span
      className={`sync-badge sync-${status}`}
      role="status"
      data-testid="sync-status"
    >
      {labels[status]}
    </span>
  )
}

function AuthForm() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const isSignup = mode === 'signup'

  async function submit(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const cleanEmail = email.trim()

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        })

        if (signUpError) throw signUpError

        if (!data.session) {
          setInfo(
            'Account created. Please check your email to confirm it, then log in.'
          )
          setMode('login')
        }
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })

        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }

    setBusy(false)
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>SpendWise</h1>

        <p className="auth-sub">
          {isSignup
            ? 'Create your account to start tracking.'
            : 'Log in to see your expenses on any device.'}
        </p>

        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {info && <p className="auth-info">{info}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to SpendWise?'}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(isSignup ? 'login' : 'signup')
              setError('')
              setInfo('')
            }}
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  )
}

function CloudGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [dataUserId, setDataUserId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      clearUserState()
      setDataUserId(null)
      return
    }

    setLoadError('')

    loadUserState(userId)
      .then(() => {
        if (!cancelled) {
          setDataUserId(userId)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load your data.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  if (session === undefined) {
    return <p className="auth-loading">Loading…</p>
  }

  if (session === null) {
    return <AuthForm />
  }

  if (loadError) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h2>Couldn’t load your data</h2>
          <p className="auth-error">{loadError}</p>

          <button onClick={() => setAttempt((n) => n + 1)}>Try again</button>

          <p className="auth-switch">
            <button
              type="button"
              className="link-btn"
              onClick={() => supabase.auth.signOut()}
            >
              Log out
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (dataUserId !== userId) {
    return <p className="auth-loading">Loading your data…</p>
  }

  return (
    <>
      <div className="topbar">
        <SyncBadge />

        <span className="topbar-user" data-testid="user-email">
          {session.user.email}
        </span>

        <button
          type="button"
          className="topbar-btn"
          onClick={() => supabase.auth.signOut()}
        >
          Log out
        </button>
      </div>

      <div key={userId}>{children}</div>
    </>
  )
}

export default function AuthGate({ children }) {
  if (!cloudEnabled) {
    return children
  }

  return <CloudGate>{children}</CloudGate>
}