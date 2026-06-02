import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, X, Save, Calculator, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => (v == null || isNaN(v)) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtVND = (v) => (v == null || isNaN(v)) ? '—' : `₫${Number(v).toLocaleString('vi-VN')}`
const fmtNum = (v, d = 4) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d)
const fmtPct = (v) => (v == null || isNaN(v)) ? '—' : `${Number(v).toFixed(4)}%`

function compute(f) {
  const gw = n(f.gross_weight), nw = n(f.net_weight)
  const price = n(f.price_bwh_inventory)
  const gwIn = n(f.gw_into_bwh)
  const gwOut = n(f.gw_out_bwh)
  const pctIns = n(f.pct_insured), insRate = n(f.ins_rate), insVat = n(f.ins_vat)
  const exRate = n(f.exchange_rate)

  const diffGwInBl = gwIn - gw
  const pctDiffIn = gw ? (diffGwInBl / gw * 100) : 0
  const diffGwOutIn = gwOut - gwIn
  const pctDiffOut = gwIn ? (diffGwOutIn / gwIn * 100) : 0

  const cargoValueInsured = nw * price * pctIns / 100
  const insFeeBase = cargoValueInsured * insRate / 100
  const checkingInsFee = insFeeBase + insFeeBase * insVat / 100
  const insInVnd = checkingInsFee * exRate

  return { diffGwInBl, pctDiffIn, diffGwOutIn, pctDiffOut, cargoValueInsured, checkingInsFee, insInVnd }
}

const BWH_STATUS = ['CHƯA NHẬP KHO', 'CHƯA BÁN', 'ĐÃ BÁN', 'ĐÃ XUẤT KHO']

const EMPTY = {
  year: new Date().getFullYear(), bwh: '', no: '', seller: '', bl: '', status: 'CHƯA NHẬP KHO',
  eta_vung_tau: '', eta_hcm: '', total_cont: '', total_bags: '',
  gross_weight: '', net_weight: '', origin: '', commodity: '',
  price_bwh_inventory: '', inv_number: '', note_tt_kho: '',
  date_into_bwh: '', supervisor_in: '', gw_into_bwh: '', nw_into_bwh: '', note_into_bwh: '',
  date_out_bwh: '', supervisor_out: '', gw_out_bwh: '', nw_out_bwh: '', note_out_bwh: '',
  ins_company: '', ins_fee: '', pct_insured: '', ins_rate: '', ins_vat: '',
  exchange_rate: '', ins_duration: '', ins_payment_date: '', note_ins: '',
  deposit: '', deposit_payment_date: '', amount_paid: '', amount_paid_date: '', note_pay_bwh: '',
}

const TABS = [
  { id: 'info', label: '① Thông Tin Kho', color: 'blue' },
  { id: 'warehouse', label: '② Nhập / Xuất Kho', color: 'amber' },
  { id: 'insurance', label: '③ Bảo Hiểm & Thanh Toán', color: 'teal' },
]

const TAB_COLOR = {
  blue: 'border-blue-600 text-blue-700 bg-blue-50',
  amber: 'border-amber-600 text-amber-700 bg-amber-50',
  teal: 'border-teal-600 text-teal-700 bg-teal-50',
}

const statusBadge = (s) => {
  if (s === 'CHƯA NHẬP KHO') return 'bg-slate-100 text-slate-600'
  if (s === 'CHƯA BÁN') return 'bg-amber-100 text-amber-700'
  if (s === 'ĐÃ BÁN') return 'bg-blue-100 text-blue-700'
  if (s === 'ĐÃ XUẤT KHO') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
}

function CalcField({ label, value, color = 'blue', note, small }) {
  const cls = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
  }
  return (
    <div className={`rounded-lg border-2 ${cls[color] || cls.blue} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Calculator size={12} className="opacity-60" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className={`font-bold ${small ? 'text-sm' : 'text-base'} ${cls[color]?.split(' ')[2]}`}>{value}</div>
      {note && <div className="text-[10px] text-slate-400 mt-0.5 italic">{note}</div>}
    </div>
  )
}

function Inp({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function BwhEntry() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [viewRecord, setViewRecord] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [activeTab, setActiveTab] = useState('info')
  const [saving, setSaving] = useState(false)

  const c = compute(form)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    api.get('/bwh-records', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const openCreate = () => { setForm(EMPTY); setEditId(null); setActiveTab('info'); setShowForm(true) }
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditId(r.id); setActiveTab('info'); setShowForm(true) }
  const openView = async (r) => { const res = await api.get(`/bwh-records/${r.id}`); setViewRecord(res.data) }

  const save = async () => {
    if (!form.bwh && !form.bl) { toast.error('Vui lòng nhập BWH hoặc BL'); setActiveTab('info'); return }
    setSaving(true)
    try {
      if (editId) await api.put(`/bwh-records/${editId}`, form)
      else await api.post('/bwh-records', form)
      toast.success(editId ? 'Đã cập nhật' : 'Đã tạo mới')
      setShowForm(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa bản ghi này?')) return
    try { await api.delete(`/bwh-records/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  // ── VIEW DETAIL ──────────────────────────────────────────────────────────────
  if (viewRecord) {
    const vc = compute(viewRecord)
    const Row = ({ label, value, isCalc }) => (
      <div className={`flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0 ${isCalc ? 'bg-blue-50 px-2 rounded my-0.5' : ''}`}>
        <span className="text-xs text-slate-500 w-56 shrink-0">{label}</span>
        <span className={`text-xs text-right font-medium ${isCalc ? 'text-blue-700 font-bold' : 'text-slate-800'}`}>{value ?? '—'}</span>
      </div>
    )
    const Sec = ({ title, color, children }) => (
      <div className={`card p-4 border-l-4 ${color}`}>
        <h3 className="font-bold text-slate-700 mb-3 text-sm">{title}</h3>
        {children}
      </div>
    )
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewRecord(null)} className="btn-secondary"><X size={15}/> Quay lại</button>
          <button onClick={() => { openEdit(viewRecord); setViewRecord(null) }} className="btn-primary"><Pencil size={15}/> Chỉnh sửa</button>
          <h1 className="page-title ml-2">🏭 Chi tiết: {viewRecord.bwh || '—'} / {viewRecord.no || '—'}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Sec title="① Thông Tin Kho" color="border-blue-500">
            <Row label="Year" value={viewRecord.year} />
            <Row label="BWH" value={viewRecord.bwh} />
            <Row label="No" value={viewRecord.no} />
            <Row label="Seller" value={viewRecord.seller} />
            <Row label="BL" value={viewRecord.bl} />
            <Row label="Status" value={viewRecord.status} />
            <Row label="ETA Vũng Tàu" value={viewRecord.eta_vung_tau} />
            <Row label="ETA HCM" value={viewRecord.eta_hcm} />
            <Row label="Total Cont" value={viewRecord.total_cont} />
            <Row label="Total Bags" value={viewRecord.total_bags} />
            <Row label="Gross Weight (MT)" value={viewRecord.gross_weight} />
            <Row label="Net Weight (MT)" value={viewRecord.net_weight} />
            <Row label="Origin" value={viewRecord.origin} />
            <Row label="Commodity" value={viewRecord.commodity} />
            <Row label="Price for BWH ($)" value={fmtUSD(viewRecord.price_bwh_inventory)} />
            <Row label="Inv Number" value={viewRecord.inv_number} />
            <Row label="NOTE TT KHO" value={viewRecord.note_tt_kho} />
          </Sec>
          <Sec title="② Nhập / Xuất Kho" color="border-amber-500">
            <Row label="DATE INTO BWH" value={viewRecord.date_into_bwh} />
            <Row label="Supervisor (IN)" value={viewRecord.supervisor_in} />
            <Row label="GW INTO BWH (MT)" value={viewRecord.gw_into_bwh} />
            <Row label="NW INTO BWH (MT)" value={viewRecord.nw_into_bwh} />
            <Row label="✦ DIFF GW IN & BL GW" value={`${fmtNum(vc.diffGwInBl, 3)} MT`} isCalc />
            <Row label="✦ % Chênh lệch nhập" value={fmtPct(vc.pctDiffIn)} isCalc />
            <Row label="NOTE vào kho" value={viewRecord.note_into_bwh} />
            <Row label="DATE OUT OF BWH" value={viewRecord.date_out_bwh} />
            <Row label="Supervisor (OUT)" value={viewRecord.supervisor_out} />
            <Row label="GW OUT OF BWH (MT)" value={viewRecord.gw_out_bwh} />
            <Row label="NW OUT OF BWH (MT)" value={viewRecord.nw_out_bwh} />
            <Row label="✦ DIFF GW OUT & IN" value={`${fmtNum(vc.diffGwOutIn, 3)} MT`} isCalc />
            <Row label="✦ % Chênh lệch xuất" value={fmtPct(vc.pctDiffOut)} isCalc />
            <Row label="NOTE ra kho" value={viewRecord.note_out_bwh} />
          </Sec>
          <Sec title="③ Bảo Hiểm" color="border-teal-500">
            <Row label="INS Company" value={viewRecord.ins_company} />
            <Row label="INS Fee ($)" value={fmtUSD(viewRecord.ins_fee)} />
            <Row label="% Insured" value={viewRecord.pct_insured ? `${viewRecord.pct_insured}%` : '—'} />
            <Row label="✦ Cargo Value Insured" value={fmtUSD(vc.cargoValueInsured)} isCalc />
            <Row label="Rate (%)" value={viewRecord.ins_rate} />
            <Row label="VAT (%)" value={viewRecord.ins_vat} />
            <Row label="✦ Checking INS FEE" value={fmtUSD(vc.checkingInsFee)} isCalc />
            <Row label="Exchange Rate (VND)" value={viewRecord.exchange_rate} />
            <Row label="✦ In VND" value={fmtVND(vc.insInVnd)} isCalc />
            <Row label="Duration" value={viewRecord.ins_duration} />
            <Row label="Payment Date" value={viewRecord.ins_payment_date} />
            <Row label="Note INS" value={viewRecord.note_ins} />
          </Sec>
          <Sec title="④ Thanh Toán Kho" color="border-emerald-500">
            <Row label="Deposit ($)" value={fmtUSD(viewRecord.deposit)} />
            <Row label="Payment Date (Deposit)" value={viewRecord.deposit_payment_date} />
            <Row label="Amount Paid ($)" value={fmtUSD(viewRecord.amount_paid)} />
            <Row label="Payment Date (Amount)" value={viewRecord.amount_paid_date} />
            <Row label="Note PAY BWH" value={viewRecord.note_pay_bwh} />
          </Sec>
        </div>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="page-title">🏭 {editId ? 'Chỉnh sửa' : 'Nhập mới'} — Kho Ngoại Quan {form.bwh && `(${form.bwh})`}</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary"><X size={15}/> Hủy</button>
            <button onClick={save} disabled={saving} className="btn-primary"><Save size={15}/> {saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap border-b border-slate-200">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? TAB_COLOR[t.color] : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card p-6">
          {/* ① THÔNG TIN KHO */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              <h2 className="font-bold text-blue-700 border-b border-blue-100 pb-2">① Thông Tin Kho</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Inp label="Year">
                  <select className="select" value={form.year} onChange={fld('year')}>
                    {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Inp>
                <Inp label="BWH"><input className="input" value={form.bwh} onChange={fld('bwh')} placeholder="Tên kho" /></Inp>
                <Inp label="No"><input className="input" value={form.no} onChange={fld('no')} /></Inp>
                <Inp label="Seller"><input className="input" value={form.seller} onChange={fld('seller')} /></Inp>
                <Inp label="BL"><input className="input" value={form.bl} onChange={fld('bl')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="STATUS">
                  <select className="select" value={form.status} onChange={fld('status')}>
                    {BWH_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Inp>
                <Inp label="ETA Vũng Tàu"><input type="date" className="input" value={form.eta_vung_tau} onChange={fld('eta_vung_tau')} /></Inp>
                <Inp label="ETA HCM"><input type="date" className="input" value={form.eta_hcm} onChange={fld('eta_hcm')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Inp label="Total Cont"><input className="input" value={form.total_cont} onChange={fld('total_cont')} /></Inp>
                <Inp label="Total Bags"><input type="number" step="1" className="input" value={form.total_bags} onChange={fld('total_bags')} /></Inp>
                <Inp label="Gross Weight (MT)"><input type="number" step="0.001" className="input" value={form.gross_weight} onChange={fld('gross_weight')} /></Inp>
                <Inp label="Net Weight (MT)"><input type="number" step="0.001" className="input" value={form.net_weight} onChange={fld('net_weight')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Origin"><input className="input" value={form.origin} onChange={fld('origin')} /></Inp>
                <Inp label="Commodity"><input className="input" value={form.commodity} onChange={fld('commodity')} /></Inp>
                <Inp label="Price for BWH Inventory ($)"><input type="number" step="0.01" className="input" value={form.price_bwh_inventory} onChange={fld('price_bwh_inventory')} /></Inp>
                <Inp label="Inv Number"><input className="input" value={form.inv_number} onChange={fld('inv_number')} /></Inp>
              </div>
              <Inp label="NOTE TT KHO"><textarea className="input" rows={2} value={form.note_tt_kho} onChange={fld('note_tt_kho')} /></Inp>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('warehouse')} className="btn-secondary">Tiếp: Nhập/Xuất Kho <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ② NHẬP / XUẤT KHO */}
          {activeTab === 'warehouse' && (
            <div className="space-y-5">
              <h2 className="font-bold text-amber-700 border-b border-amber-100 pb-2">② Nhập Kho & Xuất Kho</h2>

              {/* NHẬP KHO */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-bold text-amber-700 mb-3">NHẬP KHO (INTO BWH)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="DATE INTO BWH"><input type="date" className="input" value={form.date_into_bwh} onChange={fld('date_into_bwh')} /></Inp>
                  <Inp label="Supervisor"><input className="input" value={form.supervisor_in} onChange={fld('supervisor_in')} /></Inp>
                  <Inp label="GW INTO BWH (MT)"><input type="number" step="0.001" className="input" value={form.gw_into_bwh} onChange={fld('gw_into_bwh')} /></Inp>
                  <Inp label="NW INTO BWH (MT)"><input type="number" step="0.001" className="input" value={form.nw_into_bwh} onChange={fld('nw_into_bwh')} /></Inp>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <CalcField label="[5] DIFF GW INTO BWH & BL GW = GW_In − GW_BL" value={`${fmtNum(c.diffGwInBl, 3)} MT`} color={c.diffGwInBl < 0 ? 'red' : c.diffGwInBl === 0 ? 'green' : 'amber'} small />
                  <CalcField label="[6] % = Diff / GW_BL × 100" value={fmtPct(c.pctDiffIn)} color={c.pctDiffIn < 0 ? 'red' : 'amber'} small />
                </div>
                <div className="mt-4">
                  <Inp label="NOTE (v/v thiếu hụt khi nhập kho & lấy xác nhận nhập kho)">
                    <textarea className="input" rows={2} value={form.note_into_bwh} onChange={fld('note_into_bwh')} />
                  </Inp>
                </div>
              </div>

              {/* XUẤT KHO */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs font-bold text-emerald-700 mb-3">XUẤT KHO (OUT OF BWH)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="DATE OUT OF BWH">
                    <input className="input" value={form.date_out_bwh} onChange={fld('date_out_bwh')} placeholder="Nhập ngày (nhiều ngày OK)" />
                  </Inp>
                  <Inp label="Supervisor"><input className="input" value={form.supervisor_out} onChange={fld('supervisor_out')} /></Inp>
                  <Inp label="GW OUT OF BWH (MT)"><input type="number" step="0.001" className="input" value={form.gw_out_bwh} onChange={fld('gw_out_bwh')} /></Inp>
                  <Inp label="NW OUT OF BWH (MT)"><input type="number" step="0.001" className="input" value={form.nw_out_bwh} onChange={fld('nw_out_bwh')} /></Inp>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <CalcField label="[12] DIFF GW OUT & GW INTO = GW_Out − GW_In" value={`${fmtNum(c.diffGwOutIn, 3)} MT`} color={c.diffGwOutIn < 0 ? 'red' : c.diffGwOutIn === 0 ? 'green' : 'amber'} small />
                  <CalcField label="[13] % = Diff / GW_In × 100" value={fmtPct(c.pctDiffOut)} color={c.pctDiffOut < 0 ? 'red' : 'amber'} small />
                </div>
                <div className="mt-4">
                  <Inp label="NOTE (v/v thiếu hụt khi xuất kho & lấy xác nhận xuất kho)">
                    <textarea className="input" rows={2} value={form.note_out_bwh} onChange={fld('note_out_bwh')} />
                  </Inp>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('insurance')} className="btn-secondary">Tiếp: Bảo Hiểm & TT <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ③ BẢO HIỂM & THANH TOÁN */}
          {activeTab === 'insurance' && (
            <div className="space-y-5">
              <h2 className="font-bold text-teal-700 border-b border-teal-100 pb-2">③ Bảo Hiểm & Thanh Toán Kho</h2>

              {/* BẢO HIỂM */}
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-xs font-bold text-teal-700 mb-3">BẢO HIỂM (INSURANCE)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="INS Company"><input className="input" value={form.ins_company} onChange={fld('ins_company')} /></Inp>
                  <Inp label="INS Fee ($)"><input type="number" step="0.01" className="input" value={form.ins_fee} onChange={fld('ins_fee')} /></Inp>
                  <Inp label="% Insured"><input type="number" step="0.01" className="input" value={form.pct_insured} onChange={fld('pct_insured')} placeholder="100" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="[4] Cargo Value = NW × Price × %Ins" value={fmtUSD(c.cargoValueInsured)} color="teal" small />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <Inp label="Rate (%)"><input type="number" step="0.0001" className="input" value={form.ins_rate} onChange={fld('ins_rate')} placeholder="0.00" /></Inp>
                  <Inp label="VAT (%)"><input type="number" step="0.01" className="input" value={form.ins_vat} onChange={fld('ins_vat')} placeholder="0.00" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="[7] Checking INS FEE = CVI×Rate×(1+VAT)" value={fmtUSD(c.checkingInsFee)} color="teal" small />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Inp label="Exchange Rate (VND)"><input type="number" step="1" className="input" value={form.exchange_rate} onChange={fld('exchange_rate')} placeholder="25000" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="[9] In VND = Checking × Exchange Rate" value={fmtVND(c.insInVnd)} color="teal" small />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Inp label="Duration"><input className="input" value={form.ins_duration} onChange={fld('ins_duration')} /></Inp>
                  <Inp label="Payment Date"><input type="date" className="input" value={form.ins_payment_date} onChange={fld('ins_payment_date')} /></Inp>
                  <Inp label="Note INS"><input className="input" value={form.note_ins} onChange={fld('note_ins')} /></Inp>
                </div>
              </div>

              {/* THANH TOÁN */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs font-bold text-emerald-700 mb-3">THANH TOÁN KHO (PAYMENT)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Inp label="Deposit ($)"><input type="number" step="0.01" className="input" value={form.deposit} onChange={fld('deposit')} placeholder="0.00" /></Inp>
                  <Inp label="Payment Date (Deposit)"><input type="date" className="input" value={form.deposit_payment_date} onChange={fld('deposit_payment_date')} /></Inp>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Inp label="Amount Paid ($)"><input type="number" step="0.01" className="input" value={form.amount_paid} onChange={fld('amount_paid')} placeholder="0.00" /></Inp>
                  <Inp label="Payment Date (Amount)"><input type="date" className="input" value={form.amount_paid_date} onChange={fld('amount_paid_date')} /></Inp>
                </div>
                <div className="mt-4">
                  <Inp label="Note PAY BWH"><input className="input" value={form.note_pay_bwh} onChange={fld('note_pay_bwh')} /></Inp>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setActiveTab('warehouse')} className="btn-secondary">← Nhập/Xuất Kho</button>
                <button onClick={save} disabled={saving} className="btn-primary"><Save size={15}/> {saving ? 'Đang lưu...' : '💾 Lưu toàn bộ'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="page-title">🏭 Kho Ngoại Quan (BWH)</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tìm BWH, seller, BL, hàng..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-64" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-40">
            <option value="">Tất cả</option>
            {BWH_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Nhập mới</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BWH_STATUS.map(s => (
          <div key={s} className="card p-4">
            <div className="text-xs text-slate-500">{s}</div>
            <div className={`text-2xl font-bold mt-1 ${statusBadge(s).replace('bg-', 'text-').replace('-100', '-700')}`}>
              {records.filter(r => r.status === s).length}
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">BWH / No</th>
              <th className="table-head">Year</th>
              <th className="table-head">Seller</th>
              <th className="table-head">BL</th>
              <th className="table-head">Commodity</th>
              <th className="table-head">GW (MT)</th>
              <th className="table-head">NW (MT)</th>
              <th className="table-head">Price BWH</th>
              <th className="table-head">ETA HCM</th>
              <th className="table-head">Status</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">🏭</div>
                <div>Chưa có dữ liệu — <button onClick={openCreate} className="text-blue-600 hover:underline">Nhập mới</button></div>
              </td></tr> :
              records.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                  <td className="table-cell">
                    <div className="font-bold text-blue-700 text-xs">{r.bwh || '—'}</div>
                    <div className="text-slate-400 text-xs">{r.no || ''}</div>
                  </td>
                  <td className="table-cell">{r.year || '—'}</td>
                  <td className="table-cell font-medium">{r.seller || '—'}</td>
                  <td className="table-cell font-mono text-xs">{r.bl || '—'}</td>
                  <td className="table-cell text-xs">{r.commodity || '—'}</td>
                  <td className="table-cell text-xs">{r.gross_weight ? `${r.gross_weight} MT` : '—'}</td>
                  <td className="table-cell text-xs">{r.net_weight ? `${r.net_weight} MT` : '—'}</td>
                  <td className="table-cell">{r.price_bwh_inventory ? fmtUSD(r.price_bwh_inventory) : '—'}</td>
                  <td className="table-cell text-xs text-slate-500">{r.eta_hcm || '—'}</td>
                  <td className="table-cell"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status || '—'}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openView(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={14}/></button>
                      <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"><Pencil size={14}/></button>
                      <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length > 0 && <div className="px-4 py-2 text-xs text-slate-400 border-t">{records.length} bản ghi</div>}
      </div>
    </div>
  )
}
