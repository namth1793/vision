import { useState, useEffect } from 'react'
import { Plus, Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(n) : '0'
const EMPTY = { entry_no: '', order_id: '', product: '', quantity: '', unit: 'tấn', warehouse_location: 'Kho ngoại quan Đà Nẵng', type: 'in', date: new Date().toISOString().split('T')[0], notes: '' }

export default function Warehouse() {
  const [entries, setEntries] = useState([])
  const [stock, setStock] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('entries')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (filterType) params.type = filterType
    api.get('/warehouse', { params }).then(r => setEntries(r.data))
    api.get('/warehouse/stock').then(r => setStock(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterType])
  useEffect(() => { api.get('/orders').then(r => setOrders(r.data)) }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/warehouse', form)
      toast.success(form.type === 'in' ? 'Đã nhập kho' : 'Đã xuất kho')
      setModal(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab('stock')} className={`btn ${tab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}><Package size={15} /> Tồn kho</button>
          <button onClick={() => setTab('entries')} className={`btn ${tab === 'entries' ? 'btn-primary' : 'btn-secondary'}`}>Phiếu nhập/xuất</button>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true) }} className="btn-primary"><Plus size={16} /> Tạo phiếu</button>
      </div>

      {tab === 'stock' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200"><h3 className="font-semibold text-slate-800">Tồn kho hiện tại</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-head">Sản phẩm</th><th className="table-head">Vị trí kho</th><th className="table-head">Tồn kho</th><th className="table-head">Đơn vị</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={4} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
                stock.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-slate-400">Không có hàng tồn kho</td></tr> :
                stock.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="table-cell font-medium">{s.product}</td>
                    <td className="table-cell text-slate-500">{s.warehouse_location}</td>
                    <td className="table-cell"><span className="font-bold text-emerald-600 text-lg">{fmt(s.current_stock)}</span></td>
                    <td className="table-cell">{s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'entries' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" /></div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
              <option value="">Tất cả</option><option value="in">Nhập kho</option><option value="out">Xuất kho</option>
            </select>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="table-head">Số phiếu</th><th className="table-head">Loại</th><th className="table-head">Sản phẩm</th>
                  <th className="table-head">Số lượng</th><th className="table-head">Kho</th><th className="table-head">Ngày</th>
                  <th className="table-head">ĐH liên kết</th><th className="table-head">Ghi chú</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Không có dữ liệu</td></tr> :
                  entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="table-cell font-mono text-xs text-blue-600">{e.entry_no}</td>
                      <td className="table-cell"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${e.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{e.type === 'in' ? '↓ Nhập kho' : '↑ Xuất kho'}</span></td>
                      <td className="table-cell font-medium">{e.product}</td>
                      <td className="table-cell font-bold">{fmt(e.quantity)} {e.unit}</td>
                      <td className="table-cell text-xs text-slate-500">{e.warehouse_location}</td>
                      <td className="table-cell text-xs text-slate-500">{e.date}</td>
                      <td className="table-cell text-xs text-slate-400">{e.order_no || '-'}</td>
                      <td className="table-cell text-xs text-slate-500 max-w-48 truncate">{e.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Tạo phiếu nhập/xuất kho" size="md"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu phiếu'}</button></>}>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Số phiếu *</label><input value={form.entry_no} onChange={e => f({ entry_no: e.target.value })} className="input" placeholder="WH-IN-001" /></div>
            <div><label className="label">Loại *</label>
              <select value={form.type} onChange={e => f({ type: e.target.value })} className="select w-32">
                <option value="in">Nhập kho</option><option value="out">Xuất kho</option>
              </select>
            </div>
          </div>
          <div><label className="label">Đơn hàng liên kết</label>
            <select value={form.order_id} onChange={e => f({ order_id: e.target.value })} className="select">
              <option value="">-- Không liên kết --</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.order_no} - {o.product}</option>)}
            </select>
          </div>
          <div><label className="label">Sản phẩm *</label><input value={form.product} onChange={e => f({ product: e.target.value })} className="input" placeholder="Gạo Jasmine, Cà phê Robusta..." /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Số lượng *</label><input type="number" value={form.quantity} onChange={e => f({ quantity: e.target.value })} className="input" /></div>
            <div className="w-24"><label className="label">ĐV</label>
              <select value={form.unit} onChange={e => f({ unit: e.target.value })} className="select">
                <option value="tấn">Tấn</option><option value="kg">Kg</option><option value="container">Container</option>
              </select>
            </div>
          </div>
          <div><label className="label">Vị trí kho</label><input value={form.warehouse_location} onChange={e => f({ warehouse_location: e.target.value })} className="input" /></div>
          <div><label className="label">Ngày *</label><input type="date" value={form.date} onChange={e => f({ date: e.target.value })} className="input" /></div>
          <div><label className="label">Ghi chú</label><textarea value={form.notes} onChange={e => f({ notes: e.target.value })} className="input h-20 resize-none" /></div>
        </div>
      </Modal>
    </div>
  )
}
