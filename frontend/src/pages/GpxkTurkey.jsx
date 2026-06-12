import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Save, Search, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { toDisplay } from '../utils/dateFormat'

const EMPTY = { seller: '', cert_no: '', expiry_date: '', notes: '' }

function FormDrawer({ editId, form, setForm, onSave, onClose, saving }) {
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const today = new Date().toISOString().split('T')[0]
  const daysLeft = form.expiry_date ? Math.round((new Date(form.expiry_date) - new Date()) / 86400000) : null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div>
            <h2 className="font-bold text-slate-800">{editId ? 'Sửa' : 'Thêm'} GPXK Thổ Nhĩ Kỳ</h2>
            <p className="text-xs text-slate-400 mt-0.5">Giấy phép xuất khẩu đi Turkey</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="label font-semibold">Seller *</label>
            <input className="input" value={form.seller} onChange={fld('seller')} placeholder="Tên Seller" autoFocus />
            <p className="text-xs text-slate-400 mt-1">Phải khớp với tên Seller trong Bảng Xuất để tra cứu tự động</p>
          </div>
          <div>
            <label className="label">Số Chứng Nhận / Cert No</label>
            <input className="input font-mono" value={form.cert_no} onChange={fld('cert_no')} placeholder="GPXK-2025-001" />
          </div>
          <div>
            <label className="label font-semibold">Ngày Hết Hạn</label>
            <input type="date" className="input" value={form.expiry_date} onChange={fld('expiry_date')} />
            {form.expiry_date && (
              <div className={`mt-1 flex items-center gap-2 text-xs font-medium ${daysLeft !== null && daysLeft < 30 ? 'text-red-600' : daysLeft !== null && daysLeft < 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {daysLeft !== null && daysLeft < 30 && <AlertTriangle size={13} />}
                {toDisplay(form.expiry_date)}
                {daysLeft !== null && ` — còn ${daysLeft} ngày`}
              </div>
            )}
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <textarea className="input" rows={3} value={form.notes} onChange={fld('notes')} placeholder="Ghi chú thêm..." />
          </div>
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

export default function GpxkTurkey() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    api.get('/gpxk-turkey', { params }).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditId(r.id); setShowForm(true) }
  const close = () => { setShowForm(false); setEditId(null) }

  const save = async () => {
    if (!form.seller.trim()) { toast.error('Vui lòng nhập tên Seller'); return }
    setSaving(true)
    try {
      if (editId) await api.put(`/gpxk-turkey/${editId}`, form)
      else await api.post('/gpxk-turkey', form)
      toast.success(editId ? 'Đã cập nhật' : 'Đã thêm mới')
      close(); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa?')) return
    try { await api.delete(`/gpxk-turkey/${id}`); toast.success('Đã xóa'); load() }
    catch { toast.error('Lỗi xóa') }
  }

  const today = new Date()
  const getDaysLeft = (expiry) => {
    if (!expiry) return null
    return Math.round((new Date(expiry) - today) / 86400000)
  }
  const getExpiryStatus = (days) => {
    if (days === null) return { cls: 'text-slate-400', label: '—' }
    if (days < 0) return { cls: 'bg-red-100 text-red-700', label: `Hết hạn ${Math.abs(days)} ngày trước` }
    if (days <= 30) return { cls: 'bg-red-100 text-red-700', label: `Còn ${days} ngày ⚠️` }
    if (days <= 90) return { cls: 'bg-amber-100 text-amber-700', label: `Còn ${days} ngày` }
    return { cls: 'bg-emerald-100 text-emerald-700', label: `Còn ${days} ngày` }
  }

  const expiredCount = records.filter(r => getDaysLeft(r.expiry_date) !== null && getDaysLeft(r.expiry_date) < 0).length
  const soonCount = records.filter(r => { const d = getDaysLeft(r.expiry_date); return d !== null && d >= 0 && d <= 60 }).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="page-title">🇹🇷 GPXK Đi Thổ Nhĩ Kỳ</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bảng phụ: giấy phép xuất khẩu đi Turkey — tra cứu tự động trong Bảng Xuất</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Tìm theo Seller, Cert No..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 w-56" />
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={15}/> Thêm GPXK</button>
        </div>
      </div>

      {/* Alerts */}
      {(expiredCount > 0 || soonCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <AlertTriangle size={15} className="text-red-600" />
              <span className="text-sm text-red-700 font-medium">{expiredCount} GPXK đã hết hạn</span>
            </div>
          )}
          {soonCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">{soonCount} GPXK sắp hết hạn (trong 60 ngày)</span>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">#</th>
              <th className="table-head">Seller</th>
              <th className="table-head">Cert No</th>
              <th className="table-head">Ngày Hết Hạn</th>
              <th className="table-head">Tình Trạng</th>
              <th className="table-head">Ghi chú</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">Đang tải...</td></tr> :
              records.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-2">🇹🇷</div>
                  <div>Chưa có dữ liệu — <button onClick={openCreate} className="text-blue-600 hover:underline">Thêm GPXK đầu tiên</button></div>
                </td></tr>
              ) : records.map((r, i) => {
                const days = getDaysLeft(r.expiry_date)
                const { cls, label } = getExpiryStatus(days)
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 ${days !== null && days < 0 ? 'bg-red-50/40' : days !== null && days <= 30 ? 'bg-amber-50/30' : ''}`}>
                    <td className="table-cell text-xs text-slate-400">{i + 1}</td>
                    <td className="table-cell font-semibold text-sm">{r.seller}</td>
                    <td className="table-cell font-mono text-xs">{r.cert_no || '—'}</td>
                    <td className="table-cell text-sm font-medium">{toDisplay(r.expiry_date)}</td>
                    <td className="table-cell">
                      {label !== '—' ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="table-cell text-xs text-slate-500 max-w-[200px] truncate">{r.notes || '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Pencil size={13}/></button>
                        <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {records.length > 0 && <div className="px-4 py-2 text-xs text-slate-400 border-t">{records.length} bản ghi</div>}
      </div>

      {showForm && <FormDrawer editId={editId} form={form} setForm={setForm} onSave={save} onClose={close} saving={saving} />}
    </div>
  )
}
