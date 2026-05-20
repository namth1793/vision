import { useState, useEffect, useCallback } from 'react'
import { Search, FlaskConical, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => v == null || isNaN(v) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtN4 = (v, fallback = '—') => (v == null || v === '' || isNaN(v)) ? fallback : Number(v).toFixed(4)
const fmtTon = (v, fallback = '—') => (v == null || v === '' || isNaN(v)) ? fallback : `${Number(v).toFixed(3)} MT`

function computeQuality(r) {
  const price = n(r.price), lbs = n(r.lbs), nut = n(r.nut)
  const nw_bl = n(r.nw_bl), nw_bw = n(r.nw_bw)
  const outturn_vina = n(r.outturn_vina), nutcount_vina = n(r.nutcount_vina)
  const double_penalty = n(r.double_penalty)

  const shortageOvertage = nw_bw - nw_bl
  const diffOutturn = outturn_vina - lbs
  const diffNutcount = nutcount_vina - nut
  const lbs_1to1 = (diffOutturn > 0 && double_penalty > 0 && diffOutturn < double_penalty) ? (lbs - diffOutturn) : null
  const lbs_1to2 = (diffOutturn > 0 && double_penalty > 0 && diffOutturn >= double_penalty) ? (lbs - diffOutturn) : null
  const penalty_1to1 = lbs > 0 ? price / lbs : 0
  const penalty_1to2 = penalty_1to1 * 2
  const nutcountClaim = diffNutcount > 0 ? diffNutcount * 0.5 * nw_bw : 0

  return { shortageOvertage, diffOutturn, diffNutcount, lbs_1to1, lbs_1to2, penalty_1to1, penalty_1to2, nutcountClaim }
}

function PenaltyBadge({ type, active }) {
  if (!active) return <span className="text-slate-300 text-xs">—</span>
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${type === '1:1' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{type}</span>
}

export default function Quality() {
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
    const q = computeQuality(r)
    acc.nw_bw += n(r.nw_bw)
    acc.nutcountClaim += q.nutcountClaim
    return acc
  }, { nw_bw: 0, nutcountClaim: 0 })

  const withPenalty1to1 = records.filter(r => computeQuality(r).lbs_1to1 != null).length
  const withPenalty1to2 = records.filter(r => computeQuality(r).lbs_1to2 != null).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">🔬 Kiểm Tra Chất Lượng</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kết quả kiểm tra, chênh lệch & phạt — nhập tại <button onClick={() => navigate('/entry')} className="text-blue-600 hover:underline font-medium">Nhập Liệu</button></p>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm số HĐ..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-60" /></div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15}/></button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lô có phạt 1:1', value: withPenalty1to1, color: 'amber' },
          { label: 'Lô có phạt 1:2', value: withPenalty1to2, color: 'red' },
          { label: 'Tổng NW out of BW', value: `${totals.nw_bw.toFixed(3)} MT`, color: 'slate' },
          { label: 'Tổng Nutcount Claim', value: fmtUSD(totals.nutcountClaim), color: 'violet' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.color === 'amber' ? 'text-amber-700' : k.color === 'red' ? 'text-red-700' : k.color === 'violet' ? 'text-violet-700' : 'text-slate-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Số HĐ</th>
              <th className="table-head">Date Unload</th>
              <th className="table-head">Certificate No</th>
              <th className="table-head">Date Cert</th>
              <th className="table-head">NW on B/L</th>
              <th className="table-head">NW out of BW</th>
              <th className="table-head bg-amber-50 text-amber-700">[43] Shortage/Overtage</th>
              <th className="table-head">LBs / Outturn</th>
              <th className="table-head bg-amber-50 text-amber-700">[47] Diff Outturn</th>
              <th className="table-head">Nut / Nutcount</th>
              <th className="table-head bg-amber-50 text-amber-700">[46] Diff Nutcount</th>
              <th className="table-head">Phạt</th>
              <th className="table-head">[48] 1:1 lbs</th>
              <th className="table-head">[49] 1:2 lbs</th>
              <th className="table-head">[50] 1:1 Penalty</th>
              <th className="table-head">[51] 1:2 Penalty</th>
              <th className="table-head">1:1 Claim (52)</th>
              <th className="table-head">1:2 Claim (53)</th>
              <th className="table-head bg-red-50 text-red-700">[54] Nutcount Claim</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={20} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={20} className="text-center py-12 text-slate-400">
                <FlaskConical size={40} className="mx-auto mb-2 opacity-30" />
                <div>Chưa có dữ liệu chất lượng</div>
              </td></tr> :
              records.map((r, i) => {
                const q = computeQuality(r)
                const hasShortage = q.shortageOvertage < -0.001
                const hasOvertage = q.shortageOvertage > 0.001
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell text-slate-400">{i+1}</td>
                    <td className="table-cell font-mono text-blue-600 font-bold">{r.contract_no || '—'}</td>
                    <td className="table-cell">{r.date_unload || '—'}</td>
                    <td className="table-cell">{r.certificate_no || '—'}</td>
                    <td className="table-cell">{r.date_certificate || '—'}</td>
                    <td className="table-cell">{fmtTon(r.nw_bl)}</td>
                    <td className="table-cell font-medium">{fmtTon(r.nw_bw)}</td>
                    <td className={`table-cell font-bold bg-amber-50 ${hasShortage ? 'text-red-600' : hasOvertage ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {fmtTon(q.shortageOvertage)}
                    </td>
                    <td className="table-cell"><div>LBs: {r.lbs ?? '—'}</div><div className="text-slate-400">Vina: {r.outturn_vina ?? '—'}</div></td>
                    <td className={`table-cell font-bold bg-amber-50 ${q.diffOutturn > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtN4(q.diffOutturn)}
                    </td>
                    <td className="table-cell"><div>Nut: {r.nut ?? '—'}</div><div className="text-slate-400">Vina: {r.nutcount_vina ?? '—'}</div></td>
                    <td className={`table-cell font-bold bg-amber-50 ${q.diffNutcount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtN4(q.diffNutcount)}
                    </td>
                    <td className="table-cell">
                      {q.lbs_1to1 != null && <PenaltyBadge type="1:1" active />}
                      {q.lbs_1to2 != null && <PenaltyBadge type="1:2" active />}
                      {q.lbs_1to1 == null && q.lbs_1to2 == null && <span className="text-emerald-500 text-xs">OK</span>}
                    </td>
                    <td className="table-cell text-amber-700 font-medium">{q.lbs_1to1 != null ? fmtN4(q.lbs_1to1) : '—'}</td>
                    <td className="table-cell text-red-700 font-medium">{q.lbs_1to2 != null ? fmtN4(q.lbs_1to2) : '—'}</td>
                    <td className="table-cell">{fmtUSD(q.penalty_1to1)}</td>
                    <td className="table-cell">{fmtUSD(q.penalty_1to2)}</td>
                    <td className="table-cell">{r.outturn_claim_1to1 ? fmtUSD(r.outturn_claim_1to1) : '—'}</td>
                    <td className="table-cell">{r.outturn_claim_1to2 ? fmtUSD(r.outturn_claim_1to2) : '—'}</td>
                    <td className={`table-cell font-bold bg-red-50 ${q.nutcountClaim > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {q.nutcountClaim > 0 ? fmtUSD(q.nutcountClaim) : '$0.00'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4 bg-slate-50">
        <div className="text-xs font-semibold text-slate-600 mb-2">📖 Chú thích công thức</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
          <div><span className="font-mono bg-white px-1 rounded">[43]</span> Shortage/Overtage = NW_BW − NW_BL</div>
          <div><span className="font-mono bg-white px-1 rounded">[47]</span> Diff Outturn = Outturn_Vina − LBs</div>
          <div><span className="font-mono bg-white px-1 rounded">[46]</span> Diff Nutcount = Nutcount_Vina − Nut</div>
          <div><span className="font-mono bg-white px-1 rounded">[48]</span> 1:1 lbs = LBs − Diff (nếu 0 &lt; Diff &lt; Double Penalty)</div>
          <div><span className="font-mono bg-white px-1 rounded">[49]</span> 1:2 lbs = LBs − Diff (nếu Diff ≥ Double Penalty)</div>
          <div><span className="font-mono bg-white px-1 rounded">[50]</span> 1:1 Penalty = Price / LBs</div>
          <div><span className="font-mono bg-white px-1 rounded">[51]</span> 1:2 Penalty = 1:1 Penalty × 2</div>
          <div><span className="font-mono bg-white px-1 rounded">[54]</span> Nutcount Claim = Diff_Nut × 0.5 × NW_BW (nếu &gt; 0)</div>
        </div>
      </div>
    </div>
  )
}
