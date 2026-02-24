import { useState } from 'react'
import Threads from './Threads'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'import' | 'create' | 'list'>('create')

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // тут пізніше буде виклик API
  }

  return (
    <div className="app-wrap">
      <div className="app-background">
        <Threads color={[251/255, 157/255, 81/255]} amplitude={1} enableMouseInteraction />
      </div>
      <div className="app-content">
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
    </div>
  )
}

export default App
