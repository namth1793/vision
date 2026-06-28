import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, X, Save, Calculator, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => (v == null || isNaN(v)) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNum = (v, d = 3) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (v) => (v == null || isNaN(v)) ? '—' : `${Number(v).toFixed(4)}%`

function compute(f) {
  const price = n(f.price), qty = n(f.quantity)
  const pct3 = n(f.pct3)
  const p1to1 = n(f.penalty_1to1)
  const outturn = n(f.outturn), nutcount = n(f.nutcount), moisture = n(f.moisture)
  const dp = n(f.double_penalty)
  const nutPen = n(f.nutcount_penalty), moistPen = n(f.moisture_penalty)
  const totalBags = n(f.total_bags), gwBl = n(f.gw_bl)
  const lessAdv = n(f.less_advance), disc1 = n(f.discount1)
  const secPay = n(f.second_payment)
  const nwBw = n(f.nw_bw)
  const outVina = n(f.outturn_vina), nutVina = n(f.nutcount_vina), moistVina = n(f.moisture_vina)
  const demDet = n(f.dem_det), sto = n(f.sto), fee1 = n(f.other_fee1), fee2 = n(f.other_fee2)
  const c1 = n(f.commission1_usd_mt), c2 = n(f.commission2_usd_mt)
  const dcInput = n(f.debit_credit_input)

  const contractValue = price * qty
  const penalty_1to2 = p1to1 * 2
  const nwBl = gwBl - totalBags / 1000
  const cargoValue = nwBl * price
  const lessRetention = -(cargoValue * pct3 / 100)
  const calcBlInvoice = price * nwBl + lessAdv + lessRetention + disc1

  const shortageOvertage = nwBw - nwBl
  const diffOutturn = outVina - outturn

  const threshold = outturn + dp // dp entered as negative offset
  let outurnClaim1to1 = 0, outurnClaim1to2 = 0
  if (outVina < outturn) {
    if (outVina >= threshold) {
      outurnClaim1to1 = (outturn - outVina) * p1to1 * nwBw
    } else {
      outurnClaim1to1 = (outturn - threshold) * p1to1 * nwBw
      outurnClaim1to2 = (threshold - outVina) * penalty_1to2 * nwBw
    }
  }

  const nutDiff = nutVina - nutcount
  const nutcountClaim = nutDiff > 0 ? nutDiff * nutPen * nwBw : 0
  const moistDiff = moistVina - moisture
  const moistureClaim = moistDiff > 0 ? moistDiff * moistPen * nwBw : 0

  const calcDebitCredit = Math.round((
    price * nwBw - secPay + lessAdv
    - outurnClaim1to1 - outurnClaim1to2
    - nutcountClaim - moistureClaim
    - demDet - sto - fee1 - fee2
  ) * 100) / 100

  const notesDebitCredit = calcDebitCredit > 0
    ? `${f.buyer || 'Buyer'} has to pay ${f.seller || 'Seller'}`
    : `${f.seller || 'Seller'} has to pay ${f.buyer || 'Buyer'}`

  let statusSettlement = 'NOT YET'
  if (n(f.final_settlement) !== 0 && Math.abs(dcInput - n(f.final_settlement)) < 0.01) {
    statusSettlement = 'CLOSED'
  }

  const comm1Amount = c1 * nwBw
  const comm2Amount = c2 * nwBw

  return {
    contractValue, penalty_1to2, nwBl, cargoValue, lessRetention, calcBlInvoice,
    shortageOvertage, diffOutturn, outurnClaim1to1, outurnClaim1to2, nutDiff, moistDiff,
    nutcountClaim, moistureClaim, calcDebitCredit, notesDebitCredit,
    statusSettlement, comm1Amount, comm2Amount
  }
}

const EMPTY = {
  year: new Date().getFullYear(), staff: '', vn_broker: '', agency: '', order_note: '', sale_contract: '',
  date: '', seller: '', buyer: '', status: '',
  shipment: '', quantity: '', origin: '', pol: '',
  outturn: '', nutcount: '', moisture: '', price: '',
  pct1: '', pct2: '', pct3: '', double_penalty: '', penalty_1to1: '', nutcount_penalty: '', moisture_penalty: '',
  advanced_payment: '', payment_date1: '', second_payment: '', payment_date2: '', final_settlement: '', payment_date3: '', note_pay: '',
  shipping_line: '', loader: '', bl_number: '', eta_caimep: '', eta_hcm: '', eta_pod: '', notes_bill: '',
  dhl_fedex_number: '', dhl_delivered: '', total_cont: '', cont_size: '', total_bags: '', gw_bl: '',
  less_advance: '', discount1: '',
  seller_invoice_amount: '', notes_invoice: '',
  date_unload: '', supervisor: '', notes_cert: '', certificate_no: '', date_certificate: '', nw_bw: '',
  outturn_vina: '', nutcount_vina: '', moisture_vina: '',
  dem_det: '', sto: '', other_fee1: '', other_fee2: '',
  debit_credit_input: '', notes_final: '',
  commission1_usd_mt: '', pay_on_behalf1: '', notes_comm1: '',
  commission2_usd_mt: '', pay_on_behalf2: '', notes_comm2: '',
}

const TABS = [
  { id: 'contract', label: '① Hợp Đồng', color: 'blue' },
  { id: 'payment', label: '② Thanh Toán', color: 'green' },
  { id: 'shipment', label: '③ Vận Chuyển / B/L', color: 'violet' },
  { id: 'quality', label: '④ Kiểm Tra CL', color: 'amber' },
  { id: 'settlement', label: '⑤ Quyết Toán', color: 'red' },
  { id: 'commission', label: '⑥ Hoa Hồng', color: 'teal' },
]

const TAB_COLOR = {
  blue: 'border-blue-600 text-blue-700 bg-blue-50',
  green: 'border-emerald-600 text-emerald-700 bg-emerald-50',
  violet: 'border-violet-600 text-violet-700 bg-violet-50',
  amber: 'border-amber-600 text-amber-700 bg-amber-50',
  red: 'border-red-600 text-red-700 bg-red-50',
  teal: 'border-teal-600 text-teal-700 bg-teal-50',
}

function CalcField({ label, value, color = 'blue', note, small }) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  }
  return (
    <div className={`rounded-lg border-2 ${colors[color] || colors.blue} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Calculator size={12} className="opacity-60" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className={`font-bold ${small ? 'text-sm' : 'text-base'} ${colors[color]?.split(' ')[2]}`}>{value}</div>
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

export default function ImportEntry() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [viewRecord, setViewRecord] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [activeTab, setActiveTab] = useState('contract')
  const [saving, setSaving] = useState(false)

  const c = compute(form)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    api.get('/import-records', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const openCreate = () => { setForm(EMPTY); setEditId(null); setActiveTab('contract'); setShowForm(true) }
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditId(r.id); setActiveTab('contract'); setShowForm(true) }
  const openView = async (r) => { const res = await api.get(`/import-records/${r.id}`); setViewRecord(res.data) }

  const save = async () => {
    if (!form.sale_contract) { toast.error('Vui lòng nhập Sale Contract'); setActiveTab('contract'); return }
    setSaving(true)
    try {
      if (editId) await api.put(`/import-records/${editId}`, form)
      else await api.post('/import-records', form)
      toast.success(editId ? 'Đã cập nhật' : 'Đã tạo mới')
      setShowForm(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa bản ghi này?')) return
    try { await api.delete(`/import-records/${id}`); toast.success('Đã xóa'); load() }
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
          <h1 className="page-title ml-2">📥 Chi tiết: {viewRecord.sale_contract || '—'}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Sec title="① Hợp Đồng" color="border-blue-500">
            <Row label="Year" value={viewRecord.year} />
            <Row label="Staff" value={viewRecord.staff} />
            <Row label="VN Broker" value={viewRecord.vn_broker} />
            <Row label="Agency" value={viewRecord.agency} />
            <Row label="Order/Note" value={viewRecord.order_note} />
            <Row label="Sale Contract" value={<strong>{viewRecord.sale_contract}</strong>} />
            <Row label="Date" value={viewRecord.date} />
            <Row label="Seller" value={viewRecord.seller} />
            <Row label="Buyer" value={viewRecord.buyer} />
            <Row label="Status" value={viewRecord.status} />
            <Row label="Shipment" value={viewRecord.shipment} />
            <Row label="Quantity (MT)" value={viewRecord.quantity} />
            <Row label="Origin" value={viewRecord.origin} />
            <Row label="POL" value={viewRecord.pol} />
            <Row label="Outturn (lbs)" value={viewRecord.outturn} />
            <Row label="Nutcount" value={viewRecord.nutcount} />
            <Row label="Moisture" value={viewRecord.moisture} />
            <Row label="Price ($/MT)" value={fmtUSD(viewRecord.price)} />
            <Row label="✦ Contract Value" value={fmtUSD(vc.contractValue)} isCalc />
            <Row label="1st %" value={viewRecord.pct1} />
            <Row label="2nd %" value={viewRecord.pct2} />
            <Row label="3rd %" value={viewRecord.pct3} />
            <Row label="Double Penalty (lbs)" value={viewRecord.double_penalty} />
            <Row label="1:1 Penalty ($)" value={fmtUSD(viewRecord.penalty_1to1)} />
            <Row label="✦ 1:2 Penalty ($)" value={fmtUSD(vc.penalty_1to2)} isCalc />
            <Row label="Nutcount Penalty" value={viewRecord.nutcount_penalty} />
            <Row label="Moisture Penalty" value={viewRecord.moisture_penalty} />
          </Sec>
          <Sec title="② Thanh Toán" color="border-emerald-500">
            <Row label="Advanced Payment ($)" value={fmtUSD(viewRecord.advanced_payment)} />
            <Row label="Payment Date 1" value={viewRecord.payment_date1} />
            <Row label="Second Payment ($)" value={fmtUSD(viewRecord.second_payment)} />
            <Row label="Payment Date 2" value={viewRecord.payment_date2} />
            <Row label="Final Settlement ($)" value={fmtUSD(viewRecord.final_settlement)} />
            <Row label="Payment Date 3" value={viewRecord.payment_date3} />
          </Sec>
          <Sec title="③ Vận Chuyển / B/L" color="border-violet-500">
            <Row label="Shipping Line" value={viewRecord.shipping_line} />
            <Row label="Loader" value={viewRecord.loader} />
            <Row label="B/L Number" value={viewRecord.bl_number} />
            <Row label="ETA CAIMEP" value={viewRecord.eta_caimep} />
            <Row label="ETA HCM" value={viewRecord.eta_hcm} />
            <Row label="ETA POD" value={viewRecord.eta_pod} />
            <Row label="Notes Bill" value={viewRecord.notes_bill} />
            <Row label="DHL/Fedex Number" value={viewRecord.dhl_fedex_number} />
            <Row label="DHL Delivered" value={viewRecord.dhl_delivered} />
            <Row label="Total Cont" value={viewRecord.total_cont} />
            <Row label="Cont Size" value={viewRecord.cont_size} />
            <Row label="Total Bags" value={viewRecord.total_bags} />
            <Row label="GW on B/L (MT)" value={viewRecord.gw_bl} />
            <Row label="✦ NW on B/L (MT)" value={fmtNum(vc.nwBl)} isCalc />
            <Row label="✦ Cargo Value = NW × Price" value={fmtUSD(vc.cargoValue)} isCalc />
            <Row label="Less Advance (-)" value={viewRecord.less_advance} />
            <Row label="✦ Less Retention (-)" value={fmtUSD(vc.lessRetention)} isCalc />
            <Row label="Discount (-)" value={viewRecord.discount1} />
            <Row label="✦ Amount Payable to Seller" value={fmtUSD(vc.calcBlInvoice)} isCalc />
            <Row label="Seller Invoice Amount ($)" value={fmtUSD(viewRecord.seller_invoice_amount)} />
            <Row label="Notes Invoice" value={viewRecord.notes_invoice} />
          </Sec>
          <Sec title="④ Kiểm Tra CL" color="border-amber-500">
            <Row label="Date Unload Cargo" value={viewRecord.date_unload} />
            <Row label="Notes Cert" value={viewRecord.notes_cert} />
            <Row label="Certificate No" value={viewRecord.certificate_no} />
            <Row label="Date of Certificate" value={viewRecord.date_certificate} />
            <Row label="NW as Vina/CF (MT)" value={viewRecord.nw_bw} />
            <Row label="✦ Shortage/Overtage" value={fmtNum(vc.shortageOvertage)} isCalc />
            <Row label="Outturn Vina/CF (lbs)" value={viewRecord.outturn_vina} />
            <Row label="Nutcount Vina/CF" value={viewRecord.nutcount_vina} />
            <Row label="Moisture Vina/CF" value={viewRecord.moisture_vina} />
            <Row label="✦ Diff Outturn" value={fmtNum(vc.diffOutturn)} isCalc />
            <Row label="✦ 1:1 Outturn Claim ($)" value={fmtUSD(vc.outurnClaim1to1)} isCalc />
            <Row label="✦ 1:2 Outturn Claim ($)" value={fmtUSD(vc.outurnClaim1to2)} isCalc />
            <Row label="✦ Nutcount Diff" value={fmtNum(vc.nutDiff)} isCalc />
            <Row label="✦ Nutcount Claim ($)" value={fmtUSD(vc.nutcountClaim)} isCalc />
            <Row label="✦ Moisture Diff" value={fmtNum(vc.moistDiff)} isCalc />
            <Row label="✦ Moisture Claim ($)" value={fmtUSD(vc.moistureClaim)} isCalc />
          </Sec>
          <Sec title="⑤ Quyết Toán" color="border-red-500">
            <Row label="DEM/DET ($)" value={fmtUSD(viewRecord.dem_det)} />
            <Row label="STO ($)" value={fmtUSD(viewRecord.sto)} />
            <Row label="Other Fee 1 ($)" value={fmtUSD(viewRecord.other_fee1)} />
            <Row label="Other Fee 2 ($)" value={fmtUSD(viewRecord.other_fee2)} />
            <Row label="✦ Calc Debit/Credit" value={fmtUSD(vc.calcDebitCredit)} isCalc />
            <Row label="✦ Notes" value={vc.notesDebitCredit} isCalc />
            <Row label="Debit/Credit (Buyer/Seller)" value={fmtUSD(viewRecord.debit_credit_input)} />
            <Row label="✦ Status Settlement" value={vc.statusSettlement} isCalc />
            <Row label="Notes Final" value={viewRecord.notes_final} />
          </Sec>
          <Sec title="⑥ Hoa Hồng" color="border-teal-500">
            <Row label="Comm 1 ($/MT) — Nhi" value={fmtUSD(viewRecord.commission1_usd_mt)} />
            <Row label="✦ Amount 1" value={fmtUSD(vc.comm1Amount)} isCalc />
            <Row label="Pay on behalf 1 ($)" value={fmtUSD(viewRecord.pay_on_behalf1)} />
            <Row label="Notes Comm 1" value={viewRecord.notes_comm1} />
            <Row label="Comm 2 ($/MT) — Broker" value={fmtUSD(viewRecord.commission2_usd_mt)} />
            <Row label="✦ Amount 2" value={fmtUSD(vc.comm2Amount)} isCalc />
            <Row label="Pay on behalf 2 ($)" value={fmtUSD(viewRecord.pay_on_behalf2)} />
            <Row label="Notes Comm 2" value={viewRecord.notes_comm2} />
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
          <h1 className="page-title">📥 {editId ? 'Chỉnh sửa' : 'Nhập mới'} — Bảng Nhập {form.sale_contract && `(${form.sale_contract})`}</h1>
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
          {/* ① HỢP ĐỒNG */}
          {activeTab === 'contract' && (
            <div className="space-y-5">
              <h2 className="font-bold text-blue-700 border-b border-blue-100 pb-2">① Thông Tin Hợp Đồng</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Inp label="Year"><input type="number" className="input" value={form.year} onChange={fld('year')} /></Inp>
                <Inp label="Staff"><input className="input" value={form.staff} onChange={fld('staff')} placeholder="Tên nhân viên" /></Inp>
                <Inp label="VN Broker"><input className="input" value={form.vn_broker} onChange={fld('vn_broker')} /></Inp>
                <Inp label="Agency"><input className="input" value={form.agency} onChange={fld('agency')} /></Inp>
                <Inp label="Order/Note"><input className="input" value={form.order_note} onChange={fld('order_note')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="Sale Contract *"><input className="input" value={form.sale_contract} onChange={fld('sale_contract')} placeholder="VD: SC-2025-001" /></Inp>
                <Inp label="Date"><input type="date" className="input" value={form.date} onChange={fld('date')} /></Inp>
                <Inp label="Status"><input className="input" value={form.status} onChange={fld('status')} placeholder="ACTIVE / CLOSED..." /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="Seller (bên bán)"><input className="input" value={form.seller} onChange={fld('seller')} /></Inp>
                <Inp label="Buyer (bên mua)"><input className="input" value={form.buyer} onChange={fld('buyer')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Shipment (ngày giao hàng)">
                  <input type="date" className="input" value={form.shipment} onChange={fld('shipment')} />
                </Inp>
                <Inp label="Quantity (MT)"><input type="number" step="0.001" className="input" value={form.quantity} onChange={fld('quantity')} placeholder="0.000" /></Inp>
                <Inp label="Origin"><input className="input" value={form.origin} onChange={fld('origin')} /></Inp>
                <Inp label="POL"><input className="input" value={form.pol} onChange={fld('pol')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Outturn (lbs)"><input type="number" step="0.01" className="input" value={form.outturn} onChange={fld('outturn')} placeholder="0.00" /></Inp>
                <Inp label="Nutcount"><input type="number" step="0.01" className="input" value={form.nutcount} onChange={fld('nutcount')} placeholder="0.00" /></Inp>
                <Inp label="Moisture"><input type="number" step="0.01" className="input" value={form.moisture} onChange={fld('moisture')} placeholder="0.00" /></Inp>
                <Inp label="Price ($/MT)"><input type="number" step="0.01" className="input" value={form.price} onChange={fld('price')} placeholder="0.00" /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-3 rounded-lg">
                <CalcField label="[9] Contract Value = Price × Qty" value={fmtUSD(c.contractValue)} color="blue" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="1st (%)"><input type="number" step="0.01" className="input" value={form.pct1} onChange={fld('pct1')} placeholder="0.00" /></Inp>
                <Inp label="2nd (%)"><input type="number" step="0.01" className="input" value={form.pct2} onChange={fld('pct2')} placeholder="0.00" /></Inp>
                <Inp label="3rd (%)"><input type="number" step="0.01" className="input" value={form.pct3} onChange={fld('pct3')} placeholder="0.00" /></Inp>
                <Inp label="Double Penalty (lbs, số âm)"><input type="number" step="0.01" className="input" value={form.double_penalty} onChange={fld('double_penalty')} placeholder="-2.00" /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="1:1 Penalty ($)"><input type="number" step="0.0001" className="input" value={form.penalty_1to1} onChange={fld('penalty_1to1')} placeholder="0.00" /></Inp>
                <div className="flex items-end">
                  <CalcField label="[15] 1:2 Penalty = 1:1 × 2" value={fmtUSD(c.penalty_1to2)} color="blue" small />
                </div>
                <Inp label="Nutcount Penalty ($)"><input type="number" step="0.0001" className="input" value={form.nutcount_penalty} onChange={fld('nutcount_penalty')} placeholder="0.00" /></Inp>
                <Inp label="Moisture Penalty ($)"><input type="number" step="0.0001" className="input" value={form.moisture_penalty} onChange={fld('moisture_penalty')} placeholder="0.00" /></Inp>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('payment')} className="btn-secondary">Tiếp: Thanh Toán <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ② THANH TOÁN */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <h2 className="font-bold text-emerald-700 border-b border-emerald-100 pb-2">② Thanh Toán</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="Prepayment / 1st Payment ($)"><input type="number" step="0.01" className="input" value={form.advanced_payment} onChange={fld('advanced_payment')} placeholder="0.00" /></Inp>
                <Inp label="Payment Date"><input type="date" className="input" value={form.payment_date1} onChange={fld('payment_date1')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="Second Payment ($)"><input type="number" step="0.01" className="input" value={form.second_payment} onChange={fld('second_payment')} placeholder="0.00" /></Inp>
                <Inp label="Payment Date 2"><input type="date" className="input" value={form.payment_date2} onChange={fld('payment_date2')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="Final Settlement ($)"><input type="number" step="0.01" className="input" value={form.final_settlement} onChange={fld('final_settlement')} placeholder="0.00" /></Inp>
                <Inp label="Payment Date 3"><input type="date" className="input" value={form.payment_date3} onChange={fld('payment_date3')} /></Inp>
              </div>
              <Inp label="NOTE PAY"><input className="input" value={form.note_pay || ''} onChange={fld('note_pay')} /></Inp>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('shipment')} className="btn-secondary">Tiếp: Vận Chuyển <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ③ VẬN CHUYỂN / B/L */}
          {activeTab === 'shipment' && (
            <div className="space-y-5">
              <h2 className="font-bold text-violet-700 border-b border-violet-100 pb-2">③ Vận Chuyển / Bill of Lading</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="Shipping Line"><input className="input" value={form.shipping_line || ''} onChange={fld('shipping_line')} /></Inp>
                <Inp label="Loader"><input className="input" value={form.loader || ''} onChange={fld('loader')} /></Inp>
                <Inp label="B/L Number"><input className="input" value={form.bl_number} onChange={fld('bl_number')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="ETA CAIMEP"><input type="date" className="input" value={form.eta_caimep} onChange={fld('eta_caimep')} /></Inp>
                <Inp label="ETA HCM"><input type="date" className="input" value={form.eta_hcm} onChange={fld('eta_hcm')} /></Inp>
                <Inp label="ETA FPOD (ngày thực tế)"><input className="input" value={form.eta_pod} onChange={fld('eta_pod')} placeholder="Nhập ngày thực tế" /></Inp>
              </div>
              <Inp label="Notes Bill"><textarea className="input" rows={2} value={form.notes_bill} onChange={fld('notes_bill')} /></Inp>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="DHL/Fedex Number"><input className="input" value={form.dhl_fedex_number} onChange={fld('dhl_fedex_number')} /></Inp>
                <Inp label="DHL Delivered"><input type="date" className="input" value={form.dhl_delivered} onChange={fld('dhl_delivered')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Inp label="Total Cont"><input className="input" value={form.total_cont} onChange={fld('total_cont')} /></Inp>
                <Inp label="Cont Size"><input className="input" value={form.cont_size} onChange={fld('cont_size')} placeholder="20'/40'" /></Inp>
                <Inp label="Total Bags"><input type="number" step="1" className="input" value={form.total_bags} onChange={fld('total_bags')} /></Inp>
                <Inp label="GW on B/L (MT)"><input type="number" step="0.001" className="input" value={form.gw_bl} onChange={fld('gw_bl')} /></Inp>
                <div className="flex items-end">
                  <CalcField label="NW on B/L = GW − Bags/1000 (MT)" value={`${fmtNum(c.nwBl)} MT`} color="violet" small />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-violet-50 p-3 rounded-lg">
                <CalcField label="Cargo Value = NW on B/L × Price" value={fmtUSD(c.cargoValue)} color="violet" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Less Advance (-) ($)"><input type="number" step="0.01" className="input" value={form.less_advance} onChange={fld('less_advance')} placeholder="0.00 (số âm)" /></Inp>
                <div className="flex items-end">
                  <CalcField label="Less Retention (-) = −Cargo Value × 3rd%" value={fmtUSD(c.lessRetention)} color="violet" small />
                </div>
                <Inp label="Discount (-) ($)"><input type="number" step="0.01" className="input" value={form.discount1} onChange={fld('discount1')} placeholder="0.00 (số âm)" /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-violet-50 p-3 rounded-lg">
                <CalcField label="Amount Payable to Seller = Price × NW on B/L + Less Advance + Less Retention + Discount" value={fmtUSD(c.calcBlInvoice)} color="violet" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="Seller Invoice Amount ($)"><input type="number" step="0.01" className="input" value={form.seller_invoice_amount} onChange={fld('seller_invoice_amount')} /></Inp>
                <Inp label="NOTES INVOICE"><input className="input" value={form.notes_invoice} onChange={fld('notes_invoice')} /></Inp>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('quality')} className="btn-secondary">Tiếp: Kiểm Tra CL <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ④ KIỂM TRA CL */}
          {activeTab === 'quality' && (
            <div className="space-y-5">
              <h2 className="font-bold text-amber-700 border-b border-amber-100 pb-2">④ Kiểm Tra Chất Lượng</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Date Unload Cargo"><input type="date" className="input" value={form.date_unload} onChange={fld('date_unload')} /></Inp>
                <Inp label="Supervisor"><input className="input" value={form.supervisor || ''} onChange={fld('supervisor')} /></Inp>
                <Inp label="Notes CERT"><input className="input" value={form.notes_cert} onChange={fld('notes_cert')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="Vina/Cafecontrol Certificate No"><input className="input" value={form.certificate_no} onChange={fld('certificate_no')} /></Inp>
                <Inp label="Date of Certificate"><input type="date" className="input" value={form.date_certificate} onChange={fld('date_certificate')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="NW as Vina/CF or NW out of BWH (MT)">
                  <input type="number" step="0.001" className="input" value={form.nw_bw} onChange={fld('nw_bw')} placeholder="0.000" />
                </Inp>
                <div className="flex items-end">
                  <CalcField label="[6] Shortage/Overtage = NW_Vina − NW_BL" value={`${fmtNum(c.shortageOvertage)} MT`} color={c.shortageOvertage < 0 ? 'red' : 'green'} small />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="Outturn Vina/CF (lbs)"><input type="number" step="0.01" className="input" value={form.outturn_vina} onChange={fld('outturn_vina')} /></Inp>
                <Inp label="Nutcount Vina/CF"><input type="number" step="0.01" className="input" value={form.nutcount_vina} onChange={fld('nutcount_vina')} /></Inp>
                <Inp label="Moisture Vina/CF"><input type="number" step="0.01" className="input" value={form.moisture_vina} onChange={fld('moisture_vina')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <CalcField label="Difference Outturn = Outturn Vina − Contract" value={fmtNum(c.diffOutturn)} color={c.diffOutturn < 0 ? 'amber' : 'green'} />
                <CalcField label="1:1 Outturn Claim ($)" value={fmtUSD(c.outurnClaim1to1)} color="amber" note="NW_Vina × (Outturn − threshold) × 1:1 Penalty" />
                <CalcField label="1:2 Outturn Claim ($)" value={fmtUSD(c.outurnClaim1to2)} color="red" note="NW_Vina × (threshold − Outturn_Vina) × 1:2 Penalty" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CalcField label="Difference Nut = Nutcount Vina − Contract" value={fmtNum(c.nutDiff)} color={c.nutDiff > 0 ? 'amber' : 'green'} />
                <CalcField label="Nutcount Claim ($)" value={fmtUSD(c.nutcountClaim)} color="amber" note="Nếu Diff Nut > 0" />
                <CalcField label="Difference Moisture" value={fmtNum(c.moistDiff)} color={c.moistDiff > 0 ? 'amber' : 'green'} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CalcField label="Moisture Claim ($)" value={fmtUSD(c.moistureClaim)} color="amber" note="Nếu Diff Moisture > 0" />
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('settlement')} className="btn-secondary">Tiếp: Quyết Toán <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ⑤ QUYẾT TOÁN */}
          {activeTab === 'settlement' && (
            <div className="space-y-5">
              <h2 className="font-bold text-red-700 border-b border-red-100 pb-2">⑤ Quyết Toán</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="DEM/DET ($)"><input type="number" step="0.01" className="input" value={form.dem_det} onChange={fld('dem_det')} placeholder="0.00" /></Inp>
                <Inp label="STO ($)"><input type="number" step="0.01" className="input" value={form.sto} onChange={fld('sto')} placeholder="0.00" /></Inp>
                <Inp label="Other Fee 1 ($)"><input type="number" step="0.01" className="input" value={form.other_fee1} onChange={fld('other_fee1')} placeholder="0.00" /></Inp>
                <Inp label="Other Fee 2 ($)"><input type="number" step="0.01" className="input" value={form.other_fee2} onChange={fld('other_fee2')} placeholder="0.00" /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 p-3 rounded-lg">
                <CalcField label="Calculate Debit/Credit" value={fmtUSD(c.calcDebitCredit)} color={c.calcDebitCredit >= 0 ? 'green' : 'red'}
                  note="= Price×NW_Vina − 2nd Payment + Less Advance − 1:1 Claim − 1:2 Claim − Nutcount − Moisture − DEM/DET − STO − Fees" />
                <div className={`rounded-lg border-2 p-3 ${c.notesDebitCredit.includes('Buyer') && !c.notesDebitCredit.includes('Seller has') ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calculator size={12}/> [10] Notes — Bên thanh toán</div>
                  <div className="text-sm font-bold text-slate-800 italic">"{c.notesDebitCredit}"</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="[11] Debit/Credit (Buyer/Seller input) ($)">
                  <input type="number" step="0.01" className="input" value={form.debit_credit_input} onChange={fld('debit_credit_input')} placeholder="0.00" />
                </Inp>
                <div className={`flex items-end pb-1`}>
                  <div className={`rounded-lg border-2 p-3 w-full ${c.statusSettlement === 'CLOSED' ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                    <div className="text-xs text-slate-500 mb-1">[12] Status Settlement</div>
                    <div className={`text-xl font-black ${c.statusSettlement === 'CLOSED' ? 'text-emerald-700' : 'text-red-700'}`}>{c.statusSettlement}</div>
                  </div>
                </div>
              </div>
              <Inp label="[13] Notes Final"><input className="input" value={form.notes_final} onChange={fld('notes_final')} placeholder="Ghi chú quyết toán..." /></Inp>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('commission')} className="btn-secondary">Tiếp: Hoa Hồng <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ⑥ HOA HỒNG */}
          {activeTab === 'commission' && (
            <div className="space-y-5">
              <h2 className="font-bold text-teal-700 border-b border-teal-100 pb-2">⑥ Hoa Hồng</h2>
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-xs font-semibold text-teal-700 mb-3">HOA HỒNG NHI (Commission 1)</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Inp label="Commission ($/MT)"><input type="number" step="0.0001" className="input" value={form.commission1_usd_mt} onChange={fld('commission1_usd_mt')} placeholder="0.00" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="Amount = Comm × NW_Vina" value={fmtUSD(c.comm1Amount)} color="teal" small />
                  </div>
                  <Inp label="Receive/Pay on behalf of Seller ($)"><input type="number" step="0.01" className="input" value={form.pay_on_behalf1} onChange={fld('pay_on_behalf1')} placeholder="0.00" /></Inp>
                  <Inp label="Notes Nhi COM"><input className="input" value={form.notes_comm1} onChange={fld('notes_comm1')} /></Inp>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-3">HOA HỒNG BROKER (Commission 2)</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Inp label="Commission ($/MT)"><input type="number" step="0.0001" className="input" value={form.commission2_usd_mt} onChange={fld('commission2_usd_mt')} placeholder="0.00" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="Amount = Comm × NW_Vina" value={fmtUSD(c.comm2Amount)} color="teal" small />
                  </div>
                  <Inp label="Receive/Pay on behalf of Seller ($)"><input type="number" step="0.01" className="input" value={form.pay_on_behalf2} onChange={fld('pay_on_behalf2')} placeholder="0.00" /></Inp>
                  <Inp label="Notes Broker COM"><input className="input" value={form.notes_comm2} onChange={fld('notes_comm2')} /></Inp>
                </div>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setActiveTab('settlement')} className="btn-secondary">← Quyết Toán</button>
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
        <h1 className="page-title">📥 Bảng Nhập</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tìm SC, seller, buyer..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-64" />
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Nhập mới</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng bản ghi', value: records.length, color: 'blue' },
          { label: 'Tổng Qty (MT)', value: `${records.reduce((s,r) => s + n(r.quantity), 0).toLocaleString('en-US', {maximumFractionDigits:2})} MT`, color: 'violet' },
          { label: 'Tổng Contract Value', value: fmtUSD(records.reduce((s,r) => s + n(r.price) * n(r.quantity), 0)), color: 'emerald' },
          { label: 'Tổng Advanced Payment', value: fmtUSD(records.reduce((s,r) => s + n(r.advanced_payment), 0)), color: 'amber' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-lg font-bold mt-1 ${k.color === 'blue' ? 'text-blue-700' : k.color === 'violet' ? 'text-violet-700' : k.color === 'emerald' ? 'text-emerald-700' : 'text-amber-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Sale Contract</th>
              <th className="table-head">Year</th>
              <th className="table-head">Staff / Broker</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer</th>
              <th className="table-head">Qty (MT)</th>
              <th className="table-head">Price</th>
              <th className="table-head bg-blue-50 text-blue-700">Contract Value</th>
              <th className="table-head">Status</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={11} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={11} className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">📥</div>
                <div>Chưa có dữ liệu — <button onClick={openCreate} className="text-blue-600 hover:underline">Nhập mới</button></div>
              </td></tr> :
              records.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                  <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.sale_contract || '—'}</td>
                  <td className="table-cell">{r.year || '—'}</td>
                  <td className="table-cell text-xs"><div>{r.staff || '—'}</div><div className="text-slate-400">{r.vn_broker || ''}</div></td>
                  <td className="table-cell font-medium">{r.seller || '—'}</td>
                  <td className="table-cell">{r.buyer || '—'}</td>
                  <td className="table-cell">{r.quantity ? `${r.quantity} MT` : '—'}</td>
                  <td className="table-cell">{r.price ? fmtUSD(r.price) : '—'}</td>
                  <td className="table-cell bg-blue-50 font-bold text-blue-700">{r.price && r.quantity ? fmtUSD(n(r.price) * n(r.quantity)) : '—'}</td>
                  <td className="table-cell"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{r.status || '—'}</span></td>
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
