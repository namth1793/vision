import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, X, Save, Calculator, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => (v == null || isNaN(v)) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtVND = (v) => (v == null || isNaN(v)) ? '—' : `₫${Number(v).toLocaleString('vi-VN')}`
const fmtNum = (v, d = 2) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d)

function compute(f) {
  const price = n(f.price), qty = n(f.quantity)
  const nwToPay = n(f.nw_to_pay)
  const lessAdv = n(f.less_advance), disc1 = n(f.discount1), fee1 = n(f.other_fee1)
  const inclFee = f.include_other_fee !== 0 && f.include_other_fee !== false
  const pay2 = n(f.payment2)
  const sellInvAmt = n(f.seller_invoice_amount)
  const pctIns = n(f.pct_insured), insRate = n(f.ins_rate), insVat = n(f.ins_vat)
  const exRateUsd = n(f.exchange_rate_usd_vnd)
  const sellingPrice = n(f.selling_price)
  const insFee = n(f.ins_fee)
  const oceanFreight = n(f.ocean_freight)
  const markUp = n(f.mark_up), disc2 = n(f.discount2), fee2 = n(f.other_fee2)
  const amtBuyer2 = n(f.amount_buyer2_paid)
  const cosmosRate = n(f.cosmos_rate)
  const nwBlLbs = n(f.nw_bl_lbs)
  const commUsdLbs = n(f.commission_usd_lbs)
  const rateExVnd = n(f.rate_exchange_vnd)

  let ttDays = 0
  if (f.etd && f.eta) {
    const d = Math.round((new Date(f.eta) - new Date(f.etd)) / 86400000)
    if (!isNaN(d)) ttDays = d
  }

  const contractValue = price * qty
  const calcBuyer1PaySeller = price * nwToPay + lessAdv + disc1 + (inclFee ? fee1 : 0)
  const checkingBalanceBuyer1Seller = pay2 - sellInvAmt
  const cargoValueInsured = (pctIns / 100) * nwToPay * sellingPrice
  const insFeeBase = cargoValueInsured * insRate / 100
  const insFeeChecking = insFeeBase + insFeeBase * insVat / 100
  const insInVnd = insFeeChecking * exRateUsd
  const invoiceBuyer2toBuyer1 = sellingPrice * nwToPay + insFee + oceanFreight + markUp + disc2 + fee2
  const checkingBalanceBuyer2 = amtBuyer2 - invoiceBuyer2toBuyer1
  const cosmosPay = cosmosRate * nwBlLbs
  const commAmount = commUsdLbs * nwBlLbs
  const commInVnd = commAmount * rateExVnd

  return {
    contractValue, ttDays, calcBuyer1PaySeller, checkingBalanceBuyer1Seller,
    cargoValueInsured, insFeeChecking, insInVnd,
    invoiceBuyer2toBuyer1, checkingBalanceBuyer2,
    cosmosPay, commAmount, commInVnd,
  }
}

const EMPTY = {
  year: new Date().getFullYear(), staff: '', vn_broker: '', order_note: '', lot_number: '', sale_contract: '',
  date: '', status: 'SIGNED', expiry_export_cert_turkey: '',
  seller: '', buyer1: '', buyer2: '', commodity: '', qty_commodity: '', price: '',
  shipment: '', packing: '', packing_ctn: '', packing_unit: 'kgs', ctn_cont: '', quantity: '', quantity_unit: 'kgs',
  advance_payment: '', payment_date1: '', payment2: '', payment_date2: '', payment3: '', payment_date3: '', note_pay: '',
  market: '', crd: '', req_get_bkg: '', inspection_date: '', loading_date: '', supervisor: '', fwd: '',
  ocean_freight: '', note_booking: '', pol: '', pod: '', shipping_line: '',
  etd: '', eta: '',
  bkg_details: '', container_seal: '', bl_bkg_freetime: '', seller_invoice_no: '', note_shipping: '',
  commodity2: '', total_cont: '', ctn2: '',
  gw_bl_lbs: '', gw_bl_kgs: '', nw_bl_lbs: '', nw_bl_kgs: '',
  nw_to_pay: '', nw_to_pay_unit: 'lbs',
  less_advance: '', discount1: '', other_fee1: '', include_other_fee: 1,
  seller_invoice_amount: '', note_invoice: '',
  ins_company: '', ins_fee: '', pct_insured: '', ins_rate: '', ins_vat: '',
  exchange_rate_usd_vnd: '', ins_duration: '', ins_payment_date: '', note_ins: '',
  dhl_fedex_number: '', dhl_delivered: '', dhl_fee: '', note_dhl: '',
  selling_price: '', mark_up: '', discount2: '', other_fee2: '',
  amount_buyer2_paid: '', payment_date_buyer2: '',
  cosmos_rate: '', cosmos_payment_date: '', note_cos: '',
  commission_usd_lbs: '', rate_exchange_vnd: '', commission_payment_date: '', note_com: '',
}

const TABS = [
  { id: 'contract', label: '① Hợp Đồng', color: 'blue' },
  { id: 'payment', label: '② Thanh Toán', color: 'green' },
  { id: 'booking', label: '③ Booking / Shipping', color: 'violet' },
  { id: 'invoice', label: '④ Hàng & Invoice', color: 'amber' },
  { id: 'insurance', label: '⑤ Bảo Hiểm', color: 'teal' },
  { id: 'dhl_buyer2', label: '⑥ DHL / Buyer2 / Cosmos / COM', color: 'red' },
]

const TAB_COLOR = {
  blue: 'border-blue-600 text-blue-700 bg-blue-50',
  green: 'border-emerald-600 text-emerald-700 bg-emerald-50',
  violet: 'border-violet-600 text-violet-700 bg-violet-50',
  amber: 'border-amber-600 text-amber-700 bg-amber-50',
  teal: 'border-teal-600 text-teal-700 bg-teal-50',
  red: 'border-red-600 text-red-700 bg-red-50',
}

function CalcField({ label, value, color = 'blue', note, small }) {
  const cls = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
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

function UnitInput({ label, value, unit, unitValue, onChange, onUnitChange, units = ['kgs', 'lbs'], step = '0.01' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1">
        <input type="number" step={step} className="input flex-1" value={value} onChange={onChange} placeholder="0.00" />
        <select className="select w-20" value={unitValue} onChange={onUnitChange}>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </div>
  )
}

const statusBadge = (s) => {
  if (s === 'SIGNED') return 'bg-emerald-100 text-emerald-700'
  if (s === 'NOT SIGNED') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

export default function ExportEntry() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
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
    if (filterStatus) params.status = filterStatus
    api.get('/export-records', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))
  const fv = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const openCreate = () => { setForm(EMPTY); setEditId(null); setActiveTab('contract'); setShowForm(true) }
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditId(r.id); setActiveTab('contract'); setShowForm(true) }
  const openView = async (r) => { const res = await api.get(`/export-records/${r.id}`); setViewRecord(res.data) }

  const save = async () => {
    if (!form.sale_contract) { toast.error('Vui lòng nhập Sale Contract'); setActiveTab('contract'); return }
    setSaving(true)
    try {
      if (editId) await api.put(`/export-records/${editId}`, form)
      else await api.post('/export-records', form)
      toast.success(editId ? 'Đã cập nhật' : 'Đã tạo mới')
      setShowForm(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa bản ghi này?')) return
    try { await api.delete(`/export-records/${id}`); toast.success('Đã xóa'); load() }
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
          <h1 className="page-title ml-2">📤 Chi tiết: {viewRecord.sale_contract || '—'}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Sec title="① Hợp Đồng" color="border-blue-500">
            <Row label="Year / Lot" value={`${viewRecord.year || '—'} / ${viewRecord.lot_number || '—'}`} />
            <Row label="Staff" value={viewRecord.staff} />
            <Row label="VN Broker" value={viewRecord.vn_broker} />
            <Row label="Order/Note" value={viewRecord.order_note} />
            <Row label="Sale Contract" value={<strong>{viewRecord.sale_contract}</strong>} />
            <Row label="Date" value={viewRecord.date} />
            <Row label="Status" value={viewRecord.status} />
            <Row label="Expiry Export Cert (Turkey)" value={viewRecord.expiry_export_cert_turkey} />
            <Row label="Seller" value={viewRecord.seller} />
            <Row label="Buyer 1" value={viewRecord.buyer1} />
            <Row label="Buyer 2" value={viewRecord.buyer2} />
            <Row label="Commodity" value={viewRecord.commodity} />
            <Row label="Qty Commodity" value={viewRecord.qty_commodity} />
            <Row label="Price ($)" value={fmtUSD(viewRecord.price)} />
            <Row label="Shipment" value={viewRecord.shipment} />
            <Row label="Packing" value={viewRecord.packing} />
            <Row label={`Packing/CTN (${viewRecord.packing_unit})`} value={viewRecord.packing_ctn} />
            <Row label="CTN/CONT" value={viewRecord.ctn_cont} />
            <Row label={`Quantity (${viewRecord.quantity_unit})`} value={viewRecord.quantity} />
            <Row label="✦ [21] Contract Value" value={fmtUSD(vc.contractValue)} isCalc />
          </Sec>
          <Sec title="② Thanh Toán" color="border-emerald-500">
            <Row label="Advance Payment ($)" value={fmtUSD(viewRecord.advance_payment)} />
            <Row label="Payment Date 1" value={viewRecord.payment_date1} />
            <Row label="2nd Payment ($)" value={fmtUSD(viewRecord.payment2)} />
            <Row label="Payment Date 2" value={viewRecord.payment_date2} />
            <Row label="3rd Payment ($)" value={fmtUSD(viewRecord.payment3)} />
            <Row label="Payment Date 3" value={viewRecord.payment_date3} />
            <Row label="NOTE PAY" value={viewRecord.note_pay} />
          </Sec>
          <Sec title="③ Booking / Vận Chuyển" color="border-violet-500">
            <Row label="Market / CRD" value={`${viewRecord.market || '—'} / ${viewRecord.crd || '—'}`} />
            <Row label="POL / POD" value={`${viewRecord.pol || '—'} / ${viewRecord.pod || '—'}`} />
            <Row label="Shipping Line" value={viewRecord.shipping_line} />
            <Row label="ETD" value={viewRecord.etd} />
            <Row label="ETA" value={viewRecord.eta} />
            <Row label="✦ [43] TT Days" value={vc.ttDays != null ? `${vc.ttDays} ngày` : '—'} isCalc />
            <Row label="Ocean Freight ($)" value={fmtUSD(viewRecord.ocean_freight)} />
            <Row label="Container/Seal" value={viewRecord.container_seal} />
            <Row label="BL/BKG/FREETIME" value={viewRecord.bl_bkg_freetime} />
            <Row label="Seller Invoice No" value={viewRecord.seller_invoice_no} />
          </Sec>
          <Sec title="④ Hàng & Invoice Buyer1" color="border-amber-500">
            <Row label={`NW to pay (${viewRecord.nw_to_pay_unit})`} value={viewRecord.nw_to_pay} />
            <Row label="NW on B/L (lbs)" value={viewRecord.nw_bl_lbs} />
            <Row label="NW on B/L (kgs)" value={viewRecord.nw_bl_kgs} />
            <Row label="GW on B/L (lbs)" value={viewRecord.gw_bl_lbs} />
            <Row label="GW on B/L (kgs)" value={viewRecord.gw_bl_kgs} />
            <Row label="Less Advance (-)" value={fmtUSD(viewRecord.less_advance)} />
            <Row label="Discount (-)" value={fmtUSD(viewRecord.discount1)} />
            <Row label="Other Fee" value={fmtUSD(viewRecord.other_fee1)} />
            <Row label="✦ [60] Calc Buyer1 Pay Seller" value={fmtUSD(vc.calcBuyer1PaySeller)} isCalc />
            <Row label="Seller Invoice Amount ($)" value={fmtUSD(viewRecord.seller_invoice_amount)} />
            <Row label="✦ [35] Balance Buyer1–Seller" value={fmtUSD(vc.checkingBalanceBuyer1Seller)} isCalc />
          </Sec>
          <Sec title="⑤ Bảo Hiểm" color="border-teal-500">
            <Row label="INS Company" value={viewRecord.ins_company} />
            <Row label="INS Fee ($)" value={fmtUSD(viewRecord.ins_fee)} />
            <Row label="% Insured" value={viewRecord.pct_insured ? `${viewRecord.pct_insured}%` : '—'} />
            <Row label="✦ Cargo Value Insured" value={fmtUSD(vc.cargoValueInsured)} isCalc />
            <Row label="Rate (%)" value={viewRecord.ins_rate} />
            <Row label="VAT (%)" value={viewRecord.ins_vat} />
            <Row label="✦ INS FEE checking" value={fmtUSD(vc.insFeeChecking)} isCalc />
            <Row label="Exchange Rate (USD→VND)" value={viewRecord.exchange_rate_usd_vnd} />
            <Row label="✦ In VND" value={fmtVND(vc.insInVnd)} isCalc />
          </Sec>
          <Sec title="⑥ DHL / Buyer2 / Cosmos / COM" color="border-red-500">
            <Row label="DHL/Fedex Number" value={viewRecord.dhl_fedex_number} />
            <Row label="DHL Delivered" value={viewRecord.dhl_delivered} />
            <Row label="DHL Fee (VND)" value={viewRecord.dhl_fee} />
            <Row label="Selling Price ($)" value={fmtUSD(viewRecord.selling_price)} />
            <Row label="✦ Invoice Buyer2 → Buyer1" value={fmtUSD(vc.invoiceBuyer2toBuyer1)} isCalc />
            <Row label="Amount Buyer2 Paid ($)" value={fmtUSD(viewRecord.amount_buyer2_paid)} />
            <Row label="✦ Balance Buyer2–Buyer1" value={fmtUSD(vc.checkingBalanceBuyer2)} isCalc />
            <Row label="COSMOS Rate ($)" value={fmtUSD(viewRecord.cosmos_rate)} />
            <Row label="✦ COSMOS Pay Back" value={fmtUSD(vc.cosmosPay)} isCalc />
            <Row label="Commission (USD/LBS)" value={fmtUSD(viewRecord.commission_usd_lbs)} />
            <Row label="✦ Commission Amount" value={fmtUSD(vc.commAmount)} isCalc />
            <Row label="✦ Commission in VND" value={fmtVND(vc.commInVnd)} isCalc />
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
          <h1 className="page-title">📤 {editId ? 'Chỉnh sửa' : 'Nhập mới'} — Bảng Xuất {form.sale_contract && `(${form.sale_contract})`}</h1>
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
                <Inp label="Staff"><input className="input" value={form.staff} onChange={fld('staff')} /></Inp>
                <Inp label="VN Broker"><input className="input" value={form.vn_broker} onChange={fld('vn_broker')} /></Inp>
                <Inp label="Order/Note"><input className="input" value={form.order_note} onChange={fld('order_note')} /></Inp>
                <Inp label="Lot Number"><input type="number" className="input" value={form.lot_number} onChange={fld('lot_number')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Inp label="Sale Contract *"><input className="input" value={form.sale_contract} onChange={fld('sale_contract')} placeholder="VD: EX-2025-001" /></Inp>
                <Inp label="Date"><input type="date" className="input" value={form.date} onChange={fld('date')} /></Inp>
                <Inp label="Status">
                  <select className="select" value={form.status} onChange={fld('status')}>
                    <option value="SIGNED">SIGNED</option>
                    <option value="NOT SIGNED">NOT SIGNED</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </Inp>
                <Inp label="Expiry Export Cert (Turkey)"><input type="date" className="input" value={form.expiry_export_cert_turkey} onChange={fld('expiry_export_cert_turkey')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="Seller"><input className="input" value={form.seller} onChange={fld('seller')} /></Inp>
                <Inp label="Buyer 1"><input className="input" value={form.buyer1} onChange={fld('buyer1')} /></Inp>
                <Inp label="Buyer 2"><input className="input" value={form.buyer2} onChange={fld('buyer2')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="COMMODITY"><input className="input" value={form.commodity} onChange={fld('commodity')} /></Inp>
                <Inp label="Qty Commodity"><input type="number" step="0.001" className="input" value={form.qty_commodity} onChange={fld('qty_commodity')} /></Inp>
                <Inp label="Price ($)"><input type="number" step="0.01" className="input" value={form.price} onChange={fld('price')} placeholder="0.00" /></Inp>
                <Inp label="Shipment"><input className="input" value={form.shipment} onChange={fld('shipment')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Packing"><input className="input" value={form.packing} onChange={fld('packing')} /></Inp>
                <UnitInput label="Packing/CTN" value={form.packing_ctn} unit="packing_unit" unitValue={form.packing_unit} onChange={fld('packing_ctn')} onUnitChange={fld('packing_unit')} />
                <Inp label="CTN/CONT"><input type="number" step="0.01" className="input" value={form.ctn_cont} onChange={fld('ctn_cont')} /></Inp>
                <UnitInput label="Quantity" value={form.quantity} unit="quantity_unit" unitValue={form.quantity_unit} onChange={fld('quantity')} onUnitChange={fld('quantity_unit')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-3 rounded-lg">
                <CalcField label="[21] Contract Value = Price × Quantity" value={fmtUSD(c.contractValue)} color="blue" />
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
                <Inp label="Advance Payment ($)"><input type="number" step="0.01" className="input" value={form.advance_payment} onChange={fld('advance_payment')} placeholder="0.00" /></Inp>
                <Inp label="Payment Date 1"><input type="date" className="input" value={form.payment_date1} onChange={fld('payment_date1')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="2nd Payment ($)"><input type="number" step="0.01" className="input" value={form.payment2} onChange={fld('payment2')} placeholder="0.00" /></Inp>
                <Inp label="Payment Date 2"><input type="date" className="input" value={form.payment_date2} onChange={fld('payment_date2')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="3rd Payment ($)"><input type="number" step="0.01" className="input" value={form.payment3} onChange={fld('payment3')} placeholder="0.00" /></Inp>
                <Inp label="Payment Date 3"><input type="date" className="input" value={form.payment_date3} onChange={fld('payment_date3')} /></Inp>
              </div>
              <Inp label="NOTE PAY"><input className="input" value={form.note_pay} onChange={fld('note_pay')} /></Inp>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('booking')} className="btn-secondary">Tiếp: Booking/Shipping <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ③ BOOKING / SHIPPING */}
          {activeTab === 'booking' && (
            <div className="space-y-5">
              <h2 className="font-bold text-violet-700 border-b border-violet-100 pb-2">③ Booking / Vận Chuyển</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Market"><input className="input" value={form.market} onChange={fld('market')} /></Inp>
                <Inp label="CRD"><input className="input" value={form.crd} onChange={fld('crd')} /></Inp>
                <Inp label="Req get BKG"><input className="input" value={form.req_get_bkg} onChange={fld('req_get_bkg')} /></Inp>
                <Inp label="Inspection Date"><input className="input" value={form.inspection_date} onChange={fld('inspection_date')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Loading Date"><input className="input" value={form.loading_date} onChange={fld('loading_date')} /></Inp>
                <Inp label="Supervisor"><input className="input" value={form.supervisor} onChange={fld('supervisor')} /></Inp>
                <Inp label="FWD"><input className="input" value={form.fwd} onChange={fld('fwd')} /></Inp>
                <Inp label="Ocean Freight ($)"><input type="number" step="0.01" className="input" value={form.ocean_freight} onChange={fld('ocean_freight')} /></Inp>
              </div>
              <Inp label="NOTE BOOKING"><input className="input" value={form.note_booking} onChange={fld('note_booking')} /></Inp>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Inp label="POL"><input className="input" value={form.pol} onChange={fld('pol')} /></Inp>
                <Inp label="POD"><input className="input" value={form.pod} onChange={fld('pod')} /></Inp>
                <Inp label="Shipping Line"><input className="input" value={form.shipping_line} onChange={fld('shipping_line')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="ETD"><input type="date" className="input" value={form.etd} onChange={fld('etd')} /></Inp>
                <Inp label="ETA"><input type="date" className="input" value={form.eta} onChange={fld('eta')} /></Inp>
                <div className="flex items-end">
                  <CalcField label="[43] TT Days = ETA − ETD" value={c.ttDays != null ? `${c.ttDays} ngày` : '—'} color="violet" small />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="BKG Details"><input className="input" value={form.bkg_details} onChange={fld('bkg_details')} /></Inp>
                <Inp label="Container/Seal Number"><input className="input" value={form.container_seal} onChange={fld('container_seal')} /></Inp>
                <Inp label="BL/BKG/FREETIME"><input className="input" value={form.bl_bkg_freetime} onChange={fld('bl_bkg_freetime')} /></Inp>
                <Inp label="Seller Invoice Number"><input className="input" value={form.seller_invoice_no} onChange={fld('seller_invoice_no')} /></Inp>
              </div>
              <Inp label="NOTE SHIPPING"><input className="input" value={form.note_shipping} onChange={fld('note_shipping')} /></Inp>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('invoice')} className="btn-secondary">Tiếp: Hàng & Invoice <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ④ HÀNG & INVOICE */}
          {activeTab === 'invoice' && (
            <div className="space-y-5">
              <h2 className="font-bold text-amber-700 border-b border-amber-100 pb-2">④ Chi Tiết Hàng & Invoice Buyer 1</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Commodity"><input className="input" value={form.commodity2} onChange={fld('commodity2')} /></Inp>
                <Inp label="Total Cont"><input type="number" step="0.01" className="input" value={form.total_cont} onChange={fld('total_cont')} /></Inp>
                <Inp label="CTN"><input type="number" step="0.01" className="input" value={form.ctn2} onChange={fld('ctn2')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="GW on B/L (lbs)"><input type="number" step="0.01" className="input" value={form.gw_bl_lbs} onChange={fld('gw_bl_lbs')} /></Inp>
                <Inp label="GW on B/L (kgs)"><input type="number" step="0.01" className="input" value={form.gw_bl_kgs} onChange={fld('gw_bl_kgs')} /></Inp>
                <Inp label="NW on B/L (lbs)"><input type="number" step="0.01" className="input" value={form.nw_bl_lbs} onChange={fld('nw_bl_lbs')} /></Inp>
                <Inp label="NW on B/L (kgs)"><input type="number" step="0.01" className="input" value={form.nw_bl_kgs} onChange={fld('nw_bl_kgs')} /></Inp>
              </div>
              <UnitInput label="NW to pay (chọn đơn vị)" value={form.nw_to_pay} unit="nw_to_pay_unit" unitValue={form.nw_to_pay_unit} onChange={fld('nw_to_pay')} onUnitChange={fld('nw_to_pay_unit')} step="0.001" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Inp label="Less Advance (-) ($)"><input type="number" step="0.01" className="input" value={form.less_advance} onChange={fld('less_advance')} placeholder="0.00 (số âm)" /></Inp>
                <Inp label="Discount (-) ($)"><input type="number" step="0.01" className="input" value={form.discount1} onChange={fld('discount1')} placeholder="0.00 (số âm)" /></Inp>
                <Inp label="Other Fee ($)"><input type="number" step="0.01" className="input" value={form.other_fee1} onChange={fld('other_fee1')} placeholder="0.00 (số âm)" /></Inp>
              </div>
              <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <input type="checkbox" id="inclFee" checked={!!form.include_other_fee} onChange={e => fv('include_other_fee', e.target.checked ? 1 : 0)} className="w-4 h-4" />
                <label htmlFor="inclFee" className="text-sm font-medium text-amber-800">Tính Other Fee (+59) vào công thức Buyer1 Pay Seller</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50 p-3 rounded-lg">
                <CalcField label="[60] Calc Buyer1 Must Pay Seller = Price × NW_to_pay + Less Adv + Discount [+ Other Fee]" value={fmtUSD(c.calcBuyer1PaySeller)} color="amber" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Inp label="[61] Seller Invoice Amount ($)"><input type="number" step="0.01" className="input" value={form.seller_invoice_amount} onChange={fld('seller_invoice_amount')} /></Inp>
                <Inp label="NOTE INVOICE"><input className="input" value={form.note_invoice} onChange={fld('note_invoice')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg">
                <CalcField label="[35] Checking Balance Buyer1 & Seller = 2nd Payment − Seller Invoice" value={fmtUSD(c.checkingBalanceBuyer1Seller)} color={c.checkingBalanceBuyer1Seller >= 0 ? 'green' : 'red'} />
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('insurance')} className="btn-secondary">Tiếp: Bảo Hiểm <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ⑤ BẢO HIỂM */}
          {activeTab === 'insurance' && (
            <div className="space-y-5">
              <h2 className="font-bold text-teal-700 border-b border-teal-100 pb-2">⑤ Bảo Hiểm</h2>
              <p className="text-xs text-slate-400 italic">Lưu ý: Selling Price (field 80) phải được nhập ở tab ⑥ trước khi tính Cargo Value Insured</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="INS Company"><input className="input" value={form.ins_company} onChange={fld('ins_company')} /></Inp>
                <Inp label="INS Fee ($)"><input type="number" step="0.01" className="input" value={form.ins_fee} onChange={fld('ins_fee')} /></Inp>
                <Inp label="% Insured"><input type="number" step="0.01" className="input" value={form.pct_insured} onChange={fld('pct_insured')} placeholder="100" /></Inp>
                <div className="flex items-end">
                  <CalcField label="[67] Cargo Value Insured = %×NW_to_pay×Selling" value={fmtUSD(c.cargoValueInsured)} color="teal" small />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Rate (%)"><input type="number" step="0.0001" className="input" value={form.ins_rate} onChange={fld('ins_rate')} placeholder="0.00" /></Inp>
                <Inp label="VAT (%)"><input type="number" step="0.01" className="input" value={form.ins_vat} onChange={fld('ins_vat')} placeholder="0.00" /></Inp>
                <div className="flex items-end">
                  <CalcField label="[70] INS FEE checking = CVI×Rate×(1+VAT)" value={fmtUSD(c.insFeeChecking)} color="teal" small />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="Exchange Rate (USD→VND)"><input type="number" step="1" className="input" value={form.exchange_rate_usd_vnd} onChange={fld('exchange_rate_usd_vnd')} placeholder="25000" /></Inp>
                <div className="flex items-end">
                  <CalcField label="[72] In VND = INS_checking × Exchange Rate" value={fmtVND(c.insInVnd)} color="teal" small />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="Duration"><input className="input" value={form.ins_duration} onChange={fld('ins_duration')} /></Inp>
                <Inp label="Payment Date"><input type="date" className="input" value={form.ins_payment_date} onChange={fld('ins_payment_date')} /></Inp>
                <Inp label="NOTE INS"><input className="input" value={form.note_ins} onChange={fld('note_ins')} /></Inp>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('dhl_buyer2')} className="btn-secondary">Tiếp: DHL / Buyer2 / Cosmos <ChevronRight size={15}/></button>
              </div>
            </div>
          )}

          {/* ⑥ DHL / BUYER2 / COSMOS / COMMISSION */}
          {activeTab === 'dhl_buyer2' && (
            <div className="space-y-5">
              <h2 className="font-bold text-red-700 border-b border-red-100 pb-2">⑥ DHL / Buyer2 / Cosmos / Commission</h2>

              {/* DHL */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-3">DHL / FedEx</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="DHL/Fedex Number"><input className="input" value={form.dhl_fedex_number} onChange={fld('dhl_fedex_number')} /></Inp>
                  <Inp label="DHL Delivered"><input type="date" className="input" value={form.dhl_delivered} onChange={fld('dhl_delivered')} /></Inp>
                  <Inp label="DHL Fee (VND)"><input type="number" step="1000" className="input" value={form.dhl_fee} onChange={fld('dhl_fee')} /></Inp>
                  <Inp label="NOTE DHL"><input className="input" value={form.note_dhl} onChange={fld('note_dhl')} /></Inp>
                </div>
              </div>

              {/* Buyer2 → Buyer1 */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-bold text-amber-700 mb-3">BUYER 2 → BUYER 1</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="[80] Selling Price ($)"><input type="number" step="0.01" className="input" value={form.selling_price} onChange={fld('selling_price')} placeholder="0.00" /></Inp>
                  <Inp label="MARK UP ($)"><input type="number" step="0.01" className="input" value={form.mark_up} onChange={fld('mark_up')} placeholder="0.00" /></Inp>
                  <Inp label="Discount (-) ($)"><input type="number" step="0.01" className="input" value={form.discount2} onChange={fld('discount2')} placeholder="0.00 (số âm)" /></Inp>
                  <Inp label="Other Fee ($)"><input type="number" step="0.01" className="input" value={form.other_fee2} onChange={fld('other_fee2')} placeholder="0.00" /></Inp>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <CalcField label="[84] Invoice Buyer2→Buyer1 = Sell×NW + INS + OF + MarkUp + Disc + Fee" value={fmtUSD(c.invoiceBuyer2toBuyer1)} color="amber" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Inp label="Amount Buyer2 Paid Buyer1 ($)"><input type="number" step="0.01" className="input" value={form.amount_buyer2_paid} onChange={fld('amount_buyer2_paid')} /></Inp>
                  <Inp label="Payment Date"><input type="date" className="input" value={form.payment_date_buyer2} onChange={fld('payment_date_buyer2')} /></Inp>
                </div>
                <div className="mt-3">
                  <CalcField label="[86] Checking Balance Buyer2–Buyer1 = Paid − Invoice" value={fmtUSD(c.checkingBalanceBuyer2)} color={c.checkingBalanceBuyer2 >= 0 ? 'green' : 'red'} small />
                </div>
              </div>

              {/* COSMOS */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-bold text-blue-700 mb-3">COSMOS</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="[88] Rate ($)"><input type="number" step="0.0001" className="input" value={form.cosmos_rate} onChange={fld('cosmos_rate')} placeholder="0.00" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="[89] COSMOS Pay Back = Rate × NW B/L (lbs)" value={fmtUSD(c.cosmosPay)} color="blue" small />
                  </div>
                  <Inp label="Payment Date"><input type="date" className="input" value={form.cosmos_payment_date} onChange={fld('cosmos_payment_date')} /></Inp>
                  <Inp label="NOTE COS"><input className="input" value={form.note_cos} onChange={fld('note_cos')} /></Inp>
                </div>
              </div>

              {/* COMMISSION */}
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-xs font-bold text-teal-700 mb-3">HOA HỒNG (Commission)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Inp label="[92] Commission ($/LBS)"><input type="number" step="0.0001" className="input" value={form.commission_usd_lbs} onChange={fld('commission_usd_lbs')} placeholder="0.00" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="[93] Amount = Comm × NW B/L (lbs)" value={fmtUSD(c.commAmount)} color="teal" small />
                  </div>
                  <Inp label="[94] Rate of Exchange (VND)"><input type="number" step="1" className="input" value={form.rate_exchange_vnd} onChange={fld('rate_exchange_vnd')} placeholder="25000" /></Inp>
                  <div className="flex items-end">
                    <CalcField label="[95] In VND = Amount × Rate" value={fmtVND(c.commInVnd)} color="teal" small />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Inp label="Payment Date"><input type="date" className="input" value={form.commission_payment_date} onChange={fld('commission_payment_date')} /></Inp>
                  <Inp label="Note COM"><input className="input" value={form.note_com} onChange={fld('note_com')} /></Inp>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setActiveTab('insurance')} className="btn-secondary">← Bảo Hiểm</button>
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
        <h1 className="page-title">📤 Bảng Xuất</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tìm SC, seller, buyer..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-64" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
            <option value="">Tất cả</option>
            <option value="SIGNED">SIGNED</option>
            <option value="NOT SIGNED">NOT SIGNED</option>
          </select>
          <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Nhập mới</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng bản ghi', value: records.length, color: 'blue' },
          { label: 'SIGNED', value: records.filter(r => r.status === 'SIGNED').length, color: 'emerald' },
          { label: 'NOT SIGNED', value: records.filter(r => r.status === 'NOT SIGNED').length, color: 'red' },
          { label: 'Tổng Contract Value', value: fmtUSD(records.reduce((s, r) => s + n(r.price) * n(r.quantity), 0)), color: 'amber' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-lg font-bold mt-1 ${k.color === 'blue' ? 'text-blue-700' : k.color === 'emerald' ? 'text-emerald-700' : k.color === 'red' ? 'text-red-700' : 'text-amber-700'}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Sale Contract</th>
              <th className="table-head">Year / Lot</th>
              <th className="table-head">Staff</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer1</th>
              <th className="table-head">Commodity</th>
              <th className="table-head">Price ($)</th>
              <th className="table-head bg-blue-50 text-blue-700">Contract Value</th>
              <th className="table-head">Status</th>
              <th className="table-head">ETD</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">📤</div>
                <div>Chưa có dữ liệu — <button onClick={openCreate} className="text-blue-600 hover:underline">Nhập mới</button></div>
              </td></tr> :
              records.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                  <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.sale_contract || '—'}</td>
                  <td className="table-cell text-xs"><div>{r.year || '—'}</div><div className="text-slate-400">Lot {r.lot_number || '—'}</div></td>
                  <td className="table-cell text-sm">{r.staff || '—'}</td>
                  <td className="table-cell font-medium">{r.seller || '—'}</td>
                  <td className="table-cell">{r.buyer1 || '—'}</td>
                  <td className="table-cell text-xs">{r.commodity || '—'}</td>
                  <td className="table-cell">{r.price ? fmtUSD(r.price) : '—'}</td>
                  <td className="table-cell bg-blue-50 font-bold text-blue-700">{r.price && r.quantity ? fmtUSD(n(r.price) * n(r.quantity)) : '—'}</td>
                  <td className="table-cell"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status || '—'}</span></td>
                  <td className="table-cell text-xs text-slate-500">{r.etd || '—'}</td>
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
