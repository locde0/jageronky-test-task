import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Order } from '../api'
import './MapView.css'

function mkIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker"><div class="map-marker-pulse"></div></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lon) map.flyTo([lat, lon], 12, { duration: 1.2 })
  }, [lat, lon, map])
  return null
}

function MapResize() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200)
    const observer = new ResizeObserver(() => map.invalidateSize())
    if (map.getContainer()) observer.observe(map.getContainer())
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [map])
  return null
}

function MouseTracker({ onMove }: { onMove: (lat: number, lon: number) => void }) {
  useMapEvents({
    mousemove(e) { onMove(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

interface Props {
  orders: Order[]
  selectedOrderId: number | null
  onSelectOrder: (id: number) => void
}

export default function MapView({ orders, selectedOrderId, onSelectOrder }: Props) {
  const [mouse, setMouse] = useState({ lat: 0, lon: 0 })
  const selectedOrder = orders.find(o => o.id === selectedOrderId)
  const overlayLat = selectedOrder?.latitude ?? mouse.lat
  const overlayLon = selectedOrder?.longitude ?? mouse.lon
  const overlayRate = selectedOrder ? (selectedOrder.composite_tax_rate * 100).toFixed(3) + '%' : '—'
  const icon = useRef(mkIcon())

  return (
    <div className="map-wrap">
      <MapContainer center={[42.9, -76.2]} zoom={7} className="map-container" zoomControl={true} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" maxZoom={19} />
        <MapResize />
        <MouseTracker onMove={(lat, lon) => setMouse({ lat, lon })} />
        {selectedOrder && <FlyTo lat={selectedOrder.latitude} lon={selectedOrder.longitude} />}
        {orders.map(o => (
          <Marker key={o.id} position={[o.latitude, o.longitude]} icon={icon.current}
            eventHandlers={{ click: () => onSelectOrder(o.id) }}
          >
            <Popup>
              <div className="map-popup">
                <div className="map-popup-id">ORD-{String(o.id).padStart(3, '0')}</div>
                <div className="map-popup-coords">{o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}</div>
                <div className="map-popup-row">Subtotal: <b>${o.subtotal.toFixed(2)}</b></div>
                <div className="map-popup-row">Rate: <b>{(o.composite_tax_rate * 100).toFixed(3)}%</b></div>
                <div className="map-popup-row">Tax: <b>${o.tax_amount.toFixed(2)}</b></div>
                <div className="map-popup-total">Total: ${o.total_amount.toFixed(2)}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-overlay">
        <div className="map-overlay-title">Delivery Point</div>
        <div className="coord-row"><span className="coord-key">LAT</span><span className="coord-val">{overlayLat ? overlayLat.toFixed(5) : '—'}</span></div>
        <div className="coord-row"><span className="coord-key">LON</span><span className="coord-val">{overlayLon ? overlayLon.toFixed(5) : '—'}</span></div>
        <div className="coord-row coord-rate"><span className="coord-key">RATE</span><span className="coord-val accent">{overlayRate}</span></div>
      </div>
    </div>
  )
}
