import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Package, TrendingUp, TrendingDown, AlertTriangle, Clock, DollarSign, BookUser } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/StatCard'
import api from '../lib/axios'

const fmt = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const fmtUSD = (n) => n ? `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}` : '$0'
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/reports/overview'),
      api.get('/reports/monthly'),
      api.get('/reports/charts'),
    ]).then(([r1, r2, r3]) => {
      setData(r1.data); setMonthly(r2.data); setCharts(r3.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>

  const bwhStatusLabels = { 'CHƯA NHẬP KHO': 'Chưa nhập kho', 'CHƯA BÁN': 'Chưa bán', 'ĐÃ BÁN': 'Đã bán', 'ĐÃ XUẤT KHO': 'Đã xuất kho' }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Bảng Nhập" value={data?.importCount?.count || 0} subtitle={`Tổng: ${fmtUSD(data?.importCount?.total)} USD`} icon={FileText} color="blue" onClick={() => navigate('/import-entry')} />
        <StatCard title="Bảng Xuất" value={data?.exportCount?.count || 0} subtitle={`SIGNED: ${data?.exportSigned?.count || 0} hợp đồng`} icon={Package} color="purple" onClick={() => navigate('/export-entry')} />
        <StatCard title="Kho Ngoại Quan" value={data?.bwhCount?.count || 0} subtitle={`Chưa bán: ${data?.bwhUnsold?.count || 0} lô`} icon={TrendingUp} color="green" onClick={() => navigate('/bwh-entry')} />
        <StatCard title="Buyers" value={data?.buyerCount?.count || 0} subtitle="Khách hàng" icon={BookUser} color="teal" onClick={() => navigate('/buyers')} />
      </div>

      {/* Alert row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Thu Chi chờ duyệt" value={data?.pendingExpenses?.count || 0} subtitle="Yêu cầu phê duyệt" icon={Clock} color="yellow" onClick={() => navigate('/expenses')} />
        <StatCard title="Tổng Contract Value (Nhập)" value={fmtUSD(data?.importCount?.total)} subtitle={`${data?.importCount?.count || 0} bảng nhập`} icon={DollarSign} color="blue" onClick={() => navigate('/import-entry')} />
        <StatCard title="Tổng Contract Value (Xuất)" value={fmtUSD(data?.exportCount?.total)} subtitle={`${data?.exportCount?.count || 0} bảng xuất`} icon={TrendingDown} color="red" onClick={() => navigate('/export-entry')} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Bảng Nhập theo tháng (Contract Value USD)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly?.importsByMonth || []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`$${fmt(v)}`, 'Giá trị']} labelFormatter={l => `Tháng ${l}`} />
              <Bar dataKey="total_value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Kho Ngoại Quan theo trạng thái</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(charts?.bwhByStatus || []).map(d => ({ ...d, name: bwhStatusLabels[d.status] || d.status }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {(charts?.bwhByStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Bảng Nhập gần đây</h3>
            <button onClick={() => navigate('/import-entry')} className="text-xs text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50"><th className="table-head">Sale Contract</th><th className="table-head">Buyer</th><th className="table-head">Giá trị</th><th className="table-head">TT</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentImports || []).length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-sm">Chưa có dữ liệu</td></tr>
                ) : (data?.recentImports || []).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono text-xs text-blue-600">{c.sale_contract || '—'}</td>
                    <td className="table-cell">{c.buyer || '—'}</td>
                    <td className="table-cell font-medium">{c.contract_value ? `$${fmt(c.contract_value)}` : '—'}</td>
                    <td className="table-cell"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{c.status || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Bảng Xuất gần đây</h3>
            <button onClick={() => navigate('/export-entry')} className="text-xs text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50"><th className="table-head">Sale Contract</th><th className="table-head">Buyer1</th><th className="table-head">Commodity</th><th className="table-head">TT</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentExports || []).length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-sm">Chưa có dữ liệu</td></tr>
                ) : (data?.recentExports || []).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono text-xs text-blue-600">{o.sale_contract || '—'}</td>
                    <td className="table-cell">{o.buyer1 || '—'}</td>
                    <td className="table-cell">{o.commodity || '—'}</td>
                    <td className="table-cell"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{o.status || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
