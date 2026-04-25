import { useState, useEffect } from 'react'
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const ROLES = [['admin', 'Admin'], ['seller', 'Seller'], ['broker', 'Môi giới'], ['staff', 'Nhân viên']]
const EMPTY = { name: '', email: '', password: '', role: 'staff', department: '', phone: '' }

export default function Users() {
  const { user: currentUser } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/users').then(r => setData(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/users', form)
      else await api.put(`/users/${form.id}`, form)
      toast.success(modal === 'create' ? 'Đã tạo tài khoản' : 'Đã cập nhật')
      setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const toggleActive = async (u) => {
    if (u.id === currentUser.id) return toast.error('Không thể vô hiệu hóa chính mình')
    try {
      await api.put(`/users/${u.id}`, { ...u, active: u.active ? 0 : 1 })
      toast.success(u.active ? 'Đã vô hiệu hóa' : 'Đã kích hoạt'); load()
    } catch (e) { toast.error('Lỗi') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const roleLabel = r => ROLES.find(x => x[0] === r)?.[1] || r
  const roleBg = { admin: 'bg-purple-100 text-purple-700', seller: 'bg-blue-100 text-blue-700', broker: 'bg-amber-100 text-amber-700', staff: 'bg-slate-100 text-slate-600' }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm(EMPTY); setModal('create') }} className="btn-primary"><Plus size={16} /> Thêm người dùng</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Họ tên</th><th className="table-head">Email</th><th className="table-head">Vai trò</th>
              <th className="table-head">Phòng ban</th><th className="table-head">Điện thoại</th><th className="table-head">Trạng thái</th>
              <th className="table-head">Ngày tạo</th><th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              data.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">{u.name[0]}</div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-500">{u.email}</td>
                  <td className="table-cell"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBg[u.role]}`}>{roleLabel(u.role)}</span></td>
                  <td className="table-cell text-slate-500">{u.department || '-'}</td>
                  <td className="table-cell text-slate-500">{u.phone || '-'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm({ ...u, password: '' }); setModal('edit') }} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => toggleActive(u)} className={`p-1.5 rounded-lg ${u.active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                          {u.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Thêm người dùng' : 'Chỉnh sửa người dùng'} size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Họ tên *</label><input value={form.name} onChange={e => f({ name: e.target.value })} className="input" /></div>
          <div><label className="label">Email *</label><input type="email" value={form.email} onChange={e => f({ email: e.target.value })} className="input" /></div>
          <div><label className="label">{modal === 'create' ? 'Mật khẩu *' : 'Mật khẩu mới (để trống nếu không đổi)'}</label><input type="password" value={form.password} onChange={e => f({ password: e.target.value })} className="input" placeholder={modal === 'edit' ? '(giữ nguyên)' : ''} /></div>
          <div><label className="label">Vai trò</label>
            <select value={form.role} onChange={e => f({ role: e.target.value })} className="select">
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label className="label">Phòng ban</label><input value={form.department} onChange={e => f({ department: e.target.value })} className="input" placeholder="Kinh Doanh, Hành Chính..." /></div>
          <div><label className="label">Điện thoại</label><input value={form.phone} onChange={e => f({ phone: e.target.value })} className="input" /></div>
        </div>
      </Modal>
    </div>
  )
}
