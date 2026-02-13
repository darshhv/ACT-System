import { formatDistanceToNow } from 'date-fns'

const severityColors = {
  CRITICAL: { bg: '#7f1d1d', text: '#fca5a5', border: '#dc2626' },
  WARNING:  { bg: '#78350f', text: '#fde68a', border: '#d97706' },
  INFO:     { bg: '#1e3a5f', text: '#93c5fd', border: '#3b82f6' },
}

export function AlertsPanel({ alerts, loading, onAcknowledge, onResolve }) {
  if (loading) return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '1.25rem' }}>
      <div style={{ color: '#64748b' }}>Loading alerts...</div>
    </div>
  )

  const open = (alerts || []).filter(a => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED')

  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '1.25rem' }}>
      <h2 style={{ color: '#e2e8f0', fontSize: '1rem', margin: '0 0 1rem 0' }}>
        Active Alerts
        {open.length > 0 && (
          <span style={{ background: '#dc2626', color: 'white', borderRadius: '50%', padding: '1px 7px', fontSize: '0.75rem', marginLeft: 8 }}>
            {open.length}
          </span>
        )}
      </h2>

      {open.length === 0 && (
        <div style={{ color: '#4ade80', textAlign: 'center', padding: '1.5rem' }}>
          ✓ No active alerts
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {open.map(alert => {
          const c = severityColors[alert.severity] || severityColors.INFO
          return (
            <div key={alert.id} style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: '0.875rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: c.text, fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
                    {alert.title}
                  </div>
                  <div style={{ color: c.text, opacity: 0.8, fontSize: '0.8rem', lineHeight: 1.4 }}>
                    {alert.message}
                  </div>
                  <div style={{ color: c.text, opacity: 0.5, fontSize: '0.75rem', marginTop: 6 }}>
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    {alert.status === 'ACKNOWLEDGED' && ' · Acknowledged'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {alert.status === 'OPEN' && onAcknowledge && (
                    <button onClick={() => onAcknowledge(alert.id)} style={{
                      background: 'transparent', border: `1px solid ${c.border}`,
                      color: c.text, borderRadius: 4, padding: '4px 10px',
                      fontSize: '0.75rem', cursor: 'pointer'
                    }}>
                      ACK
                    </button>
                  )}
                  {onResolve && (
                    <button onClick={() => onResolve(alert.id)} style={{
                      background: 'transparent', border: `1px solid ${c.border}`,
                      color: c.text, borderRadius: 4, padding: '4px 10px',
                      fontSize: '0.75rem', cursor: 'pointer'
                    }}>
                      RESOLVE
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
