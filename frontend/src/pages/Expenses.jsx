import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const EMPTY = { type: 'expense', category: 'travel', amount: '', currency: 'VND', date: new Date().toISOString().split('T')[0], description: '' }

export default function Expenses() {
  const { hasRole } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterType) params.type = filterType
    api.get('/expenses', { params }).then(r => setData(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [search, filterStatus, filterType])

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/expenses', form)
      else await api.put(`/expenses/${form.id}`, form)
      toast.success('Đã lưu'); setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const changeStatus = async (exp, status) => {
    try {
      await api.put(`/expenses/${exp.id}`, { ...exp, status })
      toast.success(status === 'approved' ? 'Đã duyệt' : status === 'rejected' ? 'Đã từ chối' : 'Đã thanh toán')
      load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
  }

  const remove = async (id) => {
    if (!confirm('Xóa khoản này?')) return
    try { await api.delete(`/expenses/${id}`); toast.success('Đã xóa'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const cats = [['travel', 'Công tác phí'], ['entertainment', 'Tiếp khách'], ['office', 'Văn phòng phẩm'], ['transport', 'Vận tải'], ['other', 'Khác']]
  const catLabel = v => cats.find(c => c[0] === v)?.[1] || v

  const totals = { expense: data.filter(d => d.type === 'expense' && d.status !== 'rejected').reduce((s, d) => s + d.amount, 0), income: data.filter(d => d.type === 'income' && d.status !== 'rejected').reduce((s, d) => s + d.amount, 0) }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 border-l-4 border-red-500"><p className="text-xs text-slate-500">Tổng chi</p><p className="text-2xl font-bold text-red-600 mt-1">{fmt(totals.expense)} VND</p></div>
        <div className="card p-4 border-l-4 border-emerald-500"><p className="text-xs text-slate-500">Tổng thu</p><p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(totals.income)} VND</p></div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" /></div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-32">
            <option value="">Tất cả</option><option value="expense">Chi</option><option value="income">Thu</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
            <option value="">Tất cả TT</option><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="paid">Đã thanh toán</option><option value="rejected">Từ chối</option>
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal('create') }} className="btn-primary"><Plus size={16} /> Tạo khoản</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Ngày</th><th className="table-head">Loại</th><th className="table-head">Danh mục</th>
              <th className="table-head">Mô tả</th><th className="table-head">Số tiền</th><th className="table-head">Người nộp</th>
              <th className="table-head">Người duyệt</th><th className="table-head">Trạng thái</th><th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={9} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              data.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-slate-400">Không có dữ liệu</td></tr> :
              data.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50">
                  <td className="table-cell text-xs text-slate-500">{ex.date}</td>
                  <td className="table-cell"><Badge value={ex.type} /></td>
                  <td className="table-cell text-xs text-slate-600">{catLabel(ex.category)}</td>
                  <td className="table-cell max-w-56 truncate">{ex.description}</td>
                  <td className="table-cell font-bold"><span className={ex.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>{fmt(ex.amount)} {ex.currency}</span></td>
                  <td className="table-cell text-slate-500">{ex.submitter_name}</td>
                  <td className="table-cell text-slate-400 text-xs">{ex.approver_name || '-'}</td>
                  <td className="table-cell"><Badge value={ex.status} /></td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      {hasRole('admin') && ex.status === 'pending' && <>
                        <button onClick={() => changeStatus(ex, 'approved')} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg" title="Duyệt"><CheckCircle size={14} /></button>
                        <button onClick={() => changeStatus(ex, 'rejected')} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Từ chối"><XCircle size={14} /></button>
                      </>}
                      {hasRole('admin') && ex.status === 'approved' && <button onClick={() => changeStatus(ex, 'paid')} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Đã TT"><CheckCircle size={14} /></button>}
                      {ex.status === 'pending' && <button onClick={() => { setForm({ ...ex }); setModal('edit') }} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>}
                      {(ex.status === 'pending' || hasRole('admin')) && <button onClick={() => remove(ex.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Tạo khoản thu/chi' : 'Chỉnh sửa'} size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Loại *</label>
              <select value={form.type} onChange={e => f({ type: e.target.value })} className="select">
                <option value="expense">Chi phí</option><option value="income">Thu nhập</option>
              </select>
            </div>
            <div className="flex-1"><label className="label">Danh mục</label>
              <select value={form.category} onChange={e => f({ category: e.target.value })} className="select">
                {cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Mô tả *</label><input value={form.description} onChange={e => f({ description: e.target.value })} className="input" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Số tiền *</label><input type="number" value={form.amount} onChange={e => f({ amount: e.target.value })} className="input" /></div>
            <div className="w-24"><label className="label">Đơn tiền</label>
              <select value={form.currency} onChange={e => f({ currency: e.target.value })} className="select">
                <option value="VND">VND</option><option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div><label className="label">Ngày *</label><input type="date" value={form.date} onChange={e => f({ date: e.target.value })} className="input" /></div>
        </div>
      </Modal>
    </div>
  )
}
