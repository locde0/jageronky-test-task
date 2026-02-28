import { useState, useMemo } from 'react'
import type { Order } from '../api'
import './OrdersPanel.css'

const PER_PAGE = 8

interface Props {
  orders: Order[]
  total: number
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function OrdersPanel({ orders, total, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = orders.filter(o => {
      const j = o.jurisdictions
      const jText = [j?.state, j?.county, j?.city, ...(j?.special ?? [])].filter(Boolean).join(' ').toLowerCase()
      return (
        String(o.id).includes(q) ||
        o.latitude.toString().includes(q) ||
        o.longitude.toString().includes(q) ||
        o.subtotal.toString().includes(q) ||
        jText.includes(q)
      )
    })
    if (sort === 'highest') list = [...list].sort((a, b) => b.composite_tax_rate - a.composite_tax_rate)
    else if (sort === 'lowest') list = [...list].sort((a, b) => a.total_amount - b.total_amount)
    return list
  }, [orders, search, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, pages)
  const slice = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  return (
    <div className="orders-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Order Queue</div>
          <div className="panel-count">{total} record{total !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div className="filter-row">
        <input
          className="filter-input"
          placeholder="ID, county, city…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <select className="filter-select" value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1) }}>
          <option value="newest">Newest</option>
          <option value="highest">Highest Tax</option>
          <option value="lowest">Lowest Total</option>
        </select>
      </div>
      <div className="orders-list">
        {slice.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <div>No orders found</div>
            <div style={{ marginTop: 6, opacity: 0.6 }}>Import CSV or create manually</div>
          </div>
        ) : slice.map((o, i) => {
          const bd = o.breakdown
          return (
            <div
              key={o.id}
              className={`order-card${selectedId === o.id ? ' selected' : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => onSelect(o.id)}
            >
              <div className="order-top">
                <div className="order-id">ORD-{String(o.id).padStart(3, '0')}</div>
                <div className="order-total">${o.total_amount.toFixed(2)}</div>
              </div>
              <div className="order-coords">{o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}</div>
              <div className="order-sep" />
              <div className="order-bottom">
                <div className="order-tax">
                  Tax <span className="order-tax-hl">{(o.composite_tax_rate * 100).toFixed(3)}%</span> · ${o.tax_amount.toFixed(2)}
                </div>
                <div className="chips">
                  <span className="chip chip-st">ST {(bd.state_rate * 100).toFixed(0)}%</span>
                  <span className="chip chip-co">CO {(bd.county_rate * 100).toFixed(1)}%</span>
                  {bd.special_rates?.length > 0 && <span className="chip chip-sp">SP</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length > PER_PAGE && (
        <div className="pagination">
          <div className="page-info">Page {safePage} of {pages}</div>
          <div className="page-btns">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn${p === safePage ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
