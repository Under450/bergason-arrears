import React, { useEffect, useState } from 'react'
import { db } from '../firebase.js'
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore'

export default function BlocksPage() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { fetchBlocks() }, [])

  async function fetchBlocks() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'arrears_blocks'), orderBy('createdAt', 'desc')))
    const data = []
    snap.forEach(d => data.push({ id: d.id, ...d.data() }))
    setBlocks(data)
    setLoading(false)
  }

  async function addBlock(e) {
    e.preventDefault()
    setAdding(true)
    await addDoc(collection(db, 'arrears_blocks'), { name, address, createdAt: serverTimestamp() })
    setName(''); setAddress(''); setShowForm(false)
    await fetchBlocks()
    setAdding(false)
  }

  const inputStyle = {
    flex: 1, padding: '10px 14px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    color: 'var(--text-primary)', fontSize: 13,
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Blocks</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>Manage your property blocks</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '9px 18px', background: 'var(--red)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13 }}>
          + Add Block
        </button>
      </div>

      {showForm && (
        <form onSubmit={addBlock} style={{ display: 'flex', gap: 12, marginBottom: 24, padding: 20, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <input placeholder="Block name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
          <input placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
          <button type="submit" disabled={adding} style={{ padding: '10px 20px', background: 'var(--green)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13 }}>
            {adding ? 'Saving...' : 'Save'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : blocks.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', padding: 40, textAlign: 'center' }}>No blocks yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {blocks.map(b => (
            <div key={b.id} style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{b.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{b.address || 'No address'}</div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('en-GB') : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
