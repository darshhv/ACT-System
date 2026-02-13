import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'

const badge = (is_overdue, hours) => {
  if (is_overdue) return (
    <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
      OVERDUE {hours ? `${hours.toFixed(1)}h` : ''}
    </span>
  )
  return (
    <span style={{ background: '#14532d', color: '#86efac', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
      IN CUSTODY
    </span>
  )
}

export function ActiveCustodyTable({ records, loading }) {
  const [search, setSearch] = useState('')

  const filtered = (records || []).filter(r =>
    r.worker_name.toLowerCase().includes(search.toLowerCase()) ||
    r.asset_code.toLowerCase().includes(search.toLowerCase()) ||
    r.asset_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '1rem', margin: 0 }}>
          Active Custody
          <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 8, fontSize: '0.875rem' }}>
            ({filtered.length} items out)
          </span>
        </h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search worker or asset..."
          style={{
            background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
            color: '#e2e8f0', padding: '6px 12px', fontSize: '0.8rem', width: 220
          }}
        />
      </div>

      {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
          No items currently checked out
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Worker', 'Emp ID', 'Asset / Kit', 'Code', 'Checked Out', 'Expected Return', 'Elapsed', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'transparent' : '#0f172a20' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 500 }}>{r.worker_name}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.worker_employee_id}</td>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>
                    {r.is_kit && <span style={{ color: '#a78bfa', fontSize: '0.7rem', marginRight: 4 }}>KIT</span>}
                    {r.asset_name}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#38bdf8', fontFamily: 'monospace' }}>{r.asset_code}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                    {format(new Date(r.checked_out_at), 'HH:mm')}
                  </td>
                  <td style={{ padding: '10px 12px', color: r.is_overdue ? '#f87171' : '#94a3b8' }}>
                    {r.expected_return_at ? format(new Date(r.expected_return_at), 'HH:mm') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: r.is_overdue ? '#f87171' : '#94a3b8' }}>
                    {r.hours_elapsed.toFixed(1)}h
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {badge(r.is_overdue, r.overdue_hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
