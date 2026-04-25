import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Package, Warehouse, CreditCard, DollarSign, FolderOpen, GitBranch, Receipt, BarChart2, Users, Building2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','seller','broker','staff'] },
  { to: '/contracts', label: 'Hợp Đồng', icon: FileText, roles: ['admin','seller','broker','staff'] },
  { to: '/orders', label: 'Đơn Hàng', icon: Package, roles: ['admin','seller','staff'] },
  { to: '/warehouse', label: 'Kho Ngoại Quan', icon: Warehouse, roles: ['admin','seller','staff'] },
  { to: '/debts', label: 'Công Nợ', icon: CreditCard, roles: ['admin','seller'] },
  { to: '/commissions', label: 'Hoa Hồng', icon: DollarSign, roles: ['admin','broker'] },
  { to: '/files', label: 'Quản Lý File', icon: FolderOpen, roles: ['admin','seller','staff'] },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch, roles: ['admin','seller'] },
  { to: '/expenses', label: 'Thu Chi Nội Bộ', icon: Receipt, roles: ['admin','seller','staff'] },
  { to: '/reports', label: 'Báo Cáo', icon: BarChart2, roles: ['admin','seller'] },
  { to: '/users', label: 'Người Dùng', icon: Users, roles: ['admin'] },
]

export default function Sidebar({ onClose }) {
  const { user } = useAuth()
  const filtered = navItems.filter(i => i.roles.includes(user?.role))

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0">
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">VISION</p>
            <p className="text-slate-400 text-xs">Hệ Thống Nội Bộ</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-700 rounded"><X size={18} /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">{user?.name?.[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
