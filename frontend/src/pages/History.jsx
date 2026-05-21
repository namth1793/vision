import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, FilePlus, FilePen, Trash2, Clock, User, Filter } from 'lucide-react'
import api from '../lib/axios'

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)   return `${diff}s trước`
  if (diff < 3600) return `${Math.floor(diff/60)}m trước`
  if (diff < 86400)return `${Math.floor(diff/3600)}h trước`
  if (diff < 86400*7) return `${Math.floor(diff/86400)} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const ACTION_CONFIG = {
  create: { label: 'Nhập liệu',  icon: FilePlus,  bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  update: { label: 'Cập nhật',   icon: FilePen,   bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    ring: 'ring-blue-200' },
  delete: { label: 'Đã xóa',     icon: Trash2,    bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     ring: 'ring-red-200' },
}

const ROLE_COLOR = {
  admin:  'bg-violet-100 text-violet-700',
  seller: 'bg-blue-100 text-blue-700',
  broker: 'bg-amber-100 text-amber-700',
  staff:  'bg-slate-100 text-slate-600',
}
const ROLE_LABEL = { admin: 'Admin', seller: 'Seller', broker: 'Broker', staff: 'Staff' }

// ── Detail changes parser ─────────────────────────────────────────────────────
function parseChanges(detail) {
  try {
    const d = JSON.parse(detail || '{}')
    if (d.changed && d.changed.length > 0) return d.changed
    if (d.contract_no) return [`HĐ: ${d.contract_no}`, d.seller && `Seller: ${d.seller}`, d.buyer && `Buyer: ${d.buyer}`].filter(Boolean)
    return []
  } catch { return [] }
}

// ── Timeline Item ─────────────────────────────────────────────────────────────
function TimelineItem({ log, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.update
  const Icon = cfg.icon
  const changes = parseChanges(log.detail)

  return (
    <div className="flex gap-4">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ring-2 ${cfg.ring}`}>
          <Icon size={16} className={cfg.text} />
        </div>
        {!isLast && <div className="w-0.5 bg-slate-200 flex-1 mt-1" />}
      </div>

      {/* Content */}
      <div className={`pb-5 flex-1 min-w-0 ${isLast ? '' : ''}`}>
        <div className="flex flex-wrap items-start gap-2 mb-1">
          {/* Action badge */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
          {/* Contract badge */}
          {log.contract_no && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
              {log.contract_no}
            </span>
          )}
          {/* Time */}
          <span className="text-xs text-slate-400 ml-auto shrink-0" title={fmtDateTime(log.created_at)}>
            {timeAgo(log.created_at)}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-700 font-medium leading-snug">{log.summary}</p>

        {/* User info */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-slate-600">{log.user_name?.[0] || '?'}</span>
          </div>
          <span className="text-xs text-slate-600 font-medium">{log.user_name || '—'}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ROLE_COLOR[log.user_role] || 'bg-slate-100 text-slate-500'}`}>
            {ROLE_LABEL[log.user_role] || log.user_role}
          </span>
          <span className="text-xs text-slate-400">{fmtDateTime(log.created_at)}</span>
        </div>

        {/* Changed fields (expandable) */}
        {changes.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              {expanded ? '▲ Ẩn chi tiết' : `▼ Xem ${changes.length} thay đổi`}
            </button>
            {expanded && (
              <ul className="mt-1.5 space-y-1 pl-2 border-l-2 border-slate-200">
                {changes.map((c, i) => (
                  <li key={i} className="text-xs text-slate-600 font-mono">{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function History() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser]     = useState('')
  const [users, setUsers]     = useState([])
  const [page, setPage]       = useState(0)
  const [viewMode, setViewMode] = useState('timeline') // 'timeline' | 'table'
  const PER_PAGE = 50

  const load = useCallback(() => {
    setLoading(true)
    const params = { limit: PER_PAGE, offset: page * PER_PAGE }
    if (search)       params.search  = search
    if (filterAction) params.action  = filterAction
    if (filterUser)   params.user_id = filterUser
    Promise.all([
      api.get('/history', { params }),
      api.get('/history/stats'),
    ]).then(([r1, r2]) => {
      setLogs(r1.data.logs)
      setTotal(r1.data.total)
      setStats(r2.data)
    }).finally(() => setLoading(false))
  }, [search, filterAction, filterUser, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const totalPages = Math.ceil(total / PER_PAGE)

  // Group logs by date for timeline
  function groupByDate(logs) {
    const groups = {}
    logs.forEach(log => {
      const day = log.created_at ? log.created_at.split(' ')[0] : 'Không rõ'
      if (!groups[day]) groups[day] = []
      groups[day].push(log)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  function formatDay(day) {
    if (!day || day === 'Không rõ') return 'Không rõ'
    const d = new Date(day)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hôm nay'
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua'
    return d.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })
  }

  const actionCount = (a) => stats?.actionCounts?.find(x => x.action === a)?.count || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">🕐 Lịch Sử Hoạt Động</h1>
          <p className="text-sm text-slate-500 mt-0.5">Theo dõi mọi thao tác nhập liệu & chỉnh sửa · Tự cập nhật mỗi 30 giây</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-2 text-sm font-medium ${viewMode==='timeline' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Timeline</button>
            <button onClick={() => setViewMode('table')}    className={`px-3 py-2 text-sm font-medium ${viewMode==='table'    ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Bảng</button>
          </div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15}/></button>
        </div>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Tổng thao tác</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{total}</div>
        </div>
        <div className="card p-4 border-l-4 border-emerald-400">
          <div className="flex items-center gap-2 text-xs text-slate-500"><FilePlus size={12} className="text-emerald-500"/> Nhập liệu</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{actionCount('create')}</div>
        </div>
        <div className="card p-4 border-l-4 border-blue-400">
          <div className="flex items-center gap-2 text-xs text-slate-500"><FilePen size={12} className="text-blue-500"/> Cập nhật</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{actionCount('update')}</div>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <div className="flex items-center gap-2 text-xs text-slate-500"><Trash2 size={12} className="text-red-500"/> Đã xóa</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{actionCount('delete')}</div>
        </div>
      </div>

      {/* Top users */}
      {stats?.topUsers?.length > 0 && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            <User size={12} className="inline mr-1" /> Hoạt động nhiều nhất
          </div>
          <div className="flex flex-wrap gap-3">
            {stats.topUsers.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-700">{u.user_name?.[0] || '?'}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700">{u.user_name}</div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] px-1 rounded font-medium ${ROLE_COLOR[u.user_role]||''}`}>{ROLE_LABEL[u.user_role]||u.user_role}</span>
                    <span className="text-xs text-slate-400">{u.count} thao tác</span>
                  </div>
                </div>
                {i === 0 && <span className="text-base" title="Hoạt động nhiều nhất">🏆</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input placeholder="Tìm HĐ, người dùng, nội dung..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="input pl-9 w-64 text-sm" />
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0) }} className="select w-36 text-sm">
          <option value="">Tất cả hành động</option>
          <option value="create">Nhập liệu</option>
          <option value="update">Cập nhật</option>
          <option value="delete">Đã xóa</option>
        </select>
        <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(0) }} className="select w-44 text-sm">
          <option value="">Tất cả người dùng</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
        {(search || filterAction || filterUser) && (
          <button onClick={() => { setSearch(''); setFilterAction(''); setFilterUser(''); setPage(0) }}
            className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
            <Filter size={12}/> Xóa filter
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{total} kết quả</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"/>
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-16 text-center">
          <Clock size={48} className="mx-auto mb-3 text-slate-300"/>
          <div className="text-slate-500 font-medium">Chưa có lịch sử hoạt động</div>
          <div className="text-sm text-slate-400 mt-1">Các thao tác nhập liệu & chỉnh sửa sẽ hiển thị tại đây</div>
        </div>
      ) : viewMode === 'timeline' ? (
        /* ── Timeline View ── */
        <div className="space-y-6">
          {groupByDate(logs).map(([day, dayLogs]) => (
            <div key={day}>
              {/* Day separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-slate-200"/>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                  {formatDay(day)}
                </span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>
              {/* Logs for this day */}
              <div className="card p-5">
                {dayLogs.map((log, idx) => (
                  <TimelineItem key={log.id} log={log} isLast={idx === dayLogs.length - 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-head">Thời gian</th>
                <th className="table-head">Hành động</th>
                <th className="table-head">Số HĐ</th>
                <th className="table-head">Nội dung</th>
                <th className="table-head">Người thực hiện</th>
                <th className="table-head">Vai trò</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => {
                  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.update
                  const Icon = cfg.icon
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="table-cell text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-medium">{fmtDateTime(log.created_at)}</div>
                        <div className="text-slate-400">{timeAgo(log.created_at)}</div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <Icon size={12}/> {cfg.label}
                        </span>
                      </td>
                      <td className="table-cell font-mono text-xs text-blue-600 font-bold">
                        {log.contract_no || '—'}
                      </td>
                      <td className="table-cell text-sm text-slate-700 max-w-xs truncate" title={log.summary}>
                        {log.summary}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold">{log.user_name?.[0]||'?'}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-700">{log.user_name||'—'}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLOR[log.user_role]||'bg-slate-100 text-slate-500'}`}>
                          {ROLE_LABEL[log.user_role]||log.user_role}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">← Trước</button>
          <span className="text-sm text-slate-600">
            Trang {page+1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page>=totalPages-1}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">Sau →</button>
        </div>
      )}
    </div>
  )
}
