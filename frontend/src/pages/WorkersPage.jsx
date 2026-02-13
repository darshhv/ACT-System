import { useState, useEffect } from 'react'
import { getWorkers } from '../api/client'

const roleColors = {
  TOOLROOM_INCHARGE: '#a78bfa',
  SUPERVISOR: '#38bdf8',
  TECHNICIAN: '#4ade80',
  OPERATOR: '#94a3b8',
  ADMIN: '#f97316',
}

export function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getWorkers().then(r => setWorkers(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = workers.filter(w =>
    !search ||
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    (w.department || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search workers..."
          style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
            color: '#e2e8f0', padding: '8px 12px', fontSize: '0.875rem', width: 240
          }}
        />
      </div>

      {loading && <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Loading...</div>}

      {!loading && (
        <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Emp ID', 'Name', 'Role', 'Department', 'QR Code', 'Phone', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#0f172a10' }}>
                  <td style={{ padding: '10px 14px', color: '#38bdf8', fontFamily: 'monospace' }}>{w.employee_id}</td>
                  <td style={{ padding: '10px 14px', color: '#e2e8f0', fontWeight: 500 }}>{w.full_name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: roleColors[w.role] || '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                      {w.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{w.department || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8rem' }}>{w.qr_code}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{w.phone || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: w.is_active ? '#4ade80' : '#f87171', fontSize: '0.8rem' }}>
                      {w.is_active ? '● Active' : '○ Inactive'}
                    </span>
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
