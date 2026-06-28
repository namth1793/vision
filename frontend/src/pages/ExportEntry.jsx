import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, X, Save, Calculator, ChevronRight, Copy, Filter, ChevronDown, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { toDisplay } from '../utils/dateFormat'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => (v == null || isNaN(v)) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtVND = (v) => (v == null || isNaN(v)) ? '—' : `₫${Number(v).toLocaleString('vi-VN')}`

const EXPORT_STATUSES = [
  'not yet send order',
  'not yet issue contract',
  'not yet signed, no deposit required',
  'signed, no deposit required',
  'not yet signed, not yet deposit',
  'signed & not yet deposit',
  'signed and deposited',
  'pending',
  'cancel',
  'processing',
  'done',
  'other',
]

const STATUS_COLOR = {
  'done': 'bg-emerald-100 text-emerald-700',
  'signed and deposited': 'bg-emerald-100 text-emerald-700',
  'cancel': 'bg-red-100 text-red-700',
  'pending': 'bg-amber-100 text-amber-700',
  'processing': 'bg-blue-100 text-blue-700',
  'signed & not yet deposit': 'bg-violet-100 text-violet-700',
}
const statusBadge = (s) => STATUS_COLOR[s?.toLowerCase()] || 'bg-slate-100 text-slate-600'

function compute(f) {
  const price = n(f.price), qty = n(f.quantity)
  const nwToPay = n(f.nw_to_pay)
  const lessAdv = n(f.less_advance), disc1 = n(f.discount1), fee1 = n(f.other_fee1)
  const sellingPrice = n(f.selling_price)
  const oceanFreight = n(f.ocean_freight)
  const markUp = n(f.mark_up), disc2 = n(f.discount2), fee2 = n(f.other_fee2)
  const lessPre2 = n(f.less_prepayment2)
  const insRate = n(f.ins_rate), insVat = n(f.ins_vat)
  const exRateUsd = n(f.exchange_rate_usd_vnd)
  const cosmosRate = n(f.cosmos_rate)
  const nwBlLbs = n(f.nw_bl_lbs)
  const commUsdLbs = n(f.commission_usd_lbs), rateExVnd = n(f.rate_exchange_vnd)
  const comm2UsdLbs = n(f.commission2_usd_lbs), rateEx2Vnd = n(f.rate_exchange2_vnd)

  let ttDays = 0
  if (f.etd && f.eta) {
    const d = Math.round((new Date(f.eta) - new Date(f.etd)) / 86400000)
    if (!isNaN(d)) ttDays = d
  }

  const contractValue = price * qty
  const calcBuyer1PaySeller = price * nwToPay + lessAdv + disc1 + fee1
  const goodOfValue = nwToPay * sellingPrice
  const insFeeBase = goodOfValue * insRate / 100
  const insFeeChecking = insFeeBase + insFeeBase * insVat / 100
  const insInVnd = insFeeChecking * exRateUsd
  const invoiceBuyer2toBuyer1 = sellingPrice * nwToPay + oceanFreight + markUp + lessPre2 + disc2 + fee2
  const cosmosPay = cosmosRate * nwBlLbs
  const commAmount = commUsdLbs * nwBlLbs
  const commInVnd = commAmount * rateExVnd
  const commAmount2 = comm2UsdLbs * nwBlLbs
  const commInVnd2 = commAmount2 * rateEx2Vnd

  return {
    contractValue, ttDays, calcBuyer1PaySeller, goodOfValue,
    insFeeChecking, insInVnd, invoiceBuyer2toBuyer1,
    cosmosPay, commAmount, commInVnd, commAmount2, commInVnd2,
  }
}

const EMPTY = {
  year: new Date().getFullYear(), staff: '', vn_broker: '', agency: '', order_note: '',
  lot_number: '', sale_contract: '',
  date: '', status: 'signed and deposited', expiry_export_cert_turkey: '',
  seller: '', buyer1: '', buyer2: '',
  commodity: '', qty_commodity: '', cont_type: '20',
  price: '', price_unit: 'USD/LB',
  shipment: '', packing: '', packing_ctn: '', packing_unit: 'kgs', ctn_cont: '', quantity: '', quantity_unit: 'kgs',
  pct1: '', pct2: '', pct3: '',
  advance_payment: '', payment_date1: '', payment2: '', payment_date2: '', payment3: '', payment_date3: '', note_pay: '',
  b2_advance_payment: '', b2_pay_date1: '', b2_payment2: '', b2_pay_date2: '', b2_payment3: '', b2_pay_date3: '', b2_note_pay: '',
  s_advance_payment: '', s_pay_date1: '', s_payment2: '', s_pay_date2: '', s_payment3: '', s_pay_date3: '', s_note_pay: '',
  dhl_fedex_number: '', dhl_delivered: '', dhl_fee: '', dhl_pay_to: '', dhl_payment_date: '', note_dhl: '',
  market: '', crd: '', req_get_bkg: '', inspection_date: '', loading_date: '', supervisor: '', note_donghang: '',
  fwd: '', ocean_freight: '', note_booking: '',
  pol: '', pod: '', shipping_line: '',
  etd: '', eta: '', bkg_details: '', container_seal: '', bl_bkg_freetime: '', seller_invoice_no: '', company_inspection: '', note_shipping: '',
  commodity2: '', total_cont: '', ctn2: '',
  gw_bl_lbs: '', gw_bl_kgs: '', nw_bl_lbs: '', nw_bl_kgs: '',
  nw_to_pay: '', nw_to_pay_unit: 'lbs',
  nw_to_pay_2: '', nw_to_pay_2_unit: 'lbs',
  less_advance: '', discount1: '', other_fee1: '',
  seller_invoice_amount: '', note_invoice: '',
  selling_price: '', mark_up: '', less_prepayment2: '', discount2: '', other_fee2: '', note_invoice2: '',
  ins_company: '', ins_fee: '', pct_insured: '', ins_rate: '', ins_vat: '',
  exchange_rate_usd_vnd: '', ins_duration: '', ins_payment_date: '', note_ins: '',
  cosmos_rate: '', cosmos_other_fee: '', cosmos_payment_date: '', note_cos: '',
  commission_usd_lbs: '', rate_exchange_vnd: '', commission_payment_date: '', note_com: '',
  commission2_usd_lbs: '', rate_exchange2_vnd: '', commission2_payment_date: '', note_com2: '',
}

const TABS = [
  { id: 'contract', label: '① Hợp Đồng', color: 'blue' },
  { id: 'payment', label: '② Thanh Toán', color: 'green' },
  { id: 'booking', label: '③ Booking / Shipping', color: 'violet' },
  { id: 'invoice', label: '④ Hàng & Invoice', color: 'amber' },
  { id: 'insurance', label: '⑤ Bảo Hiểm', color: 'teal' },
  { id: 'cosmos_com', label: '⑥ Cosmos / COM', color: 'red' },
]

const TAB_COLOR = {
  blue: 'border-blue-600 text-blue-700 bg-blue-50',
  green: 'border-emerald-600 text-emerald-700 bg-emerald-50',
  violet: 'border-violet-600 text-violet-700 bg-violet-50',
  amber: 'border-amber-600 text-amber-700 bg-amber-50',
  teal: 'border-teal-600 text-teal-700 bg-teal-50',
  red: 'border-red-600 text-red-700 bg-red-50',
}

function CalcField({ label, value, color = 'blue', note, small, editable, editValue, onEditChange }) {
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
        {editable && <span className="ml-auto text-[10px] text-slate-400 italic">ghi đè</span>}
      </div>
      {editable ? (
        <input type="number" step="0.01" className={`w-full bg-transparent border-0 border-b border-dashed ${cls[color]?.split(' ')[2]} font-bold text-sm outline-none`}
          value={editValue ?? ''} onChange={e => onEditChange(e.target.value)} placeholder={value} />
      ) : (
        <div className={`font-bold ${small ? 'text-sm' : 'text-base'} ${cls[color]?.split(' ')[2]}`}>{value}</div>
      )}
      {note && <div className="text-[10px] text-slate-400 mt-0.5 italic">{note}</div>}
    </div>
  )
}

function Inp({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>
}

function UnitInput({ label, value, unitValue, onChange, onUnitChange, units = ['kgs', 'lbs'], step = '0.01' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1">
        <input type="number" step={step} className="input flex-1" value={value} onChange={onChange} placeholder="0.00" />
        <select className="select w-24" value={unitValue} onChange={onUnitChange}>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </div>
  )
}

function DateInp({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="date" className="input" value={value} onChange={onChange} />
      {value && <p className="text-xs text-slate-400 mt-0.5">{toDisplay(value)}</p>}
    </div>
  )
}

function PayGroup({ title, color, fields, fld }) {
  const bg = { green: 'bg-emerald-50 border-emerald-200', blue: 'bg-blue-50 border-blue-200', violet: 'bg-violet-50 border-violet-200' }
  const tc = { green: 'text-emerald-700', blue: 'text-blue-700', violet: 'text-violet-700' }
  return (
    <div className={`p-4 rounded-lg border ${bg[color] || bg.green}`}>
      <p className={`text-xs font-bold mb-3 ${tc[color] || tc.green}`}>{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Inp label="1st Payment ($)"><input type="number" step="0.01" className="input" value={fields.adv} onChange={fld('adv')} placeholder="0.00" /></Inp>
        <DateInp label="Payment Date" value={fields.d1} onChange={fld('d1')} />
        <Inp label="2nd Payment ($)"><input type="number" step="0.01" className="input" value={fields.p2} onChange={fld('p2')} placeholder="0.00" /></Inp>
        <DateInp label="Payment Date 2" value={fields.d2} onChange={fld('d2')} />
        <Inp label="3rd Payment ($)"><input type="number" step="0.01" className="input" value={fields.p3} onChange={fld('p3')} placeholder="0.00" /></Inp>
        <DateInp label="Payment Date 3" value={fields.d3} onChange={fld('d3')} />
      </div>
      <div className="mt-3">
        <Inp label="NOTE PAY"><input className="input" value={fields.note} onChange={fld('note')} /></Inp>
      </div>
    </div>
  )
}

function ColFilter({ label, values, active, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const unique = [...new Set(values.filter(Boolean))].sort()
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}>
        {label} <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-56 overflow-y-auto">
          <button onClick={() => { onChange(''); setOpen(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-500">— Tất cả —</button>
          {unique.map(v => (
            <button key={v} onClick={() => { onChange(v); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 ${active === v ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}>
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── VIEW DETAIL ──────────────────────────────────────────────────────────────
function ViewDetail({ record, onBack, onEdit }) {
  const vc = compute(record)
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
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="btn-secondary"><X size={15}/> Quay lại</button>
        <button onClick={() => onEdit(record)} className="btn-primary"><Pencil size={15}/> Chỉnh sửa</button>
        <h1 className="page-title ml-2">📤 Chi tiết: {record.sale_contract || '—'}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Sec title="① Hợp Đồng" color="border-blue-500">
          <Row label="Year / Lot" value={`${record.year || '—'} / ${record.lot_number || '—'}`} />
          <Row label="Staff" value={record.staff} />
          <Row label="VN Broker" value={record.vn_broker} />
          <Row label="Agency" value={record.agency} />
          <Row label="Order/Note" value={record.order_note} />
          <Row label="Sale Contract" value={<strong>{record.sale_contract}</strong>} />
          <Row label="Date" value={toDisplay(record.date)} />
          <Row label="Status" value={record.status} />
          <Row label="Expiry Export Cert (Turkey)" value={toDisplay(record.expiry_export_cert_turkey)} />
          <Row label="Seller" value={record.seller} />
          <Row label="Buyer 1" value={record.buyer1} />
          <Row label="Buyer 2" value={record.buyer2} />
          <Row label="Commodity" value={record.commodity} />
          <Row label="Qty Commodity" value={`${record.qty_commodity || '—'} (${record.cont_type || '20'}' cont)`} />
          <Row label="Price" value={`${record.price} ${record.price_unit || 'USD/LB'}`} />
          <Row label="Shipment" value={record.shipment} />
          <Row label="Packing" value={record.packing} />
          <Row label="Packing/CTN" value={`${record.packing_ctn || '—'} ${record.packing_unit || ''}`} />
          <Row label="CTN/CONT" value={record.ctn_cont} />
          <Row label="Quantity" value={`${record.quantity || '—'} ${record.quantity_unit || ''}`} />
          <Row label="✦ Contract Value" value={fmtUSD(vc.contractValue)} isCalc />
          <Row label="1st / 2nd / 3rd %" value={`${record.pct1 || '—'}% / ${record.pct2 || '—'}% / ${record.pct3 || '—'}%`} />
        </Sec>
        <Sec title="② Thanh Toán — Group 1" color="border-emerald-500">
          <Row label="1st Payment ($)" value={fmtUSD(record.advance_payment)} />
          <Row label="Payment Date 1" value={toDisplay(record.payment_date1)} />
          <Row label="2nd Payment ($)" value={fmtUSD(record.payment2)} />
          <Row label="Payment Date 2" value={toDisplay(record.payment_date2)} />
          <Row label="3rd Payment ($)" value={fmtUSD(record.payment3)} />
          <Row label="Payment Date 3" value={toDisplay(record.payment_date3)} />
          <Row label="NOTE PAY" value={record.note_pay} />
          <Row label="— Group 2 1st Payment" value={fmtUSD(record.b2_advance_payment)} />
          <Row label="— Group 2 2nd Payment" value={fmtUSD(record.b2_payment2)} />
          <Row label="— Group 2 3rd Payment" value={fmtUSD(record.b2_payment3)} />
          <Row label="— Group 3 1st Payment" value={fmtUSD(record.s_advance_payment)} />
          <Row label="— Group 3 2nd Payment" value={fmtUSD(record.s_payment2)} />
          <Row label="— Group 3 3rd Payment" value={fmtUSD(record.s_payment3)} />
        </Sec>
        <Sec title="③ DHL / Booking / Vận Chuyển" color="border-violet-500">
          <Row label="DHL/Fedex Number" value={record.dhl_fedex_number} />
          <Row label="DHL Delivered" value={toDisplay(record.dhl_delivered)} />
          <Row label="DHL Fee (VND)" value={record.dhl_fee} />
          <Row label="POL / POD" value={`${record.pol || '—'} / ${record.pod || '—'}`} />
          <Row label="Shipping Line" value={record.shipping_line} />
          <Row label="ETD" value={toDisplay(record.etd)} />
          <Row label="ETA" value={toDisplay(record.eta)} />
          <Row label="✦ TT Days" value={`${vc.ttDays} ngày`} isCalc />
          <Row label="Ocean Freight ($)" value={fmtUSD(record.ocean_freight)} />
          <Row label="Container/Seal" value={record.container_seal} />
          <Row label="BL/BKG Number" value={record.bl_bkg_freetime} />
          <Row label="Company Inspection" value={record.company_inspection} />
        </Sec>
        <Sec title="④ Hàng & Invoice" color="border-amber-500">
          <Row label="NW on B/L (lbs)" value={record.nw_bl_lbs} />
          <Row label="NW on B/L (kgs)" value={record.nw_bl_kgs} />
          <Row label={`NW to pay (${record.nw_to_pay_unit || 'lbs'})`} value={record.nw_to_pay} />
          <Row label="Less Prepayment (-)" value={fmtUSD(record.less_advance)} />
          <Row label="✦ Calc Buyer1 Pay Seller" value={fmtUSD(vc.calcBuyer1PaySeller)} isCalc />
          <Row label="Selling Price ($)" value={fmtUSD(record.selling_price)} />
          <Row label="✦ Invoice Buyer2→Buyer1" value={fmtUSD(vc.invoiceBuyer2toBuyer1)} isCalc />
        </Sec>
        <Sec title="⑤ Bảo Hiểm" color="border-teal-500">
          <Row label="INS Company" value={record.ins_company} />
          <Row label="INS Fee ($)" value={fmtUSD(record.ins_fee)} />
          <Row label="% Insured" value={record.pct_insured ? `${record.pct_insured}%` : '—'} />
          <Row label="✦ Good of Value" value={fmtUSD(vc.goodOfValue)} isCalc />
          <Row label="Rate (%)" value={record.ins_rate} />
          <Row label="VAT (%)" value={record.ins_vat} />
          <Row label="✦ INS FEE checking" value={fmtUSD(vc.insFeeChecking)} isCalc />
          <Row label="✦ In VND" value={fmtVND(vc.insInVnd)} isCalc />
          <Row label="Payment Date" value={toDisplay(record.ins_payment_date)} />
        </Sec>
        <Sec title="⑥ Cosmos / Commission" color="border-red-500">
          <Row label="COSMOS Rate ($)" value={fmtUSD(record.cosmos_rate)} />
          <Row label="✦ COSMOS Pay Back" value={fmtUSD(vc.cosmosPay)} isCalc />
          <Row label="COM1 ($/LBS)" value={fmtUSD(record.commission_usd_lbs)} />
          <Row label="✦ COM1 Amount" value={fmtUSD(vc.commAmount)} isCalc />
          <Row label="✦ COM1 In VND" value={fmtVND(vc.commInVnd)} isCalc />
          <Row label="COM2 ($/LBS)" value={fmtUSD(record.commission2_usd_lbs)} />
          <Row label="✦ COM2 Amount" value={fmtUSD(vc.commAmount2)} isCalc />
          <Row label="✦ COM2 In VND" value={fmtVND(vc.commInVnd2)} isCalc />
        </Sec>
      </div>
    </div>
  )
}

// ── FORM ─────────────────────────────────────────────────────────────────────
function EntryForm({ editId, form, setForm, onSave, onCancel, saving }) {
  const [activeTab, setActiveTab] = useState('contract')
  const [loadingTurkey, setLoadingTurkey] = useState(false)
  const c = compute(form)
  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))
  const fv = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const lookupTurkey = async () => {
    if (!form.seller) { toast.error('Nhập tên Seller trước'); return }
    setLoadingTurkey(true)
    try {
      const res = await api.get(`/gpxk-turkey/lookup/${encodeURIComponent(form.seller)}`)
      if (res.data) {
        setForm(p => ({ ...p, expiry_export_cert_turkey: res.data.expiry_date || '' }))
        toast.success(`Tìm thấy: hết hạn ${toDisplay(res.data.expiry_date)}`)
      } else {
        setForm(p => ({ ...p, expiry_export_cert_turkey: '' }))
        toast('Chưa có thông tin GPXK Thổ Nhĩ Kỳ cho Seller này', { icon: 'ℹ️' })
      }
    } catch { toast.error('Lỗi tra cứu') }
    finally { setLoadingTurkey(false) }
  }

  const hasAdv1 = n(form.advance_payment) !== 0
  const hasAdv2 = n(form.b2_advance_payment) !== 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">📤 {editId ? 'Chỉnh sửa' : 'Nhập mới'} — Bảng Xuất {form.sale_contract && `(${form.sale_contract})`}</h1>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary"><X size={15}/> Hủy</button>
          <button onClick={onSave} disabled={saving} className="btn-primary"><Save size={15}/> {saving ? 'Đang lưu...' : 'Lưu'}</button>
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Inp label="Year"><input type="number" className="input" value={form.year} onChange={fld('year')} /></Inp>
              <Inp label="Staff"><input className="input" value={form.staff} onChange={fld('staff')} /></Inp>
              <Inp label="VN Broker"><input className="input" value={form.vn_broker} onChange={fld('vn_broker')} /></Inp>
              <Inp label="Agency"><input className="input" value={form.agency} onChange={fld('agency')} /></Inp>
              <Inp label="Order/Note"><input className="input" value={form.order_note} onChange={fld('order_note')} /></Inp>
              <Inp label="Lot Number"><input type="number" className="input" value={form.lot_number} onChange={fld('lot_number')} /></Inp>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Inp label="Sale Contract *"><input className="input" value={form.sale_contract} onChange={fld('sale_contract')} placeholder="VD: EX-2025-001" /></Inp>
              <DateInp label="Date" value={form.date} onChange={fld('date')} />
              <Inp label="Status">
                <select className="select" value={form.status} onChange={fld('status')}>
                  {EXPORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Inp>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <DateInp label="Expiry date of Export Cert to Turkey" value={form.expiry_export_cert_turkey} onChange={fld('expiry_export_cert_turkey')} />
              <div className="flex gap-2 items-end pb-1">
                <button onClick={lookupTurkey} disabled={loadingTurkey} className="btn-secondary text-sm">
                  {loadingTurkey ? '...' : '🔍 Tra cứu GPXK Turkey theo Seller'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Inp label="Seller"><input className="input" value={form.seller} onChange={fld('seller')} /></Inp>
              <Inp label="Buyer 1"><input className="input" value={form.buyer1} onChange={fld('buyer1')} /></Inp>
              <Inp label="Buyer 2"><input className="input" value={form.buyer2} onChange={fld('buyer2')} /></Inp>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Inp label="COMMODITY"><input className="input" value={form.commodity} onChange={fld('commodity')} /></Inp>
              <div>
                <label className="label">Quantity Commodity + Loại cont</label>
                <div className="flex gap-1">
                  <input type="number" step="0.001" className="input flex-1" value={form.qty_commodity} onChange={fld('qty_commodity')} placeholder="0.000" />
                  <select className="select w-20" value={form.cont_type} onChange={fld('cont_type')}>
                    <option value="20">20'</option>
                    <option value="40">40'</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Price + Đơn vị</label>
                <div className="flex gap-1">
                  <input type="number" step="0.0001" className="input flex-1" value={form.price} onChange={fld('price')} placeholder="0.00" />
                  <select className="select w-28" value={form.price_unit} onChange={fld('price_unit')}>
                    <option value="$/lbs">$/lbs</option>
                    <option value="$/kgs">$/kgs</option>
                    <option value="USD/LB">USD/LB</option>
                    <option value="USD/KG">USD/KG</option>
                    <option value="USD/MT">USD/MT</option>
                  </select>
                </div>
              </div>
              <Inp label="Shipment"><input className="input" value={form.shipment} onChange={fld('shipment')} /></Inp>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Inp label="Packing"><input className="input" value={form.packing} onChange={fld('packing')} /></Inp>
              <UnitInput label="Packing/CTN" value={form.packing_ctn} unitValue={form.packing_unit}
                onChange={fld('packing_ctn')} onUnitChange={fld('packing_unit')} />
              <Inp label="CTN/CONT"><input type="number" step="0.01" className="input" value={form.ctn_cont} onChange={fld('ctn_cont')} /></Inp>
              <UnitInput label="Quantity" value={form.quantity} unitValue={form.quantity_unit}
                onChange={fld('quantity')} onUnitChange={fld('quantity_unit')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-3 rounded-lg">
              <CalcField label="Contract Value = Price × Quantity" value={fmtUSD(c.contractValue)} color="blue" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Inp label="1st (%)"><input type="number" step="0.01" className="input" value={form.pct1} onChange={fld('pct1')} placeholder="0.00" /></Inp>
              <Inp label="2nd (%)"><input type="number" step="0.01" className="input" value={form.pct2} onChange={fld('pct2')} placeholder="0.00" /></Inp>
              <Inp label="3rd (%)"><input type="number" step="0.01" className="input" value={form.pct3} onChange={fld('pct3')} placeholder="0.00" /></Inp>
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

            <PayGroup title="PAYMENT GROUP 1" color="green"
              fields={{ adv: form.advance_payment, d1: form.payment_date1, p2: form.payment2, d2: form.payment_date2, p3: form.payment3, d3: form.payment_date3, note: form.note_pay }}
              fld={(k) => (e) => {
                const map = { adv: 'advance_payment', d1: 'payment_date1', p2: 'payment2', d2: 'payment_date2', p3: 'payment3', d3: 'payment_date3', note: 'note_pay' }
                setForm(p => ({ ...p, [map[k]]: e.target.value }))
              }}
            />

            <PayGroup title="PAYMENT GROUP 2" color="blue"
              fields={{ adv: form.b2_advance_payment, d1: form.b2_pay_date1, p2: form.b2_payment2, d2: form.b2_pay_date2, p3: form.b2_payment3, d3: form.b2_pay_date3, note: form.b2_note_pay }}
              fld={(k) => (e) => {
                const map = { adv: 'b2_advance_payment', d1: 'b2_pay_date1', p2: 'b2_payment2', d2: 'b2_pay_date2', p3: 'b2_payment3', d3: 'b2_pay_date3', note: 'b2_note_pay' }
                setForm(p => ({ ...p, [map[k]]: e.target.value }))
              }}
            />

            <PayGroup title="PAYMENT GROUP 3" color="violet"
              fields={{ adv: form.s_advance_payment, d1: form.s_pay_date1, p2: form.s_payment2, d2: form.s_pay_date2, p3: form.s_payment3, d3: form.s_pay_date3, note: form.s_note_pay }}
              fld={(k) => (e) => {
                const map = { adv: 's_advance_payment', d1: 's_pay_date1', p2: 's_payment2', d2: 's_pay_date2', p3: 's_payment3', d3: 's_pay_date3', note: 's_note_pay' }
                setForm(p => ({ ...p, [map[k]]: e.target.value }))
              }}
            />

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveTab('booking')} className="btn-secondary">Tiếp: Booking/Shipping <ChevronRight size={15}/></button>
            </div>
          </div>
        )}

        {/* ③ BOOKING / SHIPPING */}
        {activeTab === 'booking' && (
          <div className="space-y-5">
            <h2 className="font-bold text-violet-700 border-b border-violet-100 pb-2">③ Booking / Vận Chuyển</h2>

            {/* DHL */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-600 mb-3">DHL / FedEx</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Inp label="DHL/Fedex Number"><input className="input" value={form.dhl_fedex_number} onChange={fld('dhl_fedex_number')} /></Inp>
                <DateInp label="DHL Delivered Date" value={form.dhl_delivered} onChange={fld('dhl_delivered')} />
                <Inp label="DHL FEE (VND)"><input type="number" step="1000" className="input" value={form.dhl_fee} onChange={fld('dhl_fee')} /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                <Inp label="PAY TO"><input className="input" value={form.dhl_pay_to} onChange={fld('dhl_pay_to')} /></Inp>
                <DateInp label="DHL Payment Date" value={form.dhl_payment_date} onChange={fld('dhl_payment_date')} />
                <Inp label="NOTE DHL"><input className="input" value={form.note_dhl} onChange={fld('note_dhl')} /></Inp>
              </div>
            </div>

            {/* Booking */}
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
              <p className="text-xs font-bold text-violet-700 mb-3">BOOKING</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Market"><input className="input" value={form.market} onChange={fld('market')} /></Inp>
                <DateInp label="CRD" value={form.crd} onChange={fld('crd')} />
                <DateInp label="Req get BKG" value={form.req_get_bkg} onChange={fld('req_get_bkg')} />
                <DateInp label="Inspection Date" value={form.inspection_date} onChange={fld('inspection_date')} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <DateInp label="Loading Date" value={form.loading_date} onChange={fld('loading_date')} />
                <Inp label="Supervisor"><input className="input" value={form.supervisor} onChange={fld('supervisor')} /></Inp>
                <Inp label="NOTE DONGHANG"><input className="input" value={form.note_donghang} onChange={fld('note_donghang')} /></Inp>
                <Inp label="FWD"><input className="input" value={form.fwd} onChange={fld('fwd')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Inp label="Ocean Freight ($)"><input type="number" step="0.01" className="input" value={form.ocean_freight} onChange={fld('ocean_freight')} /></Inp>
                <Inp label="NOTE BOOKING"><input className="input" value={form.note_booking} onChange={fld('note_booking')} /></Inp>
              </div>
            </div>

            {/* Shipping */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 mb-3">SHIPPING</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Inp label="POL"><input className="input" value={form.pol} onChange={fld('pol')} /></Inp>
                <Inp label="POD"><input className="input" value={form.pod} onChange={fld('pod')} /></Inp>
                <Inp label="Shipping Line"><input className="input" value={form.shipping_line} onChange={fld('shipping_line')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <DateInp label="ETD" value={form.etd} onChange={fld('etd')} />
                <DateInp label="ETA" value={form.eta} onChange={fld('eta')} />
                <div className="flex items-end">
                  <CalcField label="TT Days = ETA − ETD" value={`${c.ttDays} ngày`} color="blue" small />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <Inp label="BKG Details"><input className="input" value={form.bkg_details} onChange={fld('bkg_details')} /></Inp>
                <Inp label="Container/Seal Number"><input className="input" value={form.container_seal} onChange={fld('container_seal')} /></Inp>
                <Inp label="BL/BKG/FREETIME"><input className="input" value={form.bl_bkg_freetime} onChange={fld('bl_bkg_freetime')} /></Inp>
                <Inp label="Seller Invoice Number"><input className="input" value={form.seller_invoice_no} onChange={fld('seller_invoice_no')} /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Inp label="Company Inspection"><input className="input" value={form.company_inspection} onChange={fld('company_inspection')} /></Inp>
                <Inp label="NOTE SHIPPING"><input className="input" value={form.note_shipping} onChange={fld('note_shipping')} /></Inp>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveTab('invoice')} className="btn-secondary">Tiếp: Hàng & Invoice <ChevronRight size={15}/></button>
            </div>
          </div>
        )}

        {/* ④ HÀNG & INVOICE */}
        {activeTab === 'invoice' && (
          <div className="space-y-5">
            <h2 className="font-bold text-amber-700 border-b border-amber-100 pb-2">④ Chi Tiết Hàng & Invoice</h2>

            {/* Hàng */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Inp label="Commodity"><input className="input" value={form.commodity2} onChange={fld('commodity2')} /></Inp>
              <Inp label="Total Cont (cont)"><input type="number" step="1" className="input" value={form.total_cont} onChange={fld('total_cont')} /></Inp>
              <Inp label="CTN"><input type="number" step="1" className="input" value={form.ctn2} onChange={fld('ctn2')} /></Inp>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Inp label="GW on B/L (lbs)"><input type="number" step="0.01" className="input" value={form.gw_bl_lbs} onChange={fld('gw_bl_lbs')} /></Inp>
              <Inp label="GW on B/L (kgs)"><input type="number" step="0.01" className="input" value={form.gw_bl_kgs} onChange={fld('gw_bl_kgs')} /></Inp>
              <Inp label="NW on B/L (lbs)"><input type="number" step="0.01" className="input" value={form.nw_bl_lbs} onChange={fld('nw_bl_lbs')} /></Inp>
              <Inp label="NW on B/L (kgs)"><input type="number" step="0.01" className="input" value={form.nw_bl_kgs} onChange={fld('nw_bl_kgs')} /></Inp>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UnitInput label="NW to pay" value={form.nw_to_pay} unitValue={form.nw_to_pay_unit}
                onChange={fld('nw_to_pay')} onUnitChange={fld('nw_to_pay_unit')} step="0.001" />
              <UnitInput label="NW to pay (2)" value={form.nw_to_pay_2} unitValue={form.nw_to_pay_2_unit}
                onChange={fld('nw_to_pay_2')} onUnitChange={fld('nw_to_pay_2_unit')} step="0.001" />
            </div>

            {/* Invoice Buyer1 → Seller */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-bold text-amber-700 mb-3">INVOICE — BUYER 1 MUST PAY SELLER</p>
              {hasAdv1 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                  <span className="text-xs text-orange-700 font-medium">⚠️ Phải trừ cọc — Group 1 có 1st Payment: {fmtUSD(form.advance_payment)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Inp label="Less Prepayment (-) ($)"><input type="number" step="0.01" className="input" value={form.less_advance} onChange={fld('less_advance')} placeholder="0.00 (số âm)" /></Inp>
                <Inp label="Discount (-) ($)"><input type="number" step="0.01" className="input" value={form.discount1} onChange={fld('discount1')} placeholder="0.00 (số âm)" /></Inp>
                <Inp label="Other Fee ($)"><input type="number" step="0.01" className="input" value={form.other_fee1} onChange={fld('other_fee1')} placeholder="0.00 (+/-)" /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CalcField label="Calculate Buyer 1 Must Pay Seller = Price × NW to pay + Less Prepayment + Discount + Other Fee"
                  value={fmtUSD(c.calcBuyer1PaySeller)} color="amber"
                  editable editValue={form._override_buyer1pay} onEditChange={v => fv('_override_buyer1pay', v)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Inp label="Seller Invoice Amount ($)"><input type="number" step="0.01" className="input" value={form.seller_invoice_amount} onChange={fld('seller_invoice_amount')} /></Inp>
                <Inp label="NOTE INVOICE"><input className="input" value={form.note_invoice} onChange={fld('note_invoice')} /></Inp>
              </div>
            </div>

            {/* Invoice Buyer2 → Buyer1 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 mb-3">INVOICE — BUYER 2 → BUYER 1</p>
              {hasAdv2 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                  <span className="text-xs text-orange-700 font-medium">⚠️ Phải trừ cọc — Group 2 có 1st Payment: {fmtUSD(form.b2_advance_payment)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Selling Price ($)"><input type="number" step="0.0001" className="input" value={form.selling_price} onChange={fld('selling_price')} /></Inp>
                <Inp label="MARK UP OF ($)"><input type="number" step="0.01" className="input" value={form.mark_up} onChange={fld('mark_up')} /></Inp>
                <Inp label="Less Prepayment (-) ($)"><input type="number" step="0.01" className="input" value={form.less_prepayment2} onChange={fld('less_prepayment2')} placeholder="0.00 (số âm)" /></Inp>
                <Inp label="Discount (-) ($)"><input type="number" step="0.01" className="input" value={form.discount2} onChange={fld('discount2')} placeholder="0.00 (số âm)" /></Inp>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <Inp label="Other Fee ($)"><input type="number" step="0.01" className="input" value={form.other_fee2} onChange={fld('other_fee2')} placeholder="0.00 (+/-)" /></Inp>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CalcField label="Invoice Buyer2→Buyer1 = Selling Price × NW to pay + Ocean Freight + Mark Up + Less Prepayment + Discount + Other Fee"
                  value={fmtUSD(c.invoiceBuyer2toBuyer1)} color="blue"
                  editable editValue={form._override_inv2} onEditChange={v => fv('_override_inv2', v)} />
              </div>
              <div className="mt-3">
                <Inp label="NOTE INVOICE 2"><input className="input" value={form.note_invoice2} onChange={fld('note_invoice2')} /></Inp>
              </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Inp label="INS Company"><input className="input" value={form.ins_company} onChange={fld('ins_company')} /></Inp>
              <Inp label="INS Fee ($)"><input type="number" step="0.01" className="input" value={form.ins_fee} onChange={fld('ins_fee')} /></Inp>
              <Inp label="Percentage Insured (%)"><input type="number" step="0.01" className="input" value={form.pct_insured} onChange={fld('pct_insured')} placeholder="100" /></Inp>
              <div className="flex items-end">
                <CalcField label="Good of Value = NW to pay × Selling Price" value={fmtUSD(c.goodOfValue)} color="teal" small />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Inp label="Rate (%)"><input type="number" step="0.0001" className="input" value={form.ins_rate} onChange={fld('ins_rate')} placeholder="0.00" /></Inp>
              <Inp label="VAT (%)"><input type="number" step="0.01" className="input" value={form.ins_vat} onChange={fld('ins_vat')} placeholder="0.00" /></Inp>
              <div className="flex items-end col-span-2">
                <CalcField label="INS FEE checking = Good of Value × Rate + (Good of Value × Rate) × VAT"
                  value={fmtUSD(c.insFeeChecking)} color="teal" small
                  editable editValue={form._override_insfee} onEditChange={v => fv('_override_insfee', v)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Inp label="Exchange Rate (USD→VND)"><input type="number" step="1" className="input" value={form.exchange_rate_usd_vnd} onChange={fld('exchange_rate_usd_vnd')} placeholder="25000" /></Inp>
              <div className="flex items-end">
                <CalcField label="In VND = INS FEE checking × Exchange Rate" value={fmtVND(c.insInVnd)} color="teal" small
                  editable editValue={form._override_insvnd} onEditChange={v => fv('_override_insvnd', v)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Inp label="Duration"><input className="input" value={form.ins_duration} onChange={fld('ins_duration')} /></Inp>
              <DateInp label="INS Payment Date" value={form.ins_payment_date} onChange={fld('ins_payment_date')} />
              <Inp label="NOTE INS"><input className="input" value={form.note_ins} onChange={fld('note_ins')} /></Inp>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveTab('cosmos_com')} className="btn-secondary">Tiếp: Cosmos / COM <ChevronRight size={15}/></button>
            </div>
          </div>
        )}

        {/* ⑥ COSMOS & COMMISSION */}
        {activeTab === 'cosmos_com' && (
          <div className="space-y-5">
            <h2 className="font-bold text-red-700 border-b border-red-100 pb-2">⑥ Cosmos & Commission</h2>

            {/* COSMOS */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 mb-3">COSMOS PAY BACK MS NHI</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Rate ($)"><input type="number" step="0.0001" className="input" value={form.cosmos_rate} onChange={fld('cosmos_rate')} /></Inp>
                <div className="flex items-end">
                  <CalcField label="COSMOS Pay Back = Rate × NW on B/L (lbs)" value={fmtUSD(c.cosmosPay)} color="blue" small
                    editable editValue={form._override_cosmos} onEditChange={v => fv('_override_cosmos', v)} />
                </div>
                <Inp label="Other Fee ($)"><input type="number" step="0.01" className="input" value={form.cosmos_other_fee} onChange={fld('cosmos_other_fee')} placeholder="0.00" /></Inp>
                <DateInp label="Payment Date" value={form.cosmos_payment_date} onChange={fld('cosmos_payment_date')} />
              </div>
              <div className="mt-3">
                <Inp label="NOTE COS"><input className="input" value={form.note_cos} onChange={fld('note_cos')} /></Inp>
              </div>
            </div>

            {/* COMMISSION 1 */}
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-xs font-bold text-teal-700 mb-3">HOA HỒNG 1 (COM1)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Commission ($/LBS)"><input type="number" step="0.0001" className="input" value={form.commission_usd_lbs} onChange={fld('commission_usd_lbs')} /></Inp>
                <div className="flex items-end">
                  <CalcField label="Amount = Commission × NW on B/L (lbs)" value={fmtUSD(c.commAmount)} color="teal" small
                    editable editValue={form._override_comm} onEditChange={v => fv('_override_comm', v)} />
                </div>
                <Inp label="Rate of Exchange (VND)"><input type="number" step="1" className="input" value={form.rate_exchange_vnd} onChange={fld('rate_exchange_vnd')} placeholder="25000" /></Inp>
                <div className="flex items-end">
                  <CalcField label="In VND = Amount × Rate" value={fmtVND(c.commInVnd)} color="teal" small
                    editable editValue={form._override_commvnd} onEditChange={v => fv('_override_commvnd', v)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <DateInp label="Payment Date" value={form.commission_payment_date} onChange={fld('commission_payment_date')} />
                <Inp label="Note COM1"><input className="input" value={form.note_com} onChange={fld('note_com')} /></Inp>
              </div>
            </div>

            {/* COMMISSION 2 */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-700 mb-3">HOA HỒNG 2 (COM2)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Inp label="Commission ($/LBS)"><input type="number" step="0.0001" className="input" value={form.commission2_usd_lbs} onChange={fld('commission2_usd_lbs')} /></Inp>
                <div className="flex items-end">
                  <CalcField label="Amount = Commission × NW on B/L (lbs)" value={fmtUSD(c.commAmount2)} color="blue" small
                    editable editValue={form._override_comm2} onEditChange={v => fv('_override_comm2', v)} />
                </div>
                <Inp label="Rate of Exchange (VND)"><input type="number" step="1" className="input" value={form.rate_exchange2_vnd} onChange={fld('rate_exchange2_vnd')} placeholder="25000" /></Inp>
                <div className="flex items-end">
                  <CalcField label="In VND = Amount × Rate" value={fmtVND(c.commInVnd2)} color="blue" small
                    editable editValue={form._override_comm2vnd} onEditChange={v => fv('_override_comm2vnd', v)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <DateInp label="Payment Date" value={form.commission2_payment_date} onChange={fld('commission2_payment_date')} />
                <Inp label="Note COM2"><input className="input" value={form.note_com2} onChange={fld('note_com2')} /></Inp>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => setActiveTab('insurance')} className="btn-secondary">← Bảo Hiểm</button>
              <button onClick={onSave} disabled={saving} className="btn-primary"><Save size={15}/> {saving ? 'Đang lưu...' : '💾 Lưu toàn bộ'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN EXPORT LIST ─────────────────────────────────────────────────────────
export default function ExportEntry() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterBuyer1, setFilterBuyer1] = useState('')
  const [filterCommodity, setFilterCommodity] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [viewRecord, setViewRecord] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    api.get('/export-records', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditId(r.id); setShowForm(true) }
  const openCopy = (r) => {
    const copy = { ...EMPTY, ...r, id: undefined,
      lot_number: (Number(r.lot_number) || 1) + 1,
      advance_payment: '', payment_date1: '', payment2: '', payment_date2: '', payment3: '', payment_date3: '',
      b2_advance_payment: '', b2_pay_date1: '', b2_payment2: '', b2_pay_date2: '', b2_payment3: '', b2_pay_date3: '',
      s_advance_payment: '', s_pay_date1: '', s_payment2: '', s_pay_date2: '', s_payment3: '', s_pay_date3: '',
      etd: '', eta: '', bl_bkg_freetime: '', container_seal: '', bkg_details: '',
      dhl_fedex_number: '', dhl_delivered: '', dhl_payment_date: '', ins_payment_date: '',
      status: 'signed and deposited',
    }
    setForm(copy); setEditId(null); setShowForm(true)
    toast('Đã copy bản ghi — đang tạo Lot mới', { icon: '📋' })
  }
  const openView = async (r) => { const res = await api.get(`/export-records/${r.id}`); setViewRecord(res.data) }

  const save = async () => {
    if (!form.sale_contract) { toast.error('Vui lòng nhập Sale Contract'); return }
    setSaving(true)
    const payload = { ...form }
    Object.keys(payload).filter(k => k.startsWith('_override_')).forEach(k => delete payload[k])
    try {
      if (editId) await api.put(`/export-records/${editId}`, payload)
      else await api.post('/export-records', payload)
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

  if (viewRecord) return <ViewDetail record={viewRecord} onBack={() => setViewRecord(null)} onEdit={(r) => { openEdit(r); setViewRecord(null) }} />
  if (showForm) return <EntryForm editId={editId} form={form} setForm={setForm} onSave={save} onCancel={() => setShowForm(false)} saving={saving} />

  const nv = (v) => parseFloat(v) || 0
  const filtered = records.filter(r => {
    if (filterYear && String(r.year) !== filterYear) return false
    if (filterSeller && r.seller !== filterSeller) return false
    if (filterBuyer1 && r.buyer1 !== filterBuyer1) return false
    if (filterCommodity && r.commodity !== filterCommodity) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="page-title">📤 Bảng Xuất</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tìm SC, seller, buyer..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-64" />
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Nhập mới</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Tổng bản ghi', value: records.length, color: 'text-blue-700' },
          { label: 'Signed & Deposited', value: records.filter(r => r.status === 'signed and deposited').length, color: 'text-emerald-700' },
          { label: 'Processing', value: records.filter(r => r.status === 'processing').length, color: 'text-blue-700' },
          { label: 'Cancel', value: records.filter(r => r.status === 'cancel').length, color: 'text-red-700' },
          { label: 'Contract Value', value: `$${records.reduce((s,r) => s + nv(r.price)*nv(r.quantity), 0).toLocaleString('en-US',{maximumFractionDigits:0})}`, color: 'text-amber-700' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center p-3 border-b border-slate-100 bg-slate-50">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Lọc theo:</span>
          <ColFilter label="Year" values={records.map(r => String(r.year))} active={filterYear} onChange={setFilterYear} />
          <ColFilter label="Status" values={records.map(r => r.status)} active={filterStatus} onChange={setFilterStatus} />
          <ColFilter label="Seller" values={records.map(r => r.seller)} active={filterSeller} onChange={setFilterSeller} />
          <ColFilter label="Buyer 1" values={records.map(r => r.buyer1)} active={filterBuyer1} onChange={setFilterBuyer1} />
          <ColFilter label="Commodity" values={records.map(r => r.commodity)} active={filterCommodity} onChange={setFilterCommodity} />
          {(filterYear || filterStatus || filterSeller || filterBuyer1 || filterCommodity) && (
            <button onClick={() => { setFilterYear(''); setFilterStatus(''); setFilterSeller(''); setFilterBuyer1(''); setFilterCommodity('') }}
              className="text-xs text-red-600 hover:underline ml-2">✕ Xóa filter</button>
          )}
          <span className="ml-auto text-xs text-slate-400">{filtered.length}/{records.length} bản ghi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Sale Contract</th>
              <th className="table-head">Year / Lot</th>
              <th className="table-head">Staff</th>
              <th className="table-head">Agency</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer1</th>
              <th className="table-head">Commodity</th>
              <th className="table-head">Price / Unit</th>
              <th className="table-head bg-blue-50 text-blue-700">Status</th>
              <th className="table-head">ETD</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">📤</div>
                <div>Chưa có dữ liệu {records.length > 0 ? '(filter đang ẩn kết quả)' : '—'} <button onClick={openCreate} className="text-blue-600 hover:underline ml-1">Nhập mới</button></div>
              </td></tr> :
              filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                  <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.sale_contract || '—'}</td>
                  <td className="table-cell text-xs"><div>{r.year || '—'}</div><div className="text-slate-400">Lot {r.lot_number || '—'}</div></td>
                  <td className="table-cell text-sm">{r.staff || '—'}</td>
                  <td className="table-cell text-xs">{r.agency || '—'}</td>
                  <td className="table-cell font-medium text-sm">{r.seller || '—'}</td>
                  <td className="table-cell text-sm">{r.buyer1 || '—'}</td>
                  <td className="table-cell text-xs">{r.commodity || '—'}</td>
                  <td className="table-cell text-xs">
                    <div className="font-medium">{r.price || '—'}</div>
                    <div className="text-slate-400">{r.price_unit || 'USD/LB'}</div>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge(r.status)}`}>{r.status || '—'}</span>
                  </td>
                  <td className="table-cell text-xs text-slate-500">{toDisplay(r.etd)}</td>
                  <td className="table-cell">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openView(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Xem"><Eye size={14}/></button>
                      <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg" title="Sửa"><Pencil size={14}/></button>
                      <button onClick={() => openCopy(r)} className="p-1.5 hover:bg-violet-50 text-violet-600 rounded-lg" title="Copy"><Copy size={14}/></button>
                      <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Xóa"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && <div className="px-4 py-2 text-xs text-slate-400 border-t">{filtered.length} bản ghi</div>}
      </div>
    </div>
  )
}
