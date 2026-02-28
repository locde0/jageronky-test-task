import { useState } from 'react'
import { createOrder } from '../api'
import type { Order } from '../api'
import './Drawer.css'

function getNowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (order: Order) => void
}

export default function CreateDrawer({ open, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<'entry' | 'preview'>('entry')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [sub, setSub] = useState('')
  const [ts, setTs] = useState(getNowLocal())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toNum = (s: string) => parseFloat(s.replace(',', '.'))
  const latN = toNum(lat)
  const lonN = toNum(lon)
  const subN = toNum(sub)

  const handleSubmit = async () => {
    if (!latN || !lonN || !subN) { setError('Fill all fields'); return }
    setLoading(true); setError('')
    try {
      const order = await createOrder({
        latitude: latN, longitude: lonN, subtotal: subN,
        timestamp: new Date(ts).toISOString(),
      })
      onCreated(order)
      setLat(''); setLon(''); setSub(''); setTs(getNowLocal()); setTab('entry')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`drawer${open ? ' open' : ''}`}>
        <div className="drawer-header">
          <div>
            <div className="drawer-title">New Order</div>
            <div className="drawer-sub">Manual Entry</div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div className="tabs">
            <div className={`tab${tab === 'entry' ? ' active' : ''}`} onClick={() => setTab('entry')}>Details</div>
            <div className={`tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>Tax Preview</div>
          </div>

          {tab === 'entry' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input className="form-input" placeholder="40.7128" type="text" inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input className="form-input" placeholder="-74.0059" type="text" inputMode="decimal" value={lon} onChange={e => setLon(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Subtotal ($)</label>
                <input className="form-input" placeholder="49.99" type="text" inputMode="decimal" value={sub} onChange={e => setSub(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date / Time</label>
                <input className="form-input" type="datetime-local" value={ts} onChange={e => setTs(e.target.value)} />
              </div>
            </>
          )}

          {tab === 'preview' && (
            <div className="tax-preview">
              <div className="tax-preview-label">Tax Breakdown (calculated on submit)</div>
              <div className="tax-row"><span className="tax-key">Latitude</span><span className="tax-val">{lat || '—'}</span></div>
              <div className="tax-row"><span className="tax-key">Longitude</span><span className="tax-val">{lon || '—'}</span></div>
              <div className="tax-row"><span className="tax-key">Subtotal</span><span className="tax-val">{subN ? `$${subN.toFixed(2)}` : '—'}</span></div>
              <div className="tax-row tax-row-hint">
                <span className="tax-key">Tax will be calculated by the server based on delivery coordinates</span>
              </div>
            </div>
          )}

          {error && <div className="drawer-error">{error}</div>}
        </div>
        <div className="drawer-footer">
          <button className="btn btn-ghost drawer-btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-warm drawer-btn-main" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating…' : 'Create Order →'}
          </button>
        </div>
      </div>
    </>
  )
}
