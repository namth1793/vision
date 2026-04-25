import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Package, TrendingUp, TrendingDown, AlertTriangle, Clock, DollarSign, Warehouse } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
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

  const orderStatusLabels = { pending: 'Chờ xử lý', in_transit: 'Đang vận chuyển', arrived: 'Đã đến cảng', completed: 'Hoàn thành', cancelled: 'Đã hủy' }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Hợp đồng hoạt động" value={data?.activeContracts?.count || 0} subtitle={`Tổng: ${fmtUSD(data?.totalContracts?.total)} USD`} icon={FileText} color="blue" onClick={() => navigate('/contracts')} />
        <StatCard title="Đơn hàng đang vận chuyển" value={data?.inTransitOrders?.count || 0} subtitle={`Tổng đơn: ${data?.totalOrders?.count || 0}`} icon={Package} color="purple" onClick={() => navigate('/orders')} />
        <StatCard title="Công nợ phải thu" value={fmtUSD(data?.receivables?.total)} subtitle={`${data?.receivables?.count || 0} khoản chưa thu`} icon={TrendingUp} color="green" onClick={() => navigate('/debts')} />
        <StatCard title="Công nợ phải trả" value={fmtUSD(data?.payables?.total)} subtitle={`${data?.payables?.count || 0} khoản chưa trả`} icon={TrendingDown} color="red" onClick={() => navigate('/debts')} />
      </div>

      {/* Alert row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Công nợ quá hạn" value={data?.overdueDebts?.count || 0} subtitle="Cần xử lý ngay" icon={AlertTriangle} color="red" onClick={() => navigate('/debts')} />
        <StatCard title="Hoa hồng chờ duyệt" value={fmtUSD(data?.pendingCommissions?.total)} subtitle={`${data?.pendingCommissions?.count || 0} khoản`} icon={DollarSign} color="yellow" onClick={() => navigate('/commissions')} />
        <StatCard title="Chi phí chờ duyệt" value={data?.pendingExpenses?.count || 0} subtitle="Yêu cầu phê duyệt" icon={Clock} color="teal" onClick={() => navigate('/expenses')} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Hợp đồng theo tháng (giá trị USD)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly?.contractsByMonth || []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`$${fmt(v)}`, 'Giá trị']} labelFormatter={l => `Tháng ${l}`} />
              <Bar dataKey="total_value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Phân loại đơn hàng</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(charts?.orderByStatus || []).map(d => ({ ...d, name: orderStatusLabels[d.status] || d.status }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {(charts?.orderByStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
            <h3 className="font-semibold text-slate-800">Hợp đồng gần đây</h3>
            <button onClick={() => navigate('/contracts')} className="text-xs text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50"><th className="table-head">Số HĐ</th><th className="table-head">Khách hàng</th><th className="table-head">Giá trị</th><th className="table-head">TT</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentContracts || []).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono text-xs text-blue-600">{c.contract_no}</td>
                    <td className="table-cell">{c.customer_name}</td>
                    <td className="table-cell font-medium">${fmt(c.total_value)}</td>
                    <td className="table-cell"><Badge value={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Đơn hàng gần đây</h3>
            <button onClick={() => navigate('/orders')} className="text-xs text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50"><th className="table-head">Số ĐH</th><th className="table-head">Sản phẩm</th><th className="table-head">SL</th><th className="table-head">TT</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentOrders || []).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono text-xs text-blue-600">{o.order_no}</td>
                    <td className="table-cell">{o.product}</td>
                    <td className="table-cell">{o.quantity} {o.unit}</td>
                    <td className="table-cell"><Badge value={o.status} /></td>
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
