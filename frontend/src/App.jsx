import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

// ─── API ──────────────────────────────────────────────────────────────────────
const BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000') + '/api/v1'
const http = axios.create({ baseURL: BASE, timeout: 10000 })
const api = {
  summary:    () => http.get('/dashboard/summary'),
  custody:    () => http.get('/dashboard/active-custody'),
  alerts:     () => http.get('/alerts?status=OPEN&limit=30'),
  assets:     () => http.get('/assets?limit=200'),
  kits:       () => http.get('/kits'),
  workers:    () => http.get('/workers'),
  history:    () => http.get('/custody/history?limit=100'),
  checkout:   (d) => http.post('/custody/checkout', d),
  returnItem: (d) => http.post('/custody/return', d),
  ackAlert:   (id) => http.post(`/alerts/${id}/acknowledge`, { worker_id: '00000000-0000-0000-0000-000000000000' }),
  resolveAlert:(id) => http.post(`/alerts/${id}/resolve`, { worker_id: '00000000-0000-0000-0000-000000000000' }),
}

function useData(fn, ms = 10000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const load = useCallback(async () => {
    try { const r = await fn(); setData(r.data); setErr(null) }
    catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [fn])
  useEffect(() => { load(); const t = setInterval(load, ms); return () => clearInterval(t) }, [load, ms])
  return { data, loading, err, reload: load }
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #F7F7F5; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; color: #111; -webkit-font-smoothing: antialiased; }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D0D0D0; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #B0B0B0; }

  @keyframes fadeSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pop { 0%{transform:scale(0.94);opacity:0} 60%{transform:scale(1.02)} 100%{transform:scale(1);opacity:1} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes slideRight { from{transform:translateX(-16px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes blink { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)} 70%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }

  .anim-fade  { animation: fadeSlide .35s cubic-bezier(.16,1,.3,1) both }
  .anim-pop   { animation: pop .3s cubic-bezier(.16,1,.3,1) both }
  .anim-slide { animation: slideRight .3s cubic-bezier(.16,1,.3,1) both }

  .row-hover { transition: background 0.12s }
  .row-hover:hover { background: rgba(0,0,0,.03) !important }
  .btn-hover { transition: all 0.15s }
  .btn-hover:hover { filter: brightness(0.94) }
  .btn-primary:hover { box-shadow: 0 4px 16px rgba(0,122,255,.4) !important }
  .nav-item:hover { background: rgba(0,0,0,.055) !important }
  .chip-btn:hover { opacity:.8 }
`

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const C = {
  bg:        '#F7F7F5',
  panel:     '#FFFFFF',
  panelAlt:  '#FAFAF8',
  border:    '#E8E8E4',
  borderMid: '#D4D4CE',
  text:      '#111111',
  textSub:   '#555555',
  textMuted: '#999999',
  blue:      '#007AFF',
  blueBg:    '#EEF5FF',
  green:     '#16A34A',
  greenBg:   '#EDFBF3',
  amber:     '#D97706',
  amberBg:   '#FFFBEB',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  orange:    '#EA580C',
  orangeBg:  '#FFF7ED',
  purple:    '#7C3AED',
  purpleBg:  '#F5F3FF',
  shadow:    '0 1px 2px rgba(0,0,0,.06), 0 3px 12px rgba(0,0,0,.07)',
  shadowLg:  '0 4px 6px rgba(0,0,0,.05), 0 10px 40px rgba(0,0,0,.10)',
  r:         14,
  rSm:       9,
  rLg:       20,
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Panel = ({ children, style, pad = 24 }) => (
  <div style={{ background: C.panel, borderRadius: C.r, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: pad, ...style }}>
    {children}
  </div>
)

const Tag = ({ label, color = C.blue, bg, size = 'md' }) => {
  const pad = size === 'sm' ? '2px 8px' : '4px 10px'
  const fs  = size === 'sm' ? 11 : 12
  return (
    <span style={{ display:'inline-flex', alignItems:'center', background: bg || color + '18', color, borderRadius: 99, padding: pad, fontSize: fs, fontWeight: 700, letterSpacing: '0.01em', whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

const Dot = ({ color, pulse }) => (
  <span style={{ display:'inline-block', width: 8, height: 8, borderRadius:'50%', background: color, flexShrink: 0, animation: pulse ? 'blink 2s infinite' : 'none' }} />
)

const Divider = ({ my = 16 }) => <div style={{ height: 1, background: C.border, margin: `${my}px 0` }} />

const Spinner = ({ size = 18, color = C.blue }) => (
  <span style={{ display:'inline-block', width: size, height: size, border: `2px solid ${color}33`, borderTopColor: color, borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }} />
)

const Empty = ({ icon = '—', text }) => (
  <div style={{ padding: '48px 24px', textAlign:'center' }}>
    <div style={{ fontSize: 36, marginBottom: 12, opacity: .25 }}>{icon}</div>
    <div style={{ fontSize: 14, color: C.textMuted }}>{text}</div>
  </div>
)

function Button({ children, onClick, variant = 'secondary', size = 'md', disabled, icon, full }) {
  const isPrimary = variant === 'primary'
  const isDanger  = variant === 'danger'
  const isGhost   = variant === 'ghost'
  const pad = size === 'sm' ? '6px 14px' : size === 'lg' ? '14px 28px' : '9px 18px'
  const fs  = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 13.5

  let bg = '#F0F0ED', border = `1px solid ${C.borderMid}`, color = C.text, shadow = 'none'
  if (isPrimary) { bg = C.blue; border = 'none'; color = '#fff'; shadow = `0 2px 8px rgba(0,122,255,.3)` }
  if (isDanger)  { bg = C.red;  border = 'none'; color = '#fff'; shadow = `0 2px 8px rgba(220,38,38,.3)` }
  if (isGhost)   { bg = 'transparent'; border = 'none'; color = C.textSub }

  return (
    <button className={`btn-hover ${isPrimary ? 'btn-primary' : ''}`} onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 7,
      background: bg, border, color, borderRadius: C.rSm, padding: pad, fontSize: fs,
      fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: shadow,
      opacity: disabled ? .5 : 1, width: full ? '100%' : undefined,
    }}>
      {icon && <span style={{ fontSize: size === 'lg' ? 17 : 14 }}>{icon}</span>}
      {children}
    </button>
  )
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const PAGES = [
  { id: 'dashboard', icon: '⊡', label: 'Dashboard' },
  { id: 'scan',      icon: '⊞', label: 'Scan Station' },
  { id: 'custody',   icon: '↕', label: 'Custody Log' },
  { id: 'assets',    icon: '◫', label: 'Assets & Kits' },
  { id: 'workers',   icon: '◉', label: 'Workers' },
  { id: 'alerts',    icon: '◬', label: 'Alerts' },
]

function Sidebar({ page, setPage, summary }) {
  const crit = summary?.critical_alerts || 0
  const open = summary?.open_alerts || 0

  return (
    <aside style={{ width: 232, flexShrink:0, background:'#FAFAF8', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, padding:'16px 12px' }}>

      {/* Brand */}
      <div style={{ padding:'8px 10px 20px', borderBottom:`1px solid ${C.border}`, marginBottom: 10 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 11 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:`linear-gradient(145deg, #007AFF, #0055CC)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(0,122,255,.4)', flexShrink:0 }}>
            <span style={{ color:'white', fontWeight:800, fontSize:15, letterSpacing:'-0.5px' }}>A</span>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, letterSpacing:'-0.03em', color: C.text }}>ACT System</div>
            <div style={{ fontSize:11, color: C.textMuted, marginTop:1 }}>IISc Bangalore</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
        {PAGES.map(p => {
          const active = page === p.id
          return (
            <button key={p.id} className="nav-item" onClick={() => setPage(p.id)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'none',
              background: active ? C.panel : 'transparent',
              boxShadow: active ? C.shadow : 'none',
              color: active ? C.blue : C.textSub,
              fontWeight: active ? 700 : 500, fontSize:13.5,
              cursor:'pointer', textAlign:'left', width:'100%', transition:'all .15s',
            }}>
              <span style={{ fontSize:16, width:20, textAlign:'center', opacity: active ? 1 : .6 }}>{p.icon}</span>
              <span style={{ flex:1 }}>{p.label}</span>
              {p.id === 'alerts' && open > 0 && (
                <span style={{ background: crit > 0 ? C.red : C.amber, color:'#fff', borderRadius:99, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{open}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Status footer */}
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 10px' }}>
          <Dot color={C.green} />
          <span style={{ fontSize:12, color: C.textMuted }}>All services running</span>
        </div>
        <div style={{ fontSize:11.5, color: C.textMuted, padding:'4px 10px' }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
        </div>
      </div>
    </aside>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function StatCard({ value, label, sub, color, bg, icon, delay = 0 }) {
  return (
    <Panel pad={22} style={{ animationDelay:`${delay}ms`, flex:1, minWidth:140 }} className="anim-fade">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:34, fontWeight:800, color: color, letterSpacing:'-0.04em', lineHeight:1 }}>{value ?? '—'}</div>
          <div style={{ fontSize:13, fontWeight:600, color: C.text, marginTop:7 }}>{label}</div>
          {sub && <div style={{ fontSize:11.5, color: C.textMuted, marginTop:3 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{ width:40, height:40, borderRadius:11, background: bg || color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {icon}
          </div>
        )}
      </div>
    </Panel>
  )
}

function Dashboard({ setPage }) {
  const sfn = useCallback(() => api.summary(), [])
  const cfn = useCallback(() => api.custody(), [])
  const afn = useCallback(() => api.alerts(), [])
  const { data: S, loading: sl, reload: rs } = useData(sfn, 10000)
  const { data: custody, loading: cl } = useData(cfn, 10000)
  const { data: alerts, loading: al, reload: ra } = useData(afn, 12000)
  const total = (custody || []).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.04em', color: C.text, lineHeight:1.1 }}>Tool Room</h1>
          <p style={{ fontSize:13.5, color: C.textSub, marginTop:5 }}>Live operations dashboard · refreshes every 10s</p>
        </div>
        <Button onClick={rs} icon="↻">Refresh</Button>
      </div>

      {/* Critical banner */}
      {S?.critical_alerts > 0 && (
        <div className="anim-pop" style={{ background: C.red, borderRadius: C.r, padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
          <Dot color="white" pulse />
          <div style={{ flex:1 }}>
            <div style={{ color:'white', fontWeight:700, fontSize:15 }}>{S.critical_alerts} Critical Alert{S.critical_alerts > 1 ? 's' : ''} Require Immediate Attention</div>
            <div style={{ color:'rgba(255,255,255,.75)', fontSize:12.5, marginTop:2 }}>Overdue tools or expired calibration — action required now</div>
          </div>
          <Button onClick={() => setPage('alerts')} size="sm" style={{ background:'white', color: C.red }}>View Alerts</Button>
        </div>
      )}

      {/* KPI row */}
      {sl
        ? <div style={{ display:'flex', gap:14, height:110 }}>{[...Array(6)].map((_,i) => <div key={i} style={{ flex:1, background:'rgba(0,0,0,.05)', borderRadius: C.r, animation:'pulse 1.5s infinite', animationDelay:`${i*100}ms` }} />)}</div>
        : <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <StatCard value={S?.total_assets}         label="Total Assets"      color={C.blue}   icon="◫" bg={C.blueBg}   delay={0}   />
            <StatCard value={S?.available}            label="Available"         color={C.green}  icon="✓" bg={C.greenBg}  delay={50}  />
            <StatCard value={S?.in_custody}           label="In Custody"        color={C.amber}  icon="↑" bg={C.amberBg}  delay={100} sub={`${S?.kits_in_custody} kits`} />
            <StatCard value={S?.overdue}              label="Overdue"           color={C.red}    icon="!" bg={C.redBg}    delay={150} sub={S?.overdue > 0 ? 'Needs action' : 'All on time'} />
            <StatCard value={S?.open_alerts}          label="Open Alerts"       color={S?.critical_alerts > 0 ? C.red : C.amber} icon="◬" delay={200} sub={S?.critical_alerts > 0 ? `${S.critical_alerts} critical` : 'No critical'} />
            <StatCard value={S?.active_workers_today} label="Workers Today"     color={C.purple} icon="◉" bg={C.purpleBg} delay={250} />
          </div>
      }

      {/* Calibration warning */}
      {(S?.calibration_overdue > 0 || S?.calibration_due_soon > 0) && (
        <div style={{ background: C.amberBg, border:`1.5px solid ${C.amber}44`, borderRadius: C.r, padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:22 }}>🔧</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color: C.amber }}>Calibration Attention Required</div>
            <div style={{ fontSize:13, color: C.amber, opacity:.8, marginTop:2 }}>
              {S?.calibration_overdue > 0 && `${S.calibration_overdue} asset${S.calibration_overdue > 1 ? 's' : ''} with expired calibration · `}
              {S?.calibration_due_soon > 0 && `${S.calibration_due_soon} due within 30 days`}
            </div>
          </div>
          <Button onClick={() => setPage('assets')} size="sm">View Assets</Button>
        </div>
      )}

      {/* Body: custody + alerts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' }}>

        {/* Active custody */}
        <Panel pad={0} style={{ overflow:'hidden' }}>
          <div style={{ padding:'20px 24px 0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color: C.text, letterSpacing:'-0.02em' }}>Active Custody</div>
                <div style={{ fontSize:12.5, color: C.textMuted, marginTop:3 }}>{total} item{total !== 1 ? 's' : ''} currently checked out</div>
              </div>
              <Button onClick={() => setPage('custody')} size="sm" variant="ghost">View all →</Button>
            </div>
          </div>
          <CustodyTable records={custody || []} loading={cl} compact />
        </Panel>

        {/* Alerts */}
        <Panel pad={20}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color: C.text, letterSpacing:'-0.02em' }}>
                Alerts
                {(alerts||[]).length > 0 && <span style={{ marginLeft:9, background: C.red, color:'white', borderRadius:99, padding:'1px 8px', fontSize:11.5, fontWeight:700, verticalAlign:'middle' }}>{(alerts||[]).length}</span>}
              </div>
              <div style={{ fontSize:12.5, color: C.textMuted, marginTop:3 }}>Requires attention</div>
            </div>
            <Button onClick={() => setPage('alerts')} size="sm" variant="ghost">All →</Button>
          </div>
          <AlertsFeed alerts={alerts || []} loading={al} onRefresh={ra} compact />
        </Panel>
      </div>
    </div>
  )
}

// ─── CUSTODY TABLE ─────────────────────────────────────────────────────────────
function CustodyTable({ records, loading, compact }) {
  const [q, setQ] = useState('')
  const rows = (records || []).filter(r =>
    !q || r.worker_name.toLowerCase().includes(q.toLowerCase()) ||
    r.asset_name.toLowerCase().includes(q.toLowerCase()) ||
    r.asset_code.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <div style={{ padding: compact ? '0 24px 14px' : '0 0 14px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by worker or asset…"
          style={{ padding:'9px 14px', width:'100%', background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm, fontSize:13.5, color: C.text, outline:'none' }}
        />
      </div>
      {loading && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>}
      {!loading && rows.length === 0 && <Empty icon="✓" text="No items currently checked out" />}
      {!loading && rows.length > 0 && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7F7F5', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
                {['Worker','Asset / Kit','Code','Checked Out','Due Back','Status'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11.5, fontWeight:700, color: C.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const over = r.is_overdue
                return (
                  <tr key={r.id} className="row-hover" style={{ borderBottom:`1px solid ${C.border}`, background: over ? '#FEF2F2' : 'white', animationDelay:`${i*20}ms` }}>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ fontWeight:700, fontSize:14, color: C.text }}>{r.worker_name}</div>
                      <div style={{ fontSize:11.5, color: C.textMuted, marginTop:2 }}>{r.worker_employee_id}</div>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ fontWeight:600, fontSize:13.5, color: C.text, maxWidth:220 }}>
                        {r.is_kit && <Tag label="KIT" color={C.purple} size="sm" />}{r.is_kit ? ' ' : ''}{r.asset_name}
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <span style={{ fontFamily:'DM Mono', fontSize:12.5, color: C.blue, fontWeight:500 }}>{r.asset_code}</span>
                    </td>
                    <td style={{ padding:'13px 16px', fontSize:13.5, color: C.textSub, whiteSpace:'nowrap' }}>
                      {new Date(r.checked_out_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                    </td>
                    <td style={{ padding:'13px 16px', fontSize:13.5, fontWeight: over ? 700 : 400, color: over ? C.red : C.textSub, whiteSpace:'nowrap' }}>
                      {r.expected_return_at ? new Date(r.expected_return_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      {over
                        ? <Tag label={`OVERDUE · ${r.overdue_hours?.toFixed(1)}h`} color={C.red} />
                        : <Tag label="IN CUSTODY" color={C.amber} />
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── ALERTS FEED ───────────────────────────────────────────────────────────────
function AlertsFeed({ alerts, loading, onRefresh, compact }) {
  const [acking, setAcking] = useState(null)
  const ack = async (id) => { setAcking(id); await api.ackAlert(id); setAcking(null); onRefresh() }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>
  if (!alerts.length) return <Empty icon="✓" text="No active alerts — all clear" />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {alerts.slice(0, compact ? 6 : 999).map((a, i) => {
        const isCrit = a.severity === 'CRITICAL'
        const isWarn = a.severity === 'WARNING'
        const col = isCrit ? C.red : isWarn ? C.amber : C.blue
        const bg  = isCrit ? C.redBg : isWarn ? C.amberBg : C.blueBg
        return (
          <div key={a.id} className="anim-fade" style={{ background: bg, borderRadius: C.rSm, border:`1.5px solid ${col}33`, padding:'14px 16px', animationDelay:`${i*50}ms` }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <Dot color={col} pulse={isCrit} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color: col, lineHeight:1.35, marginBottom:5 }}>{a.title}</div>
                <div style={{ fontSize:12.5, color: C.textSub, lineHeight:1.5 }}>{a.message.slice(0, compact ? 90 : 999)}{compact && a.message.length > 90 ? '…' : ''}</div>
                <div style={{ fontSize:11.5, color: C.textMuted, marginTop:7 }}>{timeAgo(a.created_at)}</div>
              </div>
              <button className="chip-btn" onClick={() => ack(a.id)} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:7, padding:'5px 11px', fontSize:12, fontWeight:600, color: C.textSub, cursor:'pointer', flexShrink:0 }}>
                {acking === a.id ? '…' : 'ACK'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── ALERTS PAGE ───────────────────────────────────────────────────────────────
function AlertsPage() {
  const fn = useCallback(() => api.alerts(), [])
  const { data: alerts, loading, reload } = useData(fn, 15000)
  const [filter, setFilter] = useState('ALL')
  const [acking, setAcking] = useState(null)

  const ack = async (id) => { setAcking(id); await api.ackAlert(id); setAcking(null); reload() }
  const resolve = async (id) => { setAcking(id); await api.resolveAlert(id); setAcking(null); reload() }

  const all = alerts || []
  const shown = filter === 'ALL' ? all : all.filter(a => a.severity === filter)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.04em', color: C.text }}>Alerts</h1>
          <p style={{ fontSize:13.5, color: C.textSub, marginTop:5 }}>{all.length} open alert{all.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={reload} icon="↻">Refresh</Button>
      </div>

      {/* Filter chips */}
      <div style={{ display:'flex', gap:8 }}>
        {['ALL','CRITICAL','WARNING','INFO'].map(f => (
          <button key={f} className="btn-hover" onClick={() => setFilter(f)} style={{
            padding:'7px 18px', borderRadius:99, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
            background: filter === f ? C.text : C.panel, color: filter === f ? 'white' : C.textSub,
            boxShadow: filter === f ? C.shadow : 'none',
          }}>{f}</button>
        ))}
      </div>

      {loading && <Panel><div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner /></div></Panel>}

      {!loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {shown.length === 0 && <Panel><Empty icon="✓" text="No alerts in this category" /></Panel>}
          {shown.map((a, i) => {
            const isCrit = a.severity === 'CRITICAL'
            const isWarn = a.severity === 'WARNING'
            const col = isCrit ? C.red : isWarn ? C.amber : C.blue
            const bg  = isCrit ? C.redBg : isWarn ? C.amberBg : C.blueBg
            return (
              <div key={a.id} className="anim-fade" style={{ background: bg, borderRadius: C.r, border:`1.5px solid ${col}33`, padding:'18px 22px', animationDelay:`${i*40}ms` }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background: col+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {isCrit ? '🔴' : isWarn ? '🟡' : 'ℹ️'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <Tag label={a.severity} color={col} />
                      <Tag label={a.alert_type.replace(/_/g,' ')} color={C.textMuted} bg="rgba(0,0,0,.07)" />
                    </div>
                    <div style={{ fontSize:15, fontWeight:700, color: C.text, marginBottom:6, lineHeight:1.35 }}>{a.title}</div>
                    <div style={{ fontSize:13.5, color: C.textSub, lineHeight:1.6 }}>{a.message}</div>
                    <div style={{ fontSize:12, color: C.textMuted, marginTop:10 }}>Created {timeAgo(a.created_at)}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
                    <Button onClick={() => ack(a.id)} size="sm" disabled={acking === a.id}>{acking === a.id ? '…' : 'Acknowledge'}</Button>
                    <Button onClick={() => resolve(a.id)} size="sm" variant="primary" disabled={acking === a.id}>Resolve</Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── CUSTODY LOG PAGE ──────────────────────────────────────────────────────────
function CustodyPage() {
  const [tab, setTab] = useState('active')
  const activeFn  = useCallback(() => api.custody(), [])
  const historyFn = useCallback(() => api.history(), [])
  const { data: active,  loading: al } = useData(activeFn, 10000)
  const { data: history, loading: hl } = useData(historyFn, 30000)

  const records = tab === 'active' ? (active || []) : (history || [])
  const loading  = tab === 'active' ? al : hl

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.04em', color: C.text }}>Custody Log</h1>
      <Panel pad={0} style={{ overflow:'hidden' }}>
        <div style={{ display:'flex', gap:6, padding:'20px 24px 0', borderBottom:`1px solid ${C.border}`, paddingBottom: 0 }}>
          {[['active','Active Now'],['history','Full History']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:'10px 20px', border:'none', background:'transparent', cursor:'pointer',
              fontSize:14, fontWeight: tab === id ? 700 : 500,
              color: tab === id ? C.blue : C.textSub,
              borderBottom: tab === id ? `2.5px solid ${C.blue}` : '2.5px solid transparent',
              marginBottom:-1,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ padding:24 }}>
          {loading && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>}
          {!loading && tab === 'active'  && <CustodyTable records={records} loading={false} />}
          {!loading && tab === 'history' && <HistoryTable records={records} />}
        </div>
      </Panel>
    </div>
  )
}

function HistoryTable({ records }) {
  const [q, setQ] = useState('')
  const rows = records.filter(r =>
    !q || (r.worker||'').toLowerCase().includes(q.toLowerCase()) ||
    (r.asset||'').toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search history…"
        style={{ padding:'9px 14px', width:'100%', maxWidth:320, background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm, fontSize:13.5, color: C.text, outline:'none', marginBottom:16 }}
      />
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:'#F7F7F5', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
            {['Event','Worker','Asset','Checked Out','Returned','Overdue'].map(h => (
              <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11.5, fontWeight:700, color: C.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0,100).map((r,i) => (
            <tr key={r.id} className="row-hover" style={{ borderBottom:`1px solid ${C.border}`, animationDelay:`${i*15}ms` }}>
              <td style={{ padding:'11px 14px' }}><Tag label={r.event_type} color={C.blue} size="sm" /></td>
              <td style={{ padding:'11px 14px', fontSize:13.5, fontWeight:600, color: C.text }}>{r.worker || '—'}</td>
              <td style={{ padding:'11px 14px', fontSize:13.5, color: C.textSub }}>{r.asset_name || r.asset || '—'}</td>
              <td style={{ padding:'11px 14px', fontSize:13, color: C.textSub }}>{r.checked_out_at ? new Date(r.checked_out_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
              <td style={{ padding:'11px 14px', fontSize:13, color: r.returned_at ? C.green : C.amber }}>{r.returned_at ? new Date(r.returned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : 'Not returned'}</td>
              <td style={{ padding:'11px 14px' }}>{r.is_overdue ? <Tag label={`${(r.overdue_hours||0).toFixed(1)}h`} color={C.red} size="sm" /> : <span style={{ color: C.textMuted, fontSize:13 }}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <Empty icon="◫" text="No records found" />}
    </div>
  )
}

// ─── ASSETS PAGE ───────────────────────────────────────────────────────────────
const SM = {
  AVAILABLE:        { color: C.green,   label:'Available' },
  IN_CUSTODY:       { color: C.amber,   label:'In Custody' },
  OVERDUE:          { color: C.red,     label:'Overdue' },
  SUSPENDED:        { color: C.orange,  label:'Suspended' },
  OVERRIDE_CUSTODY: { color: C.purple,  label:'Override' },
  WITHDRAWN:        { color: C.textMuted, label:'Withdrawn' },
}
const CM = {
  VALID:        { color: C.green,   label:'Valid' },
  DUE_SOON:     { color: C.amber,   label:'Due Soon' },
  OVERDUE:      { color: C.red,     label:'Overdue' },
  NOT_REQUIRED: { color: C.textMuted, label:'N/A' },
  UNKNOWN:      { color: C.textMuted, label:'Unknown' },
}

function AssetsPage() {
  const [assets, setA] = useState([])
  const [kits, setK]   = useState([])
  const [load, setLoad] = useState(true)
  const [tab, setTab]  = useState('assets')
  const [q, setQ]      = useState('')
  const [sf, setSf]    = useState('')

  useEffect(() => {
    Promise.all([api.assets(), api.kits()])
      .then(([a,k]) => { setA(a.data.items||[]); setK(k.data||[]) })
      .finally(() => setLoad(false))
  }, [])

  const items = (tab === 'assets' ? assets : kits).filter(x => {
    const code = x.asset_code || x.kit_code || ''
    const ok1 = !q || x.name.toLowerCase().includes(q.toLowerCase()) || code.toLowerCase().includes(q.toLowerCase())
    const ok2 = !sf || x.state === sf
    return ok1 && ok2
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.04em', color: C.text }}>Assets & Kits</h1>
      <Panel pad={0} style={{ overflow:'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or code…"
            style={{ padding:'9px 14px', background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm, fontSize:13.5, color: C.text, outline:'none', width:240 }}
          />
          <select value={sf} onChange={e => setSf(e.target.value)} style={{ padding:'9px 14px', background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm, fontSize:13.5, color: C.text, outline:'none' }}>
            <option value="">All States</option>
            {Object.entries(SM).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ marginLeft:'auto', display:'flex', background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm, overflow:'hidden' }}>
            {['assets','kits'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:'9px 20px', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, background: tab === t ? C.text : 'transparent', color: tab === t ? 'white' : C.textSub, transition:'all .15s' }}>
                {t === 'assets' ? `Assets (${assets.length})` : `Kits (${kits.length})`}
              </button>
            ))}
          </div>
        </div>

        {load && <div style={{ display:'flex', justifyContent:'center', padding:56 }}><Spinner size={28} /></div>}
        {!load && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F7F7F5', borderBottom:`1px solid ${C.border}` }}>
                  {tab === 'assets'
                    ? ['Code','Name','Category','Manufacturer','State','Calibration','Cal. Due'].map(h => <Th key={h}>{h}</Th>)
                    : ['Kit Code','Name','Category','Pieces','State'].map(h => <Th key={h}>{h}</Th>)
                  }
                </tr>
              </thead>
              <tbody>
                {items.map((x,i) => {
                  const code = x.asset_code || x.kit_code
                  const sm = SM[x.state] || SM.WITHDRAWN
                  const cm = CM[x.calibration_status] || CM.UNKNOWN
                  return (
                    <tr key={x.id} className="row-hover" style={{ borderBottom:`1px solid ${C.border}`, animationDelay:`${i*15}ms` }}>
                      <td style={{ padding:'13px 16px' }}><span style={{ fontFamily:'DM Mono', fontSize:12.5, color: C.blue, fontWeight:500 }}>{code}</span></td>
                      <td style={{ padding:'13px 16px', fontSize:14, fontWeight:600, color: C.text }}>{x.name}</td>
                      <td style={{ padding:'13px 16px', fontSize:13, color: C.textSub }}>{x.category?.name || '—'}</td>
                      {tab === 'assets' && <>
                        <td style={{ padding:'13px 16px', fontSize:13, color: C.textSub }}>{x.manufacturer || '—'}</td>
                        <td style={{ padding:'13px 16px' }}><Tag label={sm.label} color={sm.color} /></td>
                        <td style={{ padding:'13px 16px' }}><Tag label={cm.label} color={cm.color} /></td>
                        <td style={{ padding:'13px 16px', fontSize:13, color: C.textMuted }}>{x.calibration_due_at ? new Date(x.calibration_due_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                      </>}
                      {tab === 'kits' && <>
                        <td style={{ padding:'13px 16px', fontSize:13, color: C.textSub }}>{x.expected_count} pc</td>
                        <td style={{ padding:'13px 16px' }}><Tag label={sm.label} color={sm.color} /></td>
                      </>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {items.length === 0 && <Empty icon="◫" text="No assets match your search" />}
          </div>
        )}
      </Panel>
    </div>
  )
}
const Th = ({children}) => <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11.5, fontWeight:700, color: C.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{children}</th>

// ─── WORKERS PAGE ──────────────────────────────────────────────────────────────
const RM = {
  TOOLROOM_INCHARGE: { color: C.purple, label:'Toolroom Incharge' },
  SUPERVISOR:        { color: C.blue,   label:'Supervisor' },
  TECHNICIAN:        { color: C.green,  label:'Technician' },
  OPERATOR:          { color: C.textSub, label:'Operator' },
  ADMIN:             { color: '#0891B2', label:'Admin' },
}

function WorkersPage() {
  const [workers, setW] = useState([])
  const [load, setLoad] = useState(true)
  const [q, setQ] = useState('')
  useEffect(() => { api.workers().then(r => setW(r.data)).finally(() => setLoad(false)) }, [])
  const rows = workers.filter(w => !q || w.full_name.toLowerCase().includes(q.toLowerCase()) || w.employee_id.toLowerCase().includes(q.toLowerCase()) || (w.department||'').toLowerCase().includes(q.toLowerCase()))
  const initials = (name) => name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
  const hue = (name) => (name.charCodeAt(0) * 37 + name.charCodeAt(1||0) * 13) % 360

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.04em', color: C.text }}>Workers</h1>
      <Panel pad={0} style={{ overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}` }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, ID or department…"
            style={{ padding:'9px 14px', background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm, fontSize:13.5, color: C.text, outline:'none', width:300 }}
          />
        </div>
        {load && <div style={{ display:'flex', justifyContent:'center', padding:56 }}><Spinner size={28} /></div>}
        {!load && (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7F7F5', borderBottom:`1px solid ${C.border}` }}>
                {['','Name','Employee ID','Role','Department','QR Code','Status'].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((w,i) => {
                const rm = RM[w.role] || RM.OPERATOR
                const h = hue(w.full_name)
                return (
                  <tr key={w.id} className="row-hover" style={{ borderBottom:`1px solid ${C.border}`, animationDelay:`${i*20}ms` }}>
                    <td style={{ padding:'12px 16px', width:48 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:`hsl(${h},60%,88%)`, color:`hsl(${h},55%,35%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>{initials(w.full_name)}</div>
                    </td>
                    <td style={{ padding:'12px 8px', fontSize:14, fontWeight:700, color: C.text }}>{w.full_name}</td>
                    <td style={{ padding:'12px 16px' }}><span style={{ fontFamily:'DM Mono', fontSize:12.5, color: C.blue }}>{w.employee_id}</span></td>
                    <td style={{ padding:'12px 16px' }}><Tag label={rm.label} color={rm.color} /></td>
                    <td style={{ padding:'12px 16px', fontSize:13.5, color: C.textSub }}>{w.department || '—'}</td>
                    <td style={{ padding:'12px 16px' }}><span style={{ fontFamily:'DM Mono', fontSize:11.5, color: C.textMuted }}>{w.qr_code}</span></td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <Dot color={w.is_active ? C.green : C.textMuted} />
                        <span style={{ fontSize:13, fontWeight:600, color: w.is_active ? C.green : C.textMuted }}>{w.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!load && rows.length === 0 && <Empty icon="◉" text="No workers found" />}
      </Panel>
    </div>
  )
}

// ─── SCAN STATION ──────────────────────────────────────────────────────────────
function ScanPage() {
  const [action, setAction] = useState('CHECKOUT')
  const [wQR, setWQR] = useState('')
  const [aQR, setAQR] = useState('')
  const [status, setStatus] = useState(null)
  const [msg, setMsg] = useState('')
  const [subMsg, setSubMsg] = useState('')
  const wRef = useRef(); const aRef = useRef()

  const reset = () => { setWQR(''); setAQR(''); wRef.current?.focus() }

  const submit = async () => {
    if (!wQR.trim() || !aQR.trim()) { setStatus('error'); setMsg('Both QR codes are required'); setSubMsg('Please scan or enter the Worker QR and Asset QR'); return }
    setStatus('loading')
    try {
      const fn = action === 'CHECKOUT' ? api.checkout : api.returnItem
      const r = await fn({ worker_qr: wQR.trim(), asset_qr: aQR.trim() })
      setStatus('success')
      setMsg(r.data.message || (action === 'CHECKOUT' ? 'Tool checked out successfully' : 'Tool returned successfully'))
      setSubMsg(r.data.expected_return_at ? `Return by ${new Date(r.data.expected_return_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}` : '')
      reset()
      setTimeout(() => setStatus(null), 5000)
    } catch(e) {
      setStatus('error')
      setMsg(e.response?.data?.detail || 'Operation failed')
      setSubMsg('Check the QR codes and try again')
      setTimeout(() => setStatus(null), 6000)
    }
  }

  const onKey = (e, next) => { if (e.key === 'Enter') { next ? next.current?.focus() : submit() } }
  const fill = (code) => { if (!wQR) { setWQR(code); aRef.current?.focus() } else if (!aQR) { setAQR(code) } }

  const samples = [
    ['Ramesh Kumar','QR-W-001'],['Suresh Naidu','QR-W-002'],['Venkatesh Rao','QR-W-003'],
    ['Mohan Lal','QR-W-004'],['Priya Sharma','QR-W-005'],
    ['Vernier Caliper 150mm','QR-A-001'],['Outside Micrometer 0-25mm','QR-A-004'],['Cordless Drill 18V','QR-A-025'],
    ['Drill Bit Set (Kit)','QR-K-001'],['Allen Key Set (Kit)','QR-K-004'],
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:720 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.04em', color: C.text }}>Scan Station</h1>
        <p style={{ fontSize:13.5, color: C.textSub, marginTop:5 }}>Tool room checkout and return · scan or type QR codes</p>
      </div>

      {/* Main scan card */}
      <Panel pad={32}>
        {/* Toggle */}
        <div style={{ display:'flex', background:'#F0F0ED', borderRadius:12, padding:4, marginBottom:28 }}>
          {['CHECKOUT','RETURN'].map(a => (
            <button key={a} onClick={() => { setAction(a); setStatus(null) }} style={{
              flex:1, padding:'11px', border:'none', borderRadius:9, cursor:'pointer',
              background: action === a ? 'white' : 'transparent',
              boxShadow: action === a ? C.shadow : 'none',
              color: action === a ? C.text : C.textSub,
              fontSize:14, fontWeight:700, letterSpacing:'-0.01em', transition:'all .2s',
            }}>{a === 'CHECKOUT' ? '↑ CHECKOUT' : '↓ RETURN'}</button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:24 }}>
          <div>
            <label style={{ fontSize:12.5, fontWeight:700, color: C.textSub, textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>Worker QR Code</label>
            <input ref={wRef} value={wQR} onChange={e => setWQR(e.target.value)} onKeyDown={e => onKey(e, aRef)}
              placeholder="e.g. QR-W-004" autoFocus
              style={{ width:'100%', padding:'14px 18px', background:'#F7F7F5', border:`2px solid ${wQR ? C.blue : C.border}`, borderRadius:11, fontSize:16, color: C.text, outline:'none', fontFamily:'DM Mono', fontWeight:500, transition:'border .15s', letterSpacing:'0.02em' }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = wQR ? C.blue : C.border}
            />
          </div>
          <div>
            <label style={{ fontSize:12.5, fontWeight:700, color: C.textSub, textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>Asset / Kit QR Code</label>
            <input ref={aRef} value={aQR} onChange={e => setAQR(e.target.value)} onKeyDown={e => onKey(e, null)}
              placeholder="e.g. QR-A-001"
              style={{ width:'100%', padding:'14px 18px', background:'#F7F7F5', border:`2px solid ${aQR ? C.blue : C.border}`, borderRadius:11, fontSize:16, color: C.text, outline:'none', fontFamily:'DM Mono', fontWeight:500, transition:'border .15s', letterSpacing:'0.02em' }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = aQR ? C.blue : C.border}
            />
          </div>
        </div>

        {/* Submit */}
        <button className="btn-primary" onClick={submit} disabled={status === 'loading'} style={{
          width:'100%', padding:'15px', border:'none', borderRadius:11, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          background: status === 'loading' ? '#ccc' : action === 'CHECKOUT' ? C.blue : C.green,
          color:'white', fontSize:16, fontWeight:800, letterSpacing:'-0.02em',
          boxShadow: status === 'loading' ? 'none' : `0 4px 18px ${action === 'CHECKOUT' ? 'rgba(0,122,255,.4)' : 'rgba(22,163,74,.4)'}`,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all .2s',
        }}>
          {status === 'loading' ? <><Spinner color="white" /> Processing…</> : `${action === 'CHECKOUT' ? '↑' : '↓'} ${action}`}
        </button>

        {/* Result */}
        {status === 'success' && (
          <div className="anim-pop" style={{ marginTop:16, padding:'16px 20px', background: C.greenBg, border:`2px solid ${C.green}44`, borderRadius:11, display:'flex', gap:14, alignItems:'center' }}>
            <span style={{ fontSize:24 }}>✅</span>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color: C.green }}>{msg}</div>
              {subMsg && <div style={{ fontSize:13, color: C.green, opacity:.75, marginTop:3 }}>{subMsg}</div>}
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="anim-pop" style={{ marginTop:16, padding:'16px 20px', background: C.redBg, border:`2px solid ${C.red}44`, borderRadius:11, display:'flex', gap:14, alignItems:'center' }}>
            <span style={{ fontSize:24 }}>❌</span>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color: C.red }}>{msg}</div>
              {subMsg && <div style={{ fontSize:13, color: C.red, opacity:.75, marginTop:3 }}>{subMsg}</div>}
            </div>
          </div>
        )}
      </Panel>

      {/* Quick reference */}
      <Panel pad={24}>
        <div style={{ fontSize:14, fontWeight:700, color: C.text, marginBottom:16 }}>Quick Reference — Click to fill</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {samples.map(([label, code]) => (
            <button key={code} onClick={() => fill(code)} className="btn-hover" style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 14px', background: C.panelAlt, border:`1px solid ${C.border}`, borderRadius: C.rSm,
              cursor:'pointer', textAlign:'left',
            }}>
              <span style={{ fontSize:13, color: C.textSub, flex:1 }}>{label}</span>
              <span style={{ fontFamily:'DM Mono', fontSize:12.5, color: C.blue, fontWeight:500, marginLeft:8, flexShrink:0 }}>{code}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop:12, fontSize:12.5, color: C.textMuted }}>Click any row to auto-fill Worker QR first, then Asset QR. Press Enter to move between fields.</div>
      </Panel>
    </div>
  )
}

// ─── UTIL ──────────────────────────────────────────────────────────────────────
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('dashboard')
  const sfn = useCallback(() => api.summary(), [])
  const { data: summary } = useData(sfn, 15000)

  const VIEWS = { dashboard: <Dashboard setPage={setPage} />, scan: <ScanPage />, custody: <CustodyPage />, assets: <AssetsPage />, workers: <WorkersPage />, alerts: <AlertsPage /> }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Sidebar page={page} setPage={setPage} summary={summary} />
        <main style={{ flex:1, overflowY:'auto', padding:'32px 36px', background: C.bg }}>
          <div key={page} className="anim-fade">{VIEWS[page]}</div>
        </main>
      </div>
    </>
  )
}
