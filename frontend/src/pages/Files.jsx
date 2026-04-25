import { useState, useEffect, useRef } from 'react'
import { Upload, Search, Trash2, Download, FileText, Image, File } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import Modal from '../components/Modal'

const fmtSize = b => b < 1024 ? `${b}B` : b < 1024*1024 ? `${(b/1024).toFixed(1)}KB` : `${(b/1024/1024).toFixed(1)}MB`

const FileIcon = ({ mime }) => {
  if (mime?.startsWith('image/')) return <Image size={20} className="text-blue-500" />
  if (mime?.includes('pdf')) return <FileText size={20} className="text-red-500" />
  return <File size={20} className="text-slate-500" />
}

export default function Files() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ category: 'contract', related_type: '', notes: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (filterCat) params.category = filterCat
    api.get('/files', { params }).then(r => setFiles(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [search, filterCat])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return toast.error('Chọn file để upload')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('category', uploadForm.category)
      if (uploadForm.related_type) fd.append('related_type', uploadForm.related_type)
      await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Upload thành công'); setModal(false); setSelectedFile(null); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Upload thất bại') }
    finally { setUploading(false) }
  }

  const remove = async (f) => {
    if (!confirm(`Xóa file "${f.original_name}"?`)) return
    try { await api.delete(`/files/${f.id}`); toast.success('Đã xóa file'); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Lỗi xóa') }
  }

  const cats = [['contract', 'Hợp đồng'], ['order', 'Đơn hàng'], ['invoice', 'Hóa đơn'], ['shipping', 'Chứng từ vận tải'], ['other', 'Khác']]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" /></div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="select w-40">
            <option value="">Tất cả danh mục</option>
            {cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Upload size={16} /> Upload file</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-head">File</th><th className="table-head">Danh mục</th><th className="table-head">Kích thước</th>
              <th className="table-head">Người upload</th><th className="table-head">Ngày upload</th><th className="table-head"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">Đang tải...</td></tr> :
              files.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">Chưa có file nào</td></tr> :
              files.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <FileIcon mime={f.mime_type} />
                      <span className="font-medium text-sm max-w-64 truncate">{f.original_name}</span>
                    </div>
                  </td>
                  <td className="table-cell"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{cats.find(c => c[0] === f.category)?.[1] || f.category}</span></td>
                  <td className="table-cell text-slate-500 text-xs">{fmtSize(f.file_size)}</td>
                  <td className="table-cell text-slate-600">{f.uploader_name}</td>
                  <td className="table-cell text-xs text-slate-500">{new Date(f.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <a href={`/uploads/${f.filename}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg inline-flex"><Download size={14} /></a>
                      <button onClick={() => remove(f)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Upload file" size="sm"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Hủy</button><button onClick={handleUpload} disabled={uploading} className="btn-primary">{uploading ? 'Đang upload...' : 'Upload'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Chọn file *</label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              {selectedFile ? <p className="text-sm font-medium text-blue-600">{selectedFile.name}</p> : <p className="text-sm text-slate-500">Click để chọn file<br /><span className="text-xs text-slate-400">Tối đa 50MB</span></p>}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
          </div>
          <div><label className="label">Danh mục</label>
            <select value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))} className="select">
              {cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
