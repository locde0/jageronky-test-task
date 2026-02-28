import { useState, useRef, useCallback } from 'react'
import { importOrders } from '../api'
import { isImportSuccess } from '../api/types'
import './Drawer.css'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export default function ImportDrawer({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ type: 'idle' | 'success' | 'duplicate' | 'error'; msg: string }>({ type: 'idle', msg: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) { setResult({ type: 'error', msg: 'Select a .csv file' }); return }
    setFile(f); setResult({ type: 'idle', msg: '' })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true); setProgress(30)
    try {
      setProgress(60)
      const data = await importOrders(file)
      setProgress(100)
      if (isImportSuccess(data)) {
        setResult({ type: 'success', msg: `Imported ${data.inserted} of ${data.total} orders` })
        onImported()
      } else {
        setResult({ type: 'duplicate', msg: data.error })
      }
    } catch (err) {
      setResult({ type: 'error', msg: err instanceof Error ? err.message : 'Error' })
    } finally { setLoading(false) }
  }

  const reset = () => {
    setFile(null); setResult({ type: 'idle', msg: '' }); setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => { reset(); onClose() }

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={handleClose} />
      <div className={`drawer${open ? ' open' : ''}`}>
        <div className="drawer-header">
          <div>
            <div className="drawer-title">Import Orders</div>
            <div className="drawer-sub">CSV Batch Upload</div>
          </div>
          <button className="drawer-close" onClick={handleClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div
            className={`drop-zone${dragging ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {!file ? (
              <>
                <div className="drop-icon">⬆</div>
                <div className="drop-text">Drop your CSV here</div>
                <div className="drop-sub">lat, lon, subtotal, timestamp</div>
              </>
            ) : (
              <>
                <div className="drop-icon">📄</div>
                <div className="drop-text">{file.name}</div>
                <div className="drop-sub">{(file.size / 1024).toFixed(1)} KB</div>
              </>
            )}
          </div>

          {loading && (
            <div className="progress-wrap">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="progress-text">Processing…</div>
            </div>
          )}

          {result.type === 'success' && (
            <div className="drawer-success">{result.msg}</div>
          )}
          {result.type === 'duplicate' && (
            <div className="drawer-warn">{result.msg}</div>
          )}
          {result.type === 'error' && (
            <div className="drawer-error">{result.msg}</div>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn btn-ghost drawer-btn" onClick={handleClose}>Cancel</button>
          <button className="btn btn-warm drawer-btn-main" onClick={handleSubmit} disabled={loading || !file || result.type === 'success'}>
            {loading ? 'Importing…' : 'Import →'}
          </button>
        </div>
      </div>
    </>
  )
}
