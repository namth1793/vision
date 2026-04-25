import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const EMPTY = { contract_id: '', broker_id: '', rate: '', amount: '', currency: 'USD', notes: '' }

export default function Commissions() {
  const { hasRole } = useAuth()
  const [data, setData] = useState([])
  const [contracts, setContracts] = useState([])
  const [brokers, setBrokers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = {}
    if (filterStatus) params.status = filterStatus
    api.get('/commissions', { params }).then(r => setData(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filterStatus])
  useEffect(() => {
    api.get('/contracts').then(r => setContracts(r.data))
    api.get('/users/brokers').then(r => setBrokers(r.data))
  }, [])

  const calcAmount = (contractId, rate) => {
    const c = contracts.find(x => x.id == contractId)
    if (c && c.total_value && rate) return ((c.total_value * parseFloat(rate)) / 100).toFixed(2)
    return form.amount
  }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/commissions', form)
      else await api.put(`/commissions/${form.id}`, form)
      toast.success('Đã lưu'); setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const approve = async (cm) => {
    try {
      await api.put(`/commissions/${cm.id}`, { ...cm, status: 'approved', payment_date: null })
      toast.success('Đã duyệt hoa hồng'); load()
    } catch (e) { toast.error('Lỗi duyệt') }
  }

  const markPaid = async (cm) => {
    try {
      await api.put(`/commissions/${cm.id}`, { ...cm, status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
      toast.success('Đã đánh dấu đã thanh toán'); load()
    } catch (e) { toast.error('Lỗi') }
  }

  const remove = async (id) => {
    if (!confirm('Xóa khoản hoa hồng này?')) return
    try { await api.delete(`/commissions/${id}`); toast.success('Đã xóa'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const totals = { pending: data.filter(d => d.status === 'pending').reduce((s, d) => s + d.amount, 0), approved: data.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0), paid: data.filter(d => d.status === 'paid').reduce((s, d) => s + d.amount, 0) }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[['Chờ duyệt', totals.pending, 'text-amber-600 border-amber-400'], ['Đã duyệt', totals.approved, 'text-blue-600 border-blue-400'], ['Đã thanh toán', totals.paid, 'text-emerald-600 border-emerald-400']].map(([l, v, cls]) => (
          <div key={l} className={`card p-4 border-l-4 ${cls.split(' ')[2]}`}><p className="text-xs text-slate-500">{l}</p><p className={`text-xl font-bold mt-1 ${cls.split(' ')[0]}`}>${fmt(v)}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-40">
          <option value="">Tất cả TT</option><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="paid">Đã TT</option>
        </select>
        {hasRole('admin', 'seller') && <button onClick={() => { setForm(EMPTY); setModal('create') }} className="btn-primary"><Plus size={16} /> Thêm hoa hồng</button>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Hợp đồng</th><th className="table-head">Khách hàng</th><th className="table-head">Môi giới</th>
              <th className="table-head">Tỷ lệ</th><th className="table-head">Hoa hồng</th><th className="table-head">Ngày TT</th>
              <th className="table-head">Trạng thái</th><th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              data.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Không có dữ liệu</td></tr> :
              data.map(cm => (
                <tr key={cm.id} className="hover:bg-slate-50">
                  <td className="table-cell font-mono text-xs text-blue-600">{cm.contract_no}</td>
                  <td className="table-cell">{cm.customer_name}</td>
                  <td className="table-cell font-medium">{cm.broker_name}</td>
                  <td className="table-cell">{cm.rate ? `${cm.rate}%` : '-'}</td>
                  <td className="table-cell font-bold text-emerald-700">{fmt(cm.amount)} {cm.currency}</td>
                  <td className="table-cell text-xs text-slate-500">{cm.payment_date || '-'}</td>
                  <td className="table-cell"><Badge value={cm.status} /></td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      {hasRole('admin') && cm.status === 'pending' && <button onClick={() => approve(cm)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Duyệt"><CheckCircle size={14} /></button>}
                      {hasRole('admin') && cm.status === 'approved' && <button onClick={() => markPaid(cm)} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg" title="Đã TT"><CheckCircle size={14} /></button>}
                      {hasRole('admin') && <button onClick={() => { setForm({ ...cm, contract_id: cm.contract_id, broker_id: cm.broker_id }); setModal('edit') }} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>}
                      {hasRole('admin') && <button onClick={() => remove(cm.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Thêm hoa hồng' : 'Chỉnh sửa hoa hồng'} size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Hợp đồng *</label>
            <select value={form.contract_id} onChange={e => { const a = calcAmount(e.target.value, form.rate); f({ contract_id: e.target.value, amount: a }) }} className="select">
              <option value="">-- Chọn hợp đồng --</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_no} - {c.customer_name} (${fmt(c.total_value)})</option>)}
            </select>
          </div>
          <div><label className="label">Môi giới *</label>
            <select value={form.broker_id} onChange={e => f({ broker_id: e.target.value })} className="select">
              <option value="">-- Chọn môi giới --</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Tỷ lệ (%)</label>
              <input type="number" step="0.1" value={form.rate} onChange={e => { const a = calcAmount(form.contract_id, e.target.value); f({ rate: e.target.value, amount: a }) }} className="input" placeholder="1.0" /></div>
            <div className="flex-1"><label className="label">Số tiền *</label><input type="number" value={form.amount} onChange={e => f({ amount: e.target.value })} className="input" /></div>
            <div className="w-24"><label className="label">Đơn tiền</label>
              <select value={form.currency} onChange={e => f({ currency: e.target.value })} className="select">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="VND">VND</option>
              </select>
            </div>
          </div>
          {modal === 'edit' && <div><label className="label">Trạng thái</label>
            <select value={form.status} onChange={e => f({ status: e.target.value })} className="select">
              <option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="paid">Đã TT</option>
            </select>
          </div>}
          <div><label className="label">Ghi chú</label><textarea value={form.notes} onChange={e => f({ notes: e.target.value })} className="input h-20 resize-none" /></div>
        </div>
      </Modal>
    </div>
  )
}
