import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, X, Save, Users, Copy, Building2,
         CreditCard, ChevronDown, ChevronUp, PlusCircle, Trash, FileCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { toDisplay } from '../utils/dateFormat'

const COMPANY_TYPES = ['Buyer', 'Seller', 'Partner', 'Shipping Line', 'Khác']
const TYPE_COLOR = {
  Buyer: 'bg-blue-100 text-blue-700', Seller: 'bg-emerald-100 text-emerald-700',
  Partner: 'bg-violet-100 text-violet-700', 'Shipping Line': 'bg-amber-100 text-amber-700',
  'Khác': 'bg-slate-100 text-slate-600',
}

const EMPTY_BANK = { bank_info: '' }
const EMPTY_GPXK = { country_type: '', cert_no: '', issue_date: '', expiry_date: '', notes: '' }

const EMPTY = {
  company_type: '',
  company_info_en: '',
  company_info_vi: '',
  notes: '',
  banks: [{ ...EMPTY_BANK }],
  gpxk: [],
}

function daysLeft(expiry) {
  if (!expiry) return null
  return Math.round((new Date(expiry) - new Date()) / 86400000)
}
function expiryStatus(days) {
  if (days === null) return { cls: 'text-slate-400 bg-slate-50 border-slate-200', label: '—' }
  if (days < 0) return { cls: 'text-red-700 bg-red-50 border-red-200', label: `Hết hạn ${Math.abs(days)} ngày trước` }
  if (days <= 30) return { cls: 'text-red-700 bg-red-50 border-red-200', label: `Còn ${days} ngày ⚠️` }
  if (days <= 90) return { cls: 'text-amber-700 bg-amber-50 border-amber-200', label: `Còn ${days} ngày` }
  return { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: `Còn ${days} ngày` }
}

// ── Bank details accordion (display) ────────────────────────────────────────
function BankList({ banks }) {
  const [open, setOpen] = useState(false)
  if (!banks || banks.length === 0) return <span className="text-slate-400 text-xs">—</span>
  const primary = banks[0]
  const preview = (primary.bank_info || '').split('\n')[0]
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-slate-700 hover:text-blue-600 font-mono">
        <CreditCard size={12} /> {preview || '...'}
        {banks.length > 1 && <span className="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-[10px]">+{banks.length - 1}</span>}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {banks.map((bk, i) => (
            <div key={bk.id ?? i} className="bg-slate-50 rounded-lg p-2 text-[11px] font-mono border border-slate-200 whitespace-pre-wrap">
              {i === 0 && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded mr-1 not-italic font-sans">PRIMARY</span>}
              {bk.bank_info || '—'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bank form row (single free-text block per bank) ─────────────────────────
function BankFormRow({ bank, index, onChange, onRemove, isPrimary }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-700">
          {isPrimary ? <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">PRIMARY</span> : `Ngân hàng ${index + 1}`}
        </span>
        {!isPrimary && (
          <button onClick={() => onRemove(index)} className="p-1 hover:bg-red-50 text-red-400 rounded">
            <Trash size={13} />
          </button>
        )}
      </div>
      <textarea
        className="input text-xs font-mono"
        rows={4}
        value={bank.bank_info}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder={`Dán toàn bộ thông tin ngân hàng vào đây, VD:\nBank: Vietcombank - CN HCM\nAccount No: 0071001234567\nSwift/BIC: BFTVVNVX\nAddress: 47 Ly Tu Trong, Q1, HCM`}
      />
    </div>
  )
}

// ── GPXK list (display) ──────────────────────────────────────────────────────
function GpxkList({ gpxk }) {
  const [open, setOpen] = useState(false)
  if (!gpxk || gpxk.length === 0) return <span className="text-slate-400 text-xs">—</span>
  const soonest = [...gpxk].sort((a, b) => (a.expiry_date || '9999').localeCompare(b.expiry_date || '9999'))[0]
  const { cls, label } = expiryStatus(daysLeft(soonest.expiry_date))
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-slate-700 hover:text-blue-600">
        <FileCheck size={12} /> {soonest.country_type || '...'}
        {gpxk.length > 1 && <span className="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-[10px]">+{gpxk.length - 1}</span>}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {gpxk.map((g, i) => {
            const st = expiryStatus(daysLeft(g.expiry_date))
            return (
              <div key={g.id ?? i} className={`rounded-lg p-2 text-[11px] border ${st.cls}`}>
                <div className="font-semibold">{g.country_type || '(chưa đặt tên loại)'} {g.cert_no && <span className="font-mono font-normal">• {g.cert_no}</span>}</div>
                {g.expiry_date && <div>Hết hạn: {toDisplay(g.expiry_date)} — {st.label}</div>}
                {g.notes && <div className="italic opacity-80">{g.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── GPXK form row ─────────────────────────────────────────────────────────────
function GpxkFormRow({ item, index, onChange, onRemove }) {
  const fld = (k) => (e) => onChange(index, k, e.target.value)
  const st = expiryStatus(daysLeft(item.expiry_date))
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-700">GPXK {index + 1}</span>
        <button onClick={() => onRemove(index)} className="p-1 hover:bg-red-50 text-red-400 rounded">
          <Trash size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Nước / Loại GPXK</label>
          <input className="input text-xs py-1.5" value={item.country_type} onChange={fld('country_type')} placeholder="VD: Turkey, EU, Korea..." />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Số chứng nhận</label>
          <input className="input text-xs py-1.5 font-mono" value={item.cert_no} onChange={fld('cert_no')} placeholder="GPXK-2025-001" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Ngày cấp</label>
          <input type="date" className="input text-xs py-1.5" value={item.issue_date} onChange={fld('issue_date')} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Ngày hết hạn</label>
          <input type="date" className="input text-xs py-1.5" value={item.expiry_date} onChange={fld('expiry_date')} />
        </div>
      </div>
      {item.expiry_date && (
        <div className={`text-[11px] px-2 py-1 rounded border ${st.cls}`}>{st.label}</div>
      )}
      <div>
        <label className="text-[10px] text-slate-500 font-medium">Ghi chú</label>
        <input className="input text-xs py-1.5" value={item.notes} onChange={fld('notes')} placeholder="Ghi chú..." />
      </div>
    </div>
  )
}

// ── Company card (compact) ───────────────────────────────────────────────────
function BuyerCard({ buyer, onEdit, onDelete, onCopy }) {
  const initials = (buyer.buyer_name || '?').slice(0, 2).toUpperCase()
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-red-500','bg-teal-500','bg-pink-500','bg-indigo-500']
  const color = colors[buyer.id % colors.length]
  const enRest = (buyer.company_info_en || '').split('\n').slice(1).join('\n')

  return (
    <div className="card p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{buyer.buyer_name}</h3>
            {buyer.company_type && <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[buyer.company_type] || TYPE_COLOR['Khác']}`}>{buyer.company_type}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onCopy(buyer)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg"><Copy size={13}/></button>
          <button onClick={() => onEdit(buyer)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Pencil size={13}/></button>
          <button onClick={() => onDelete(buyer.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={13}/></button>
        </div>
      </div>
      <div className="space-y-2">
        {enRest && (
          <div className="flex items-start gap-2">
            <Building2 size={12} className="text-slate-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{enRest}</p>
          </div>
        )}
        {buyer.company_info_vi && (
          <div className="flex items-start gap-2">
            <Building2 size={12} className="text-blue-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-blue-700 leading-relaxed whitespace-pre-wrap line-clamp-3">{buyer.company_info_vi}</p>
          </div>
        )}
        {buyer.banks && buyer.banks.length > 0 && <BankList banks={buyer.banks} />}
        {buyer.gpxk && buyer.gpxk.length > 0 && <GpxkList gpxk={buyer.gpxk} />}
      </div>
    </div>
  )
}

// ── Form Drawer ──────────────────────────────────────────────────────────────
function FormDrawer({ editId, form, setForm, onSave, onClose, saving }) {
  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const updateBank = (i, v) => setForm(p => {
    const banks = [...(p.banks || [])]
    banks[i] = { ...banks[i], bank_info: v }
    return { ...p, banks }
  })
  const addBank = () => {
    if ((form.banks || []).length >= 5) { toast.error('Tối đa 5 ngân hàng'); return }
    setForm(p => ({ ...p, banks: [...(p.banks || []), { ...EMPTY_BANK }] }))
  }
  const removeBank = (i) => setForm(p => ({ ...p, banks: p.banks.filter((_, idx) => idx !== i) }))

  const updateGpxk = (i, k, v) => setForm(p => {
    const gpxk = [...(p.gpxk || [])]
    gpxk[i] = { ...gpxk[i], [k]: v }
    return { ...p, gpxk }
  })
  const addGpxk = () => {
    if ((form.gpxk || []).length >= 10) { toast.error('Tối đa 10 GPXK'); return }
    setForm(p => ({ ...p, gpxk: [...(p.gpxk || []), { ...EMPTY_GPXK }] }))
  }
  const removeGpxk = (i) => setForm(p => ({ ...p, gpxk: p.gpxk.filter((_, idx) => idx !== i) }))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{editId ? 'Chỉnh sửa Công ty' : 'Thêm Công ty mới'}</h2>
              <p className="text-xs text-slate-400">Buyer / Seller / Partner / Shipping Line</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Company type */}
          <div>
            <label className="label font-semibold text-slate-700">Loại công ty</label>
            <select className="select" value={form.company_type || ''} onChange={fld('company_type')}>
              <option value="">— Chọn loại —</option>
              {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Company info EN — one consolidated block */}
          <div>
            <label className="label font-semibold text-blue-700 flex items-center gap-2">
              <Building2 size={14} /> THÔNG TIN CÔNG TY (Tiếng Anh) *
            </label>
            <p className="text-[11px] text-slate-400 mb-1">Dán toàn bộ: tên, địa chỉ, MST, email, phone... — dòng đầu tiên sẽ dùng làm tên hiển thị</p>
            <textarea className="input font-medium" rows={6} value={form.company_info_en} onChange={fld('company_info_en')}
              placeholder={`ABC Trading Co., Ltd\n123 Nguyen Hue St, District 1, Ho Chi Minh City, Vietnam\nTax code: 0123456789\nEmail: contact@abc.com\nPhone: +84 123 456 789`}
              autoFocus />
          </div>

          {/* Company info VI — one consolidated block */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Building2 size={14} /> THÔNG TIN CÔNG TY (Tiếng Việt)
            </label>
            <textarea className="input" rows={6} value={form.company_info_vi} onChange={fld('company_info_vi')}
              placeholder={`Công ty TNHH ABC\n123 Nguyễn Huệ, Quận 1, TP.HCM\nMST: 0123456789\nEmail: contact@abc.com\nSĐT: 0123 456 789`} />
          </div>

          {/* Banks section — one free-text block per bank */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label font-semibold text-slate-700 flex items-center gap-2 mb-0">
                <CreditCard size={14} /> THÔNG TIN NGÂN HÀNG ({(form.banks || []).length}/5)
              </label>
              <button onClick={addBank} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <PlusCircle size={14} /> Thêm ngân hàng
              </button>
            </div>
            <div className="space-y-3">
              {(form.banks || []).map((bk, i) => (
                <BankFormRow key={i} bank={bk} index={i} onChange={updateBank} onRemove={removeBank} isPrimary={i === 0} />
              ))}
              {(form.banks || []).length === 0 && (
                <button onClick={addBank} className="w-full border-2 border-dashed border-slate-300 rounded-lg p-3 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  + Thêm ngân hàng đầu tiên
                </button>
              )}
            </div>
          </div>

          {/* GPXK section — repeatable license entries, one company can hold many */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label font-semibold text-slate-700 flex items-center gap-2 mb-0">
                <FileCheck size={14} /> GIẤY PHÉP XUẤT KHẨU (GPXK) ({(form.gpxk || []).length}/10)
              </label>
              <button onClick={addGpxk} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <PlusCircle size={14} /> Thêm GPXK
              </button>
            </div>
            <div className="space-y-3">
              {(form.gpxk || []).map((g, i) => (
                <GpxkFormRow key={i} item={g} index={i} onChange={updateGpxk} onRemove={removeGpxk} />
              ))}
              {(form.gpxk || []).length === 0 && (
                <button onClick={addGpxk} className="w-full border-2 border-dashed border-slate-300 rounded-lg p-3 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  + Thêm GPXK (nếu công ty có giấy phép xuất khẩu đi các nước)
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Ghi chú nội bộ</label>
            <textarea className="input" rows={2} value={form.notes} onChange={fld('notes')} placeholder="Ghi chú..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">
            <Save size={15}/> {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Buyers() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('card')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (filterType) params.company_type = filterType
    api.get('/buyers', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search, filterType])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (b) => {
    setForm({ ...EMPTY, ...b, banks: b.banks && b.banks.length > 0 ? b.banks : [{ ...EMPTY_BANK }] })
    setEditId(b.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const copyInfo = (buyer) => {
    const bankText = (buyer.banks || []).map((bk, i) => `--- Ngân hàng ${i + 1} ---\n${bk.bank_info || ''}`).join('\n\n')
    const gpxkText = (buyer.gpxk || []).map(g =>
      `GPXK ${g.country_type || ''}${g.cert_no ? ` (${g.cert_no})` : ''}: cấp ${toDisplay(g.issue_date) || '—'}, hết hạn ${toDisplay(g.expiry_date) || '—'}`
    ).join('\n')
    const text = [buyer.company_info_en, buyer.company_info_vi, bankText, gpxkText, buyer.notes].filter(Boolean).join('\n\n')
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Đã copy thông tin'))
      .catch(() => toast.error('Không thể copy'))
  }

  const save = async () => {
    if (!form.company_info_en.trim() && !form.company_info_vi.trim()) {
      toast.error('Vui lòng nhập thông tin công ty (tiếng Anh hoặc tiếng Việt)'); return
    }
    setSaving(true)
    try {
      const payload = { ...form, banks: (form.banks || []).filter(b => b.bank_info?.trim()) }
      if (editId) await api.put(`/buyers/${editId}`, payload)
      else await api.post('/buyers', payload)
      toast.success(editId ? 'Đã cập nhật' : 'Đã thêm mới')
      closeForm(); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa công ty này?')) return
    try { await api.delete(`/buyers/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">👥 Danh Sách Công Ty</h1>
          <p className="text-sm text-slate-500 mt-0.5">Buyer, Seller, Partner, Shipping Lines — thông tin & ngân hàng</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tìm tên, MST, địa chỉ, số TK..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-72" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-40">
            <option value="">Tất cả loại</option>
            {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'card' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Cards</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Bảng</button>
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Thêm</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng công ty', value: records.length, color: 'text-blue-700' },
          { label: 'Buyer', value: records.filter(r => r.company_type === 'Buyer').length, color: 'text-blue-700' },
          { label: 'Seller', value: records.filter(r => r.company_type === 'Seller').length, color: 'text-emerald-700' },
          { label: 'Có Bank', value: records.filter(r => r.banks?.length > 0).length, color: 'text-amber-700' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400">Đang tải...</div>
      ) : records.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-3">👥</div>
          <div className="text-slate-500 font-medium mb-1">{search || filterType ? 'Không tìm thấy kết quả' : 'Chưa có công ty nào'}</div>
          {!search && !filterType && <button onClick={openCreate} className="btn-primary mx-auto mt-3"><Plus size={15}/> Thêm công ty đầu tiên</button>}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {records.map(b => <BuyerCard key={b.id} buyer={b} onEdit={openEdit} onDelete={remove} onCopy={copyInfo} />)}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="table-head">#</th>
                  <th className="table-head">CÔNG TY</th>
                  <th className="table-head">LOẠI</th>
                  <th className="table-head">THÔNG TIN (VI)</th>
                  <th className="table-head">NGÂN HÀNG</th>
                  <th className="table-head">GPXK</th>
                  <th className="table-head"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((b, i) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-red-500'][b.id % 5]}`}>
                          {(b.buyer_name||'?').slice(0,2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-slate-800">{b.buyer_name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {b.company_type ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[b.company_type] || TYPE_COLOR['Khác']}`}>{b.company_type}</span> : '—'}
                    </td>
                    <td className="table-cell text-xs text-slate-600 max-w-[200px] truncate">{b.company_info_vi || '—'}</td>
                    <td className="table-cell max-w-[200px]"><BankList banks={b.banks} /></td>
                    <td className="table-cell max-w-[180px]"><GpxkList gpxk={b.gpxk} /></td>
                    <td className="table-cell">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => copyInfo(b)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg"><Copy size={13}/></button>
                        <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Pencil size={13}/></button>
                        <button onClick={() => remove(b.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{records.length} công ty</div>
        </div>
      )}

      {showForm && <FormDrawer editId={editId} form={form} setForm={setForm} onSave={save} onClose={closeForm} saving={saving} />}
    </div>
  )
}
