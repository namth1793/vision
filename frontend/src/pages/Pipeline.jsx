import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

const EMPTY = { stage_id: '', title: '', description: '', contract_id: '', assigned_to: '', priority: 'medium', due_date: '' }

export default function Pipeline() {
  const [stages, setStages] = useState([])
  const [items, setItems] = useState([])
  const [contracts, setContracts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [s, i] = await Promise.all([api.get('/pipeline/stages'), api.get('/pipeline/items')])
    setStages(s.data); setItems(i.data); setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    api.get('/contracts').then(r => setContracts(r.data))
    api.get('/users').then(r => setUsers(r.data))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/pipeline/items', form)
      else await api.put(`/pipeline/items/${form.id}`, form)
      toast.success('Đã lưu'); setModal(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Xóa item này?')) return
    try { await api.delete(`/pipeline/items/${id}`); toast.success('Đã xóa'); load() }
    catch (e) { toast.error('Lỗi xóa') }
  }

  const moveItem = async (item, targetStageId) => {
    try {
      await api.put(`/pipeline/items/${item.id}`, { ...item, stage_id: targetStageId })
      toast.success('Đã chuyển stage'); load()
    } catch (e) { toast.error('Lỗi') }
  }

  const f = v => setForm(p => ({ ...p, ...v }))
  const itemsByStage = (stageId) => items.filter(i => i.stage_id === stageId)

  const priorityDot = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-slate-400' }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm({ ...EMPTY, stage_id: stages[0]?.id || '' }); setModal('create') }} className="btn-primary"><Plus size={16} /> Thêm vào pipeline</button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageItems = itemsByStage(stage.id)
            return (
              <div key={stage.id} className="flex-none w-72">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-semibold text-slate-700 text-sm">{stage.name}</h3>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{stageItems.length}</span>
                </div>
                <div className="space-y-3 min-h-24">
                  {stageItems.map(item => (
                    <div key={item.id} className="card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[item.priority]}`} />
                          <p className="font-medium text-slate-800 text-sm">{item.title}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setForm({ ...item, contract_id: item.contract_id || '', assigned_to: item.assigned_to || '' }); setModal('edit') }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-600"><Pencil size={12} /></button>
                          <button onClick={() => remove(item.id)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{item.description}</p>}
                      {item.contract_no && <p className="text-xs font-mono text-blue-600 mb-1">{item.contract_no}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          {item.assigned_to_name && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.assigned_to_name.split(' ').pop()}</span>}
                          {item.due_date && <span className="text-xs text-slate-400">{item.due_date}</span>}
                        </div>
                        {stage.order_index < stages.length && (
                          <button onClick={() => { const next = stages.find(s => s.order_index === stage.order_index + 1); if (next) moveItem(item, next.id) }} className="p-1 hover:bg-blue-50 text-blue-500 rounded" title="Chuyển sang bước tiếp theo">
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageItems.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl h-20 flex items-center justify-center">
                      <p className="text-xs text-slate-400">Không có item</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Thêm vào pipeline' : 'Chỉnh sửa item'} size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Tiêu đề *</label><input value={form.title} onChange={e => f({ title: e.target.value })} className="input" /></div>
          <div><label className="label">Stage *</label>
            <select value={form.stage_id} onChange={e => f({ stage_id: e.target.value })} className="select">
              <option value="">-- Chọn stage --</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Mô tả</label><textarea value={form.description} onChange={e => f({ description: e.target.value })} className="input h-20 resize-none" /></div>
          <div><label className="label">Hợp đồng liên kết</label>
            <select value={form.contract_id} onChange={e => f({ contract_id: e.target.value })} className="select">
              <option value="">-- Không liên kết --</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_no} - {c.customer_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Phụ trách</label>
              <select value={form.assigned_to} onChange={e => f({ assigned_to: e.target.value })} className="select">
                <option value="">-- Không phân công --</option>
                {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div><label className="label">Độ ưu tiên</label>
              <select value={form.priority} onChange={e => f({ priority: e.target.value })} className="select w-32">
                <option value="high">Cao</option><option value="medium">TB</option><option value="low">Thấp</option>
              </select>
            </div>
          </div>
          <div><label className="label">Hạn chót</label><input type="date" value={form.due_date} onChange={e => f({ due_date: e.target.value })} className="input" /></div>
        </div>
      </Modal>
    </div>
  )
}
