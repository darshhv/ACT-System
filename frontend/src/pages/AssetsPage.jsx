import { useState, useEffect } from 'react'
import { getAssets, getKits } from '../api/client'

const stateColors = {
  AVAILABLE:       { bg: '#14532d', text: '#86efac' },
  IN_CUSTODY:      { bg: '#713f12', text: '#fde68a' },
  OVERDUE:         { bg: '#7c2d12', text: '#fdba74' },
  SUSPENDED:       { bg: '#7f1d1d', text: '#fca5a5' },
  OVERRIDE_CUSTODY:{ bg: '#4a1d96', text: '#c4b5fd' },
  WITHDRAWN:       { bg: '#1e293b', text: '#64748b' },
}

const calColors = {
  VALID:        '#4ade80',
  DUE_SOON:     '#facc15',
  OVERDUE:      '#f87171',
  NOT_REQUIRED: '#475569',
  UNKNOWN:      '#64748b',
}

function StateBadge({ state }) {
  const c = stateColors[state] || stateColors.WITHDRAWN
  return (
    <span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
      {state}
    </span>
  )
}

export function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [tab, setTab] = useState('assets')

  useEffect(() => {
    Promise.all([getAssets({ limit: 200 }), getKits()])
      .then(([a, k]) => {
        setAssets(a.data.items || [])
        setKits(k.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredAssets = assets.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_code.toLowerCase().includes(search.toLowerCase())
    const matchState = !stateFilter || a.state === stateFilter
    return matchSearch && matchState
  })

  const filteredKits = kits.filter(k =>
    !search || k.name.toLowerCase().includes(search.toLowerCase()) || k.kit_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search assets..."
          style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
            color: '#e2e8f0', padding: '8px 12px', fontSize: '0.875rem', width: 240
          }}
        />
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
            color: '#e2e8f0', padding: '8px 12px', fontSize: '0.875rem'
          }}
        >
          <option value="">All States</option>
          {Object.keys(stateColors).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 0, marginLeft: 'auto' }}>
          {['assets', 'kits'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#0284c7' : '#1e293b',
              color: tab === t ? 'white' : '#94a3b8',
              border: '1px solid #334155', padding: '8px 18px',
              fontSize: '0.875rem', cursor: 'pointer',
              borderRadius: t === 'assets' ? '6px 0 0 6px' : '0 6px 6px 0'
            }}>
              {t === 'assets' ? `Assets (${filteredAssets.length})` : `Kits (${filteredKits.length})`}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Loading...</div>}

      {!loading && tab === 'assets' && (
        <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Code', 'Name', 'Category', 'Manufacturer', 'State', 'Calibration', 'Cal. Due'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#0f172a10' }}>
                    <td style={{ padding: '10px 14px', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{a.asset_code}</td>
                    <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>{a.name}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{a.category?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{a.manufacturer || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><StateBadge state={a.state} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ color: calColors[a.calibration_status] || '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                        {a.calibration_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {a.calibration_due_at
                        ? new Date(a.calibration_due_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'kits' && (
        <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Kit Code', 'Name', 'Category', 'Pieces', 'State'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredKits.map((k, i) => (
                <tr key={k.id} style={{ borderBottom: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#0f172a10' }}>
                  <td style={{ padding: '10px 14px', color: '#a78bfa', fontFamily: 'monospace' }}>{k.kit_code}</td>
                  <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>{k.name}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{k.category?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{k.expected_count} pc</td>
                  <td style={{ padding: '10px 14px' }}><StateBadge state={k.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
