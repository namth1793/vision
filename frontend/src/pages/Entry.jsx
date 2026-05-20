import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, X, Save, Calculator, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

// ── helpers ──────────────────────────────────────────────────────────────────
const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => v == null || isNaN(v) ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNum = (v) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const fmtTon = (v) => v == null || isNaN(v) ? '—' : `${Number(v).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT`

// ── Computed formulas (pure JS, called on every form change) ─────────────────
function compute(f) {
  const price = n(f.price), qty = n(f.qty), retention = n(f.retention)
  const nw_bl = n(f.nw_bl), advanced_paid_bl = n(f.advanced_paid_bl)
  const nw_bw = n(f.nw_bw), lbs = n(f.lbs), nut = n(f.nut)
  const outturn_vina = n(f.outturn_vina), nutcount_vina = n(f.nutcount_vina)
  const double_penalty = n(f.double_penalty)
  const second_payment = n(f.second_payment)
  const outturn_claim_1to1 = n(f.outturn_claim_1to1)
  const outturn_claim_1to2 = n(f.outturn_claim_1to2)
  const dem_det = n(f.dem_det), sto = n(f.sto)
  const other_fee1 = n(f.other_fee1), other_fee2 = n(f.other_fee2)
  const final_settlement = n(f.final_settlement)
  const commission_rate = n(f.commission_rate)

  // 16: Contract Value = Price × Qty
  const contractValue = price * qty

  // 37: Calculation B/L Invoice = Price × NW_BL - Adv_BL - (Price × NW_BL × Retention/100)
  const calcBLInvoice = (price * nw_bl) - advanced_paid_bl - (price * nw_bl * retention / 100)

  // 43: Shortage/Overtage = NW_BW - NW_BL
  const shortageOvertage = nw_bw - nw_bl

  // 46: Difference Nutcount = Nutcount_Vina - Nut
  const diffNutcount = nutcount_vina - nut

  // 47: Difference Outturn = Outturn_Vina - LBs
  const diffOutturn = outturn_vina - lbs

  // 48: 1:1 lbs – nếu diffOutturn > 0 VÀ < double_penalty
  const lbs_1to1 = (diffOutturn > 0 && double_penalty > 0 && diffOutturn < double_penalty) ? (lbs - diffOutturn) : null

  // 49: 1:2 lbs – nếu diffOutturn > 0 VÀ >= double_penalty
  const lbs_1to2 = (diffOutturn > 0 && double_penalty > 0 && diffOutturn >= double_penalty) ? (lbs - diffOutturn) : null

  // 50: 1:1 Penalty = Price / LBs
  const penalty_1to1 = lbs > 0 ? price / lbs : 0

  // 51: 1:2 Penalty = 1:1 Penalty × 2
  const penalty_1to2 = penalty_1to1 * 2

  // 54: Nutcount Claim
  const nutcountClaim = diffNutcount > 0 ? diffNutcount * 0.5 * nw_bw : 0

  // 59: Debit/Credit (rounded to 2 decimals)
  const debitCredit = Math.round((
    price * nw_bw
    - advanced_paid_bl
    - second_payment
    - outturn_claim_1to1
    - outturn_claim_1to2
    - nutcountClaim
    - dem_det - sto - other_fee1 - other_fee2
  ) * 100) / 100

  // 60: Notes 4
  const notes4 = debitCredit > 0
    ? `${f.buyer || 'Buyer'} has to pay ${f.seller || 'Seller'}`
    : `${f.seller || 'Seller'} has to pay ${f.buyer || 'Buyer'}`

  // 61: Balance = Final Settlement - Debit/Credit
  const balance = final_settlement - debitCredit

  // 62: Notes 5
  const notes5 = Math.abs(balance) < 0.01 ? 'CLOSED' : 'BALANCE NOT PAID'

  // 65: Commission Amount = Rate × NW_BW
  const commissionAmount = commission_rate * nw_bw

  return {
    contractValue, calcBLInvoice, shortageOvertage,
    diffNutcount, diffOutturn, lbs_1to1, lbs_1to2,
    penalty_1to1, penalty_1to2, nutcountClaim,
    debitCredit, notes4, balance, notes5, commissionAmount
  }
}

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY = {
  staff:'', broker:'', year: new Date().getFullYear(), contract_no:'', contract_date:'',
  seller:'', buyer:'', status:'active', ship_date:'', qty:'', origin:'', pol:'',
  lbs:'', nut:'', price:'', retention:'', double_penalty:'', notes1:'',
  advanced_payment:'', second_payment:'', final_settlement:'',
  line_loader:'', bl_number:'', eta_caimep:'', eta_hcm:'', eta_pod:'', notes2:'',
  dhl_fedex_number:'', dhl_delivered:'', total_cont:'', cont_size:'', bags:'',
  gw_bl:'', nw_bl:'', advanced_paid_bl:'',
  date_unload:'', notes3:'', certificate_no:'', date_certificate:'',
  nw_bw:'', outturn_vina:'', nutcount_vina:'',
  outturn_claim_1to1:'', outturn_claim_1to2:'',
  dem_det:'', sto:'', other_fee1:'', other_fee2:'', notes6:'',
  commission_rate:'', pay_on_behalf:'', notes7:'', fee_from_buyer:''
}

const TABS = [
  { id: 'contract', label: '① Hợp Đồng', color: 'blue' },
  { id: 'payment',  label: '② Thanh Toán', color: 'green' },
  { id: 'shipment', label: '③ Vận Chuyển / B/L', color: 'violet' },
  { id: 'quality',  label: '④ Kiểm Tra CL', color: 'amber' },
  { id: 'settlement', label: '⑤ Quyết Toán', color: 'red' },
  { id: 'commission', label: '⑥ Hoa Hồng', color: 'teal' },
]

// ── Computed Badge ────────────────────────────────────────────────────────────
function CalcField({ label, value, unit = '', color = 'blue', note }) {
  return (
    <div className={`rounded-lg border-2 ${color === 'red' ? 'border-red-200 bg-red-50' : color === 'green' ? 'border-emerald-200 bg-emerald-50' : color === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Calculator size={13} className={color === 'red' ? 'text-red-500' : color === 'green' ? 'text-emerald-500' : color === 'amber' ? 'text-amber-500' : 'text-blue-500'} />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color === 'red' ? 'text-red-700' : color === 'green' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-blue-700'}`}>
        {value}{unit ? ` ${unit}` : ''}
      </div>
      {note && <div className="text-xs text-slate-500 mt-1 italic">{note}</div>}
    </div>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────
function Field({ label, children, half }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2 md:col-span-1'}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Entry() {
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

  const calc = compute(form)

  const load = useCallback(() => {
    const params = {}
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    api.get('/trades', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search, filterStatus])

  useEffect(() => { load() }, [load])

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))
  const fv = (updates) => setForm(p => ({ ...p, ...updates }))

  const openCreate = () => { setForm(EMPTY); setEditId(null); setActiveTab('contract'); setShowForm(true) }
  const openEdit = (r) => {
    setForm({ ...EMPTY, ...r })
    setEditId(r.id); setActiveTab('contract'); setShowForm(true)
  }
  const openView = async (r) => {
    const res = await api.get(`/trades/${r.id}`)
    setViewRecord(res.data)
  }

  const save = async () => {
    if (!form.contract_no) { toast.error('Vui lòng nhập số hợp đồng'); setActiveTab('contract'); return }
    setSaving(true)
    try {
      if (editId) await api.put(`/trades/${editId}`, form)
      else await api.post('/trades', form)
      toast.success(editId ? 'Đã cập nhật bản ghi' : 'Đã tạo bản ghi mới')
      setShowForm(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa bản ghi này?')) return
    try { await api.delete(`/trades/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  const statusColor = (s) => ({ active: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700', pending: 'bg-amber-100 text-amber-700' }[s] || 'bg-slate-100 text-slate-600')
  const statusLabel = (s) => ({ active: 'Đang HĐ', completed: 'Hoàn thành', cancelled: 'Đã hủy', pending: 'Chờ xử lý' }[s] || s)

  // ── VIEW DETAIL ────────────────────────────────────────────────────────────
  if (viewRecord) {
    const vc = compute(viewRecord)
    const Row = ({ label, value, isBold, isCalc }) => (
      <div className={`flex items-start justify-between py-2 border-b border-slate-100 last:border-0 ${isCalc ? 'bg-blue-50 px-2 rounded' : ''}`}>
        <span className="text-sm text-slate-500 min-w-0 flex-shrink-0 w-52">{label}</span>
        <span className={`text-sm text-right ${isBold || isCalc ? 'font-bold text-slate-800' : 'text-slate-700'} ${isCalc ? 'text-blue-700' : ''}`}>{value ?? '—'}</span>
      </div>
    )
    const Section = ({ title, color, children }) => (
      <div className={`card p-5 border-l-4 ${color}`}>
        <h3 className="font-bold text-slate-700 mb-3 text-base">{title}</h3>
        {children}
      </div>
    )
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewRecord(null)} className="btn-secondary"><X size={16}/> Quay lại</button>
          <button onClick={() => { openEdit(viewRecord); setViewRecord(null) }} className="btn-primary"><Pencil size={16}/> Chỉnh sửa</button>
          <h1 className="page-title ml-2">Chi tiết: {viewRecord.contract_no || '—'}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="① Thông tin Hợp Đồng" color="border-blue-500">
            <Row label="Staff" value={viewRecord.staff} />
            <Row label="Broker" value={viewRecord.broker} />
            <Row label="Năm" value={viewRecord.year} />
            <Row label="Số HĐ" value={viewRecord.contract_no} isBold />
            <Row label="Ngày phát hành" value={viewRecord.contract_date} />
            <Row label="Seller (bên bán)" value={viewRecord.seller} />
            <Row label="Buyer (bên mua)" value={viewRecord.buyer} />
            <Row label="Trạng thái" value={statusLabel(viewRecord.status)} />
            <Row label="Thời gian giao hàng" value={viewRecord.ship_date} />
            <Row label="Qty (tấn)" value={viewRecord.qty} />
            <Row label="Origin" value={viewRecord.origin} />
            <Row label="POL" value={viewRecord.pol} />
            <Row label="LBs" value={viewRecord.lbs} />
            <Row label="Nut" value={viewRecord.nut} />
            <Row label="Price ($/tấn)" value={fmtUSD(viewRecord.price)} />
            <Row label="✦ Contract Value" value={fmtUSD(vc.contractValue)} isCalc isBold />
            <Row label="Retention (%)" value={viewRecord.retention} />
            <Row label="Double Penalty" value={viewRecord.double_penalty} />
            <Row label="Notes 1" value={viewRecord.notes1} />
          </Section>
          <Section title="② Thanh Toán" color="border-emerald-500">
            <Row label="Advanced Payment" value={fmtUSD(viewRecord.advanced_payment)} />
            <Row label="Second Payment" value={fmtUSD(viewRecord.second_payment)} />
            <Row label="Final Settlement" value={fmtUSD(viewRecord.final_settlement)} />
            <div className="mt-4 pt-3 border-t">
              <h4 className="font-semibold text-slate-600 mb-2">③ Vận Chuyển / B/L</h4>
              <Row label="Line/Loader" value={viewRecord.line_loader} />
              <Row label="B/L Number" value={viewRecord.bl_number} isBold />
              <Row label="ETA CAIMEP" value={viewRecord.eta_caimep} />
              <Row label="ETA HCM" value={viewRecord.eta_hcm} />
              <Row label="ETA POD" value={viewRecord.eta_pod} />
              <Row label="DHL/Fedex Number" value={viewRecord.dhl_fedex_number} />
              <Row label="DHL Delivered" value={viewRecord.dhl_delivered} />
              <Row label="Total Cont" value={viewRecord.total_cont} />
              <Row label="Cont Size" value={viewRecord.cont_size} />
              <Row label="Bags" value={viewRecord.bags} />
              <Row label="GW on B/L (MT)" value={viewRecord.gw_bl} />
              <Row label="NW on B/L (MT)" value={viewRecord.nw_bl} />
              <Row label="Advanced Paid B/L" value={fmtUSD(viewRecord.advanced_paid_bl)} />
              <Row label="✦ Calc B/L Invoice" value={fmtUSD(vc.calcBLInvoice)} isCalc isBold />
            </div>
          </Section>
          <Section title="④ Kiểm Tra Chất Lượng" color="border-amber-500">
            <Row label="Date Unload Cargo" value={viewRecord.date_unload} />
            <Row label="Certificate No" value={viewRecord.certificate_no} />
            <Row label="Date of Certificate" value={viewRecord.date_certificate} />
            <Row label="NW out of BW (MT)" value={viewRecord.nw_bw} />
            <Row label="Outturn Vina/CF" value={viewRecord.outturn_vina} />
            <Row label="Nutcount Vina/CF" value={viewRecord.nutcount_vina} />
            <Row label="✦ Shortage/Overtage" value={fmtTon(vc.shortageOvertage)} isCalc />
            <Row label="✦ Diff Outturn (47)" value={fmtNum(vc.diffOutturn)} isCalc />
            <Row label="✦ Diff Nutcount (46)" value={fmtNum(vc.diffNutcount)} isCalc />
            <Row label="✦ 1:1 lbs (48)" value={vc.lbs_1to1 != null ? fmtNum(vc.lbs_1to1) : 'N/A'} isCalc />
            <Row label="✦ 1:2 lbs (49)" value={vc.lbs_1to2 != null ? fmtNum(vc.lbs_1to2) : 'N/A'} isCalc />
            <Row label="✦ 1:1 Penalty (50)" value={fmtUSD(vc.penalty_1to1)} isCalc />
            <Row label="✦ 1:2 Penalty (51)" value={fmtUSD(vc.penalty_1to2)} isCalc />
            <Row label="1:1 Outturn Claim (52)" value={fmtUSD(viewRecord.outturn_claim_1to1)} />
            <Row label="1:2 Outturn Claim (53)" value={fmtUSD(viewRecord.outturn_claim_1to2)} />
            <Row label="✦ Nutcount Claim (54)" value={fmtUSD(vc.nutcountClaim)} isCalc />
            <Row label="Notes 3" value={viewRecord.notes3} />
          </Section>
          <Section title="⑤ Quyết Toán" color="border-red-500">
            <Row label="DEM/DET" value={fmtUSD(viewRecord.dem_det)} />
            <Row label="STO" value={fmtUSD(viewRecord.sto)} />
            <Row label="Other Fee 1" value={fmtUSD(viewRecord.other_fee1)} />
            <Row label="Other Fee 2" value={fmtUSD(viewRecord.other_fee2)} />
            <Row label="✦ Debit/Credit (59)" value={fmtUSD(vc.debitCredit)} isCalc isBold />
            <Row label="✦ Notes 4 (60)" value={vc.notes4} isCalc />
            <Row label="✦ BALANCE (61)" value={fmtUSD(vc.balance)} isCalc isBold />
            <Row label="✦ Notes 5 (62)" value={vc.notes5} isCalc />
            <Row label="Notes 6" value={viewRecord.notes6} />
            <div className="mt-4 pt-3 border-t">
              <h4 className="font-semibold text-slate-600 mb-2">⑥ Hoa Hồng</h4>
              <Row label="Commission (USD/MT)" value={fmtUSD(viewRecord.commission_rate)} />
              <Row label="✦ Amount (65)" value={fmtUSD(vc.commissionAmount)} isCalc isBold />
              <Row label="Pay on behalf of Seller" value={fmtUSD(viewRecord.pay_on_behalf)} />
              <Row label="Fee from Buyer" value={fmtUSD(viewRecord.fee_from_buyer)} />
              <Row label="Notes 7" value={viewRecord.notes7} />
            </div>
          </Section>
        </div>
      </div>
    )
  }

  // ── FORM ───────────────────────────────────────────────────────────────────
  if (showForm) {
    const tabColor = { blue: 'border-blue-600 text-blue-700 bg-blue-50', green: 'border-emerald-600 text-emerald-700 bg-emerald-50', violet: 'border-violet-600 text-violet-700 bg-violet-50', amber: 'border-amber-600 text-amber-700 bg-amber-50', red: 'border-red-600 text-red-700 bg-red-50', teal: 'border-teal-600 text-teal-700 bg-teal-50' }
    const cur = TABS.find(t => t.id === activeTab)
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="page-title">{editId ? '✏️ Chỉnh sửa bản ghi' : '➕ Nhập liệu mới'} {form.contract_no && `— ${form.contract_no}`}</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary"><X size={16}/> Hủy</button>
            <button onClick={save} disabled={saving} className="btn-primary"><Save size={16}/> {saving ? 'Đang lưu...' : 'Lưu bản ghi'}</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-slate-200 pb-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? tabColor[t.color] : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card p-6">
          {/* ① HỢP ĐỒNG */}
          {activeTab === 'contract' && (
            <div className="space-y-5">
              <h2 className="font-bold text-blue-700 text-base border-b border-blue-100 pb-2">① Thông tin Hợp Đồng</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="label">Staff (nhân viên)</label><input className="input" value={form.staff} onChange={f('staff')} placeholder="Tên nhân viên" /></div>
                <div><label className="label">Broker (môi giới)</label><input className="input" value={form.broker} onChange={f('broker')} placeholder="Tên môi giới" /></div>
                <div><label className="label">Year (năm)</label><input type="number" className="input" value={form.year} onChange={f('year')} /></div>
                <div><label className="label">Status (trạng thái)</label>
                  <select className="select" value={form.status} onChange={f('status')}>
                    <option value="active">Đang HĐ</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><label className="label">Contract (số hợp đồng) <span className="text-red-500">*</span></label><input className="input" value={form.contract_no} onChange={f('contract_no')} placeholder="VD: VXK-CF-2025-001" /></div>
                <div><label className="label">Date (ngày phát hành)</label><input type="date" className="input" value={form.contract_date} onChange={f('contract_date')} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Seller (bên bán)</label><input className="input" value={form.seller} onChange={f('seller')} placeholder="Tên bên bán" /></div>
                <div><label className="label">Buyer (bên mua)</label><input className="input" value={form.buyer} onChange={f('buyer')} placeholder="Tên bên mua" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="label">Ship (thời gian giao)</label><input type="date" className="input" value={form.ship_date} onChange={f('ship_date')} /></div>
                <div><label className="label">Qty (tấn)</label><input type="number" step="0.001" className="input" value={form.qty} onChange={f('qty')} placeholder="0.000" /></div>
                <div><label className="label">Origin (nguồn gốc)</label><input className="input" value={form.origin} onChange={f('origin')} placeholder="VD: Vietnam" /></div>
                <div><label className="label">POL (cảng chất hàng)</label><input className="input" value={form.pol} onChange={f('pol')} placeholder="VD: Da Nang" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="label">LBs (chất lượng 1)</label><input type="number" step="0.01" className="input" value={form.lbs} onChange={f('lbs')} placeholder="0.00" /></div>
                <div><label className="label">Nut (chất lượng 2)</label><input type="number" step="0.01" className="input" value={form.nut} onChange={f('nut')} placeholder="0.00" /></div>
                <div><label className="label">Price ($/tấn)</label><input type="number" step="0.01" className="input" value={form.price} onChange={f('price')} placeholder="0.00" /></div>
                <div><label className="label">Retention (%)</label><input type="number" step="0.01" className="input" value={form.retention} onChange={f('retention')} placeholder="0.00" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label">Double Penalty</label><input type="number" step="0.01" className="input" value={form.double_penalty} onChange={f('double_penalty')} placeholder="0.00" /></div>
                <div className="md:col-span-2"><label className="label">Notes 1 (ghi chú hợp đồng)</label><input className="input" value={form.notes1} onChange={f('notes1')} placeholder="Ghi chú..." /></div>
              </div>
              {/* Computed: Contract Value */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <CalcField label="[16] Contract Value = Price × Qty" value={fmtUSD(calc.contractValue)} color="blue" />
              </div>
              {/* Navigation */}
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('payment')} className="btn-secondary">Tiếp: Thanh Toán <ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {/* ② THANH TOÁN */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <h2 className="font-bold text-emerald-700 text-base border-b border-emerald-100 pb-2">② Thanh Toán</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label">Advanced Payment ($) — Tiền cọc</label><input type="number" step="0.01" className="input" value={form.advanced_payment} onChange={f('advanced_payment')} placeholder="0.00" /></div>
                <div><label className="label">Second Payment ($) — Tiền cọc lần 2</label><input type="number" step="0.01" className="input" value={form.second_payment} onChange={f('second_payment')} placeholder="0.00" /></div>
                <div><label className="label">Final Settlement — Quyết toán cuối</label><input type="number" step="0.01" className="input" value={form.final_settlement} onChange={f('final_settlement')} placeholder="0.00" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 bg-slate-50 p-4 rounded-lg">
                <CalcField label="[16] Contract Value" value={fmtUSD(calc.contractValue)} color="blue" />
                <CalcField label="Advanced + Second" value={fmtUSD(n(form.advanced_payment) + n(form.second_payment))} color="green" note="Tổng tiền đã cọc" />
                <CalcField label="Remaining (ước tính)" value={fmtUSD(calc.contractValue - n(form.advanced_payment) - n(form.second_payment))} color={calc.contractValue - n(form.advanced_payment) - n(form.second_payment) > 0 ? 'amber' : 'green'} />
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('shipment')} className="btn-secondary">Tiếp: Vận Chuyển <ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {/* ③ VẬN CHUYỂN / B/L */}
          {activeTab === 'shipment' && (
            <div className="space-y-5">
              <h2 className="font-bold text-violet-700 text-base border-b border-violet-100 pb-2">③ Vận Chuyển / Bill of Lading</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Line/Loader (chi tiết bill)</label><input className="input" value={form.line_loader} onChange={f('line_loader')} placeholder="VD: APL, Maersk..." /></div>
                <div><label className="label">B/L Number (số bill)</label><input className="input" value={form.bl_number} onChange={f('bl_number')} placeholder="Số bill of lading" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="label">ETA CAIMEP</label><input type="date" className="input" value={form.eta_caimep} onChange={f('eta_caimep')} /></div>
                <div><label className="label">ETA HCM</label><input type="date" className="input" value={form.eta_hcm} onChange={f('eta_hcm')} /></div>
                <div><label className="label">ETA POD (thực tế)</label><input className="input" value={form.eta_pod} onChange={f('eta_pod')} placeholder="Ngày/ghi chú" /></div>
              </div>
              <div><label className="label">Notes 2 (ghi chú bill)</label><textarea className="input" rows={2} value={form.notes2} onChange={f('notes2')} placeholder="Ghi chú..." /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">DHL/Fedex Number (số chứng từ)</label><input className="input" value={form.dhl_fedex_number} onChange={f('dhl_fedex_number')} /></div>
                <div><label className="label">DHL Delivered (ngày giao chứng từ)</label><input type="date" className="input" value={form.dhl_delivered} onChange={f('dhl_delivered')} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><label className="label">Total Cont</label><input type="number" className="input" value={form.total_cont} onChange={f('total_cont')} /></div>
                <div><label className="label">Cont Size</label><input className="input" value={form.cont_size} onChange={f('cont_size')} placeholder="VD: 20', 40'" /></div>
                <div><label className="label">Bags</label><input className="input" value={form.bags} onChange={f('bags')} /></div>
                <div><label className="label">GW on B/L (MT)</label><input type="number" step="0.001" className="input" value={form.gw_bl} onChange={f('gw_bl')} /></div>
                <div><label className="label">NW on B/L (MT)</label><input type="number" step="0.001" className="input" value={form.nw_bl} onChange={f('nw_bl')} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label">Advanced Paid B/L ($)</label><input type="number" step="0.01" className="input" value={form.advanced_paid_bl} onChange={f('advanced_paid_bl')} placeholder="0.00" /></div>
              </div>
              {/* Computed: B/L Invoice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <CalcField
                  label="[37] Calculation B/L Invoice"
                  value={fmtUSD(calc.calcBLInvoice)}
                  color="violet"
                  note="= Price × NW_BL − Adv_BL − (Price × NW_BL × Retention%)"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('quality')} className="btn-secondary">Tiếp: Kiểm Tra CL <ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {/* ④ KIỂM TRA CHẤT LƯỢNG */}
          {activeTab === 'quality' && (
            <div className="space-y-5">
              <h2 className="font-bold text-amber-700 text-base border-b border-amber-100 pb-2">④ Kiểm Tra Chất Lượng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Date Unload Cargo (ngày dỡ hàng)</label><input className="input" value={form.date_unload} onChange={f('date_unload')} placeholder="Ngày/ghi chú" /></div>
                <div><label className="label">Vina/CF Certificate No (số chứng nhận)</label><input className="input" value={form.certificate_no} onChange={f('certificate_no')} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Date of Certificate (ngày cấp CN)</label><input type="date" className="input" value={form.date_certificate} onChange={f('date_certificate')} /></div>
                <div><label className="label">NW out of BW (MT) — Trọng lượng CN</label><input type="number" step="0.001" className="input" value={form.nw_bw} onChange={f('nw_bw')} placeholder="0.000" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Outturn Vina/CF — Chất lượng 1 trên CN</label><input type="number" step="0.01" className="input" value={form.outturn_vina} onChange={f('outturn_vina')} placeholder="0.00" /></div>
                <div><label className="label">Nutcount Vina/CF — Chất lượng 2 trên CN</label><input type="number" step="0.01" className="input" value={form.nutcount_vina} onChange={f('nutcount_vina')} placeholder="0.00" /></div>
              </div>
              <div><label className="label">Notes 3 (ghi chú kiểm tra)</label><textarea className="input" rows={2} value={form.notes3} onChange={f('notes3')} placeholder="Ghi chú..." /></div>

              {/* Computed quality fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <CalcField label="[43] Shortage/Overtage" value={fmtTon(calc.shortageOvertage)} color={calc.shortageOvertage < 0 ? 'red' : 'green'} note="= NW_BW − NW_BL" />
                <CalcField label="[47] Diff Outturn" value={fmtNum(calc.diffOutturn)} color={calc.diffOutturn > 0 ? 'amber' : 'green'} note="= Outturn_Vina − LBs" />
                <CalcField label="[46] Diff Nutcount" value={fmtNum(calc.diffNutcount)} color={calc.diffNutcount > 0 ? 'amber' : 'green'} note="= Nutcount_Vina − Nut" />
                <CalcField label="[54] Nutcount Claim" value={fmtUSD(calc.nutcountClaim)} color="amber" note="Nếu Diff Nutcount > 0" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CalcField label="[48] 1:1 lbs" value={calc.lbs_1to1 != null ? fmtNum(calc.lbs_1to1) : 'N/A'} color="blue" note="Nếu 0 < Diff < Double Penalty" />
                <CalcField label="[49] 1:2 lbs" value={calc.lbs_1to2 != null ? fmtNum(calc.lbs_1to2) : 'N/A'} color="red" note="Nếu Diff ≥ Double Penalty" />
                <CalcField label="[50] 1:1 Penalty ($/LBs)" value={fmtUSD(calc.penalty_1to1)} color="blue" note="= Price / LBs" />
                <CalcField label="[51] 1:2 Penalty ($/LBs)" value={fmtUSD(calc.penalty_1to2)} color="red" note="= 1:1 Penalty × 2" />
              </div>

              {/* Manual claim inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-100">
                <div>
                  <label className="label">1:1 Outturn Claim ($) — Nhập tay (52)</label>
                  <input type="number" step="0.01" className="input" value={form.outturn_claim_1to1} onChange={f('outturn_claim_1to1')} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">1:2 Outturn Claim ($) — Nhập tay (53)</label>
                  <input type="number" step="0.01" className="input" value={form.outturn_claim_1to2} onChange={f('outturn_claim_1to2')} placeholder="0.00" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('settlement')} className="btn-secondary">Tiếp: Quyết Toán <ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {/* ⑤ QUYẾT TOÁN */}
          {activeTab === 'settlement' && (
            <div className="space-y-5">
              <h2 className="font-bold text-red-700 text-base border-b border-red-100 pb-2">⑤ Quyết Toán</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="label">DEM/DET ($)</label><input type="number" step="0.01" className="input" value={form.dem_det} onChange={f('dem_det')} placeholder="0.00" /></div>
                <div><label className="label">STO ($)</label><input type="number" step="0.01" className="input" value={form.sto} onChange={f('sto')} placeholder="0.00" /></div>
                <div><label className="label">Other Fee 1 ($)</label><input type="number" step="0.01" className="input" value={form.other_fee1} onChange={f('other_fee1')} placeholder="0.00" /></div>
                <div><label className="label">Other Fee 2 ($)</label><input type="number" step="0.01" className="input" value={form.other_fee2} onChange={f('other_fee2')} placeholder="0.00" /></div>
              </div>
              <div><label className="label">Notes 6 (ghi chú)</label><input className="input" value={form.notes6} onChange={f('notes6')} placeholder="Ghi chú quyết toán..." /></div>

              {/* Computed settlement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <CalcField
                  label="[59] Debit / Credit"
                  value={fmtUSD(calc.debitCredit)}
                  color={calc.debitCredit >= 0 ? 'green' : 'red'}
                  note="= Price×NW_BW − Adv_BL − 2nd_Pay − Claims − Fees"
                />
                <CalcField
                  label="[61] BALANCE"
                  value={fmtUSD(calc.balance)}
                  color={Math.abs(calc.balance) < 0.01 ? 'green' : 'red'}
                  note="= Final Settlement − Debit/Credit"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500 mb-1">[60] Notes 4 — Bên thanh toán</div>
                  <div className="text-sm font-semibold text-slate-800 italic">"{calc.notes4}"</div>
                </div>
                <div className={`rounded-lg border-2 p-4 ${calc.notes5 === 'CLOSED' ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                  <div className="text-xs font-medium text-slate-500 mb-1">[62] Notes 5 — Trạng thái</div>
                  <div className={`text-xl font-bold ${calc.notes5 === 'CLOSED' ? 'text-emerald-700' : 'text-red-700'}`}>{calc.notes5}</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setActiveTab('commission')} className="btn-secondary">Tiếp: Hoa Hồng <ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {/* ⑥ HOA HỒNG */}
          {activeTab === 'commission' && (
            <div className="space-y-5">
              <h2 className="font-bold text-teal-700 text-base border-b border-teal-100 pb-2">⑥ Hoa Hồng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Commissions ($/MT) — Hoa hồng đơn vị</label><input type="number" step="0.01" className="input" value={form.commission_rate} onChange={f('commission_rate')} placeholder="0.00" /></div>
                <div><label className="label">Pay on behalf of Seller ($)</label><input type="number" step="0.01" className="input" value={form.pay_on_behalf} onChange={f('pay_on_behalf')} placeholder="0.00" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Fee has to take from Buyer ($)</label><input type="number" step="0.01" className="input" value={form.fee_from_buyer} onChange={f('fee_from_buyer')} placeholder="0.00" /></div>
                <div><label className="label">Notes 7 ($)</label><input className="input" value={form.notes7} onChange={f('notes7')} placeholder="Ghi chú hoa hồng..." /></div>
              </div>

              {/* Computed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <CalcField
                  label="[65] Commission Amount"
                  value={fmtUSD(calc.commissionAmount)}
                  color="teal"
                  note="= Commission Rate × NW out of BW"
                />
                <CalcField
                  label="Net Commission"
                  value={fmtUSD(calc.commissionAmount - n(form.pay_on_behalf))}
                  color="green"
                  note="= Amount − Pay on behalf"
                />
              </div>

              {/* Final Save */}
              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setActiveTab('settlement')} className="btn-secondary">← Quyết Toán</button>
                <button onClick={save} disabled={saving} className="btn-primary"><Save size={16}/> {saving ? 'Đang lưu...' : '💾 Lưu toàn bộ bản ghi'}</button>
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
        <h1 className="page-title">📋 Nhập Liệu XNK</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm theo HĐ, seller, buyer..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-64" /></div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
            <option value="">Tất cả</option>
            <option value="active">Đang HĐ</option>
            <option value="pending">Chờ xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <button onClick={openCreate} className="btn-primary"><Plus size={16}/> Nhập liệu mới</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Số HĐ</th>
              <th className="table-head">Year</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Buyer</th>
              <th className="table-head">Qty (MT)</th>
              <th className="table-head">Price</th>
              <th className="table-head">Contract Value</th>
              <th className="table-head">Status</th>
              <th className="table-head">Staff</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-slate-400">
                <div className="space-y-2">
                  <div className="text-4xl">📝</div>
                  <div className="font-medium">Chưa có bản ghi nào</div>
                  <div className="text-sm">Nhấn "Nhập liệu mới" để bắt đầu</div>
                </div>
              </td></tr> :
              records.map(r => {
                const cv = compute(r)
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono text-xs text-blue-600 font-bold">{r.contract_no || '—'}</td>
                    <td className="table-cell">{r.year || '—'}</td>
                    <td className="table-cell font-medium">{r.seller || '—'}</td>
                    <td className="table-cell">{r.buyer || '—'}</td>
                    <td className="table-cell">{r.qty ? `${r.qty} MT` : '—'}</td>
                    <td className="table-cell">{r.price ? fmtUSD(r.price) : '—'}</td>
                    <td className="table-cell font-semibold text-blue-700">{cv.contractValue > 0 ? fmtUSD(cv.contractValue) : '—'}</td>
                    <td className="table-cell"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{statusLabel(r.status)}</span></td>
                    <td className="table-cell text-slate-500">{r.staff || '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openView(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Xem chi tiết"><Eye size={15}/></button>
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg" title="Chỉnh sửa"><Pencil size={15}/></button>
                        <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Xóa"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {records.length > 0 && <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500">{records.length} bản ghi</div>}
      </div>
    </div>
  )
}
