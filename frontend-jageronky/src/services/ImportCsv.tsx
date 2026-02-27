import { useState, useRef, useCallback } from 'react'
import { importOrders } from '../api'
import { isImportSuccess } from '../api/types'
import type { ImportResponse } from '../api'
import './ImportCsv.css'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImportCsv() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<{
    type: 'idle' | 'loading' | 'success' | 'duplicate' | 'error'
    data?: ImportResponse
    message?: string
  }>({ type: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setResult({ type: 'error', message: 'Оберіть файл у форматі .csv' })
      return
    }
    setFile(f)
    setResult({ type: 'idle' })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleSubmit = async () => {
    if (!file) return
    setResult({ type: 'loading' })
    try {
      const data = await importOrders(file)
      if (isImportSuccess(data)) {
        setResult({ type: 'success', data })
      } else {
        setResult({ type: 'duplicate', message: data.error })
      }
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Помилка' })
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult({ type: 'idle' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="import-wrap">
      <div
        className={`import-dropzone${dragging ? ' import-dropzone--active' : ''}${file ? ' import-dropzone--has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="import-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        {!file ? (
          <>
            <svg className="import-dropzone-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M24 32V16M24 16L18 22M24 16L30 22" />
              <path d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32" />
            </svg>
            <p className="import-dropzone-text">Перетягніть CSV файл сюди</p>
            <p className="import-dropzone-hint">або натисніть, щоб обрати</p>
          </>
        ) : (
          <div className="import-file-info">
            <svg className="import-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="import-file-details">
              <span className="import-file-name">{file.name}</span>
              <span className="import-file-size">{formatFileSize(file.size)}</span>
            </div>
          </div>
        )}
      </div>

      {file && result.type !== 'success' && (
        <div className="import-actions">
          <button type="button" className="import-submit" onClick={handleSubmit} disabled={result.type === 'loading'}>
            {result.type === 'loading' ? 'Імпорт…' : 'Імпортувати'}
          </button>
          <button type="button" className="import-cancel" onClick={handleReset} disabled={result.type === 'loading'}>
            Скасувати
          </button>
        </div>
      )}

      {result.type === 'loading' && (
        <div className="import-result import-result--loading">
          <p>Завантаження та обробка файлу…</p>
        </div>
      )}

      {result.type === 'success' && isImportSuccess(result.data!) && (
        <div className="import-result import-result--success">
          <p><strong>Імпорт завершено</strong></p>
          <div className="import-stats">
            <div className="import-stat">
              <span className="import-stat-value">{result.data!.total}</span>
              <span className="import-stat-label">Всього рядків</span>
            </div>
            <div className="import-stat import-stat--ok">
              <span className="import-stat-value">{result.data!.inserted}</span>
              <span className="import-stat-label">Вставлено</span>
            </div>
            {result.data!.failed > 0 && (
              <div className="import-stat import-stat--fail">
                <span className="import-stat-value">{result.data!.failed}</span>
                <span className="import-stat-label">Помилки</span>
              </div>
            )}
          </div>
          <p className="import-id">Import ID: {result.data!.import_id}</p>
          <button type="button" className="import-reset-btn" onClick={handleReset}>
            + Імпортувати ще
          </button>
        </div>
      )}

      {result.type === 'duplicate' && (
        <div className="import-result import-result--duplicate">
          <p><strong>Дублікат</strong></p>
          <p>{result.message}</p>
          <button type="button" className="import-reset-btn" onClick={handleReset}>
            Обрати інший файл
          </button>
        </div>
      )}

      {result.type === 'error' && (
        <div className="import-result import-result--error">
          <p>{result.message}</p>
        </div>
      )}
    </div>
  )
}
