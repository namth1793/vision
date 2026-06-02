import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { RefreshCw } from 'lucide-react'
import api from '../lib/axios'

const fmt = n => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '0'
const fmtK = n => n ? `$${(n/1000).toFixed(0)}k` : '$0'
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const bwhStatusLabels = { 'CHƯA NHẬP KHO': 'Chưa nhập kho', 'CHƯA BÁN': 'Chưa bán', 'ĐÃ BÁN': 'Đã bán', 'ĐÃ XUẤT KHO': 'Đã xuất kho' }

export default function Reports() {
  const [overview, setOverview] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/reports/overview'), api.get('/reports/monthly'), api.get('/reports/charts')])
      .then(([r1, r2, r3]) => { setOverview(r1.data); setMonthly(r2.data); setCharts(r3.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>

  const bwhPieData = (charts?.bwhByStatus || []).map(d => ({ name: bwhStatusLabels[d.status] || d.status, value: d.count }))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={load} className="btn-secondary"><RefreshCw size={15}/> Làm mới</button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Tổng Bảng Nhập', overview?.importCount?.count ?? 0, 'text-blue-600'],
          ['Contract Value Nhập', `$${fmt(overview?.importCount?.total)}`, 'text-purple-600'],
          ['Tổng Bảng Xuất (SIGNED)', overview?.exportSigned?.count ?? 0, 'text-emerald-600'],
          ['Contract Value Xuất', `$${fmt(overview?.exportCount?.total)}`, 'text-red-600'],
        ].map(([l, v, cls]) => (
          <div key={l} className="card p-4">
            <p className="text-xs text-slate-500 font-medium">{l}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import value by month */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Bảng Nhập theo tháng (Contract Value USD)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly?.importsByMonth || []} margin={{ left: -5, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip formatter={v => [`$${fmt(v)}`, 'Giá trị']} />
              <Bar dataKey="total_value" fill="#3b82f6" radius={[4,4,0,0]} name="Giá trị (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Export value by month */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Bảng Xuất theo tháng (Contract Value USD)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly?.exportsByMonth || []} margin={{ left: -5, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip formatter={v => [`$${fmt(v)}`, 'Giá trị']} />
              <Bar dataKey="total_value" fill="#10b981" radius={[4,4,0,0]} name="Giá trị (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* BWH status pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Kho Ngoại Quan theo trạng thái</h3>
          {bwhPieData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-slate-400 text-sm">Chưa có dữ liệu kho</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={bwhPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {bwhPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Thu chi by month */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Thu Chi Nội Bộ theo tháng (VND)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts?.expensesByMonth || []} margin={{ left: -5, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000000).toFixed(0)}tr`} />
              <Tooltip formatter={v => `${fmt(v)} VND`} />
              <Legend />
              <Bar dataKey="income" name="Thu" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" name="Chi" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top importers */}
      {(charts?.importBySeller || []).length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top Seller (Bảng Nhập) theo Contract Value</h3>
          <div className="space-y-3">
            {charts.importBySeller.map((c, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center shrink-0 font-bold">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-slate-800 text-sm truncate">{c.seller}</span>
                    <span className="text-sm font-bold text-blue-700 ml-2">${fmt(c.total)}</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(c.total / (charts.importBySeller[0]?.total || 1)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{c.count} HĐ</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
