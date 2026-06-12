import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Save, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { toDisplay } from '../utils/dateFormat'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => {
  const num = parseFloat(v)
  if (isNaN(num)) return '—'
  const cls = num < 0 ? 'text-red-600' : num > 0 ? 'text-emerald-700' : 'text-slate-600'
  return { value: `$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cls, raw: num }
}
const fmtCell = (v) => {
  if (v == null || v === '') return '—'
  const num = parseFloat(v)
  if (isNaN(num)) return '—'
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const EMPTY_INCOME = {
  type: 'export', sale_contract: '', lot_number: '', seller: '', agency: '', commodity: '',
  qty_contract: '', qty_actual_nw: '', rate: '', rate_unit: 'USD/MT',
  est_amount: '', actual_amount: '',
  received_1: '', date_1: '', received_2: '', date_2: '', received_3: '', date_3: '', note: ''
}

const EMPTY_EXPENSE = {
  type: 'export', sale_contract: '', lot_number: '', vn_broker: '', commodity: '',
  qty_contract: '', qty_actual_bl: '', rate: '', rate_unit: 'USD/MT',
  est_amount: '', actual_amount: '',
  paid_1: '', date_1: '', paid_2: '', date_2: '', paid_3: '', date_3: '', note: ''
}

function Inp({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>
}

// ── INCOME FORM ──────────────────────────────────────────────────────────────
function IncomeForm({ editId, form, setForm, onSave, onClose, saving }) {
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const estAmt = n(form.qty_contract) * n(form.rate)
  const actualAmt = n(form.qty_actual_nw) * n(form.rate)
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-emerald-50">
          <h2 className="font-bold text-emerald-700">💰 {editId ? 'Sửa' : 'Thêm'} HH Phải Thu</h2>
          <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-lg text-slate-500"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Type">
              <select className="select" value={form.type} onChange={fld('type')}>
                <option value="export">Hàng Xuất</option>
                <option value="import">Hàng Nhập</option>
              </select>
            </Inp>
            <Inp label="Sale Contract"><input className="input" value={form.sale_contract} onChange={fld('sale_contract')} placeholder="EX-2025-001" /></Inp>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Lot Number"><input className="input" value={form.lot_number} onChange={fld('lot_number')} /></Inp>
            <Inp label="Seller"><input className="input" value={form.seller} onChange={fld('seller')} /></Inp>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Agency"><input className="input" value={form.agency} onChange={fld('agency')} /></Inp>
            <Inp label="Commodity"><input className="input" value={form.commodity} onChange={fld('commodity')} /></Inp>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-slate-600">Tính hoa hồng</p>
            <div className="grid grid-cols-3 gap-2">
              <Inp label="QTY HĐ (Seller)"><input type="number" step="0.001" className="input" value={form.qty_contract} onChange={fld('qty_contract')} /></Inp>
              <Inp label="QTY Thực (NW)"><input type="number" step="0.001" className="input" value={form.qty_actual_nw} onChange={fld('qty_actual_nw')} /></Inp>
              <div>
                <label className="label">Rate</label>
                <div className="flex gap-1">
                  <input type="number" step="0.0001" className="input flex-1" value={form.rate} onChange={fld('rate')} />
                  <select className="select w-24" value={form.rate_unit} onChange={fld('rate_unit')}>
                    <option>USD/MT</option><option>USD/LB</option><option>USD/KG</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <div className="text-[10px] text-slate-500">Ước tính (theo QTY HĐ)</div>
                <div className="font-bold text-amber-700">{fmtCell(estAmt)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <div className="text-[10px] text-slate-500">Thực tế (theo NW)</div>
                <div className="font-bold text-emerald-700">{fmtCell(actualAmt)}</div>
              </div>
            </div>
            <Inp label="Est Amount (ghi đè)"><input type="number" step="0.01" className="input" value={form.est_amount} onChange={fld('est_amount')} placeholder={fmtCell(estAmt)} /></Inp>
            <Inp label="Actual Amount (ghi đè)"><input type="number" step="0.01" className="input" value={form.actual_amount} onChange={fld('actual_amount')} placeholder={fmtCell(actualAmt)} /></Inp>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-emerald-700">Các đợt đã thu</p>
            {[['received_1','date_1','Đợt 1'],['received_2','date_2','Đợt 2'],['received_3','date_3','Đợt 3']].map(([amt, dt, lbl]) => (
              <div key={lbl} className="grid grid-cols-2 gap-2">
                <Inp label={`${lbl} ($)`}><input type="number" step="0.01" className="input" value={form[amt]} onChange={fld(amt)} /></Inp>
                <Inp label="Ngày nhận">
                  <input type="date" className="input" value={form[dt]} onChange={fld(dt)} />
                  {form[dt] && <p className="text-xs text-slate-400 mt-0.5">{toDisplay(form[dt])}</p>}
                </Inp>
              </div>
            ))}
          </div>
          <Inp label="Ghi chú"><textarea className="input" rows={2} value={form.note} onChange={fld('note')} /></Inp>
        </div>
        <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">
            <Save size={15}/> {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── EXPENSE FORM ─────────────────────────────────────────────────────────────
function ExpenseForm({ editId, form, setForm, onSave, onClose, saving }) {
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const estAmt = n(form.qty_contract) * n(form.rate)
  const actualAmt = n(form.qty_actual_bl) * n(form.rate)
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-red-50">
          <h2 className="font-bold text-red-700">💸 {editId ? 'Sửa' : 'Thêm'} HH Phải Chi</h2>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-lg text-slate-500"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Type">
              <select className="select" value={form.type} onChange={fld('type')}>
                <option value="export">Hàng Xuất</option>
                <option value="import">Hàng Nhập</option>
              </select>
            </Inp>
            <Inp label="Sale Contract"><input className="input" value={form.sale_contract} onChange={fld('sale_contract')} /></Inp>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Lot Number"><input className="input" value={form.lot_number} onChange={fld('lot_number')} /></Inp>
            <Inp label="VN Broker"><input className="input" value={form.vn_broker} onChange={fld('vn_broker')} /></Inp>
          </div>
          <Inp label="Commodity"><input className="input" value={form.commodity} onChange={fld('commodity')} /></Inp>
          <div className="bg-slate-50 rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-slate-600">Tính hoa hồng</p>
            <div className="grid grid-cols-3 gap-2">
              <Inp label="QTY HĐ"><input type="number" step="0.001" className="input" value={form.qty_contract} onChange={fld('qty_contract')} /></Inp>
              <Inp label="QTY Thực (BL)"><input type="number" step="0.001" className="input" value={form.qty_actual_bl} onChange={fld('qty_actual_bl')} /></Inp>
              <div>
                <label className="label">Rate</label>
                <div className="flex gap-1">
                  <input type="number" step="0.0001" className="input flex-1" value={form.rate} onChange={fld('rate')} />
                  <select className="select w-24" value={form.rate_unit} onChange={fld('rate_unit')}>
                    <option>USD/MT</option><option>USD/LB</option><option>USD/KG</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <div className="text-[10px] text-slate-500">Ước tính (theo QTY HĐ)</div>
                <div className="font-bold text-amber-700">{fmtCell(estAmt)}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="text-[10px] text-slate-500">Thực tế (theo BL)</div>
                <div className="font-bold text-red-700">{fmtCell(actualAmt)}</div>
              </div>
            </div>
            <Inp label="Est Amount (ghi đè)"><input type="number" step="0.01" className="input" value={form.est_amount} onChange={fld('est_amount')} placeholder={fmtCell(estAmt)} /></Inp>
            <Inp label="Actual Amount (ghi đè)"><input type="number" step="0.01" className="input" value={form.actual_amount} onChange={fld('actual_amount')} placeholder={fmtCell(actualAmt)} /></Inp>
          </div>
          <div className="bg-red-50 rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-red-700">Các đợt đã chi</p>
            {[['paid_1','date_1','Đợt 1'],['paid_2','date_2','Đợt 2'],['paid_3','date_3','Đợt 3']].map(([amt, dt, lbl]) => (
              <div key={lbl} className="grid grid-cols-2 gap-2">
                <Inp label={`${lbl} ($)`}><input type="number" step="0.01" className="input" value={form[amt]} onChange={fld(amt)} /></Inp>
                <Inp label="Ngày chi">
                  <input type="date" className="input" value={form[dt]} onChange={fld(dt)} />
                  {form[dt] && <p className="text-xs text-slate-400 mt-0.5">{toDisplay(form[dt])}</p>}
                </Inp>
              </div>
            ))}
          </div>
          <Inp label="Ghi chú"><textarea className="input" rows={2} value={form.note} onChange={fld('note')} /></Inp>
        </div>
        <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">
            <Save size={15}/> {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function CommissionTracking() {
  const [tab, setTab] = useState('income')
  const [incomeList, setIncomeList] = useState([])
  const [expenseList, setExpenseList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterBroker, setFilterBroker] = useState('')
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filterType) params.type = filterType
    Promise.all([
      api.get('/commission/income', { params: filterSeller ? { ...params, seller: filterSeller } : params }),
      api.get('/commission/expense', { params: filterBroker ? { ...params, vn_broker: filterBroker } : params })
    ]).then(([ri, re]) => { setIncomeList(ri.data); setExpenseList(re.data) })
      .finally(() => setLoading(false))
  }, [filterType, filterSeller, filterBroker])

  useEffect(() => { load() }, [load])

  const openIncomeCreate = () => { setForm({ ...EMPTY_INCOME }); setEditId(null); setShowIncomeForm(true) }
  const openIncomeEdit = (r) => { setForm({ ...EMPTY_INCOME, ...r }); setEditId(r.id); setShowIncomeForm(true) }
  const openExpenseCreate = () => { setForm({ ...EMPTY_EXPENSE }); setEditId(null); setShowExpenseForm(true) }
  const openExpenseEdit = (r) => { setForm({ ...EMPTY_EXPENSE, ...r }); setEditId(r.id); setShowExpenseForm(true) }

  const saveIncome = async () => {
    setSaving(true)
    try {
      if (editId) await api.put(`/commission/income/${editId}`, form)
      else await api.post('/commission/income', form)
      toast.success('Đã lưu'); setShowIncomeForm(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu') }
    finally { setSaving(false) }
  }

  const saveExpense = async () => {
    setSaving(true)
    try {
      if (editId) await api.put(`/commission/expense/${editId}`, form)
      else await api.post('/commission/expense', form)
      toast.success('Đã lưu'); setShowExpenseForm(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu') }
    finally { setSaving(false) }
  }

  const removeIncome = async (id) => {
    if (!confirm('Xóa?')) return
    try { await api.delete(`/commission/income/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  const removeExpense = async (id) => {
    if (!confirm('Xóa?')) return
    try { await api.delete(`/commission/expense/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  const totalEstIncome = incomeList.reduce((s, r) => s + n(r.est_amount || (n(r.qty_contract)*n(r.rate))), 0)
  const totalActualIncome = incomeList.reduce((s, r) => s + n(r.actual_amount || (n(r.qty_actual_nw)*n(r.rate))), 0)
  const totalReceivedIncome = incomeList.reduce((s, r) => s + n(r.total_received), 0)
  const totalRemainingIncome = incomeList.reduce((s, r) => s + n(r.remaining), 0)

  const totalEstExpense = expenseList.reduce((s, r) => s + n(r.est_amount || (n(r.qty_contract)*n(r.rate))), 0)
  const totalActualExpense = expenseList.reduce((s, r) => s + n(r.actual_amount || (n(r.qty_actual_bl)*n(r.rate))), 0)
  const totalPaidExpense = expenseList.reduce((s, r) => s + n(r.total_paid), 0)
  const totalRemainingExpense = expenseList.reduce((s, r) => s + n(r.remaining), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">💰 Theo Dõi Hoa Hồng</h1>
          <p className="text-sm text-slate-500 mt-0.5">HH phải thu (Seller/Agency) và HH phải chi (VN Broker)</p>
        </div>
        <div className="flex gap-2">
          <select className="select w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tất cả loại</option>
            <option value="export">Hàng Xuất</option>
            <option value="import">Hàng Nhập</option>
          </select>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        <button onClick={() => setTab('income')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'income' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <TrendingUp size={16} /> HH Phải Thu ({incomeList.length})
        </button>
        <button onClick={() => setTab('expense')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'expense' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <TrendingDown size={16} /> HH Phải Chi ({expenseList.length})
        </button>
      </div>

      {/* INCOME TAB */}
      {tab === 'income' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Tổng ước tính', value: `$${totalEstIncome.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: 'text-amber-700' },
              { label: 'Tổng thực tế', value: `$${totalActualIncome.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: 'text-blue-700' },
              { label: 'Đã thu', value: `$${totalReceivedIncome.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: 'text-emerald-700' },
              { label: 'Còn phải thu', value: `$${totalRemainingIncome.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: totalRemainingIncome > 0 ? 'text-red-700' : 'text-emerald-700' },
            ].map(k => (
              <div key={k.label} className="card p-4">
                <div className="text-xs text-slate-500">{k.label}</div>
                <div className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Filter & Add */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Lọc theo Seller..." value={filterSeller} onChange={e => setFilterSeller(e.target.value)} className="input pl-8 w-48 text-sm" />
            </div>
            <button onClick={openIncomeCreate} className="btn-primary ml-auto"><Plus size={15}/> Thêm HH Thu</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-emerald-50 border-b border-emerald-200 text-xs">
                  <th className="table-head">#</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">Sale Contract</th>
                  <th className="table-head">Lot</th>
                  <th className="table-head">Seller</th>
                  <th className="table-head">Agency</th>
                  <th className="table-head">Commodity</th>
                  <th className="table-head">QTY HĐ</th>
                  <th className="table-head">QTY Thực</th>
                  <th className="table-head">Rate</th>
                  <th className="table-head">Ước tính</th>
                  <th className="table-head">Thực tế</th>
                  <th className="table-head bg-emerald-100">Đã thu</th>
                  <th className="table-head bg-red-50">Còn lại</th>
                  <th className="table-head">Đợt 1</th>
                  <th className="table-head">Đợt 2</th>
                  <th className="table-head">Đợt 3</th>
                  <th className="table-head">Note</th>
                  <th className="table-head"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan={19} className="text-center py-8 text-slate-400">Đang tải...</td></tr> :
                  incomeList.length === 0 ? <tr><td colSpan={19} className="text-center py-8 text-slate-400">Chưa có dữ liệu</td></tr> :
                  incomeList.map((r, i) => {
                    const remaining = n(r.remaining)
                    return (
                      <tr key={r.id} className="hover:bg-emerald-50/20">
                        <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                        <td className="table-cell"><span className={`px-2 py-0.5 rounded text-xs ${r.type === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>{r.type === 'export' ? 'Xuất' : 'Nhập'}</span></td>
                        <td className="table-cell font-mono text-xs text-blue-700 font-bold">{r.sale_contract}</td>
                        <td className="table-cell text-xs">{r.lot_number}</td>
                        <td className="table-cell font-medium text-sm">{r.seller}</td>
                        <td className="table-cell text-xs">{r.agency}</td>
                        <td className="table-cell text-xs">{r.commodity}</td>
                        <td className="table-cell text-xs">{r.qty_contract}</td>
                        <td className="table-cell text-xs">{r.qty_actual_nw}</td>
                        <td className="table-cell text-xs">{r.rate} {r.rate_unit}</td>
                        <td className="table-cell text-amber-700">{fmtCell(r.est_amount || n(r.qty_contract)*n(r.rate))}</td>
                        <td className="table-cell text-blue-700">{fmtCell(r.actual_amount || n(r.qty_actual_nw)*n(r.rate))}</td>
                        <td className="table-cell bg-emerald-50 font-bold text-emerald-700">{fmtCell(r.total_received)}</td>
                        <td className={`table-cell font-bold ${remaining > 0 ? 'bg-red-50 text-red-700' : 'text-emerald-700'}`}>{fmtCell(remaining)}</td>
                        <td className="table-cell text-xs">{r.received_1 ? `${fmtCell(r.received_1)}\n${toDisplay(r.date_1)}` : '—'}</td>
                        <td className="table-cell text-xs">{r.received_2 ? `${fmtCell(r.received_2)}\n${toDisplay(r.date_2)}` : '—'}</td>
                        <td className="table-cell text-xs">{r.received_3 ? `${fmtCell(r.received_3)}\n${toDisplay(r.date_3)}` : '—'}</td>
                        <td className="table-cell text-xs max-w-[120px] truncate">{r.note}</td>
                        <td className="table-cell">
                          <div className="flex gap-1">
                            <button onClick={() => openIncomeEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"><Pencil size={13}/></button>
                            <button onClick={() => removeIncome(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSE TAB */}
      {tab === 'expense' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Tổng ước tính', value: `$${totalEstExpense.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: 'text-amber-700' },
              { label: 'Tổng thực tế', value: `$${totalActualExpense.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: 'text-blue-700' },
              { label: 'Đã chi', value: `$${totalPaidExpense.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: 'text-red-700' },
              { label: 'Còn phải chi', value: `$${totalRemainingExpense.toLocaleString('en-US', {maximumFractionDigits: 2})}`, color: totalRemainingExpense > 0 ? 'text-red-700' : 'text-emerald-700' },
            ].map(k => (
              <div key={k.label} className="card p-4">
                <div className="text-xs text-slate-500">{k.label}</div>
                <div className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Lọc theo VN Broker..." value={filterBroker} onChange={e => setFilterBroker(e.target.value)} className="input pl-8 w-48 text-sm" />
            </div>
            <button onClick={openExpenseCreate} className="btn-primary ml-auto"><Plus size={15}/> Thêm HH Chi</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-red-50 border-b border-red-200 text-xs">
                  <th className="table-head">#</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">Sale Contract</th>
                  <th className="table-head">Lot</th>
                  <th className="table-head">VN Broker</th>
                  <th className="table-head">Commodity</th>
                  <th className="table-head">QTY HĐ</th>
                  <th className="table-head">QTY (BL)</th>
                  <th className="table-head">Rate</th>
                  <th className="table-head">Ước tính</th>
                  <th className="table-head">Thực tế</th>
                  <th className="table-head bg-red-100">Đã chi</th>
                  <th className="table-head bg-amber-50">Còn lại</th>
                  <th className="table-head">Đợt 1</th>
                  <th className="table-head">Đợt 2</th>
                  <th className="table-head">Đợt 3</th>
                  <th className="table-head">Note</th>
                  <th className="table-head"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan={18} className="text-center py-8 text-slate-400">Đang tải...</td></tr> :
                  expenseList.length === 0 ? <tr><td colSpan={18} className="text-center py-8 text-slate-400">Chưa có dữ liệu</td></tr> :
                  expenseList.map((r, i) => {
                    const remaining = n(r.remaining)
                    return (
                      <tr key={r.id} className="hover:bg-red-50/20">
                        <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                        <td className="table-cell"><span className={`px-2 py-0.5 rounded text-xs ${r.type === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>{r.type === 'export' ? 'Xuất' : 'Nhập'}</span></td>
                        <td className="table-cell font-mono text-xs text-blue-700 font-bold">{r.sale_contract}</td>
                        <td className="table-cell text-xs">{r.lot_number}</td>
                        <td className="table-cell font-medium text-sm">{r.vn_broker}</td>
                        <td className="table-cell text-xs">{r.commodity}</td>
                        <td className="table-cell text-xs">{r.qty_contract}</td>
                        <td className="table-cell text-xs">{r.qty_actual_bl}</td>
                        <td className="table-cell text-xs">{r.rate} {r.rate_unit}</td>
                        <td className="table-cell text-amber-700">{fmtCell(r.est_amount || n(r.qty_contract)*n(r.rate))}</td>
                        <td className="table-cell text-blue-700">{fmtCell(r.actual_amount || n(r.qty_actual_bl)*n(r.rate))}</td>
                        <td className="table-cell bg-red-50 font-bold text-red-700">{fmtCell(r.total_paid)}</td>
                        <td className={`table-cell font-bold ${remaining > 0 ? 'bg-amber-50 text-amber-700' : 'text-emerald-700'}`}>{fmtCell(remaining)}</td>
                        <td className="table-cell text-xs">{r.paid_1 ? `${fmtCell(r.paid_1)}\n${toDisplay(r.date_1)}` : '—'}</td>
                        <td className="table-cell text-xs">{r.paid_2 ? `${fmtCell(r.paid_2)}\n${toDisplay(r.date_2)}` : '—'}</td>
                        <td className="table-cell text-xs">{r.paid_3 ? `${fmtCell(r.paid_3)}\n${toDisplay(r.date_3)}` : '—'}</td>
                        <td className="table-cell text-xs max-w-[120px] truncate">{r.note}</td>
                        <td className="table-cell">
                          <div className="flex gap-1">
                            <button onClick={() => openExpenseEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"><Pencil size={13}/></button>
                            <button onClick={() => removeExpense(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showIncomeForm && form && (
        <IncomeForm editId={editId} form={form} setForm={setForm} onSave={saveIncome} onClose={() => setShowIncomeForm(false)} saving={saving} />
      )}
      {showExpenseForm && form && (
        <ExpenseForm editId={editId} form={form} setForm={setForm} onSave={saveExpense} onClose={() => setShowExpenseForm(false)} saving={saving} />
      )}
    </div>
  )
}
