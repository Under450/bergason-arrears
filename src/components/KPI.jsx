import React from 'react'

export default function KPI({ label, value, sub, accent, icon }) {
  const colors = {
    red: { bg: 'var(--red-dim)', border: 'rgba(255,59,48,0.25)', text: 'var(--red)' },
    amber: { bg: 'var(--amber-dim)', border: 'rgba(255,149,0,0.25)', text: 'var(--amber)' },
    green: { bg: 'var(--green-dim)', border: 'rgba(52,199,89,0.25)', text: 'var(--green)' },
    blue: { bg: 'var(--blue-dim)', border: 'rgba(10,132,255,0.25)', text: 'var(--blue)' },
  }
  const c = colors[accent] || colors.blue

  return (
    <div style={{
      padding: '20px 24px', background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
      transition: 'border-color 0.18s ease', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = c.border}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 120, height: 120,
        background: c.bg, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 10, fontWeight: 600 }}>
            {label.toUpperCase()}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{
            width: 36, height: 36, background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.text, flexShrink: 0,
          }}>{icon}</div>
        )}
      </div>
    </div>
  )
}
