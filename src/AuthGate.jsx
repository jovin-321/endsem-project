import React, { useState } from 'react'

export default function AuthGate({ user, onLogin, onLogout, children }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password.')
      return
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.')
        return
      }
    }

    if (onLogin) {
      onLogin(email.trim())
    }
  }

  return (
    <div>
      {/* Top Bar showing logged-in user with proper spacing */}
      {user && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#f3f4f6' }}>
          <span style={{ fontSize: '0.9rem', color: '#374151' }}>
            ✓ Saved to cloud {user.email || user}
          </span>
          <button className="btn-secondary" onClick={onLogout} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>
            Log out
          </button>
        </div>
      )}

      {/* If user is not logged in, show Auth Gate Modal/Screen */}
      {!user ? (
        <div className="modal-backdrop" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '100%', padding: '24px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
              {isSignUp ? 'Sign up to sync your data to the cloud.' : 'Log in to access your saved cloud data.'}
            </p>

            {errorMsg && (
              <div style={{ color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '12px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', marginBottom: '12px', padding: '8px' }}
              />

              <label style={{ display: 'block', marginBottom: '4px' }}>Password</label>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Enter password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px', paddingRight: '40px' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {isSignUp && (
                <>
                  <label style={{ display: 'block', marginBottom: '4px' }}>Confirm Password</label>
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      placeholder="Confirm password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '8px', paddingRight: '40px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </>
              )}

              <button type="submit" style={{ width: '100%', marginTop: '12px', padding: '10px' }}>
                {isSignUp ? 'Sign Up' : 'Log In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem' }}>
              {isSignUp ? (
                <span>Already have an account? <button style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsSignUp(false)}>Log In</button></span>
              ) : (
                <span>Don't have an account? <button style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsSignUp(true)}>Sign Up</button></span>
              )}
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}