import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import api from '../lib/axios'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const fmtK = n => n ? `$${(n/1000).toFixed(0)}k` : '$0'
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Reports() {
  const [overview, setOverview] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/reports/overview'), api.get('/reports/monthly'), api.get('/reports/charts')])
      .then(([r1, r2, r3]) => { setOverview(r1.data); setMonthly(r2.data); setCharts(r3.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>

  const contractPieData = (charts?.contractByType || []).map(d => ({ name: d.type === 'export' ? 'Xuất khẩu' : 'Nhập khẩu', value: d.count }))
  const debtData = (charts?.debtSummary || []).map(d => ({ name: d.type === 'receivable' ? 'Phải thu' : 'Phải trả', total: d.total, paid: d.paid, remaining: d.remaining }))
  const orderPieData = (charts?.orderByStatus || []).map(d => {
    const labels = { pending: 'Chờ XL', in_transit: 'Đang VC', arrived: 'Đến cảng', completed: 'Hoàn thành', cancelled: 'Hủy' }
    return { name: labels[d.status] || d.status, value: d.count }
  })

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Tổng HĐ (đang hoạt động)', overview?.activeContracts?.count, 'text-blue-600'],
          ['Tổng giá trị HĐ', `$${fmt(overview?.totalContracts?.total)}`, 'text-purple-600'],
          ['Công nợ phải thu', `$${fmt(overview?.receivables?.total)}`, 'text-emerald-600'],
          ['Công nợ phải trả', `$${fmt(overview?.payables?.total)}`, 'text-red-600'],
        ].map(([l, v, cls]) => (
          <div key={l} className="card p-4">
            <p className="text-xs text-slate-500 font-medium">{l}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract value by month */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Giá trị hợp đồng theo tháng</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly?.contractsByMonth || []} margin={{ left: -5, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip formatter={v => [`$${fmt(v)}`, 'Giá trị']} />
              <Bar dataKey="total_value" fill="#3b82f6" radius={[4,4,0,0]} name="Giá trị (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Contract type pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Phân loại hợp đồng</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={contractPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {contractPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Order status pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Trạng thái đơn hàng</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={orderPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {orderPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Debt summary */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Tổng quan công nợ (USD)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={debtData} margin={{ left: -5, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip formatter={v => `$${fmt(v)}`} />
              <Legend />
              <Bar dataKey="total" name="Tổng" fill="#94a3b8" radius={[4,4,0,0]} />
              <Bar dataKey="paid" name="Đã TT" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="remaining" name="Còn lại" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top customers */}
      {charts?.topCustomers?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top 5 khách hàng theo giá trị hợp đồng</h3>
          <div className="space-y-3">
            {charts.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center shrink-0 font-bold">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-slate-800 text-sm truncate">{c.customer_name}</span>
                    <span className="text-sm font-bold text-blue-700 ml-2">${fmt(c.total)}</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(c.total / charts.topCustomers[0].total) * 100}%` }} />
                  </div>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{c.contracts} HĐ</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
