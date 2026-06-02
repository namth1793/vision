import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, X, Save, Users, Copy, Phone, Mail, Building2, CreditCard, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

const EMPTY = {
  buyer_name: '',
  company_address: '',
  bank_details: '',
  email: '',
  phone: '',
  notes: '',
}

function BuyerCard({ buyer, onEdit, onDelete, onCopy }) {
  const initials = (buyer.buyer_name || '?').slice(0, 2).toUpperCase()
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500']
  const color = colors[buyer.id % colors.length]

  return (
    <div className="card p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{buyer.buyer_name}</h3>
            <p className="text-xs text-slate-400 mt-0.5"># {buyer.id}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onCopy(buyer)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg" title="Copy thông tin">
            <Copy size={14}/>
          </button>
          <button onClick={() => onEdit(buyer)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Chỉnh sửa">
            <Pencil size={14}/>
          </button>
          <button onClick={() => onDelete(buyer.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Xóa">
            <Trash2 size={14}/>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {buyer.company_address && (
          <div className="flex items-start gap-2">
            <Building2 size={13} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">{buyer.company_address}</p>
          </div>
        )}
        {buyer.bank_details && (
          <div className="flex items-start gap-2">
            <CreditCard size={13} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{buyer.bank_details}</p>
          </div>
        )}
        {buyer.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-slate-400 shrink-0" />
            <a href={`mailto:${buyer.email}`} className="text-xs text-blue-600 hover:underline truncate">{buyer.email}</a>
          </div>
        )}
        {buyer.phone && (
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-slate-400 shrink-0" />
            <a href={`tel:${buyer.phone}`} className="text-xs text-slate-600">{buyer.phone}</a>
          </div>
        )}
        {buyer.notes && (
          <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-2 mt-2">{buyer.notes}</p>
        )}
      </div>
    </div>
  )
}

function FormDrawer({ editId, form, setForm, onSave, onClose, saving }) {
  const fld = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{editId ? 'Chỉnh sửa Buyer' : 'Thêm Buyer mới'}</h2>
              <p className="text-xs text-slate-400">Điền đầy đủ thông tin khách hàng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* CHOOSE BUYER */}
          <div>
            <label className="label font-semibold text-blue-700">CHOOSE BUYER</label>
            <input
              className="input font-medium"
              value={form.buyer_name}
              onChange={fld('buyer_name')}
              placeholder="Tên buyer / công ty (bắt buộc)"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">Tên ngắn gọn dùng để chọn trong các form xuất/nhập</p>
          </div>

          {/* COMPANY NAME & ADDRESS */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Building2 size={14} className="text-slate-500" />
              COMPANY NAME & ADDRESS
            </label>
            <textarea
              className="input"
              rows={4}
              value={form.company_address}
              onChange={fld('company_address')}
              placeholder={`Tên công ty đầy đủ\nĐịa chỉ dòng 1\nThành phố, Quốc gia`}
            />
          </div>

          {/* BANK DETAILS */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <CreditCard size={14} className="text-slate-500" />
              BANK DETAILS
            </label>
            <textarea
              className="input font-mono text-xs"
              rows={5}
              value={form.bank_details}
              onChange={fld('bank_details')}
              placeholder={`Bank Name: ...\nAccount No: ...\nSwift/BIC: ...\nIBAN: ...\nBranch: ...`}
            />
          </div>

          {/* Email */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Mail size={14} className="text-slate-500" />
              Email
            </label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={fld('email')}
              placeholder="contact@company.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label font-semibold text-slate-700 flex items-center gap-2">
              <Phone size={14} className="text-slate-500" />
              Phone
            </label>
            <input
              type="tel"
              className="input"
              value={form.phone}
              onChange={fld('phone')}
              placeholder="+1 234 567 8900"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Ghi chú thêm</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={fld('notes')}
              placeholder="Ghi chú nội bộ..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button onClick={onSave} disabled={saving} className="btn-primary flex-1">
            <Save size={15}/> {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Lưu Buyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Buyers() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('card') // 'card' | 'table'

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    api.get('/buyers', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (b) => { setForm({ ...EMPTY, ...b }); setEditId(b.id); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const copyInfo = (buyer) => {
    const text = [
      buyer.buyer_name,
      buyer.company_address,
      buyer.bank_details,
      buyer.email && `Email: ${buyer.email}`,
      buyer.phone && `Phone: ${buyer.phone}`,
    ].filter(Boolean).join('\n\n')
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Đã copy thông tin buyer'))
      .catch(() => toast.error('Không thể copy'))
  }

  const save = async () => {
    if (!form.buyer_name.trim()) { toast.error('Vui lòng nhập tên Buyer'); return }
    setSaving(true)
    try {
      if (editId) await api.put(`/buyers/${editId}`, form)
      else await api.post('/buyers', form)
      toast.success(editId ? 'Đã cập nhật buyer' : 'Đã thêm buyer mới')
      closeForm(); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa buyer này?')) return
    try { await api.delete(`/buyers/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  const filtered = records

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">👥 Danh Sách Khách Hàng</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý thông tin buyers, ngân hàng, liên lạc</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Tìm tên, địa chỉ, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-64"
            />
          </div>
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'card' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bảng
            </button>
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={15}/> Thêm Buyer
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Tổng buyers</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{records.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Có Bank Details</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{records.filter(r => r.bank_details).length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Có Email</div>
          <div className="text-2xl font-bold text-violet-700 mt-1">{records.filter(r => r.email).length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Có Phone</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{records.filter(r => r.phone).length}</div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-3">👥</div>
          <div className="text-slate-500 font-medium mb-1">Chưa có buyer nào</div>
          <div className="text-sm text-slate-400 mb-4">{search ? 'Không tìm thấy kết quả phù hợp' : 'Nhấn "Thêm Buyer" để bắt đầu'}</div>
          {!search && <button onClick={openCreate} className="btn-primary mx-auto"><Plus size={15}/> Thêm Buyer đầu tiên</button>}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(b => (
            <BuyerCard key={b.id} buyer={b} onEdit={openEdit} onDelete={remove} onCopy={copyInfo} />
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="table-head">#</th>
                  <th className="table-head">BUYER NAME</th>
                  <th className="table-head">COMPANY NAME & ADDRESS</th>
                  <th className="table-head">BANK DETAILS</th>
                  <th className="table-head">Email</th>
                  <th className="table-head">Phone</th>
                  <th className="table-head"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b, i) => (
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
                    <td className="table-cell max-w-[220px]">
                      <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3">{b.company_address || '—'}</p>
                    </td>
                    <td className="table-cell max-w-[200px]">
                      <p className="text-xs text-slate-500 font-mono whitespace-pre-line line-clamp-3">{b.bank_details || '—'}</p>
                    </td>
                    <td className="table-cell">
                      {b.email ? (
                        <a href={`mailto:${b.email}`} className="text-xs text-blue-600 hover:underline">{b.email}</a>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="table-cell text-xs">{b.phone || '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => copyInfo(b)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg" title="Copy"><Copy size={13}/></button>
                        <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Pencil size={13}/></button>
                        <button onClick={() => remove(b.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{filtered.length} buyers</div>
        </div>
      )}

      {/* Drawer Form */}
      {showForm && (
        <FormDrawer
          editId={editId}
          form={form}
          setForm={setForm}
          onSave={save}
          onClose={closeForm}
          saving={saving}
        />
      )}
    </div>
  )
}
