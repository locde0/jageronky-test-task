import { useState, useEffect, useCallback } from 'react'
import { getOrders } from './api'
import type { Order } from './api'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MapView from './components/MapView'
import OrdersPanel from './components/OrdersPanel'
import CreateDrawer from './components/CreateDrawer'
import ImportDrawer from './components/ImportDrawer'
import './App.css'

type View = 'map' | 'orders' | 'import'
type Drawer = 'create' | 'import' | null

const PAGE_SIZE = 100

function App() {
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [activeView, setActiveView] = useState<View>('map')
  const [drawer, setDrawer] = useState<Drawer>(null)

  const loadOrders = useCallback(async () => {
    try {
      const data = await getOrders({ limit: PAGE_SIZE, offset: 0 })
      setOrders(data.items)
      setOrdersTotal(data.total)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleCreated = (order: Order) => {
    setOrders(prev => [order, ...prev])
    setOrdersTotal(prev => prev + 1)
    setSelectedOrderId(order.id)
  }

  const handleImported = () => { loadOrders() }

  const handleNavigate = (view: View) => {
    if (view === 'import') { setDrawer('import'); return }
    setActiveView(view)
  }

  return (
    <div className="shell">
      <Sidebar activeView={activeView} orderCount={ordersTotal} onNavigate={handleNavigate} />
      <div className="main">
        <Topbar orders={orders} onOpenDrawer={setDrawer} />
        <div className="content">
          <MapView orders={orders} selectedOrderId={selectedOrderId} onSelectOrder={setSelectedOrderId} />
          <OrdersPanel orders={orders} total={ordersTotal} selectedId={selectedOrderId} onSelect={setSelectedOrderId} />
        </div>
      </div>
      <CreateDrawer open={drawer === 'create'} onClose={() => setDrawer(null)} onCreated={handleCreated} />
      <ImportDrawer open={drawer === 'import'} onClose={() => setDrawer(null)} onImported={handleImported} />
    </div>
  )
}

export default App
