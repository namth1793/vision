import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

// Reusable "Tải mẫu Excel" + "Upload Excel" pair for a multi-tab entry page.
// `resource` is the API path segment (e.g. 'trades', 'import-records').
export default function ExcelImportExport({ resource, filename, onImported }) {
  const fileRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const downloadTemplate = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/${resource}/template`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename || `mau_${resource}`}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch { toast.error('Lỗi tải mẫu Excel') }
    finally { setDownloading(false) }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/${resource}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000
      })
      const { created = 0, updated = 0, errors = [] } = res.data
      if (errors.length) {
        toast.error(`Đã nhập ${created} mới, cập nhật ${updated}, lỗi ${errors.length} dòng (${errors.map(er => er.row).join(', ')})`, { duration: 6000 })
      } else {
        toast.success(`Đã nhập ${created} bản ghi mới, cập nhật ${updated} bản ghi`)
      }
      onImported?.()
    } catch (e) { toast.error(e.response?.data?.error || 'Lỗi upload file') }
    finally { setUploading(false) }
  }

  return (
    <>
      <button onClick={downloadTemplate} disabled={downloading} className="btn-secondary">
        <Download size={16}/> {downloading ? 'Đang tải...' : 'Tải mẫu Excel'}
      </button>
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary">
        <Upload size={16}/> {uploading ? 'Đang xử lý...' : 'Upload Excel'}
      </button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
    </>
  )
}
