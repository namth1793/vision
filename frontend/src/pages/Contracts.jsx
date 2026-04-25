import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const EMPTY = { contract_no: '', type: 'export', customer_name: '', customer_country: '', product: '', quantity: '', unit: 'tấn', unit_price: '', currency: 'USD', status: 'draft', seller_id: '', broker_id: '', sign_date: '', delivery_date: '', payment_terms: '', notes: '' }

export default function Contracts() {
  const { hasRole } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [sellers, setSellers] = useState([])
  const [brokers, setBrokers] = useState([])
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterType) params.type = filterType
    api.get('/contracts', { params }).then(r => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterStatus, filterType])
  useEffect(() => {
    api.get('/users/sellers').then(r => setSellers(r.data))
    api.get('/users/brokers').then(r => setBrokers(r.data))
  }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (c) => { setForm({ ...c, seller_id: c.seller_id || '', broker_id: c.broker_id || '' }); setModal('edit') }
  const openView = async (c) => { const r = await api.get(`/contracts/${c.id}`); setSelected(r.data); setModal('view') }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, total_value: form.quantity && form.unit_price ? form.quantity * form.unit_price : form.total_value }
      if (modal === 'create') await api.post('/contracts', payload)
      else await api.put(`/contracts/${form.id}`, payload)
      toast.success(modal === 'create' ? 'Đã tạo hợp đồng' : 'Đã cập nhật')
      setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa hợp đồng này?')) return
    try { await api.delete(`/contracts/${id}`); toast.success('Đã xóa'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Lỗi xóa') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" /></div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option><option value="active">Hoạt động</option>
            <option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
            <option value="">Tất cả loại</option>
            <option value="export">Xuất khẩu</option><option value="import">Nhập khẩu</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Tạo hợp đồng</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">Số HĐ</th><th className="table-head">Loại</th><th className="table-head">Khách hàng</th>
              <th className="table-head">Sản phẩm</th><th className="table-head">Số lượng</th><th className="table-head">Giá trị</th>
              <th className="table-head">Seller</th><th className="table-head">Trạng thái</th><th className="table-head">Ký kết</th>
              <th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              data.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-slate-400">Không có dữ liệu</td></tr> :
              data.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="table-cell font-mono text-xs text-blue-600 font-medium">{c.contract_no}</td>
                  <td className="table-cell"><Badge value={c.type} /></td>
                  <td className="table-cell"><div className="font-medium">{c.customer_name}</div><div className="text-xs text-slate-400">{c.customer_country}</div></td>
                  <td className="table-cell">{c.product}</td>
                  <td className="table-cell">{c.quantity} {c.unit}</td>
                  <td className="table-cell font-medium">{fmt(c.total_value)} {c.currency}</td>
                  <td className="table-cell text-slate-500">{c.seller_name || '-'}</td>
                  <td className="table-cell"><Badge value={c.status} /></td>
                  <td className="table-cell text-slate-500 text-xs">{c.sign_date || '-'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openView(c)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>
                      {hasRole('admin') && <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Tạo hợp đồng mới' : 'Chỉnh sửa hợp đồng'} size="lg"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label">Số hợp đồng *</label><input value={form.contract_no} onChange={e => f({ contract_no: e.target.value })} className="input" placeholder="VN-CF-2024-001" /></div>
          <div><label className="label">Loại *</label>
            <select value={form.type} onChange={e => f({ type: e.target.value })} className="select">
              <option value="export">Xuất khẩu</option><option value="import">Nhập khẩu</option>
            </select>
          </div>
          <div><label className="label">Khách hàng/Đối tác *</label><input value={form.customer_name} onChange={e => f({ customer_name: e.target.value })} className="input" placeholder="Tên công ty" /></div>
          <div><label className="label">Quốc gia</label><input value={form.customer_country} onChange={e => f({ customer_country: e.target.value })} className="input" placeholder="Đức, Nhật Bản..." /></div>
          <div className="md:col-span-2"><label className="label">Sản phẩm *</label><input value={form.product} onChange={e => f({ product: e.target.value })} className="input" placeholder="Cà phê Robusta, Cao su SVR 10..." /></div>
          <div><label className="label">Số lượng</label><input type="number" value={form.quantity} onChange={e => f({ quantity: e.target.value })} className="input" /></div>
          <div><label className="label">Đơn vị</label>
            <select value={form.unit} onChange={e => f({ unit: e.target.value })} className="select">
              <option value="tấn">Tấn</option><option value="kg">Kg</option><option value="container">Container</option><option value="lô">Lô</option><option value="chiếc">Chiếc</option>
            </select>
          </div>
          <div><label className="label">Đơn giá</label><input type="number" value={form.unit_price} onChange={e => f({ unit_price: e.target.value })} className="input" /></div>
          <div><label className="label">Đồng tiền</label>
            <select value={form.currency} onChange={e => f({ currency: e.target.value })} className="select">
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="VND">VND</option><option value="JPY">JPY</option>
            </select>
          </div>
          {form.quantity && form.unit_price && <div className="md:col-span-2 bg-blue-50 rounded-lg p-3 text-sm"><span className="text-slate-600">Tổng giá trị: </span><span className="font-bold text-blue-700">{fmt(form.quantity * form.unit_price)} {form.currency}</span></div>}
          <div><label className="label">Trạng thái</label>
            <select value={form.status} onChange={e => f({ status: e.target.value })} className="select">
              <option value="draft">Nháp</option><option value="active">Hoạt động</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option>
            </select>
          </div>
          <div><label className="label">Seller</label>
            <select value={form.seller_id} onChange={e => f({ seller_id: e.target.value })} className="select">
              <option value="">-- Chọn seller --</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Môi giới</label>
            <select value={form.broker_id} onChange={e => f({ broker_id: e.target.value })} className="select">
              <option value="">-- Không có --</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="label">Điều khoản thanh toán</label><input value={form.payment_terms} onChange={e => f({ payment_terms: e.target.value })} className="input" placeholder="L/C, T/T 30 ngày..." /></div>
          <div><label className="label">Ngày ký</label><input type="date" value={form.sign_date} onChange={e => f({ sign_date: e.target.value })} className="input" /></div>
          <div><label className="label">Ngày giao hàng</label><input type="date" value={form.delivery_date} onChange={e => f({ delivery_date: e.target.value })} className="input" /></div>
          <div className="md:col-span-2"><label className="label">Ghi chú</label><textarea value={form.notes} onChange={e => f({ notes: e.target.value })} className="input h-20 resize-none" /></div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={modal === 'view'} onClose={() => setModal(null)} title={`Chi tiết: ${selected?.contract_no}`} size="xl"
        footer={<><button onClick={() => { openEdit(selected); }} className="btn-secondary">Chỉnh sửa</button><button onClick={() => setModal(null)} className="btn-primary">Đóng</button></>}>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[['Số HĐ', selected.contract_no], ['Loại', selected.type === 'export' ? 'Xuất khẩu' : 'Nhập khẩu'], ['Khách hàng', selected.customer_name], ['Quốc gia', selected.customer_country], ['Sản phẩm', selected.product], ['Số lượng', `${selected.quantity} ${selected.unit}`], ['Đơn giá', `${fmt(selected.unit_price)} ${selected.currency}`], ['Tổng giá trị', `${fmt(selected.total_value)} ${selected.currency}`], ['Seller', selected.seller_name || '-'], ['Môi giới', selected.broker_name || '-'], ['Ngày ký', selected.sign_date || '-'], ['Giao hàng', selected.delivery_date || '-']].map(([k, v]) => (
                <div key={k}><p className="text-slate-400 text-xs">{k}</p><p className="font-medium text-slate-800">{v}</p></div>
              ))}
            </div>
            {selected.notes && <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600"><span className="font-medium">Ghi chú: </span>{selected.notes}</div>}
            {selected.orders?.length > 0 && <div><h4 className="font-semibold text-slate-700 mb-2">Đơn hàng ({selected.orders.length})</h4>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50"><th className="table-head">Số ĐH</th><th className="table-head">Tàu</th><th className="table-head">Xuất bến</th><th className="table-head">Trạng thái</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{selected.orders.map(o => <tr key={o.id}><td className="table-cell font-mono text-xs">{o.order_no}</td><td className="table-cell">{o.vessel || '-'}</td><td className="table-cell">{o.shipment_date || '-'}</td><td className="table-cell"><Badge value={o.status} /></td></tr>)}</tbody></table></div></div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
