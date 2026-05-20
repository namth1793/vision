import { useState, useEffect, useCallback } from 'react'
import { Search, Scale, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v < 0 ? `-$${str}` : `$${str}`
}

function computeSettlement(r) {
  const price = n(r.price)
  const nw_bw = n(r.nw_bw)
  const advanced_paid_bl = n(r.advanced_paid_bl)
  const second_payment = n(r.second_payment)
  const outturn_claim_1to1 = n(r.outturn_claim_1to1)
  const outturn_claim_1to2 = n(r.outturn_claim_1to2)
  const dem_det = n(r.dem_det), sto = n(r.sto)
  const other_fee1 = n(r.other_fee1), other_fee2 = n(r.other_fee2)
  const final_settlement = n(r.final_settlement)

  // Nutcount Claim
  const diffNutcount = n(r.nutcount_vina) - n(r.nut)
  const nutcountClaim = diffNutcount > 0 ? diffNutcount * 0.5 * nw_bw : 0

  // Debit/Credit (59) — rounded to 2dp
  const debitCredit = Math.round((
    price * nw_bw
    - advanced_paid_bl
    - second_payment
    - outturn_claim_1to1
    - outturn_claim_1to2
    - nutcountClaim
    - dem_det - sto - other_fee1 - other_fee2
  ) * 100) / 100

  // Notes 4 (60)
  const notes4 = debitCredit > 0
    ? `${r.buyer || 'Buyer'} pays ${r.seller || 'Seller'}`
    : `${r.seller || 'Seller'} pays ${r.buyer || 'Buyer'}`

  // Balance (61)
  const balance = final_settlement - debitCredit

  // Notes 5 (62)
  const notes5 = Math.abs(balance) < 0.01 ? 'CLOSED' : 'BALANCE NOT PAID'

  return { debitCredit, notes4, balance, notes5, nutcountClaim }
}

export default function Settlement() {
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
    const s = computeSettlement(r)
    acc.debitCredit += s.debitCredit
    acc.balance += s.balance
    return acc
  }, { debitCredit: 0, balance: 0 })

  const closedCount = records.filter(r => computeSettlement(r).notes5 === 'CLOSED').length
  const openCount = records.length - closedCount

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">⚖️ Quyết Toán</h1>
          <p className="text-sm text-slate-500 mt-0.5">Debit/Credit, Balance & trạng thái — nhập tại <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline font-medium">Nhập Liệu</button></p>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm số HĐ..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-60" /></div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15}/></button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '✅ CLOSED', value: closedCount, color: 'emerald' },
          { label: '🔴 Chưa xong', value: openCount, color: 'red' },
          { label: 'Tổng Debit/Credit', value: fmtUSD(totals.debitCredit), color: 'blue' },
          { label: 'Tổng Balance', value: fmtUSD(totals.balance), color: totals.balance < 0 ? 'red' : 'emerald' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.color === 'emerald' ? 'text-emerald-700' : k.color === 'red' ? 'text-red-700' : k.color === 'blue' ? 'text-blue-700' : 'text-slate-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Số HĐ</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer</th>
              <th className="table-head">DEM/DET</th>
              <th className="table-head">STO</th>
              <th className="table-head">Fee 1</th>
              <th className="table-head">Fee 2</th>
              <th className="table-head">Nutcount Claim</th>
              <th className="table-head bg-red-50 text-red-700">[59] Debit/Credit</th>
              <th className="table-head">[60] Bên thanh toán</th>
              <th className="table-head">Final Settlement</th>
              <th className="table-head bg-blue-50 text-blue-700">[61] Balance</th>
              <th className="table-head font-bold">[62] Trạng thái</th>
              <th className="table-head">Notes 6</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={15} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={15} className="text-center py-12 text-slate-400">
                <Scale size={40} className="mx-auto mb-2 opacity-30" />
                <div>Chưa có dữ liệu quyết toán</div>
              </td></tr> :
              records.map((r, i) => {
                const s = computeSettlement(r)
                const isClosed = s.notes5 === 'CLOSED'
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell text-slate-400 text-xs">{i+1}</td>
                    <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.contract_no || '—'}</td>
                    <td className="table-cell text-sm">{r.seller || '—'}</td>
                    <td className="table-cell text-sm">{r.buyer || '—'}</td>
                    <td className="table-cell">{r.dem_det ? fmtUSD(r.dem_det) : '—'}</td>
                    <td className="table-cell">{r.sto ? fmtUSD(r.sto) : '—'}</td>
                    <td className="table-cell">{r.other_fee1 ? fmtUSD(r.other_fee1) : '—'}</td>
                    <td className="table-cell">{r.other_fee2 ? fmtUSD(r.other_fee2) : '—'}</td>
                    <td className="table-cell">{s.nutcountClaim > 0 ? fmtUSD(s.nutcountClaim) : '—'}</td>
                    <td className={`table-cell font-bold bg-red-50 ${s.debitCredit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {fmtUSD(s.debitCredit)}
                    </td>
                    <td className="table-cell text-xs text-slate-600 italic max-w-36 truncate" title={s.notes4}>{s.notes4}</td>
                    <td className="table-cell">{r.final_settlement ? fmtUSD(r.final_settlement) : '—'}</td>
                    <td className={`table-cell font-bold bg-blue-50 ${Math.abs(s.balance) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {fmtUSD(s.balance)}
                    </td>
                    <td className="table-cell">
                      {isClosed
                        ? <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold"><CheckCircle size={12}/> CLOSED</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold"><AlertCircle size={12}/> NOT PAID</span>
                      }
                    </td>
                    <td className="table-cell text-xs text-slate-500 max-w-28 truncate" title={r.notes6}>{r.notes6 || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            {records.length > 0 && (
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="table-cell" colSpan={9}>Tổng ({records.length})</td>
                <td className="table-cell bg-red-50 text-red-700">{fmtUSD(totals.debitCredit)}</td>
                <td className="table-cell" colSpan={2}></td>
                <td className="table-cell bg-blue-50 text-blue-700">{fmtUSD(totals.balance)}</td>
                <td className="table-cell">
                  <span className="text-xs">{closedCount}/{records.length} CLOSED</span>
                </td>
                <td className="table-cell"></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Formula Legend */}
      <div className="card p-4 bg-slate-50">
        <div className="text-xs font-semibold text-slate-600 mb-2">📖 Công thức</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
          <div><span className="font-mono bg-white px-1 rounded">[59] Debit/Credit</span> = Price×NW_BW − Adv_BL − 2nd_Pay − 1:1 Claim − 1:2 Claim − Nutcount Claim − DEM/DET − STO − Fee1 − Fee2</div>
          <div><span className="font-mono bg-white px-1 rounded">[60] Notes 4</span> = Nếu D/C &gt; 0: Buyer trả Seller; ngược lại: Seller trả Buyer</div>
          <div><span className="font-mono bg-white px-1 rounded">[61] Balance</span> = Final Settlement − Debit/Credit</div>
          <div><span className="font-mono bg-white px-1 rounded">[62] Notes 5</span> = Balance = 0 → CLOSED; ngược lại → BALANCE NOT PAID</div>
        </div>
      </div>
    </div>
  )
}
