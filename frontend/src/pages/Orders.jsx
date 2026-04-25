import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const EMPTY = { order_no: '', contract_id: '', type: 'export', product: '', quantity: '', unit: 'tấn', status: 'pending', shipment_date: '', arrival_date: '', port_loading: '', port_discharge: '', vessel: '', bill_of_lading: '', freight: '', freight_currency: 'USD', notes: '' }

export default function Orders() {
  const { hasRole } = useAuth()
  const [data, setData] = useState([])
  const [contracts, setContracts] = useState([])
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
    api.get('/orders', { params }).then(r => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterStatus, filterType])
  useEffect(() => { api.get('/contracts', { params: { status: 'active' } }).then(r => setContracts(r.data)) }, [])

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/orders', form)
      else await api.put(`/orders/${form.id}`, form)
      toast.success(modal === 'create' ? 'Đã tạo đơn hàng' : 'Đã cập nhật')
      setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa đơn hàng này?')) return
    try { await api.delete(`/orders/${id}`); toast.success('Đã xóa'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Lỗi xóa') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const statusOpts = [['pending', 'Chờ xử lý'], ['in_transit', 'Đang vận chuyển'], ['arrived', 'Đã đến cảng'], ['completed', 'Hoàn thành'], ['cancelled', 'Đã hủy']]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" /></div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-40">
            <option value="">Tất cả trạng thái</option>
            {statusOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
            <option value="">Tất cả loại</option><option value="export">Xuất khẩu</option><option value="import">Nhập khẩu</option>
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal('create') }} className="btn-primary"><Plus size={16} /> Tạo đơn hàng</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Số ĐH</th><th className="table-head">HĐ liên kết</th><th className="table-head">Loại</th>
              <th className="table-head">Sản phẩm</th><th className="table-head">SL</th><th className="table-head">Tàu</th>
              <th className="table-head">Ngày XB</th><th className="table-head">Cảng xếp</th><th className="table-head">Cảng dỡ</th>
              <th className="table-head">Cước</th><th className="table-head">Trạng thái</th><th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              data.length === 0 ? <tr><td colSpan={12} className="text-center py-12 text-slate-400">Không có dữ liệu</td></tr> :
              data.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="table-cell font-mono text-xs text-blue-600 font-medium">{o.order_no}</td>
                  <td className="table-cell text-xs text-slate-500">{o.contract_no || '-'}</td>
                  <td className="table-cell"><Badge value={o.type} /></td>
                  <td className="table-cell">{o.product}</td>
                  <td className="table-cell">{o.quantity} {o.unit}</td>
                  <td className="table-cell text-sm">{o.vessel || '-'}</td>
                  <td className="table-cell text-xs text-slate-500">{o.shipment_date || '-'}</td>
                  <td className="table-cell text-xs">{o.port_loading || '-'}</td>
                  <td className="table-cell text-xs">{o.port_discharge || '-'}</td>
                  <td className="table-cell text-sm">{o.freight ? `${o.freight} ${o.freight_currency}` : '-'}</td>
                  <td className="table-cell"><Badge value={o.status} /></td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm({ ...o, contract_id: o.contract_id || '' }); setModal('edit') }} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>
                      {hasRole('admin') && <button onClick={() => remove(o.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Tạo đơn hàng mới' : 'Chỉnh sửa đơn hàng'} size="lg"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label">Số đơn hàng *</label><input value={form.order_no} onChange={e => f({ order_no: e.target.value })} className="input" placeholder="ORD-2024-001" /></div>
          <div><label className="label">Loại *</label>
            <select value={form.type} onChange={e => f({ type: e.target.value })} className="select">
              <option value="export">Xuất khẩu</option><option value="import">Nhập khẩu</option>
            </select>
          </div>
          <div><label className="label">Hợp đồng liên kết</label>
            <select value={form.contract_id} onChange={e => f({ contract_id: e.target.value })} className="select">
              <option value="">-- Không liên kết --</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_no} - {c.customer_name}</option>)}
            </select>
          </div>
          <div><label className="label">Trạng thái</label>
            <select value={form.status} onChange={e => f({ status: e.target.value })} className="select">
              {statusOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label className="label">Sản phẩm</label><input value={form.product} onChange={e => f({ product: e.target.value })} className="input" /></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className="label">Số lượng</label><input type="number" value={form.quantity} onChange={e => f({ quantity: e.target.value })} className="input" /></div>
            <div className="w-24"><label className="label">ĐV</label>
              <select value={form.unit} onChange={e => f({ unit: e.target.value })} className="select">
                <option value="tấn">Tấn</option><option value="kg">Kg</option><option value="container">Container</option>
              </select>
            </div>
          </div>
          <div><label className="label">Ngày xuất bến</label><input type="date" value={form.shipment_date} onChange={e => f({ shipment_date: e.target.value })} className="input" /></div>
          <div><label className="label">Ngày dự kiến đến</label><input type="date" value={form.arrival_date} onChange={e => f({ arrival_date: e.target.value })} className="input" /></div>
          <div><label className="label">Cảng xếp hàng</label><input value={form.port_loading} onChange={e => f({ port_loading: e.target.value })} className="input" placeholder="Cảng Đà Nẵng" /></div>
          <div><label className="label">Cảng dỡ hàng</label><input value={form.port_discharge} onChange={e => f({ port_discharge: e.target.value })} className="input" placeholder="Hamburg Port" /></div>
          <div><label className="label">Tên tàu</label><input value={form.vessel} onChange={e => f({ vessel: e.target.value })} className="input" placeholder="MSC DIANA" /></div>
          <div><label className="label">Vận đơn (B/L)</label><input value={form.bill_of_lading} onChange={e => f({ bill_of_lading: e.target.value })} className="input" /></div>
          <div><label className="label">Cước vận chuyển</label><input type="number" value={form.freight} onChange={e => f({ freight: e.target.value })} className="input" /></div>
          <div><label className="label">Đơn tiền cước</label>
            <select value={form.freight_currency} onChange={e => f({ freight_currency: e.target.value })} className="select">
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="VND">VND</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className="label">Ghi chú</label><textarea value={form.notes} onChange={e => f({ notes: e.target.value })} className="input h-20 resize-none" /></div>
        </div>
      </Modal>
    </div>
  )
}
