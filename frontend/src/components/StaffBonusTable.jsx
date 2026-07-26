import { Trash, PlusCircle } from 'lucide-react'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => (v == null || isNaN(v)) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtVND = (v) => (v == null || isNaN(v)) ? '—' : `₫${Number(v).toLocaleString('vi-VN')}`

// Amount = Commission (%) x Contract Value; IN VND = Amount x Rate of exchange.
export function computeBonus(row, contractValue) {
  const amount = n(row.rate_pct) / 100 * contractValue
  const inVnd = amount * n(row.rate_exchange)
  return { amount, inVnd }
}

export const EMPTY_BONUS = { rate_pct: '', rate_exchange: '', other_fee: '', payment_date: '', note: '' }

export default function StaffBonusTable({ rows, onChange, onAdd, onRemove, contractValue, max = 10 }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-sky-700">THƯỞNG THEO DOANH THU CHO NHÂN VIÊN ({(rows || []).length}/{max})</p>
        <button onClick={onAdd} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <PlusCircle size={14} /> Thêm dòng thưởng
        </button>
      </div>
      <p className="text-[11px] text-slate-400 mb-2">Amount = Commission (%) × Contract Value. IN VND = Amount × Rate of exchange.</p>
      {(rows || []).length === 0 ? (
        <button onClick={onAdd} className="w-full border-2 border-dashed border-slate-300 rounded-lg p-3 text-sm text-slate-400 hover:border-sky-400 hover:text-sky-600 transition-colors">
          + Thêm dòng thưởng đầu tiên
        </button>
      ) : (
        <div className="overflow-x-auto border border-sky-200 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sky-600 text-white">
                <th className="p-2 text-left font-medium">Commission (%)</th>
                <th className="p-2 text-left font-medium">Amount</th>
                <th className="p-2 text-left font-medium">Rate of exchange</th>
                <th className="p-2 text-left font-medium">IN VND</th>
                <th className="p-2 text-left font-medium">Other fee</th>
                <th className="p-2 text-left font-medium">Payment Date</th>
                <th className="p-2 text-left font-medium">Note</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const bc = computeBonus(row, contractValue)
                return (
                  <tr key={i} className="border-t border-sky-100 odd:bg-white even:bg-sky-50/40">
                    <td className="p-1"><input type="number" step="0.01" className="input text-xs py-1" value={row.rate_pct || ''} onChange={e => onChange(i, 'rate_pct', e.target.value)} placeholder="0.00" /></td>
                    <td className="p-1 text-right font-medium text-slate-700 whitespace-nowrap">{fmtUSD(bc.amount)}</td>
                    <td className="p-1"><input type="number" step="1" className="input text-xs py-1" value={row.rate_exchange || ''} onChange={e => onChange(i, 'rate_exchange', e.target.value)} placeholder="25000" /></td>
                    <td className="p-1 text-right font-medium text-slate-700 whitespace-nowrap">{fmtVND(bc.inVnd)}</td>
                    <td className="p-1"><input type="number" step="0.01" className="input text-xs py-1" value={row.other_fee || ''} onChange={e => onChange(i, 'other_fee', e.target.value)} placeholder="0.00" /></td>
                    <td className="p-1"><input type="date" className="input text-xs py-1" value={row.payment_date || ''} onChange={e => onChange(i, 'payment_date', e.target.value)} /></td>
                    <td className="p-1"><input className="input text-xs py-1" value={row.note || ''} onChange={e => onChange(i, 'note', e.target.value)} /></td>
                    <td className="p-1"><button onClick={() => onRemove(i)} className="p-1 hover:bg-red-50 text-red-400 rounded"><Trash size={12} /></button></td>
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
