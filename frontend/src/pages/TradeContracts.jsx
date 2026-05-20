import { useState, useEffect, useCallback } from 'react'
import { Search, FileText, Eye, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => v == null || isNaN(v) || v === 0 ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function computeContractValue(r) {
  return n(r.price) * n(r.qty)
}

const statusColor = (s) => ({ active: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700', pending: 'bg-amber-100 text-amber-700' }[s] || 'bg-slate-100 text-slate-600')
const statusLabel = (s) => ({ active: 'Đang HĐ', completed: 'Hoàn thành', cancelled: 'Đã hủy', pending: 'Chờ xử lý' }[s] || s)

export default function TradeContracts() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    api.get('/trades', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  // Summary totals
  const totals = records.reduce((acc, r) => {
    acc.qty += n(r.qty)
    acc.contractValue += computeContractValue(r)
    acc.advancedPayment += n(r.advanced_payment)
    return acc
  }, { qty: 0, contractValue: 0, advancedPayment: 0 })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">📄 Hợp Đồng</h1>
          <p className="text-sm text-slate-500 mt-0.5">Thông tin hợp đồng & giá trị — nhập liệu tại <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline font-medium">Nhập Liệu</button></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm số HĐ, seller, buyer..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-60" /></div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
            <option value="">Tất cả</option>
            <option value="active">Đang HĐ</option>
            <option value="pending">Chờ xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15}/></button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng HĐ', value: records.length, unit: 'HĐ', color: 'blue' },
          { label: 'Tổng Qty', value: `${totals.qty.toLocaleString('en-US', {maximumFractionDigits:2})} MT`, unit: '', color: 'violet' },
          { label: 'Tổng Contract Value', value: fmtUSD(totals.contractValue), unit: '', color: 'emerald' },
          { label: 'Tổng Advanced Payment', value: fmtUSD(totals.advancedPayment), unit: '', color: 'amber' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500 font-medium">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.color === 'blue' ? 'text-blue-700' : k.color === 'emerald' ? 'text-emerald-700' : k.color === 'amber' ? 'text-amber-700' : 'text-violet-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Số HĐ</th>
              <th className="table-head">Năm</th>
              <th className="table-head">Staff</th>
              <th className="table-head">Broker</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer</th>
              <th className="table-head">Ship Date</th>
              <th className="table-head">Qty (MT)</th>
              <th className="table-head">Origin / POL</th>
              <th className="table-head">LBs / Nut</th>
              <th className="table-head">Price</th>
              <th className="table-head bg-blue-50 text-blue-700">[16] Contract Value</th>
              <th className="table-head">Retention</th>
              <th className="table-head">Double Penalty</th>
              <th className="table-head">Status</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={17} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={17} className="text-center py-12 text-slate-400">
                <FileText size={40} className="mx-auto mb-2 opacity-30" />
                <div>Chưa có dữ liệu — <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline">Nhập liệu mới</button></div>
              </td></tr> :
              records.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-cell text-slate-400 text-xs">{i+1}</td>
                  <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.contract_no || '—'}</td>
                  <td className="table-cell">{r.year || '—'}</td>
                  <td className="table-cell text-sm">{r.staff || '—'}</td>
                  <td className="table-cell text-sm">{r.broker || '—'}</td>
                  <td className="table-cell font-medium">{r.seller || '—'}</td>
                  <td className="table-cell">{r.buyer || '—'}</td>
                  <td className="table-cell text-xs text-slate-500">{r.ship_date || '—'}</td>
                  <td className="table-cell">{r.qty ? `${r.qty}` : '—'}</td>
                  <td className="table-cell text-xs"><div>{r.origin || '—'}</div><div className="text-slate-400">{r.pol || ''}</div></td>
                  <td className="table-cell text-xs"><div>LBs: {r.lbs ?? '—'}</div><div>Nut: {r.nut ?? '—'}</div></td>
                  <td className="table-cell">{r.price ? fmtUSD(r.price) : '—'}</td>
                  <td className="table-cell bg-blue-50 font-bold text-blue-700">{fmtUSD(computeContractValue(r))}</td>
                  <td className="table-cell">{r.retention != null ? `${r.retention}%` : '—'}</td>
                  <td className="table-cell">{r.double_penalty ?? '—'}</td>
                  <td className="table-cell"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{statusLabel(r.status)}</span></td>
                  <td className="table-cell">
                    <button onClick={() => navigate('/entry')} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Mở trong Nhập Liệu"><Eye size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
            {records.length > 0 && (
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="table-cell" colSpan={8}>Tổng cộng ({records.length} HĐ)</td>
                <td className="table-cell">{totals.qty.toLocaleString('en-US', {maximumFractionDigits:3})} MT</td>
                <td className="table-cell" colSpan={3}></td>
                <td className="table-cell bg-blue-50 text-blue-700">{fmtUSD(totals.contractValue)}</td>
                <td className="table-cell" colSpan={4}></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
