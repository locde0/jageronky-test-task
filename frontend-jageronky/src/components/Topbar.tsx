import type { Order } from '../api'
import './Topbar.css'

interface Props {
  orders: Order[]
  onOpenDrawer: (mode: 'create' | 'import') => void
}

export default function Topbar({ orders, onOpenDrawer }: Props) {
  const n = orders.length
  const tax = orders.reduce((s, o) => s + o.tax_amount, 0)
  const rev = orders.reduce((s, o) => s + o.total_amount, 0)
  const avg = n ? orders.reduce((s, o) => s + o.composite_tax_rate, 0) / n : 0

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">Delivery Orders</div>
        <div className="topbar-sub">New York State · Real-time</div>
      </div>
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{n}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tax Collected</div>
          <div className="stat-value light">${tax.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          <div className="stat-value light">${rev.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Tax Rate</div>
          <div className="stat-value">{(avg * 100).toFixed(3)}%</div>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="btn btn-ghost" onClick={() => onOpenDrawer('create')}>+ Manual</button>
        <button className="btn btn-warm" onClick={() => onOpenDrawer('import')}>⬆ Import CSV</button>
      </div>
    </div>
  )
}
