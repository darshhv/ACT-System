export function StatCard({ label, value, color = '#38bdf8', sub }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 10,
      padding: '1.25rem 1.5rem',
      borderLeft: `4px solid ${color}`,
      minWidth: 140,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function SummaryBar({ summary }) {
  if (!summary) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
      <StatCard label="Total Assets" value={summary.total_assets} color="#38bdf8" />
      <StatCard label="Available" value={summary.available} color="#4ade80" />
      <StatCard label="In Custody" value={summary.in_custody} color="#facc15" />
      <StatCard label="Overdue" value={summary.overdue} color="#f97316"
        sub={summary.overdue > 0 ? '⚠ Needs attention' : null} />
      <StatCard label="Suspended" value={summary.suspended} color="#f43f5e"
        sub={summary.suspended > 0 ? 'Calibration issue' : null} />
      <StatCard label="Kits Out" value={summary.kits_in_custody} color="#a78bfa"
        sub={`of ${summary.total_kits} kits`} />
      <StatCard label="Open Alerts" value={summary.open_alerts} color={summary.critical_alerts > 0 ? '#f43f5e' : '#facc15'}
        sub={summary.critical_alerts > 0 ? `${summary.critical_alerts} CRITICAL` : null} />
      <StatCard label="Cal. Overdue" value={summary.calibration_overdue} color="#fb923c" />
      <StatCard label="Cal. Due Soon" value={summary.calibration_due_soon} color="#fbbf24" />
      <StatCard label="Workers Today" value={summary.active_workers_today} color="#34d399" />
    </div>
  )
}
