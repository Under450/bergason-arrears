import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase.js'
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, updateDoc, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { jsPDF } from 'jspdf'
import { daysOverdue } from '../components/ArrearsTable.jsx'

const STAGE_CONFIG = {
  reminder:     { label: 'Reminder',     color: 'var(--blue)',  next: 'final_notice' },
  final_notice: { label: 'Final Notice', color: 'var(--amber)', next: 'pap' },
  pap:          { label: 'PAP Letter',   color: 'var(--red)',   next: 'legal' },
  legal:        { label: 'Legal Action', color: '#bf5af2',      next: null },
}

const EVENT_ICONS = {
  reminder_sent: '📨', final_notice_sent: '⚠️', pap_issued: '⚖️',
  legal_escalated: '🔴', payment_received: '💰', note_added: '📝', stage_changed: '🔄',
}

function determineNextStage(days) {
  if (days > 60) return 'legal'
  if (days > 30) return 'final_notice'
  return 'reminder'
}

export default function CaseView() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [caseData, setCaseData] = useState(null)
  const [arrears, setArrears] = useState(null)
  const [leaseholder, setLeaseholder] = useState(null)
  const [block, setBlock] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  useEffect(() => { fetchCase() }, [caseId])

  async function fetchCase() {
    setLoading(true)
    try {
      const caseSnap = await getDoc(doc(db, 'arrears_cases', caseId))
      if (!caseSnap.exists()) { setLoading(false); return }
      const c = { id: caseSnap.id, ...caseSnap.data() }
      setCaseData(c)

      const [arrearsSnap, eventsSnap] = await Promise.all([
        getDoc(doc(db, 'arrears_arrears', c.arrearsId)),
        getDocs(query(collection(db, 'arrears_case_events'), where('caseId', '==', caseId), orderBy('createdAt', 'desc'))),
      ])

      const a = arrearsSnap.exists() ? { id: arrearsSnap.id, ...arrearsSnap.data() } : null
      setArrears(a)

      if (a?.leaseholderId) {
        const lhSnap = await getDoc(doc(db, 'arrears_leaseholders', a.leaseholderId))
        const lh = lhSnap.exists() ? { id: lhSnap.id, ...lhSnap.data() } : null
        setLeaseholder(lh)
        if (lh?.blockId) {
          const bSnap = await getDoc(doc(db, 'arrears_blocks', lh.blockId))
          setBlock(bSnap.exists() ? { id: bSnap.id, ...bSnap.data() } : null)
        }
      }

      const evts = []
      eventsSnap.forEach(d => evts.push({ id: d.id, ...d.data() }))
      setEvents(evts)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSendNextLetter() {
    setActionLoading(true)
    const days = daysOverdue(arrears?.dueDate)
    const nextStage = determineNextStage(days)
    const labels = { reminder: 'Reminder letter sent', final_notice: 'Final notice letter sent', pap: 'Pre-Action Protocol letter issued', legal: 'Case escalated to legal team' }
    const types = { reminder: 'reminder_sent', final_notice: 'final_notice_sent', pap: 'pap_issued', legal: 'legal_escalated' }

    await addDoc(collection(db, 'arrears_case_events'), {
      caseId, eventType: types[nextStage], note: labels[nextStage], createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'arrears_cases', caseId), {
      stage: nextStage, lastAction: serverTimestamp(),
      nextAction: Timestamp.fromDate(new Date(Date.now() + 14 * 86400000)),
    })
    await fetchCase()
    showToast(`${labels[nextStage]}`)
    setActionLoading(false)
  }

  async function handleRecordPayment(e) {
    e.preventDefault()
    if (!payAmount || isNaN(payAmount)) return
    setPayLoading(true)
    const amount = parseFloat(payAmount)
    const newBalance = Math.max(0, Number(arrears.balance) - amount)

    await addDoc(collection(db, 'arrears_payments'), {
      arrearsId: arrears.id, amount, paymentDate: serverTimestamp(),
    })
    await updateDoc(doc(db, 'arrears_arrears', arrears.id), { balance: newBalance })
    await addDoc(collection(db, 'arrears_case_events'), {
      caseId, eventType: 'payment_received',
      note: `Payment of £${amount.toFixed(2)} received. New balance: £${newBalance.toFixed(2)}`,
      createdAt: serverTimestamp(),
    })
    if (newBalance === 0) {
      await updateDoc(doc(db, 'arrears_cases', caseId), { status: 'resolved' })
      await updateDoc(doc(db, 'arrears_arrears', arrears.id), { status: 'resolved' })
    }

    setPayAmount(''); setShowPayment(false)
    await fetchCase()
    showToast(`£${amount.toFixed(2)} recorded. Balance reduced to £${newBalance.toFixed(2)}`)
    setPayLoading(false)
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    await addDoc(collection(db, 'arrears_case_events'), {
      caseId, eventType: 'note_added', note: noteText.trim(), createdAt: serverTimestamp(),
    })
    setNoteText(''); setShowNote(false)
    await fetchCase()
    showToast('Note added to timeline')
  }

  async function handleEscalate() {
    setActionLoading(true)
    await updateDoc(doc(db, 'arrears_cases', caseId), { stage: 'legal', status: 'escalated' })
    await addDoc(collection(db, 'arrears_case_events'), {
      caseId, eventType: 'legal_escalated', note: 'Case manually escalated to legal action.', createdAt: serverTimestamp(),
    })
    await fetchCase()
    showToast('Case escalated to legal action', 'warning')
    setActionLoading(false)
  }

  function generatePDF() {
    const days = daysOverdue(arrears?.dueDate)
    const stage = caseData?.stage || 'reminder'
    const doc = new jsPDF()
    const balance = `£${Number(arrears?.balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
    const property = leaseholder?.property || 'your property'
    const dueStr = arrears?.dueDate
      ? (arrears.dueDate.toDate ? arrears.dueDate.toDate() : new Date(arrears.dueDate)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'the due date'

    doc.setFillColor(28, 28, 30)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(240, 240, 245)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('BERGASON PROPERTY SERVICES', 20, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`Arrears Recovery — ${new Date().toLocaleDateString('en-GB')}`, 20, 26)
    doc.text(`Case Ref: ${caseId.substring(0, 8).toUpperCase()}`, 20, 33)

    doc.setTextColor(28, 28, 30)
    const stageLabels = { reminder: 'REMINDER LETTER', final_notice: 'FINAL NOTICE', pap: 'PRE-ACTION PROTOCOL LETTER', legal: 'NOTICE OF LEGAL PROCEEDINGS' }
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text(stageLabels[stage] || 'RECOVERY LETTER', 20, 54)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 20, 63)
    doc.setDrawColor(200, 200, 200); doc.line(20, 68, 190, 68)

    doc.setFont('helvetica', 'bold')
    doc.text(`Dear ${leaseholder?.name || 'Leaseholder'},`, 20, 80)
    doc.setFont('helvetica', 'normal')

    const bodyMap = {
      reminder: `We write regarding outstanding service charges for ${property}.\n\nOur records show that the sum of ${balance} remains unpaid, which was due on ${dueStr}. This account is now ${days} days overdue.\n\nWe respectfully request that payment be made within 14 days to avoid further action being taken.\n\nIf you have already made payment, please disregard this notice. Should you wish to discuss a payment arrangement, please contact us immediately.`,
      final_notice: `FINAL DEMAND FOR PAYMENT\n\nDespite our previous correspondence, the sum of ${balance} for service charges relating to ${property} remains outstanding at ${days} days overdue.\n\nUnless payment is received in full within 7 days, we will have no alternative but to commence formal legal proceedings to recover the debt together with any costs incurred.\n\nThis is your final opportunity to settle this matter without legal action.`,
      pap: `PRE-ACTION PROTOCOL LETTER\n\nWe write in connection with outstanding service charge arrears of ${balance} in respect of ${property}.\n\nIn accordance with the Pre-Action Protocol, we hereby provide formal notice of our intention to issue proceedings in the First-tier Tribunal (Property Chamber) for recovery of the above sum, together with interest and costs.\n\nYou have 30 days from the date of this letter to respond. Failure to do so will result in proceedings being issued without further notice.`,
      legal: `NOTICE OF LEGAL PROCEEDINGS\n\nThis matter has been referred to our legal team. Proceedings will be issued in respect of the outstanding sum of ${balance} in relation to ${property}.\n\nAll future correspondence should be directed to our legal representatives. Additional costs and interest will now accrue on the outstanding balance.`,
    }

    const lines = doc.splitTextToSize(bodyMap[stage] || bodyMap.reminder, 170)
    doc.text(lines, 20, 90)

    const ph = doc.internal.pageSize.height
    doc.setDrawColor(200, 200, 200); doc.line(20, ph - 35, 190, ph - 35)
    doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text('Bergason Property Services | Arrears Recovery Platform | Confidential', 20, ph - 25)
    doc.text(`Case Ref: ${caseId.substring(0, 8).toUpperCase()} | ${property}`, 20, ph - 18)

    doc.save(`bergason-${stage}-${(leaseholder?.name || 'leaseholder').replace(/\s/g, '-').toLowerCase()}.pdf`)
    showToast('PDF letter generated and downloading...')
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    color: 'var(--text-primary)', fontSize: 13, marginTop: 8,
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-tertiary)' }}>Loading case...</div>
  if (!caseData) return <div style={{ padding: 32, color: 'var(--red)' }}>Case not found. <button onClick={() => navigate('/arrears/')} style={{ color: 'var(--blue)', background: 'none', marginLeft: 8 }}>← Back</button></div>

  const days = daysOverdue(arrears?.dueDate)
  const stage = caseData.stage || 'reminder'
  const sc = STAGE_CONFIG[stage] || STAGE_CONFIG.reminder
  const urgencyColor = days > 60 ? 'var(--red)' : days > 30 ? 'var(--amber)' : 'var(--green)'
  const stages = ['reminder', 'final_notice', 'pap', 'legal']

  return (
    <div style={{ padding: 32, maxWidth: 1100, position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '12px 20px',
          background: toast.type === 'warning' ? 'var(--amber-dim)' : 'var(--green-dim)',
          border: `1px solid ${toast.type === 'warning' ? 'var(--amber)' : 'var(--green)'}`,
          borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: 13,
          color: toast.type === 'warning' ? 'var(--amber)' : 'var(--green)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/arrears/')} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)',
          border: '1px solid var(--border)', color: 'var(--text-secondary)',
          padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
        }}>← Back</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{leaseholder?.name || 'Unknown'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {leaseholder?.property || '—'}{block ? ` · ${block.name}` : ''}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ padding: '6px 14px', background: `${sc.color}22`, border: `1px solid ${sc.color}`, borderRadius: 20, color: sc.color, fontWeight: 700, fontSize: 12 }}>
            {sc.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Leaseholder details */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16, fontWeight: 600 }}>LEASEHOLDER DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[['Name', leaseholder?.name], ['Email', leaseholder?.email || '—'], ['Phone', leaseholder?.phone || '—'], ['Property', leaseholder?.property || '—'], ['Block', block?.name || '—'], ['Address', block?.address || '—']].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrears summary */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: `1px solid ${urgencyColor}44`, padding: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16, fontWeight: 600 }}>ARREARS SUMMARY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Outstanding Balance</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: urgencyColor, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                  £{Number(arrears?.balance || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Days Overdue</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: urgencyColor, fontFamily: 'var(--font-mono)' }}>{days}d</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Due Date</div>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {arrears?.dueDate ? (arrears.dueDate.toDate ? arrears.dueDate.toDate() : new Date(arrears.dueDate)).toLocaleDateString('en-GB') : '—'}
                </div>
              </div>
            </div>
            {/* Stage bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>RECOVERY STAGE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {stages.map(s => {
                  const ci = stages.indexOf(stage), si = stages.indexOf(s)
                  return <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: s === stage ? STAGE_CONFIG[s].color : si < ci ? `${STAGE_CONFIG[s].color}60` : 'var(--border)', transition: 'var(--transition)' }} title={STAGE_CONFIG[s].label} />
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {['Reminder', 'Final Notice', 'PAP', 'Legal'].map(l => <div key={l} style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{l}</div>)}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16, fontWeight: 600 }}>CASE TIMELINE ({events.length} events)</div>
            {events.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '20px 0' }}>No events yet. Use the action panel to begin recovery.</div>
            ) : events.map((evt, i) => (
              <div key={evt.id} style={{ display: 'flex', gap: 14, paddingBottom: i < events.length - 1 ? 20 : 0, position: 'relative' }}>
                {i < events.length - 1 && <div style={{ position: 'absolute', left: 15, top: 28, width: 1, height: 'calc(100% - 8px)', background: 'var(--border)' }} />}
                <div style={{ width: 30, height: 30, flexShrink: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, position: 'relative', zIndex: 1 }}>
                  {EVENT_ICONS[evt.eventType] || '•'}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                    {evt.eventType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  {evt.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{evt.note}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {evt.createdAt?.toDate ? evt.createdAt.toDate().toLocaleString('en-GB') : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16, fontWeight: 600 }}>ACTION PANEL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              <button onClick={handleSendNextLetter} disabled={actionLoading} style={{ padding: '10px 18px', background: 'var(--blue)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13, textAlign: 'left', opacity: actionLoading ? 0.6 : 1 }}>
                📨 Send Next Letter
                <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>→ {STAGE_CONFIG[determineNextStage(days)]?.label}</div>
              </button>

              <button onClick={() => { setShowPayment(!showPayment); setShowNote(false) }} style={{ padding: '10px 18px', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13 }}>
                💰 Record Payment
              </button>

              <button onClick={() => { setShowNote(!showNote); setShowPayment(false) }} style={{ padding: '10px 18px', background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13 }}>
                📝 Add Note
              </button>

              <button onClick={handleEscalate} disabled={actionLoading || stage === 'legal'} style={{ padding: '10px 18px', background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13, opacity: stage === 'legal' ? 0.4 : 1, cursor: stage === 'legal' ? 'not-allowed' : 'pointer' }}>
                🔴 Escalate to Legal
              </button>

              <button onClick={generatePDF} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 13, transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
              >
                📄 Generate PDF Letter
              </button>
            </div>

            {showPayment && (
              <form onSubmit={handleRecordPayment} style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Payment amount (£)</div>
                <input type="number" min="0.01" step="0.01" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} required style={inputStyle} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="submit" disabled={payLoading} style={{ flex: 1, padding: '10px', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13 }}>
                    {payLoading ? 'Saving...' : 'Confirm'}
                  </button>
                  <button type="button" onClick={() => setShowPayment(false)} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 13 }}>Cancel</button>
                </div>
              </form>
            )}

            {showNote && (
              <form onSubmit={handleAddNote} style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Note</div>
                <textarea placeholder="Add a case note..." value={noteText} onChange={e => setNoteText(e.target.value)} required rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13 }}>Save Note</button>
                  <button type="button" onClick={() => setShowNote(false)} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 13 }}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Case meta */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 600 }}>CASE INFO</div>
            {[
              ['Case ID', caseId.substring(0, 8).toUpperCase()],
              ['Status', caseData.status || '—'],
              ['Last Action', caseData.lastAction?.toDate ? caseData.lastAction.toDate().toLocaleDateString('en-GB') : 'None'],
              ['Next Action', caseData.nextAction?.toDate ? caseData.nextAction.toDate().toLocaleDateString('en-GB') : 'Not set'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
