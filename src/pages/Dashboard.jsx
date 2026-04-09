import React, { useEffect, useState } from 'react'
import { db } from '../firebase.js'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import KPI from '../components/KPI.jsx'
import ArrearsTable, { daysOverdue } from '../components/ArrearsTable.jsx'

const PoundIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="2" y="13" fontSize="14" fontWeight="700" fill="currentColor">£</text></svg>
const CaseIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const AlertIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 13H1L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const RecoveredIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [recoveredAmount, setRecoveredAmount] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch all collections in parallel
      const [blocksSnap, leaseholdersSnap, arrearsSnap, casesSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, 'arrears_blocks')),
        getDocs(collection(db, 'arrears_leaseholders')),
        getDocs(collection(db, 'arrears_arrears')),
        getDocs(collection(db, 'arrears_cases')),
        getDocs(collection(db, 'arrears_payments')),
      ])

      const blocks = {}
      blocksSnap.forEach(d => blocks[d.id] = d.data())

      const leaseholders = {}
      leaseholdersSnap.forEach(d => leaseholders[d.id] = { id: d.id, ...d.data() })

      const cases = {}
      casesSnap.forEach(d => cases[d.data().arrearsId] = { id: d.id, ...d.data() })

      // Build flat rows
      const flat = []
      arrearsSnap.forEach(d => {
        const a = d.data()
        const lh = leaseholders[a.leaseholderId] || {}
        const block = blocks[lh.blockId] || {}
        const c = cases[d.id] || {}
        flat.push({
          id: d.id,
          balance: a.balance || 0,
          dueDate: a.dueDate,
          leaseholderName: lh.name || '—',
          email: lh.email || '',
          phone: lh.phone || '',
          property: lh.property || '',
          blockName: block.name || '',
          blockAddress: block.address || '',
          leaseholderId: a.leaseholderId,
          caseId: c.id || null,
          caseStage: c.stage || 'reminder',
          caseStatus: c.status || 'active',
        })
      })

      flat.sort((a, b) => b.balance - a.balance)
      setRows(flat)

      // Payments this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      let recovered = 0
      paymentsSnap.forEach(d => {
        const p = d.data()
        const pd = p.paymentDate?.toDate ? p.paymentDate.toDate() : new Date(p.paymentDate)
        if (pd >= startOfMonth) recovered += Number(p.amount || 0)
      })
      setRecoveredAmount(recovered)
    } catch (err) {
      console.error('Error fetching data:', err)
    }
    setLoading(false)
  }

  const totalArrears = rows.reduce((s, r) => s + Number(r.balance), 0)
  const activeCases = rows.filter(r => r.caseId && r.caseStatus === 'active').length
  const over60 = rows.filter(r => daysOverdue(r.dueDate) > 60).length

  let filtered = rows
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(r => r.leaseholderName.toLowerCase().includes(q) || r.property.toLowerCase().includes(q) || r.blockName.toLowerCase().includes(q))
  }
  if (filter === 'critical') filtered = filtered.filter(r => daysOverdue(r.dueDate) > 60)
  if (filter === 'warning') filtered = filtered.filter(r => { const d = daysOverdue(r.dueDate); return d > 30 && d <= 60 })
  if (filter === 'active') filtered = filtered.filter(r => daysOverdue(r.dueDate) <= 30)

  const filterBtn = (f, label, color) => ({
    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    border: '1px solid', cursor: 'pointer', transition: 'var(--transition)',
    background: filter === f ? `rgba(${color},0.12)` : 'transparent',
    borderColor: filter === f ? `rgb(${color})` : 'var(--border)',
    color: filter === f ? `rgb(${color})` : 'var(--text-secondary)',
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KPI label="Total Arrears" value={`£${totalArrears.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} sub={`${rows.length} accounts`} accent="red" icon={<PoundIcon />} />
        <KPI label="Active Cases" value={activeCases} sub="In recovery" accent="blue" icon={<CaseIcon />} />
        <KPI label="Critical (60d+)" value={over60} sub="Immediate action" accent={over60 > 0 ? 'red' : 'green'} icon={<AlertIcon />} />
        <KPI label="Recovered This Month" value={`£${recoveredAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} sub="Payments received" accent="green" icon={<RecoveredIcon />} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={filterBtn('all', 'All', '240,240,245')} onClick={() => setFilter('all')}>All</button>
          <button style={filterBtn('critical', '🔴 Critical', '255,59,48')} onClick={() => setFilter('critical')}>🔴 Critical</button>
          <button style={filterBtn('warning', '🟠 Warning', '255,149,0')} onClick={() => setFilter('warning')}>🟠 Warning</button>
          <button style={filterBtn('active', 'Active', '10,132,255')} onClick={() => setFilter('active')}>Active</button>
        </div>
        <div style={{ position: 'relative' }}>
          <input type="text" placeholder="Search name, property, block..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px 8px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, width: 280 }}
          />
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5"/>
            <path d="M9.5 9.5L12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <ArrearsTable rows={filtered} loading={loading} />

      <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
        {[['var(--red)', '>60 days — Legal action'], ['var(--amber)', '30–60 days — Final notice'], ['var(--text-tertiary)', '<30 days — Reminder']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}
