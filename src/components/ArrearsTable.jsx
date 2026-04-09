import React from 'react'
import { useNavigate } from 'react-router-dom'

export function daysOverdue(dueDate) {
  if (!dueDate) return 0
  const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate)
  return Math.max(0, Math.floor((new Date() - due) / 86400000))
}

function urgencyConfig(days) {
  if (days > 60) return { color: 'var(--red)', bg: 'var(--red-dim)', label: 'Critical', dot: '#ff3b30', glow: '0 0 6px var(--red)' }
  if (days > 30) return { color: 'var(--amber)', bg: 'var(--amber-dim)', label: 'Warning', dot: '#ff9500', glow: '0 0 6px var(--amber)' }
  return { color: 'var(--text-secondary)', bg: 'transparent', label: 'Active', dot: '#555565', glow: 'none' }
}

export default function ArrearsTable({ rows, loading }) {
  const navigate = useNavigate()

  const th = {
    padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.07em', color: 'var(--text-tertiary)',
    borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap',
  }

  if (loading) return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
      Loading arrears data...
    </div>
  )

  if (!rows?.length) return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
      No arrears records found.
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['LEASEHOLDER', 'PROPERTY', 'BLOCK', 'BALANCE', 'DUE DATE', 'DAYS OVERDUE', 'STATUS', 'STAGE', ''].map(h => (
              <th key={h} style={{ ...th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const days = daysOverdue(row.dueDate)
            const urg = urgencyConfig(days)
            return (
              <tr key={row.id}
                onClick={() => row.caseId && navigate(`/arrears/case/${row.caseId}`)}
                style={{
                  cursor: row.caseId ? 'pointer' : 'default',
                  background: urg.bg,
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = urg.bg}
              >
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{row.leaseholderName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{row.email || '—'}</div>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{row.property || '—'}</td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{row.blockName || '—'}</td>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: days > 60 ? 'var(--red)' : 'var(--text-primary)' }}>
                  £{Number(row.balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {row.dueDate ? (row.dueDate.toDate ? row.dueDate.toDate() : new Date(row.dueDate)).toLocaleDateString('en-GB') : '—'}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: urg.color }}>{days}d</span>
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: urg.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: urg.dot, boxShadow: urg.glow }} />
                    {urg.label}
                  </span>
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', background: 'var(--bg-secondary)', borderRadius: 4, color: 'var(--text-secondary)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
                    {row.caseStage || 'reminder'}
                  </span>
                </td>
                <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                  {row.caseId ? (
                    <button onClick={e => { e.stopPropagation(); navigate(`/arrears/case/${row.caseId}`) }}
                      style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-bright)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    >View Case →</button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No case</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
