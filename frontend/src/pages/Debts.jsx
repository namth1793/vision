import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const EMPTY_DEBT = { type: 'receivable', party_name: '', party_country: '', original_amount: '', currency: 'USD', due_date: '', contract_id: '', notes: '' }
const EMPTY_PAY = { amount: '', currency: 'USD', payment_date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '', notes: '' }

export default function Debts() {
  const { hasRole } = useAuth()
  const [data, setData] = useState([])
  const [contracts, setContracts] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'pay'
  const [form, setForm] = useState(EMPTY_DEBT)
  const [payForm, setPayForm] = useState(EMPTY_PAY)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (filterType) params.type = filterType
    if (filterStatus) params.status = filterStatus
    api.get('/debts', { params }).then(r => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterType, filterStatus])
  useEffect(() => { api.get('/contracts').then(r => setContracts(r.data)) }, [])

  const openPay = async (debt) => {
    setSelected(debt)
    setPayForm({ ...EMPTY_PAY, currency: debt.currency, amount: debt.remaining_amount })
    const r = await api.get(`/debts/${debt.id}/payments`)
    setPayments(r.data)
    setModal('pay')
  }

  const saveDebt = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/debts', form)
      else await api.put(`/debts/${form.id}`, form)
      toast.success('Đã lưu công nợ'); setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const savePayment = async () => {
    setSaving(true)
    try {
      await api.post(`/debts/${selected.id}/payments`, payForm)
      toast.success('Đã ghi nhận thanh toán'); setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa công nợ này?')) return
    try { await api.delete(`/debts/${id}`); toast.success('Đã xóa'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))
  const fp = v => setPayForm(p => ({ ...p, ...v }))

  const totalReceivable = data.filter(d => d.type === 'receivable').reduce((s, d) => s + (d.remaining_amount || 0), 0)
  const totalPayable = data.filter(d => d.type === 'payable').reduce((s, d) => s + (d.remaining_amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 border-l-4 border-blue-500">
          <p className="text-xs text-slate-500 font-medium uppercase">Tổng phải thu còn lại</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">${fmt(totalReceivable)}</p>
        </div>
        <div className="card p-4 border-l-4 border-orange-500">
          <p className="text-xs text-slate-500 font-medium uppercase">Tổng phải trả còn lại</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">${fmt(totalPayable)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" /></div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
            <option value="">Tất cả loại</option><option value="receivable">Phải thu</option><option value="payable">Phải trả</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-40">
            <option value="">Tất cả TT</option><option value="pending">Chờ TT</option><option value="partial">TT 1 phần</option><option value="paid">Đã TT</option><option value="overdue">Quá hạn</option>
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY_DEBT); setModal('create') }} className="btn-primary"><Plus size={16} /> Thêm công nợ</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Loại</th><th className="table-head">Đối tác</th><th className="table-head">Tổng tiền</th>
              <th className="table-head">Đã TT</th><th className="table-head">Còn lại</th><th className="table-head">Hạn TT</th>
              <th className="table-head">HĐ</th><th className="table-head">Trạng thái</th><th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={9} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              data.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-slate-400">Không có dữ liệu</td></tr> :
              data.map(d => (
                <tr key={d.id} className={`hover:bg-slate-50 ${d.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                  <td className="table-cell"><Badge value={d.type} /></td>
                  <td className="table-cell"><div className="font-medium">{d.party_name}</div><div className="text-xs text-slate-400">{d.party_country}</div></td>
                  <td className="table-cell font-medium">{fmt(d.original_amount)} {d.currency}</td>
                  <td className="table-cell text-emerald-600">{fmt(d.paid_amount)}</td>
                  <td className="table-cell font-bold text-slate-800">{fmt(d.remaining_amount)}</td>
                  <td className="table-cell text-xs text-slate-500">{d.due_date || '-'}</td>
                  <td className="table-cell text-xs text-slate-400">{d.contract_no || '-'}</td>
                  <td className="table-cell"><Badge value={d.status} /></td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      {d.status !== 'paid' && <button onClick={() => openPay(d)} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg" title="Ghi nhận TT"><CreditCard size={14} /></button>}
                      <button onClick={() => { setForm({ ...d, contract_id: d.contract_id || '' }); setModal('edit') }} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>
                      {hasRole('admin') && <button onClick={() => remove(d.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Thêm công nợ' : 'Chỉnh sửa công nợ'} size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={saveDebt} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Loại *</label>
            <select value={form.type} onChange={e => f({ type: e.target.value })} className="select">
              <option value="receivable">Phải thu (Receivable)</option><option value="payable">Phải trả (Payable)</option>
            </select>
          </div>
          <div><label className="label">Tên đối tác *</label><input value={form.party_name} onChange={e => f({ party_name: e.target.value })} className="input" /></div>
          <div><label className="label">Quốc gia</label><input value={form.party_country} onChange={e => f({ party_country: e.target.value })} className="input" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Số tiền *</label><input type="number" value={form.original_amount} onChange={e => f({ original_amount: e.target.value })} className="input" /></div>
            <div className="w-24"><label className="label">Đơn tiền</label>
              <select value={form.currency} onChange={e => f({ currency: e.target.value })} className="select">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="VND">VND</option>
              </select>
            </div>
          </div>
          <div><label className="label">Hạn thanh toán</label><input type="date" value={form.due_date} onChange={e => f({ due_date: e.target.value })} className="input" /></div>
          <div><label className="label">Hợp đồng liên kết</label>
            <select value={form.contract_id} onChange={e => f({ contract_id: e.target.value })} className="select">
              <option value="">-- Không liên kết --</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_no} - {c.customer_name}</option>)}
            </select>
          </div>
          <div><label className="label">Ghi chú</label><textarea value={form.notes} onChange={e => f({ notes: e.target.value })} className="input h-20 resize-none" /></div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={modal === 'pay'} onClose={() => setModal(null)} title={`Ghi nhận thanh toán - ${selected?.party_name}`} size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={savePayment} disabled={saving} className="btn-success">{saving ? 'Đang lưu...' : 'Xác nhận thanh toán'}</button></>}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm grid grid-cols-2 gap-3">
              <div><p className="text-slate-400 text-xs">Tổng tiền</p><p className="font-bold">{fmt(selected.original_amount)} {selected.currency}</p></div>
              <div><p className="text-slate-400 text-xs">Còn lại</p><p className="font-bold text-red-600">{fmt(selected.remaining_amount)} {selected.currency}</p></div>
            </div>
            {payments.length > 0 && <div>
              <p className="label">Lịch sử thanh toán</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {payments.map(p => <div key={p.id} className="text-xs bg-emerald-50 rounded p-2 flex justify-between"><span>{p.payment_date} - {p.method}</span><span className="font-bold text-emerald-700">{fmt(p.amount)} {p.currency}</span></div>)}
              </div>
            </div>}
            <div className="flex gap-3">
              <div className="flex-1"><label className="label">Số tiền thanh toán *</label><input type="number" value={payForm.amount} onChange={e => fp({ amount: e.target.value })} className="input" /></div>
              <div className="w-24"><label className="label">Đơn tiền</label>
                <select value={payForm.currency} onChange={e => fp({ currency: e.target.value })} className="select">
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="VND">VND</option>
                </select>
              </div>
            </div>
            <div><label className="label">Ngày thanh toán *</label><input type="date" value={payForm.payment_date} onChange={e => fp({ payment_date: e.target.value })} className="input" /></div>
            <div><label className="label">Phương thức</label>
              <select value={payForm.method} onChange={e => fp({ method: e.target.value })} className="select">
                <option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="check">Séc</option>
              </select>
            </div>
            <div><label className="label">Số tham chiếu</label><input value={payForm.reference} onChange={e => fp({ reference: e.target.value })} className="input" placeholder="TT240320001" /></div>
            <div><label className="label">Ghi chú</label><textarea value={payForm.notes} onChange={e => fp({ notes: e.target.value })} className="input h-16 resize-none" /></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
