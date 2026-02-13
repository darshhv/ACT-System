import { useState } from 'react'
import { checkout, returnItem } from '../api/client'

export function ScanSimulator({ onSuccess }) {
  const [workerQR, setWorkerQR] = useState('')
  const [assetQR, setAssetQR] = useState('')
  const [action, setAction] = useState('CHECKOUT')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    if (!workerQR || !assetQR) {
      setError('Enter both Worker QR and Asset QR')
      return
    }
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const fn = action === 'CHECKOUT' ? checkout : returnItem
      const res = await fn({ worker_qr: workerQR, asset_qr: assetQR })
      setResult(res.data)
      setWorkerQR('')
      setAssetQR('')
      if (onSuccess) onSuccess()
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '1.25rem' }}>
      <h2 style={{ color: '#e2e8f0', fontSize: '1rem', margin: '0 0 1rem 0' }}>
        Scan Simulator
        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400, marginLeft: 8 }}>
          (test checkout/return without physical scanner)
        </span>
      </h2>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>
            Action
          </label>
          <select
            value={action}
            onChange={e => setAction(e.target.value)}
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#e2e8f0', padding: '8px 12px', fontSize: '0.875rem'
            }}
          >
            <option value="CHECKOUT">CHECKOUT</option>
            <option value="RETURN">RETURN</option>
          </select>
        </div>

        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>
            Worker QR
          </label>
          <input
            value={workerQR}
            onChange={e => setWorkerQR(e.target.value)}
            placeholder="e.g. QR-W-004"
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#e2e8f0', padding: '8px 12px', fontSize: '0.875rem', width: 140
            }}
          />
        </div>

        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>
            Asset / Kit QR
          </label>
          <input
            value={assetQR}
            onChange={e => setAssetQR(e.target.value)}
            placeholder="e.g. QR-A-001"
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#e2e8f0', padding: '8px 12px', fontSize: '0.875rem', width: 140
            }}
          />
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          style={{
            background: action === 'CHECKOUT' ? '#0284c7' : '#059669',
            color: 'white', border: 'none', borderRadius: 6,
            padding: '8px 20px', fontSize: '0.875rem', cursor: 'pointer',
            fontWeight: 600, opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : `▶ ${action}`}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: '0.75rem', background: '#14532d', border: '1px solid #16a34a',
          borderRadius: 6, padding: '0.75rem 1rem', color: '#86efac', fontSize: '0.875rem'
        }}>
          ✓ {result.message} — {result.asset || ''}
          {result.expected_return_at && ` · Return by ${new Date(result.expected_return_at).toLocaleTimeString()}`}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '0.75rem', background: '#7f1d1d', border: '1px solid #dc2626',
          borderRadius: 6, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem'
        }}>
          ✗ {error}
        </div>
      )}

      <div style={{ marginTop: '0.75rem', color: '#475569', fontSize: '0.75rem' }}>
        Try: Worker <code style={{ color: '#94a3b8' }}>QR-W-004</code> · Asset <code style={{ color: '#94a3b8' }}>QR-A-001</code> · Action CHECKOUT
      </div>
    </div>
  )
}
