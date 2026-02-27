import { useState, useCallback, useEffect } from 'react'
import { getOrders } from '../api'
import type { Order } from '../api'
import './OrdersList.css'

const PAGE_SIZE = 10

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function OrdersList() {
  const [items, setItems] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadOrders = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getOrders({ limit: PAGE_SIZE, offset: p * PAGE_SIZE })
      if (data.items.length === 0 && p > 0) {
        setPage(0)
        return
      }
      setItems(data.items)
      const knownCount = p * PAGE_SIZE + data.items.length
      setTotal(data.items.length < PAGE_SIZE ? knownCount : data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(page)
  }, [page, loadOrders])

  const handlePageChange = (p: number) => {
    if (p < 0 || p >= totalPages) return
    setExpandedId(null)
    setPage(p)
  }

  return (
    <div className="orders-wrap">
      {loading && <div className="orders-loading">Завантаження…</div>}
      {error && <div className="orders-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="orders-empty">Замовлень поки немає</div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="orders-table-scroll">
            <table className="orders-table">
              <thead>
                <tr>
                  <th className="orders-th-id">#</th>
                  <th>Location</th>
                  <th className="orders-th-num">Subtotal</th>
                  <th className="orders-th-num">Tax</th>
                  <th className="orders-th-num">Total</th>
                  <th className="orders-th-num">Rate</th>
                  <th>Jurisdiction</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const isExpanded = expandedId === o.id
                  const jurisdictionLabel = o.jurisdictions
                    ? [o.jurisdictions.state, o.jurisdictions.county, o.jurisdictions.city].filter(Boolean).join(', ')
                    : '—'
                  return (
                    <tr
                      key={o.id}
                      className={`orders-row${isExpanded ? ' orders-row--expanded' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : o.id)}
                    >
                      <td className="orders-td-id">{o.id}</td>
                      <td className="orders-td-loc">
                        <span className="orders-coord">{o.latitude.toFixed(4)}</span>
                        <span className="orders-coord-sep">,</span>
                        <span className="orders-coord">{o.longitude.toFixed(4)}</span>
                      </td>
                      <td className="orders-td-num">${o.subtotal.toFixed(2)}</td>
                      <td className="orders-td-num">${o.tax_amount.toFixed(2)}</td>
                      <td className="orders-td-num orders-td-total">${o.total_amount.toFixed(2)}</td>
                      <td className="orders-td-num">{(o.composite_tax_rate * 100).toFixed(2)}%</td>
                      <td className="orders-td-jur">{jurisdictionLabel}</td>
                      <td className="orders-td-date">{formatDate(o.timestamp)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {expandedId !== null && (() => {
            const o = items.find(i => i.id === expandedId)
            if (!o) return null
            return (
              <div className="orders-detail">
                <div className="orders-detail-header">
                  <strong>Order #{o.id}</strong>
                  <button type="button" className="orders-detail-close" onClick={() => setExpandedId(null)}>×</button>
                </div>
                <div className="orders-detail-grid">
                  <div className="orders-detail-section">
                    <h4>Tax Breakdown</h4>
                    <div className="orders-detail-row"><span>State</span><span>{(o.breakdown.state_rate * 100).toFixed(2)}%</span></div>
                    <div className="orders-detail-row"><span>County</span><span>{(o.breakdown.county_rate * 100).toFixed(2)}%</span></div>
                    <div className="orders-detail-row"><span>City</span><span>{(o.breakdown.city_rate * 100).toFixed(2)}%</span></div>
                    {o.breakdown.special_rates?.length > 0 && (
                      <div className="orders-detail-row"><span>Special</span><span>{o.breakdown.special_rates.map(r => (r * 100).toFixed(2) + '%').join(', ')}</span></div>
                    )}
                    <div className="orders-detail-row orders-detail-row--total"><span>Composite</span><span>{(o.composite_tax_rate * 100).toFixed(2)}%</span></div>
                  </div>
                  <div className="orders-detail-section">
                    <h4>Amounts</h4>
                    <div className="orders-detail-row"><span>Subtotal</span><span>${o.subtotal.toFixed(2)}</span></div>
                    <div className="orders-detail-row"><span>Tax</span><span>${o.tax_amount.toFixed(2)}</span></div>
                    <div className="orders-detail-row orders-detail-row--total"><span>Total</span><span>${o.total_amount.toFixed(2)}</span></div>
                  </div>
                  {o.jurisdictions && (
                    <div className="orders-detail-section">
                      <h4>Jurisdictions</h4>
                      {o.jurisdictions.state && <div className="orders-detail-row"><span>State</span><span>{o.jurisdictions.state}</span></div>}
                      {o.jurisdictions.county && <div className="orders-detail-row"><span>County</span><span>{o.jurisdictions.county}</span></div>}
                      {o.jurisdictions.city && <div className="orders-detail-row"><span>City</span><span>{o.jurisdictions.city}</span></div>}
                      {o.jurisdictions.special?.length > 0 && (
                        <div className="orders-detail-row"><span>Special</span><span>{o.jurisdictions.special.join(', ')}</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          <div className="orders-pagination">
            <span className="orders-pagination-info">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} з {total}
            </span>
            <div className="orders-pagination-btns">
              <button disabled={page === 0} onClick={() => handlePageChange(0)} title="Перша сторінка">«</button>
              <button disabled={page === 0} onClick={() => handlePageChange(page - 1)}>‹</button>
              <span className="orders-pagination-page">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => handlePageChange(page + 1)}>›</button>
              <button disabled={page >= totalPages - 1} onClick={() => handlePageChange(totalPages - 1)} title="Остання сторінка">»</button>
            </div>
            <button className="orders-refresh" onClick={() => loadOrders(page)} title="Оновити">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
