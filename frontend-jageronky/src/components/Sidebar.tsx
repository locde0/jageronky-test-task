import { useState, useEffect } from 'react'
import { getOrders } from '../api'
import './Sidebar.css'

type View = 'map' | 'orders' | 'import'

interface Props {
  activeView: View
  orderCount: number
  onNavigate: (view: View) => void
}

export default function Sidebar({ activeView, orderCount, onNavigate }: Props) {
  const [clock, setClock] = useState('')
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [apiMsg, setApiMsg] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' EST')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const checkApi = async () => {
    setApiStatus('loading')
    try {
      const data = await getOrders({ limit: 1, offset: 0 })
      setApiStatus('ok')
      setApiMsg(`OK · ${data.total} orders`)
    } catch (err) {
      setApiStatus('error')
      setApiMsg(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-eyebrow">◈ New York State</div>
        <div className="logo-name">DroneWell</div>
        <div className="logo-sub">Mission Control</div>
      </div>
      <nav className="nav">
        <div className="nav-section">
          <span className="nav-label">Operations</span>
          <div className={`nav-item${activeView === 'map' ? ' active' : ''}`} onClick={() => onNavigate('map')}>
            <span className="nav-icon">◉</span> Live Map
          </div>
          <div className={`nav-item${activeView === 'orders' ? ' active' : ''}`} onClick={() => onNavigate('orders')}>
            <span className="nav-icon">≡</span> Orders <span className="nav-badge">{orderCount}</span>
          </div>
          <div className={`nav-item${activeView === 'import' ? ' active' : ''}`} onClick={() => onNavigate('import')}>
            <span className="nav-icon">⬆</span> Import CSV
          </div>
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="status-row">
          <div className={`status-dot${apiStatus === 'error' ? ' error' : ''}`} />
          <div className="status-text">
            {apiStatus === 'idle' && 'System Online'}
            {apiStatus === 'loading' && 'Checking…'}
            {apiStatus === 'ok' && apiMsg}
            {apiStatus === 'error' && apiMsg}
          </div>
        </div>
        <div className="clock">{clock}</div>
        <button className="api-check-btn" onClick={checkApi} disabled={apiStatus === 'loading'}>
          Check API
        </button>
      </div>
    </aside>
  )
}
