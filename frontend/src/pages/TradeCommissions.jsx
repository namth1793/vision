import { useState, useEffect, useCallback } from 'react'
import { Search, DollarSign, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => v == null || isNaN(v) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtTon = (v) => (v == null || v === '' || isNaN(v)) ? '—' : `${Number(v).toFixed(3)} MT`

function computeCommission(r) {
  const commission_rate = n(r.commission_rate)
  const nw_bw = n(r.nw_bw)
  const pay_on_behalf = n(r.pay_on_behalf)
  const fee_from_buyer = n(r.fee_from_buyer)

  // 65: Amount = Commission Rate × NW out of BW
  const amount = commission_rate * nw_bw

  // Net = Amount - Pay on behalf
  const net = amount - pay_on_behalf

  // Total receivable = net + fee from buyer
  const totalReceivable = net + fee_from_buyer

  return { amount, net, totalReceivable }
}

export default function TradeCommissions() {
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
    const c = computeCommission(r)
    acc.amount += c.amount
    acc.payOnBehalf += n(r.pay_on_behalf)
    acc.net += c.net
    acc.feeFromBuyer += n(r.fee_from_buyer)
    acc.totalReceivable += c.totalReceivable
    return acc
  }, { amount: 0, payOnBehalf: 0, net: 0, feeFromBuyer: 0, totalReceivable: 0 })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">💰 Hoa Hồng</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tính toán hoa hồng & phí môi giới — nhập tại <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline font-medium">Nhập Liệu</button></p>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm số HĐ, broker..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-60" /></div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15}/></button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Tổng HĐ', value: records.length, color: 'blue' },
          { label: 'Tổng Commission Amount', value: fmtUSD(totals.amount), color: 'teal' },
          { label: 'Pay on Behalf', value: fmtUSD(totals.payOnBehalf), color: 'amber' },
          { label: 'Net Commission', value: fmtUSD(totals.net), color: 'emerald' },
          { label: 'Fee from Buyer', value: fmtUSD(totals.feeFromBuyer), color: 'violet' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.color === 'teal' ? 'text-teal-700' : k.color === 'emerald' ? 'text-emerald-700' : k.color === 'amber' ? 'text-amber-700' : k.color === 'violet' ? 'text-violet-700' : 'text-blue-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Số HĐ</th>
              <th className="table-head">Staff</th>
              <th className="table-head">Broker</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer</th>
              <th className="table-head">NW out of BW</th>
              <th className="table-head">Commission ($/MT)</th>
              <th className="table-head bg-teal-50 text-teal-700">[65] Amount</th>
              <th className="table-head">Pay on Behalf</th>
              <th className="table-head">Net Commission</th>
              <th className="table-head">Fee from Buyer</th>
              <th className="table-head">Total Receivable</th>
              <th className="table-head">Notes 7</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={14} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={14} className="text-center py-12 text-slate-400">
                <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
                <div>Chưa có dữ liệu hoa hồng</div>
              </td></tr> :
              records.map((r, i) => {
                const c = computeCommission(r)
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell text-slate-400 text-xs">{i+1}</td>
                    <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.contract_no || '—'}</td>
                    <td className="table-cell text-sm">{r.staff || '—'}</td>
                    <td className="table-cell text-sm font-medium">{r.broker || '—'}</td>
                    <td className="table-cell text-sm">{r.seller || '—'}</td>
                    <td className="table-cell text-sm">{r.buyer || '—'}</td>
                    <td className="table-cell">{fmtTon(r.nw_bw)}</td>
                    <td className="table-cell">{r.commission_rate ? fmtUSD(r.commission_rate) : '—'}</td>
                    <td className="table-cell bg-teal-50 font-bold text-teal-700">{fmtUSD(c.amount)}</td>
                    <td className="table-cell text-amber-700">{r.pay_on_behalf ? fmtUSD(r.pay_on_behalf) : '—'}</td>
                    <td className={`table-cell font-semibold ${c.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtUSD(c.net)}</td>
                    <td className="table-cell text-violet-700">{r.fee_from_buyer ? fmtUSD(r.fee_from_buyer) : '—'}</td>
                    <td className="table-cell font-bold text-blue-700">{fmtUSD(c.totalReceivable)}</td>
                    <td className="table-cell text-xs text-slate-500 max-w-28 truncate" title={r.notes7}>{r.notes7 || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            {records.length > 0 && (
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="table-cell" colSpan={8}>Tổng ({records.length})</td>
                <td className="table-cell bg-teal-50 text-teal-700">{fmtUSD(totals.amount)}</td>
                <td className="table-cell text-amber-700">{fmtUSD(totals.payOnBehalf)}</td>
                <td className="table-cell text-emerald-700">{fmtUSD(totals.net)}</td>
                <td className="table-cell text-violet-700">{fmtUSD(totals.feeFromBuyer)}</td>
                <td className="table-cell text-blue-700">{fmtUSD(totals.totalReceivable)}</td>
                <td className="table-cell"></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Formula */}
      <div className="card p-4 bg-slate-50">
        <div className="text-xs font-semibold text-slate-600 mb-2">📖 Công thức</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
          <div><span className="font-mono bg-white px-1 rounded">[65] Amount</span> = Commission ($/MT) × NW out of BW</div>
          <div><span className="font-mono bg-white px-1 rounded">Net</span> = Amount − Pay on behalf of Seller</div>
          <div><span className="font-mono bg-white px-1 rounded">Total Receivable</span> = Net + Fee from Buyer</div>
        </div>
      </div>
    </div>
  )
}
