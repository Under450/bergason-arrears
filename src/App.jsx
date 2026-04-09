import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { auth } from './firebase.js'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import Dashboard from './pages/Dashboard.jsx'
import CaseView from './pages/CaseView.jsx'
import BlocksPage from './pages/BlocksPage.jsx'

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const GridIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/></svg>
const FolderIcon = () => <Icon d="M1 4a2 2 0 012-2h3.172a2 2 0 011.414.586L8 3h5a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V4z" />
const BuildingIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="13" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6h2M9 6h2M5 9h2M9 9h2M6 15v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const LogoutIcon = () => <Icon d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" />

// ── Auth Screen ────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 14,
    transition: 'var(--transition)',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signInWithEmailAndPassword(auth, 'cjeavons@bergason.co.uk', password)
      onAuth(result.user)
    } catch (err) {
      setError('Incorrect password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '2px solid var(--red)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(255,59,48,0.2)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-tertiary)', marginBottom: 6 }}>BERGASON PROPERTY SERVICES</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Arrears Recovery</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>Internal management portal</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Email display — not editable */}
          <div style={{
            ...inputStyle,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            cursor: 'not-allowed',
          }}>
            cjeavons@bergason.co.uk
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--red-dim)',
              border: '1px solid var(--red)', borderRadius: 'var(--radius)',
              color: 'var(--red)', fontSize: 13,
            }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            padding: '12px', background: 'var(--red)', color: '#fff',
            borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 14,
            opacity: loading ? 0.6 : 1, transition: 'var(--transition)', marginTop: 4,
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-tertiary)', fontSize: 11 }}>
          Restricted access — Bergason Property Services
        </p>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ user, onLogout }) {
  const navItems = [
    { label: 'Dashboard', path: '/arrears/', icon: GridIcon },
    { label: 'All Cases', path: '/arrears/cases', icon: FolderIcon },
    { label: 'Blocks', path: '/arrears/blocks', icon: BuildingIcon },
  ]

  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--red)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '-0.01em', lineHeight: 1.2 }}>BERGASON</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>ARREARS RECOVERY</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '14px 10px', flex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 8, paddingLeft: 8 }}>NAVIGATION</div>
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/arrears/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 'var(--radius)', marginBottom: 2,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--bg-hover)' : 'transparent',
            fontWeight: isActive ? 600 : 400, fontSize: 13,
            transition: 'var(--transition)',
            borderLeft: isActive ? '2px solid var(--red)' : '2px solid transparent',
          })}>
            <Icon />{label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '14px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
          <div style={{
            width: 28, height: 28, background: 'var(--red-dim)',
            border: '1px solid var(--red)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--red)', flexShrink: 0,
          }}>CJ</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Craig Eavons</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Administrator</div>
          </div>
          <button onClick={onLogout} title="Sign out" style={{
            background: 'none', color: 'var(--text-tertiary)', padding: 4,
            borderRadius: 4, transition: 'var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setChecking(false)
    })
    return unsub
  }, [])

  async function handleLogout() {
    await signOut(auth)
    setUser(null)
  }

  if (checking) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border-bright)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!user) return <AuthScreen onAuth={setUser} />

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar user={user} onLogout={handleLogout} />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
          <Routes>
            <Route path="/arrears/" element={<Dashboard />} />
            <Route path="/arrears/cases" element={<Dashboard showAll />} />
            <Route path="/arrears/blocks" element={<BlocksPage />} />
            <Route path="/arrears/case/:caseId" element={<CaseView />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
