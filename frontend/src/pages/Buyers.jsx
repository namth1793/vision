import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, X, Save, Users, Copy, Phone, Mail, Building2,
         CreditCard, ChevronDown, ChevronUp, PlusCircle, Trash } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { toDisplay } from '../utils/dateFormat'

const EMPTY_BANK = { bank_name: '', account_no: '', swift_bic: '', iban: '', bank_branch: '', bank_address: '', currency: 'USD', notes: '' }

const EMPTY = {
  buyer_name: '',
  company_address: '',
  company_vi: '',
  tax_code: '',
  email: '',
  phone: '',
  notes: '',
  banks: [{ ...EMPTY_BANK }],
}

// ── Bank details accordion ──────────────────────────────────────────────────
function BankList({ banks }) {
  const [open, setOpen] = useState(false)
  if (!banks || banks.length === 0) return <span className="text-slate-400 text-xs">—</span>
  const primary = banks[0]
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-slate-700 hover:text-blue-600 font-mono">
        <CreditCard size={12} /> {primary.bank_name || '...'} {primary.account_no ? `• ${primary.account_no}` : ''}
        {banks.length > 1 && <span className="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-[10px]">+{banks.length - 1}</span>}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {banks.map((bk, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-2 text-[11px] font-mono border border-slate-200">
              {i === 0 && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded mr-1">PRIMARY</span>}
              {bk.bank_name && <div><b>Bank:</b> {bk.bank_name}</div>}
              {bk.account_no && <div><b>Account:</b> {bk.account_no}</div>}
              {bk.swift_bic && <div><b>Swift/BIC:</b> {bk.swift_bic}</div>}
              {bk.iban && <div><b>IBAN:</b> {bk.iban}</div>}
              {bk.bank_branch && <div><b>Branch:</b> {bk.bank_branch}</div>}
              {bk.currency && <div><b>Currency:</b> {bk.currency}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bank form row ────────────────────────────────────────────────────────────
function BankFormRow({ bank, index, onChange, onRemove, isPrimary }) {
  const fld = (k) => (e) => onChange(index, k, e.target.value)
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Bank Name</label>
          <input className="input text-xs py-1.5" value={bank.bank_name} onChange={fld('bank_name')} placeholder="VCB, BIDV, HSBC..." />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Account No</label>
          <input className="input text-xs py-1.5 font-mono" value={bank.account_no} onChange={fld('account_no')} placeholder="1234567890" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Swift/BIC</label>
          <input className="input text-xs py-1.5 font-mono" value={bank.swift_bic} onChange={fld('swift_bic')} placeholder="BFTVVNVX" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">IBAN</label>
          <input className="input text-xs py-1.5 font-mono" value={bank.iban} onChange={fld('iban')} placeholder="..." />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Branch / Chi nhánh</label>
          <input className="input text-xs py-1.5" value={bank.bank_branch} onChange={fld('bank_branch')} placeholder="Chi nhánh HCM" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium">Currency</label>
          <select className="select text-xs py-1.5" value={bank.currency} onChange={fld('currency')}>
            <option>USD</option><option>EUR</option><option>VND</option><option>GBP</option><option>JPY</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-slate-500 font-medium">Bank Address</label>
        <input className="input text-xs py-1.5" value={bank.bank_address} onChange={fld('bank_address')} placeholder="Địa chỉ ngân hàng..." />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 font-medium">Notes</label>
        <input className="input text-xs py-1.5" value={bank.notes} onChange={fld('notes')} placeholder="Ghi chú..." />
      </div>
    </div>
  )
}

// ── Buyer card (compact) ─────────────────────────────────────────────────────
function BuyerCard({ buyer, onEdit, onDelete, onCopy }) {
  const initials = (buyer.buyer_name || '?').slice(0, 2).toUpperCase()
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-red-500','bg-teal-500','bg-pink-500','bg-indigo-500']
  const color = colors[buyer.id % colors.length]

  return (
    <div className="card p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{buyer.buyer_name}</h3>
            {buyer.tax_code && <p className="text-xs text-slate-400 mt-0.5 font-mono">MST: {buyer.tax_code}</p>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onCopy(buyer)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg"><Copy size={13}/></button>
          <button onClick={() => onEdit(buyer)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Pencil size={13}/></button>
          <button onClick={() => onDelete(buyer.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={13}/></button>
        </div>
      </div>
      <div className="space-y-2">
        {buyer.company_address && (
          <div className="flex items-start gap-2">
            <Building2 size={12} className="text-slate-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-slate-600 leading-relaxed">{buyer.company_address}</p>
          </div>
        )}
        {buyer.company_vi && (
          <div className="flex items-start gap-2">
            <Building2 size={12} className="text-blue-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-blue-700 leading-relaxed">{buyer.company_vi}</p>
          </div>
        )}
        {buyer.banks && buyer.banks.length > 0 && (
          <BankList banks={buyer.banks} />
        )}
        {buyer.email && (
          <div className="flex items-center gap-2">
            <Mail size={12} className="text-slate-400 shrink-0"/>
            <a href={`mailto:${buyer.email}`} className="text-xs text-blue-600 hover:underline truncate">{buyer.email}</a>
          </div>
        )}
        {buyer.phone && (
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-slate-400 shrink-0"/>
            <span className="text-xs text-slate-600">{buyer.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Form Drawer ──────────────────────────────────────────────────────────────
function FormDrawer({ editId, form, setForm, onSave, onClose, saving }) {
  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const updateBank = (i, k, v) => setForm(p => {
    const banks = [...(p.banks || [])]
    banks[i] = { ...banks[i], [k]: v }
    return { ...p, banks }
  })
  const addBank = () => {
    if ((form.banks || []).length >= 5) { toast.error('Tối đa 5 ngân hàng'); return }
    setForm(p => ({ ...p, banks: [...(p.banks || []), { ...EMPTY_BANK }] }))
  }
  const removeBank = (i) => setForm(p => {
    const banks = p.banks.filter((_, idx) => idx !== i)
    return { ...p, banks }
  })

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
              <p className="text-xs text-slate-400">Buyers & Sellers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Company name EN */}
          <div>
            <label className="label font-semibold text-blue-700">COMPANY NAME (English) *</label>
            <input className="input font-medium" value={form.buyer_name} onChange={fld('buyer_name')}
              placeholder="Company name in English" autoFocus />
          </div>

          {/* Company name VI */}
          <div>
            <label className="label font-semibold text-slate-700">TÊN CÔNG TY (Tiếng Việt)</label>
            <input className="input" value={form.company_vi || ''} onChange={fld('company_vi')}
              placeholder="Tên đầy đủ bằng tiếng Việt" />
          </div>

          {/* Tax code */}
          <div>
            <label className="label font-semibold text-slate-700">MÃ SỐ THUẾ / Tax Code</label>
            <input className="input font-mono" value={form.tax_code || ''} onChange={fld('tax_code')}
              placeholder="0123456789" />
          </div>

          {/* Address EN */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Building2 size={14} /> COMPANY ADDRESS (English)
            </label>
            <textarea className="input" rows={3} value={form.company_address} onChange={fld('company_address')}
              placeholder={`Full company name\nAddress line 1\nCity, Country`} />
          </div>

          {/* Banks section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label font-semibold text-slate-700 flex items-center gap-2 mb-0">
                <CreditCard size={14} /> BANK DETAILS ({(form.banks || []).length}/5)
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

          {/* Email */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Mail size={14} /> Email
            </label>
            <input type="email" className="input" value={form.email} onChange={fld('email')} placeholder="contact@company.com" />
          </div>

          {/* Phone */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Phone size={14} /> Phone
            </label>
            <input type="tel" className="input" value={form.phone} onChange={fld('phone')} placeholder="+1 234 567 8900" />
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
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('card')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    api.get('/buyers', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (b) => {
    setForm({ ...EMPTY, ...b, banks: b.banks && b.banks.length > 0 ? b.banks : [{ ...EMPTY_BANK }] })
    setEditId(b.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const copyInfo = (buyer) => {
    const bankText = (buyer.banks || []).map((bk, i) =>
      `--- Ngân hàng ${i+1} ---\nBank: ${bk.bank_name || ''}\nAccount: ${bk.account_no || ''}\nSwift: ${bk.swift_bic || ''}`
    ).join('\n')
    const text = [buyer.buyer_name, buyer.company_vi, buyer.company_address, buyer.tax_code && `MST: ${buyer.tax_code}`, bankText,
      buyer.email && `Email: ${buyer.email}`, buyer.phone && `Phone: ${buyer.phone}`].filter(Boolean).join('\n\n')
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Đã copy thông tin'))
      .catch(() => toast.error('Không thể copy'))
  }

  const save = async () => {
    if (!form.buyer_name.trim()) { toast.error('Vui lòng nhập tên công ty'); return }
    setSaving(true)
    try {
      const payload = { ...form, banks: (form.banks || []).filter(b => b.bank_name || b.account_no) }
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
          <p className="text-sm text-slate-500 mt-0.5">Quản lý buyers, sellers — thông tin, ngân hàng, liên lạc</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tên, MST, địa chỉ, email..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-72" />
          </div>
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
          { label: 'Có MST', value: records.filter(r => r.tax_code).length, color: 'text-violet-700' },
          { label: 'Có Bank', value: records.filter(r => r.banks?.length > 0).length, color: 'text-emerald-700' },
          { label: 'Có Email', value: records.filter(r => r.email).length, color: 'text-amber-700' },
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
          <div className="text-slate-500 font-medium mb-1">{search ? 'Không tìm thấy kết quả' : 'Chưa có công ty nào'}</div>
          {!search && <button onClick={openCreate} className="btn-primary mx-auto mt-3"><Plus size={15}/> Thêm công ty đầu tiên</button>}
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
                  <th className="table-head">TÊN VI</th>
                  <th className="table-head">MST</th>
                  <th className="table-head">NGÂN HÀNG</th>
                  <th className="table-head">Email</th>
                  <th className="table-head">Phone</th>
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
                    <td className="table-cell text-xs text-slate-600 max-w-[160px] truncate">{b.company_vi || '—'}</td>
                    <td className="table-cell text-xs font-mono">{b.tax_code || '—'}</td>
                    <td className="table-cell max-w-[200px]"><BankList banks={b.banks} /></td>
                    <td className="table-cell text-xs">{b.email ? <a href={`mailto:${b.email}`} className="text-blue-600 hover:underline">{b.email}</a> : '—'}</td>
                    <td className="table-cell text-xs">{b.phone || '—'}</td>
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
