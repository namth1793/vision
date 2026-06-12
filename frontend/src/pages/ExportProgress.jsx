import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, AlertTriangle, Ship, Package, Truck } from 'lucide-react'
import api from '../lib/axios'
import { toDisplay } from '../utils/dateFormat'

const n = (v) => parseFloat(v) || 0
const fmtUSD = (v) => (v == null || isNaN(v) || v === '') ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Shared table helpers ─────────────────────────────────────────────────────
function Th({ children, className = '' }) {
  return <th className={`table-head whitespace-nowrap ${className}`}>{children}</th>
}
function Td({ children, className = '' }) {
  return <td className={`table-cell text-xs ${className}`}>{children ?? '—'}</td>
}

// ── 1. BOOKING TRACKING TABLE ────────────────────────────────────────────────
function BookingTable({ records, showSellerAmt, setShowSellerAmt, showCosmosAmt, setShowCosmosAmt }) {
  // Show rows where req_get_bkg is filled
  const rows = records.filter(r => r.req_get_bkg)

  const calcSellerAmt = (r) => {
    const price = n(r.price), nwToPay = n(r.nw_to_pay), lessAdv = n(r.less_advance), disc = n(r.discount1)
    return price * nwToPay + lessAdv + disc
  }
  const calcCosmosAmt = (r) => n(r.cosmos_rate) * n(r.nw_bl_lbs)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-violet-700 flex items-center gap-2">
          <Ship size={18} /> Theo Dõi Lấy Booking ({rows.length} bản ghi)
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSellerAmt(s => !s)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showSellerAmt ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {showSellerAmt ? <Eye size={13}/> : <EyeOff size={13}/>} Amt Payable to Seller
          </button>
          <button onClick={() => setShowCosmosAmt(s => !s)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showCosmosAmt ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {showCosmosAmt ? <Eye size={13}/> : <EyeOff size={13}/>} Amt Payable to Cosmos
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">Chưa có bản ghi nào có "Req get BKG"</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-violet-50 border-b border-violet-200">
                <Th>#</Th>
                <Th>Sale Contract</Th>
                <Th>Lot</Th>
                <Th>Seller</Th>
                <Th>Buyer1</Th>
                <Th>Buyer2</Th>
                <Th>Commodity</Th>
                <Th>Req get BKG</Th>
                <Th>BL / BKG No</Th>
                <Th>Container/Seal</Th>
                <Th>BKG Details</Th>
                <Th>POL</Th>
                <Th>POD</Th>
                <Th>ETD</Th>
                <Th>ETA</Th>
                <Th>Total Cont</Th>
                <Th>GW (kgs)</Th>
                <Th>NW (kgs)</Th>
                <Th>NW to pay</Th>
                <Th>CTN/CONT</Th>
                <Th>Price</Th>
                {showSellerAmt && <Th className="bg-amber-50 text-amber-700">Amt → Seller</Th>}
                <Th>Selling Price</Th>
                {showCosmosAmt && <Th className="bg-blue-50 text-blue-700">Amt → Cosmos</Th>}
                <Th>Note</Th>
                <Th>INS Fee</Th>
                <Th>INS Pay Date</Th>
                <Th>Note INS</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-violet-50/30">
                    <Td>{i + 1}</Td>
                    <Td className="font-mono font-bold text-violet-700">{r.sale_contract}</Td>
                    <Td>{r.lot_number}</Td>
                    <Td className="font-medium">{r.seller}</Td>
                    <Td>{r.buyer1}</Td>
                    <Td>{r.buyer2}</Td>
                    <Td>{r.commodity}</Td>
                    <Td className="text-violet-700 font-medium">{toDisplay(r.req_get_bkg)}</Td>
                    <Td className="font-mono">{r.bl_bkg_freetime}</Td>
                    <Td>{r.container_seal}</Td>
                    <Td>{r.bkg_details}</Td>
                    <Td>{r.pol}</Td>
                    <Td>{r.pod}</Td>
                    <Td>{toDisplay(r.etd)}</Td>
                    <Td>{toDisplay(r.eta)}</Td>
                    <Td>{r.total_cont}</Td>
                    <Td>{r.gw_bl_kgs}</Td>
                    <Td>{r.nw_bl_kgs}</Td>
                    <Td>{r.nw_to_pay} {r.nw_to_pay_unit}</Td>
                    <Td>{r.ctn_cont}</Td>
                    <Td>{r.price} {r.price_unit}</Td>
                    {showSellerAmt && <Td className="bg-amber-50 font-bold text-amber-700">{fmtUSD(calcSellerAmt(r))}</Td>}
                    <Td>{r.selling_price ? fmtUSD(r.selling_price) : '—'}</Td>
                    {showCosmosAmt && <Td className="bg-blue-50 font-bold text-blue-700">{fmtUSD(calcCosmosAmt(r))}</Td>}
                    <Td>{r.note_booking}</Td>
                    <Td>{r.ins_fee ? fmtUSD(r.ins_fee) : '—'}</Td>
                    <Td>{toDisplay(r.ins_payment_date)}</Td>
                    <Td>{r.note_ins}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 2. BL ARRIVAL WARNING TABLE ──────────────────────────────────────────────
function BLArrivalTable({ records, showSellerAmt, setShowSellerAmt, showCosmosAmt, setShowCosmosAmt }) {
  // Show BLs where ETA is set and BL number exists, sorted by ETA asc
  const today = new Date().toISOString().split('T')[0]
  const rows = records
    .filter(r => r.eta && r.bl_bkg_freetime)
    .sort((a, b) => (a.eta || '').localeCompare(b.eta || ''))

  const isUrgent = (eta) => {
    if (!eta) return false
    const diff = (new Date(eta) - new Date()) / 86400000
    return diff <= 7 && diff >= -3
  }

  const calcSellerAmt = (r) => n(r.price) * n(r.nw_to_pay) + n(r.less_advance) + n(r.discount1)
  const calcCosmosAmt = (r) => n(r.cosmos_rate) * n(r.nw_bl_lbs)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-amber-700 flex items-center gap-2">
          <AlertTriangle size={18} /> BL Sắp Cập Cảng — Nhắc Thanh Toán ({rows.length} bản ghi)
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSellerAmt(s => !s)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showSellerAmt ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-500'}`}>
            {showSellerAmt ? <Eye size={13}/> : <EyeOff size={13}/>} Amt → Seller
          </button>
          <button onClick={() => setShowCosmosAmt(s => !s)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showCosmosAmt ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
            {showCosmosAmt ? <Eye size={13}/> : <EyeOff size={13}/>} Amt → Cosmos
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">Không có BL nào cần theo dõi</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-amber-50 border-b border-amber-200">
                <Th>#</Th>
                <Th>Sale Contract</Th>
                <Th>Lot</Th>
                <Th>Seller</Th>
                <Th>Buyer1</Th>
                <Th>Buyer2</Th>
                <Th>Commodity</Th>
                <Th>BL / BKG No</Th>
                <Th>Container/Seal</Th>
                <Th>BKG Details</Th>
                <Th>POL</Th>
                <Th>POD</Th>
                <Th>ETD</Th>
                <Th className="bg-amber-100 text-amber-800">ETA ▲</Th>
                <Th>Total Cont</Th>
                <Th>GW (kgs)</Th>
                <Th>NW (kgs)</Th>
                <Th>NW to pay</Th>
                <Th>CTN/CONT</Th>
                <Th>Price</Th>
                {showSellerAmt && <Th className="bg-amber-50 text-amber-700">Amt → Seller</Th>}
                <Th>Selling Price</Th>
                {showCosmosAmt && <Th className="bg-blue-50 text-blue-700">Amt → Cosmos</Th>}
                <Th>Note</Th>
                <Th>INS Fee</Th>
                <Th>INS Pay Date</Th>
                <Th>Note INS</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-amber-50/30 ${isUrgent(r.eta) ? 'bg-red-50' : ''}`}>
                    <Td>{i + 1}</Td>
                    <Td className="font-mono font-bold text-blue-700">{r.sale_contract}</Td>
                    <Td>{r.lot_number}</Td>
                    <Td className="font-medium">{r.seller}</Td>
                    <Td>{r.buyer1}</Td>
                    <Td>{r.buyer2}</Td>
                    <Td>{r.commodity}</Td>
                    <Td className="font-mono">{r.bl_bkg_freetime}</Td>
                    <Td>{r.container_seal}</Td>
                    <Td>{r.bkg_details}</Td>
                    <Td>{r.pol}</Td>
                    <Td>{r.pod}</Td>
                    <Td>{toDisplay(r.etd)}</Td>
                    <Td className={`font-bold ${isUrgent(r.eta) ? 'text-red-700' : 'text-amber-700'}`}>
                      {toDisplay(r.eta)}
                      {isUrgent(r.eta) && <span className="ml-1 text-[10px] bg-red-600 text-white px-1 rounded">!</span>}
                    </Td>
                    <Td>{r.total_cont}</Td>
                    <Td>{r.gw_bl_kgs}</Td>
                    <Td>{r.nw_bl_kgs}</Td>
                    <Td>{r.nw_to_pay} {r.nw_to_pay_unit}</Td>
                    <Td>{r.ctn_cont}</Td>
                    <Td>{r.price} {r.price_unit}</Td>
                    {showSellerAmt && <Td className="bg-amber-50 font-bold text-amber-700">{fmtUSD(calcSellerAmt(r))}</Td>}
                    <Td>{r.selling_price ? fmtUSD(r.selling_price) : '—'}</Td>
                    {showCosmosAmt && <Td className="bg-blue-50 font-bold text-blue-700">{fmtUSD(calcCosmosAmt(r))}</Td>}
                    <Td>{r.note_shipping}</Td>
                    <Td>{r.ins_fee ? fmtUSD(r.ins_fee) : '—'}</Td>
                    <Td>{toDisplay(r.ins_payment_date)}</Td>
                    <Td>{r.note_ins}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 3. DHL FEE PENDING TABLE ─────────────────────────────────────────────────
function DHLPendingTable({ records }) {
  // Show records where dhl_fee is filled but dhl_payment_date is empty
  const rows = records.filter(r => r.dhl_fee && !r.dhl_payment_date)

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-red-700 flex items-center gap-2">
        <Truck size={18} /> BL Chưa Trả Phí DHL ({rows.length} bản ghi)
        <span className="text-xs text-slate-400 font-normal">(ẩn tự động khi điền DHL Payment Date)</span>
      </h2>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-emerald-600 text-sm font-medium">
          ✓ Không còn phí DHL chưa thanh toán
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-red-50 border-b border-red-200">
                <Th>#</Th>
                <Th>Sale Contract</Th>
                <Th>Lot</Th>
                <Th>Seller</Th>
                <Th>Buyer1</Th>
                <Th>BL Number</Th>
                <Th>DHL/Fedex Number</Th>
                <Th>DHL Delivered</Th>
                <Th className="bg-red-100 text-red-700">DHL Fee (VND)</Th>
                <Th>Pay To</Th>
                <Th>DHL Payment Date</Th>
                <Th>Note</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-red-50/30">
                    <Td>{i + 1}</Td>
                    <Td className="font-mono font-bold text-blue-700">{r.sale_contract}</Td>
                    <Td>{r.lot_number}</Td>
                    <Td className="font-medium">{r.seller}</Td>
                    <Td>{r.buyer1}</Td>
                    <Td className="font-mono">{r.bl_bkg_freetime}</Td>
                    <Td className="font-mono">{r.dhl_fedex_number}</Td>
                    <Td>{toDisplay(r.dhl_delivered)}</Td>
                    <Td className="font-bold text-red-700">
                      {r.dhl_fee ? Number(r.dhl_fee).toLocaleString('vi-VN') : '—'}
                    </Td>
                    <Td>{r.dhl_pay_to}</Td>
                    <Td className="text-slate-400 italic">Chưa thanh toán</Td>
                    <Td>{r.note_dhl}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ExportProgress() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('booking')
  const [showSellerAmtBkg, setShowSellerAmtBkg] = useState(false)
  const [showCosmosAmtBkg, setShowCosmosAmtBkg] = useState(false)
  const [showSellerAmtArr, setShowSellerAmtArr] = useState(false)
  const [showCosmosAmtArr, setShowCosmosAmtArr] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/export-records').then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const bkgCount = records.filter(r => r.req_get_bkg).length
  const arrCount = records.filter(r => r.eta && r.bl_bkg_freetime).length
  const dhlCount = records.filter(r => r.dhl_fee && !r.dhl_payment_date).length

  const sections = [
    { id: 'booking', label: `Booking (${bkgCount})`, icon: Ship, color: 'violet' },
    { id: 'arrival', label: `BL Sắp Cập (${arrCount})`, icon: AlertTriangle, color: 'amber' },
    { id: 'dhl', label: `DHL Chưa TT${dhlCount > 0 ? ` (${dhlCount})` : ''}`, icon: Truck, color: dhlCount > 0 ? 'red' : 'slate' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">📊 Theo Dõi Tiến Độ Hàng Xuất</h1>
          <p className="text-sm text-slate-500 mt-0.5">Booking, BL sắp cập cảng, phí DHL chưa thanh toán</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">↻ Làm mới</button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(s => {
          const Icon = s.icon
          const active = activeSection === s.id
          const colorMap = { violet: 'bg-violet-600 text-white', amber: 'bg-amber-600 text-white', red: 'bg-red-600 text-white', slate: 'bg-slate-600 text-white' }
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? (colorMap[s.color] || 'bg-blue-600 text-white') : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Icon size={16} /> {s.label}
              {s.id === 'dhl' && dhlCount > 0 && !active && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{dhlCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-400">Đang tải dữ liệu...</div>
      ) : (
        <>
          {activeSection === 'booking' && (
            <BookingTable records={records}
              showSellerAmt={showSellerAmtBkg} setShowSellerAmt={setShowSellerAmtBkg}
              showCosmosAmt={showCosmosAmtBkg} setShowCosmosAmt={setShowCosmosAmtBkg} />
          )}
          {activeSection === 'arrival' && (
            <BLArrivalTable records={records}
              showSellerAmt={showSellerAmtArr} setShowSellerAmt={setShowSellerAmtArr}
              showCosmosAmt={showCosmosAmtArr} setShowCosmosAmt={setShowCosmosAmtArr} />
          )}
          {activeSection === 'dhl' && <DHLPendingTable records={records} />}
        </>
      )}
    </div>
  )
}
