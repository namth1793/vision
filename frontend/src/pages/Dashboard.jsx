import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ArrowDownLeft, Warehouse, ClipboardList, LayoutGrid } from 'lucide-react'
import api from '../lib/axios'

const fmt = (n) => (n != null && n !== '') ? new Intl.NumberFormat('vi-VN').format(Math.round(Number(n))) : '0'
const fmtDate = (d) => (d && d.length >= 10) ? d.substring(0, 10) : '—'

const statusBadge = (s) => {
  if (!s) return 'bg-slate-100 text-slate-500'
  const u = s.toUpperCase()
  if (u === 'SIGNED') return 'bg-emerald-100 text-emerald-700'
  if (u.includes('PENDING') || u.includes('CHỜ') || u.includes('CHƯA')) return 'bg-yellow-100 text-yellow-700'
  if (u.includes('DONE') || u.includes('CLOSED') || u.includes('PAID')) return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-600'
}

const bwhStatusColor = {
  'CHƯA NHẬP KHO': 'bg-slate-100 text-slate-700 border-slate-200',
  'CHƯA BÁN':     'bg-yellow-50 text-yellow-800 border-yellow-200',
  'ĐÃ BÁN':       'bg-blue-50 text-blue-800 border-blue-200',
  'ĐÃ XUẤT KHO':  'bg-emerald-50 text-emerald-800 border-emerald-200',
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            active === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t.label}{t.count != null ? ` (${t.count})` : ''}
        </button>
      ))}
    </div>
  )
}

const TH = ({ children }) => (
  <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-left whitespace-nowrap border-b border-slate-200">
    {children}
  </th>
)
const TD = ({ children, className = '' }) => (
  <td className={`px-3 py-1.5 text-xs text-slate-700 whitespace-nowrap ${className}`}>{children}</td>
)
const Empty = ({ cols }) => (
  <tr><td colSpan={cols} className="text-center py-6 text-slate-400 text-xs">Không có dữ liệu</td></tr>
)

const PANELS = [
  { key: 'xuat', label: 'XUẤT',         color: 'bg-blue-600',   activeClass: 'bg-blue-600 text-white border-blue-600' },
  { key: 'nhap', label: 'NHẬP',         color: 'bg-emerald-600', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { key: 'kho',  label: 'KHO NQ',       color: 'bg-amber-600',  activeClass: 'bg-amber-600 text-white border-amber-600' },
  { key: 'kiem', label: 'KIỂM HÀNG',    color: 'bg-violet-600', activeClass: 'bg-violet-600 text-white border-violet-600' },
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [t1, setT1] = useState('signed')
  const [t2, setT2] = useState('status')
  const [t3, setT3] = useState('byStatus')
  const [t4, setT4] = useState('inspection')
  const [shown, setShown] = useState(new Set(['xuat', 'nhap', 'kho', 'kiem']))
  const navigate = useNavigate()

  const togglePanel = (key) => setShown(prev => {
    const next = new Set(prev)
    if (next.has(key)) { if (next.size > 1) next.delete(key) }
    else next.add(key)
    return next
  })

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  const d = data || {}

  // Panel 1 - XUẤT
  const expSignedHH   = d.exportSignedByCommodity || []
  const expUnsigned   = d.exportUnsigned || []
  const expETDSoon    = d.exportETDSoon || []
  const expETASoon    = d.exportETASoon || []

  // Panel 2 - NHẬP
  const impByStatus   = d.importByStatus || []
  const impList       = d.importPendingList || []
  const impETDSoon    = d.importETDSoon || []
  const impReceivable = d.importReceivable || []
  const impPayable    = d.importPayable || []

  // Panel 3 - KHO NQ
  const bwhAll        = d.bwhAll || []
  const bwhETDSoon    = d.bwhETDSoon || []
  const bwhDebts      = d.bwhDebts || []

  // Panel 4 - LỊCH KIỂM
  const inspBL        = d.inspectionBL || []
  const expTotals     = d.expenseTotals || []
  const expPending    = d.expensePending || []

  const eIncome  = expTotals.find(e => e.type === 'income')?.total || 0
  const eOut     = expTotals.find(e => e.type === 'expense')?.total || 0
  const ePendIn  = expPending.find(e => e.type === 'income')?.total || 0
  const ePendOut = expPending.find(e => e.type === 'expense')?.total || 0

  // Group BWH by status order
  const BWH_STATUSES = ['CHƯA NHẬP KHO', 'CHƯA BÁN', 'ĐÃ BÁN', 'ĐÃ XUẤT KHO']
  const bwhGroups = BWH_STATUSES.reduce((acc, s) => {
    acc[s] = bwhAll.filter(b => b.status === s)
    return acc
  }, {})
  const bwhOther = bwhAll.filter(b => !BWH_STATUSES.includes(b.status))

  const panelCls = 'card flex flex-col overflow-hidden'
  const bodyCls  = 'flex-1 overflow-y-auto min-h-0'

  const shownCount = shown.size
  const gridCols = shownCount === 1 ? 'grid-cols-1' : 'grid-cols-2'
  const gridHeight = shownCount <= 2 ? 'calc(100vh - 152px)' : 'calc(100vh - 152px)'

  return (
    <div className="space-y-3">
    {/* ─── Filter bar ─── */}
    <div className="card px-4 py-2.5 flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold shrink-0">
        <LayoutGrid size={14} />
        Hiển thị:
      </div>
      <div className="flex flex-wrap gap-2">
        {PANELS.map(p => {
          const active = shown.has(p.key)
          return (
            <button
              key={p.key}
              onClick={() => togglePanel(p.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                active ? p.activeClass : 'border-slate-300 text-slate-500 hover:border-slate-400 bg-white'
              }`}
            >
              {p.label}
              {active ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      <span className="ml-auto text-[11px] text-slate-400">{shownCount}/4 bảng</span>
    </div>

    {/* ─── Grid panels ─── */}
    <div className={`grid ${gridCols} gap-4`} style={{ height: gridHeight }}>

      {/* ━━━━━━━━━━━━ PANEL 1: XUẤT ━━━━━━━━━━━━ */}
      {shown.has('xuat') && <div className={panelCls}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white shrink-0">
          <ArrowUpRight className="w-4 h-4 shrink-0" />
          <h3 className="font-bold text-sm tracking-wide">XUẤT</h3>
          <button onClick={() => navigate('/export-entry')} className="ml-auto text-[11px] opacity-80 hover:opacity-100 hover:underline">
            Xem tất cả →
          </button>
        </div>
        <Tabs
          tabs={[
            { key: 'signed',   label: 'Đã ký theo HH',  count: expSignedHH.length },
            { key: 'unsigned', label: 'Chưa ký',        count: expUnsigned.length },
            { key: 'etd',      label: 'Sắp chạy (ETD)', count: expETDSoon.length },
            { key: 'eta',      label: 'Sắp cập (ETA)',  count: expETASoon.length },
          ]}
          active={t1} onChange={setT1}
        />
        <div className={bodyCls}>
          {t1 === 'signed' && (
            <table className="w-full">
              <thead><tr><TH>Mặt hàng</TH><TH>Số lô đã ký</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {expSignedHH.length === 0 ? <Empty cols={2} /> : expSignedHH.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50 cursor-pointer" onClick={() => navigate('/export-entry')}>
                    <TD className="font-medium text-slate-800">{r.commodity}</TD>
                    <TD>
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{r.count} lô</span>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t1 === 'unsigned' && (
            <table className="w-full">
              <thead><tr><TH>Sale Contract</TH><TH>Buyer</TH><TH>Mặt hàng</TH><TH>Trạng thái</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {expUnsigned.length === 0 ? <Empty cols={4} /> : expUnsigned.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/export-entry')}>
                    <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                    <TD>{r.buyer1 || '—'}</TD>
                    <TD>{r.commodity || '—'}</TD>
                    <TD>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(r.status)}`}>
                        {r.status || 'N/A'}
                      </span>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t1 === 'etd' && (
            <table className="w-full">
              <thead><tr><TH>Sale Contract</TH><TH>Mặt hàng</TH><TH>ETD</TH><TH>Tuyến vận chuyển</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {expETDSoon.length === 0 ? <Empty cols={4} /> : expETDSoon.map(r => (
                  <tr key={r.id} className="hover:bg-orange-50 cursor-pointer" onClick={() => navigate('/export-entry')}>
                    <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                    <TD>{r.commodity || '—'}</TD>
                    <TD className="font-bold text-orange-600">{fmtDate(r.etd)}</TD>
                    <TD className="text-slate-500">{r.pol || '?'} → {r.pod || '?'}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t1 === 'eta' && (
            <table className="w-full">
              <thead><tr><TH>Sale Contract</TH><TH>Mặt hàng</TH><TH>ETA</TH><TH>Tuyến vận chuyển</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {expETASoon.length === 0 ? <Empty cols={4} /> : expETASoon.map(r => (
                  <tr key={r.id} className="hover:bg-green-50 cursor-pointer" onClick={() => navigate('/export-entry')}>
                    <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                    <TD>{r.commodity || '—'}</TD>
                    <TD className="font-bold text-emerald-600">{fmtDate(r.eta)}</TD>
                    <TD className="text-slate-500">{r.pol || '?'} → {r.pod || '?'}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>}

      {/* ━━━━━━━━━━━━ PANEL 2: NHẬP ━━━━━━━━━━━━ */}
      {shown.has('nhap') && <div className={panelCls}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white shrink-0">
          <ArrowDownLeft className="w-4 h-4 shrink-0" />
          <h3 className="font-bold text-sm tracking-wide">NHẬP</h3>
          <button onClick={() => navigate('/import-entry')} className="ml-auto text-[11px] opacity-80 hover:opacity-100 hover:underline">
            Xem tất cả →
          </button>
        </div>
        <Tabs
          tabs={[
            { key: 'status',     label: 'Theo trạng thái', count: impByStatus.length },
            { key: 'etd',        label: 'Sắp về (ETA)',    count: impETDSoon.length },
            { key: 'receivable', label: 'Phải thu',        count: impReceivable.length },
            { key: 'payable',    label: 'Phải trả',        count: impPayable.length },
          ]}
          active={t2} onChange={setT2}
        />
        <div className={bodyCls}>
          {t2 === 'status' && (
            <div>
              {/* Status summary badges */}
              {impByStatus.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
                  {impByStatus.map((s, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(s.status)}`}>
                      {s.status}: {s.count}
                    </span>
                  ))}
                </div>
              )}
              <table className="w-full">
                <thead><tr><TH>Sale Contract</TH><TH>Seller</TH><TH>SL (MT)</TH><TH>Trạng thái</TH></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {impList.length === 0 ? <Empty cols={4} /> : impList.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/import-entry')}>
                      <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                      <TD>{r.seller || '—'}</TD>
                      <TD>{r.quantity ? fmt(r.quantity) : '—'}</TD>
                      <TD>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(r.status)}`}>
                          {r.status || 'N/A'}
                        </span>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {t2 === 'etd' && (
            <table className="w-full">
              <thead><tr><TH>Sale Contract</TH><TH>Seller</TH><TH>ETA</TH><TH>B/L Number</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {impETDSoon.length === 0 ? <Empty cols={4} /> : impETDSoon.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50 cursor-pointer" onClick={() => navigate('/import-entry')}>
                    <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                    <TD>{r.seller || '—'}</TD>
                    <TD className="font-bold text-orange-600">{fmtDate(r.eta_pod || r.eta_hcm || r.eta_caimep)}</TD>
                    <TD className="font-mono text-slate-500">{r.bl_number || '—'}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t2 === 'receivable' && (
            <table className="w-full">
              <thead><tr><TH>Sale Contract</TH><TH>Seller</TH><TH>Phải thu (USD)</TH><TH>Ngày TT</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {impReceivable.length === 0 ? <Empty cols={4} /> : impReceivable.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50 cursor-pointer" onClick={() => navigate('/import-entry')}>
                    <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                    <TD>{r.seller || '—'}</TD>
                    <TD className="font-bold text-emerald-600">${fmt(r.debit_credit_input)}</TD>
                    <TD>{fmtDate(r.payment_date3)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t2 === 'payable' && (
            <table className="w-full">
              <thead><tr><TH>Sale Contract</TH><TH>Seller</TH><TH>Phải trả (USD)</TH><TH>Ngày TT</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {impPayable.length === 0 ? <Empty cols={4} /> : impPayable.map(r => (
                  <tr key={r.id} className="hover:bg-red-50 cursor-pointer" onClick={() => navigate('/import-entry')}>
                    <TD className="font-mono text-blue-600 font-medium">{r.sale_contract || '—'}</TD>
                    <TD>{r.seller || '—'}</TD>
                    <TD className="font-bold text-red-600">${fmt(Math.abs(r.debit_credit_input))}</TD>
                    <TD>{fmtDate(r.payment_date3)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>}

      {/* ━━━━━━━━━━━━ PANEL 3: KHO NQ ━━━━━━━━━━━━ */}
      {shown.has('kho') && <div className={panelCls}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white shrink-0">
          <Warehouse className="w-4 h-4 shrink-0" />
          <h3 className="font-bold text-sm tracking-wide">KHO NGOẠI QUAN</h3>
          <button onClick={() => navigate('/bwh-entry')} className="ml-auto text-[11px] opacity-80 hover:opacity-100 hover:underline">
            Xem tất cả →
          </button>
        </div>
        <Tabs
          tabs={[
            { key: 'byStatus', label: 'Theo trạng thái', count: bwhAll.length },
            { key: 'etd',      label: 'Sắp về (ETA)',   count: bwhETDSoon.length },
            { key: 'debt',     label: 'Công nợ',         count: bwhDebts.length },
          ]}
          active={t3} onChange={setT3}
        />
        <div className={bodyCls}>
          {t3 === 'byStatus' && (
            bwhAll.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Không có dữ liệu</div>
            ) : (
              BWH_STATUSES.concat(bwhOther.length > 0 ? ['Khác'] : []).map(status => {
                const items = status === 'Khác' ? bwhOther : (bwhGroups[status] || [])
                if (items.length === 0) return null
                const hdrCls = bwhStatusColor[status] || 'bg-slate-100 text-slate-700 border-slate-200'
                return (
                  <div key={status}>
                    <div className={`px-3 py-1 text-[11px] font-bold border-y ${hdrCls}`}>
                      {status} — {items.length} lô
                    </div>
                    <table className="w-full">
                      <thead><tr><TH>B/L</TH><TH>Seller</TH><TH>Mặt hàng</TH><TH>NW (MT)</TH></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(r => (
                          <tr key={r.id} className="hover:bg-amber-50 cursor-pointer" onClick={() => navigate('/bwh-entry')}>
                            <TD className="font-mono text-amber-700 font-medium">{r.bl || '—'}</TD>
                            <TD>{r.seller || '—'}</TD>
                            <TD>{r.commodity || '—'}</TD>
                            <TD>{r.net_weight ? fmt(r.net_weight) : '—'}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })
            )
          )}
          {t3 === 'etd' && (
            <table className="w-full">
              <thead><tr><TH>B/L</TH><TH>Seller</TH><TH>ETA Vũng Tàu</TH><TH>ETA HCM</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {bwhETDSoon.length === 0 ? <Empty cols={4} /> : bwhETDSoon.map(r => (
                  <tr key={r.id} className="hover:bg-amber-50 cursor-pointer" onClick={() => navigate('/bwh-entry')}>
                    <TD className="font-mono text-amber-700 font-medium">{r.bl || '—'}</TD>
                    <TD>{r.seller || '—'}</TD>
                    <TD className="font-bold text-orange-600">{fmtDate(r.eta_vung_tau)}</TD>
                    <TD className="font-bold text-blue-600">{fmtDate(r.eta_hcm)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t3 === 'debt' && (
            <table className="w-full">
              <thead><tr><TH>B/L</TH><TH>Seller</TH><TH>Đặt cọc (USD)</TH><TH>Đã trả (USD)</TH><TH>Còn lại</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {bwhDebts.length === 0 ? <Empty cols={5} /> : bwhDebts.map(r => {
                  const remaining = (Number(r.deposit) || 0) - (Number(r.amount_paid) || 0)
                  return (
                    <tr key={r.id} className="hover:bg-amber-50 cursor-pointer" onClick={() => navigate('/bwh-entry')}>
                      <TD className="font-mono text-amber-700 font-medium">{r.bl || '—'}</TD>
                      <TD>{r.seller || '—'}</TD>
                      <TD>{r.deposit ? `$${fmt(r.deposit)}` : '—'}</TD>
                      <TD className="text-emerald-600">{r.amount_paid ? `$${fmt(r.amount_paid)}` : '—'}</TD>
                      <TD className={remaining > 0 ? 'font-bold text-red-600' : 'text-emerald-600'}>
                        {remaining !== 0 ? `$${fmt(Math.abs(remaining))}` : '✓'}
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>}

      {/* ━━━━━━━━━━━━ PANEL 4: LỊCH KIỂM HÀNG ━━━━━━━━━━━━ */}
      {shown.has('kiem') && <div className={panelCls}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white shrink-0">
          <ClipboardList className="w-4 h-4 shrink-0" />
          <h3 className="font-bold text-sm tracking-wide">LỊCH KIỂM HÀNG</h3>
          <button onClick={() => navigate('/import-entry')} className="ml-auto text-[11px] opacity-80 hover:opacity-100 hover:underline">
            Xem nhập →
          </button>
        </div>
        <Tabs
          tabs={[
            { key: 'inspection', label: 'Kiểm hàng (B/L)', count: inspBL.length },
            { key: 'expenses',   label: 'Thu chi nội bộ' },
          ]}
          active={t4} onChange={setT4}
        />
        <div className={bodyCls}>
          {t4 === 'inspection' && (
            <table className="w-full">
              <thead>
                <tr>
                  <TH>B/L Number</TH>
                  <TH>Sale Contract</TH>
                  <TH>Seller</TH>
                  <TH>ETA / Ngày dỡ</TH>
                  <TH>Kiểm hàng</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspBL.length === 0 ? <Empty cols={5} /> : inspBL.map(r => (
                  <tr key={r.id} className="hover:bg-violet-50 cursor-pointer" onClick={() => navigate('/import-entry')}>
                    <TD className="font-mono font-bold text-violet-700">{r.bl_number}</TD>
                    <TD className="font-mono text-blue-600">{r.sale_contract || '—'}</TD>
                    <TD>{r.seller || '—'}</TD>
                    <TD>{fmtDate(r.date_unload || r.eta_pod || r.eta_hcm || r.eta_caimep)}</TD>
                    <TD>
                      {r.outturn_vina ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Đã KH ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold animate-pulse">Chờ KH !</span>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {t4 === 'expenses' && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[11px] text-emerald-600 font-semibold mb-1">ĐÃ THU (đã duyệt)</div>
                  <div className="text-lg font-bold text-emerald-700">{fmt(eIncome)} ₫</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-[11px] text-red-600 font-semibold mb-1">ĐÃ CHI (đã duyệt)</div>
                  <div className="text-lg font-bold text-red-700">{fmt(eOut)} ₫</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <div className="text-[11px] text-yellow-600 font-semibold mb-1">THU chờ duyệt</div>
                  <div className="text-base font-bold text-yellow-700">{fmt(ePendIn)} ₫</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="text-[11px] text-orange-600 font-semibold mb-1">CHI chờ duyệt</div>
                  <div className="text-base font-bold text-orange-700">{fmt(ePendOut)} ₫</div>
                </div>
              </div>
              <div className={`rounded-xl border p-3 ${(eIncome - eOut) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">SỐ DƯ THỰC (đã thu – đã chi)</div>
                <div className={`text-2xl font-black ${(eIncome - eOut) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {(eIncome - eOut) >= 0 ? '+' : ''}{fmt(eIncome - eOut)} ₫
                </div>
              </div>
              <button
                onClick={() => navigate('/expenses')}
                className="w-full text-center text-xs text-violet-600 hover:underline py-1 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
              >
                Xem chi tiết thu chi nội bộ →
              </button>
            </div>
          )}
        </div>
      </div>}

    </div>
    </div>
  )
}
