import { useState, useMemo } from 'react'
import { createOrder } from '../api'
import type { Order } from '../api'
import './CreateOrder.css'

function getNowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function CreateOrder() {
  const initialForm = useMemo(() => ({
    latitude: '',
    longitude: '',
    subtotal: '',
    timestamp: getNowLocal(),
  }), [])

  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error'
    order?: Order
    message?: string
  }>({ type: 'idle' })

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validate = (): string | null => {
    const lat = Number(form.latitude)
    const lon = Number(form.longitude)
    const sub = Number(form.subtotal)
    if (Number.isNaN(lat) || form.latitude.trim() === '') return 'Вкажіть latitude (число).'
    if (Number.isNaN(lon) || form.longitude.trim() === '') return 'Вкажіть longitude (число).'
    if (Number.isNaN(sub) || form.subtotal.trim() === '') return 'Вкажіть subtotal (число).'
    if (sub < 0) return 'Subtotal має бути ≥ 0.'
    if (!form.timestamp.trim()) return 'Вкажіть дату та час.'
    const ts = new Date(form.timestamp)
    if (Number.isNaN(ts.getTime())) return 'Невірний формат дати/часу.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      setResult({ type: 'error', message: err })
      return
    }
    setResult({ type: 'loading' })
    try {
      const timestamp = new Date(form.timestamp).toISOString()
      const order = await createOrder({
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        subtotal: Number(form.subtotal),
        timestamp,
      })
      setResult({ type: 'success', order })
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Помилка' })
    }
  }

  return (
    <div className="create-form-wrap">
      <form className="create-form" onSubmit={handleSubmit}>
        <label className="create-form-label">
          Latitude
          <input
            type="number"
            step="any"
            placeholder="40.7128"
            value={form.latitude}
            onChange={(e) => setField('latitude', e.target.value)}
          />
        </label>
        <label className="create-form-label">
          Longitude
          <input
            type="number"
            step="any"
            placeholder="-74.0060"
            value={form.longitude}
            onChange={(e) => setField('longitude', e.target.value)}
          />
        </label>
        <label className="create-form-label">
          Subtotal ($)
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.subtotal}
            onChange={(e) => setField('subtotal', e.target.value)}
          />
        </label>
        <label className="create-form-label">
          Дата і час
          <div className="create-form-datetime-row">
            <input
              type="datetime-local"
              value={form.timestamp}
              onChange={(e) => setField('timestamp', e.target.value)}
            />
            <button
              type="button"
              className="create-form-now-btn"
              onClick={() => setField('timestamp', getNowLocal())}
            >
              Зараз
            </button>
          </div>
        </label>
        <button type="submit" className="create-form-submit" disabled={result.type === 'loading'}>
          {result.type === 'loading' ? 'Відправка…' : 'Створити'}
        </button>
      </form>
      {result.type !== 'idle' && (
        <div className={`create-form-result create-form-result--${result.type}`}>
          {result.type === 'loading' && <p>Відправка замовлення…</p>}
          {result.type === 'error' && <p>{result.message}</p>}
          {result.type === 'success' && result.order && (
            <div className="create-form-success">
              <p><strong>Замовлення створено</strong> (id: {result.order.id})</p>
              <p>Total: ${result.order.total_amount.toFixed(2)} · Tax: ${result.order.tax_amount.toFixed(2)} · Rate: {(result.order.composite_tax_rate * 100).toFixed(2)}%</p>
              <p className="create-form-breakdown">
                Breakdown: state {(result.order.breakdown.state_rate * 100).toFixed(2)}%, county {(result.order.breakdown.county_rate * 100).toFixed(2)}%, city {(result.order.breakdown.city_rate * 100).toFixed(2)}%
                {result.order.breakdown.special_rates?.length ? ` · special: ${result.order.breakdown.special_rates.map(r => (r * 100).toFixed(2) + '%').join(', ')}` : ''}
              </p>
              {result.order.jurisdictions && (
                <p className="create-form-jurisdictions">
                  Jurisdictions: {[
                    result.order.jurisdictions.state,
                    result.order.jurisdictions.county,
                    result.order.jurisdictions.city,
                  ].filter(Boolean).join(', ')}
                  {result.order.jurisdictions.special?.length ? ` · ${result.order.jurisdictions.special.join(', ')}` : ''}
                </p>
              )}
              <button
                type="button"
                className="create-form-reset"
                onClick={() => {
                  setForm({ latitude: '', longitude: '', subtotal: '', timestamp: getNowLocal() })
                  setResult({ type: 'idle' })
                }}
              >
                + Нове замовлення
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
