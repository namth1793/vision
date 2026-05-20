import { useState, useEffect, useCallback } from 'react'
import { Search, Ship, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => v == null || isNaN(v) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtTon = (v) => (v == null || v === '' || isNaN(v)) ? '—' : `${Number(v).toFixed(3)} MT`

function computeBLInvoice(r) {
  const price = n(r.price), nw_bl = n(r.nw_bl), advanced_paid_bl = n(r.advanced_paid_bl), retention = n(r.retention)
  return (price * nw_bl) - advanced_paid_bl - (price * nw_bl * retention / 100)
}

export default function TradeOrders() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    api.get('/trades', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const totals = records.reduce((acc, r) => {
    acc.nw_bl += n(r.nw_bl)
    acc.gw_bl += n(r.gw_bl)
    acc.blInvoice += computeBLInvoice(r)
    return acc
  }, { nw_bl: 0, gw_bl: 0, blInvoice: 0 })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">🚢 Vận Chuyển / Bill of Lading</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kết quả vận chuyển & tính toán B/L Invoice — nhập tại <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline font-medium">Nhập Liệu</button></p>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm số HĐ, B/L..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-60" /></div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15}/></button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Số lô hàng', value: records.length, color: 'blue' },
          { label: 'Tổng GW on B/L', value: `${totals.gw_bl.toFixed(3)} MT`, color: 'slate' },
          { label: 'Tổng NW on B/L', value: `${totals.nw_bl.toFixed(3)} MT`, color: 'violet' },
          { label: 'Tổng B/L Invoice', value: fmtUSD(totals.blInvoice), color: 'emerald' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.color === 'blue' ? 'text-blue-700' : k.color === 'emerald' ? 'text-emerald-700' : k.color === 'violet' ? 'text-violet-700' : 'text-slate-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Số HĐ</th>
              <th className="table-head">Line/Loader</th>
              <th className="table-head">B/L Number</th>
              <th className="table-head">ETA CAIMEP</th>
              <th className="table-head">ETA HCM</th>
              <th className="table-head">ETA POD</th>
              <th className="table-head">DHL/Fedex No.</th>
              <th className="table-head">DHL Delivered</th>
              <th className="table-head">Cont</th>
              <th className="table-head">GW (MT)</th>
              <th className="table-head">NW on B/L (MT)</th>
              <th className="table-head">Adv Paid B/L</th>
              <th className="table-head bg-violet-50 text-violet-700">[37] B/L Invoice</th>
              <th className="table-head">Notes 2</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={15} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={15} className="text-center py-12 text-slate-400">
                <Ship size={40} className="mx-auto mb-2 opacity-30" />
                <div>Chưa có dữ liệu — <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline">Nhập liệu mới</button></div>
              </td></tr> :
              records.map((r, i) => {
                const blInvoice = computeBLInvoice(r)
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell text-slate-400 text-xs">{i+1}</td>
                    <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.contract_no || '—'}</td>
                    <td className="table-cell text-sm">{r.line_loader || '—'}</td>
                    <td className="table-cell font-mono text-xs">{r.bl_number || '—'}</td>
                    <td className="table-cell text-xs">{r.eta_caimep || '—'}</td>
                    <td className="table-cell text-xs">{r.eta_hcm || '—'}</td>
                    <td className="table-cell text-xs">{r.eta_pod || '—'}</td>
                    <td className="table-cell text-xs">{r.dhl_fedex_number || '—'}</td>
                    <td className="table-cell text-xs">{r.dhl_delivered || '—'}</td>
                    <td className="table-cell text-xs">
                      <div>{r.total_cont ? `${r.total_cont}x ${r.cont_size || ''}` : '—'}</div>
                      {r.bags && <div className="text-slate-400">{r.bags} bags</div>}
                    </td>
                    <td className="table-cell">{fmtTon(r.gw_bl)}</td>
                    <td className="table-cell font-medium">{fmtTon(r.nw_bl)}</td>
                    <td className="table-cell">{r.advanced_paid_bl ? fmtUSD(r.advanced_paid_bl) : '—'}</td>
                    <td className="table-cell bg-violet-50 font-bold text-violet-700">{fmtUSD(blInvoice)}</td>
                    <td className="table-cell text-xs text-slate-500 max-w-32 truncate" title={r.notes2}>{r.notes2 || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            {records.length > 0 && (
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="table-cell" colSpan={10}>Tổng ({records.length})</td>
                <td className="table-cell">{totals.gw_bl.toFixed(3)} MT</td>
                <td className="table-cell">{totals.nw_bl.toFixed(3)} MT</td>
                <td className="table-cell"></td>
                <td className="table-cell bg-violet-50 text-violet-700">{fmtUSD(totals.blInvoice)}</td>
                <td className="table-cell"></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
