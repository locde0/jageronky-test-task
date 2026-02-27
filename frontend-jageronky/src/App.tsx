import { useState } from 'react'
import Threads from './Threads'
import { getOrders } from './api'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'import' | 'create' | 'list'>('create')
  const [apiPanelOpen, setApiPanelOpen] = useState(false)
  const [apiTest, setApiTest] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; message: string }>({ status: 'idle', message: '' })

  const handleTestApi = async () => {
    setApiTest({ status: 'loading', message: '...' })
    try {
      const data = await getOrders({ limit: 5, offset: 0 })
      setApiTest({ status: 'ok', message: `GET /orders ок: отримано ${data.items.length} з ${data.total}` })
    } catch (err) {
      setApiTest({ status: 'error', message: err instanceof Error ? err.message : 'Помилка' })
    }
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="app-wrap">
      <div className="app-background">
        <Threads color={[251/255, 157/255, 81/255]} amplitude={1} enableMouseInteraction />
      </div>
      <div className={`app-content ${apiPanelOpen ? 'app-content-dimmed' : ''}`}>
        <h1>Jageronky test task - Адмінка</h1>
        <div className="app-nav-buttons">
          <button onClick={() => setActiveTab('import')}>Import csv</button>
          <button onClick={() => setActiveTab('create')}>Create order</button>
          <button onClick={() => setActiveTab('list')}>Orders list</button>
        </div>

        {activeTab === 'import' && <p>Тут буде завантаження CSV</p>}

        {activeTab === 'create' && (
          <form onSubmit={handleCreateSubmit}>
            <input type="number" placeholder="Latitude" /><br />
            <input type="number" placeholder="Longitude" /><br />
            <input type="number" placeholder="Subtotal" /><br />
            <button type="submit">Створити</button>
          </form>
        )}

        {activeTab === 'list' && <p>Тут буде таблиця замовлень</p>}
      </div>

      <button
        type="button"
        className="api-fab"
        onClick={() => setApiPanelOpen(true)}
        title="Перевірка API"
      >
        <svg className="api-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
          <path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" />
        </svg>
      </button>

      {apiPanelOpen && (
        <>
          <div
            className="api-panel-overlay"
            aria-hidden
          />
          <aside className="api-panel">
            <div className="api-panel-header">
              <h2 className="api-panel-title">Перевірка API</h2>
              <button
                type="button"
                className="api-panel-close"
                onClick={() => setApiPanelOpen(false)}
                aria-label="Закрити"
              >
                <span className="api-panel-close-x">×</span>
              </button>
            </div>
            <div className="api-panel-body">
              <button
                type="button"
                className="api-panel-check-btn"
                onClick={handleTestApi}
                disabled={apiTest.status === 'loading'}
              >
                {apiTest.status === 'loading' ? 'Перевірка...' : 'Перевірити API (GET /orders)'}
              </button>
              {apiTest.status !== 'idle' && (
                <p className={`api-panel-result api-panel-result--${apiTest.status}`}>
                  {apiTest.message}
                </p>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default App
