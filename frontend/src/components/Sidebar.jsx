import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Warehouse, FolderOpen, GitBranch, Receipt,
  BarChart2, Users, Building2, X, History, PackageSearch, PackagePlus,
  Container, BookUser, TrendingUp, MapPin, Activity, Flag
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navGroups = [
  {
    label: 'TỔNG QUAN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','seller','broker','staff'] },
    ]
  },
  {
    label: 'DANH MỤC',
    items: [
      { to: '/buyers', label: 'Công Ty (Buyers)', icon: BookUser, roles: ['admin','seller','broker','staff'] },
      { to: '/gpxk-turkey', label: 'GPXK Thổ', icon: Flag, roles: ['admin','seller','staff'] },
    ]
  },
  {
    label: 'BẢNG THEO DÕI',
    items: [
      { to: '/import-entry', label: 'Bảng Nhập', icon: PackagePlus, roles: ['admin','seller','broker','staff'] },
      { to: '/export-entry', label: 'Bảng Xuất', icon: PackageSearch, roles: ['admin','seller','broker','staff'] },
      { to: '/export-progress', label: 'Tiến Độ Xuất', icon: Activity, roles: ['admin','seller','broker','staff'] },
      { to: '/bwh-entry', label: 'Kho Ngoại Quan', icon: Container, roles: ['admin','seller','staff'] },
    ]
  },
  {
    label: 'HÒA HỒNG',
    items: [
      { to: '/commission', label: 'Theo Dõi HH', icon: TrendingUp, roles: ['admin'] },
    ]
  },
  {
    label: 'QUẢN LÝ',
    items: [
      { to: '/history', label: 'Lịch Sử', icon: History, roles: ['admin','seller','broker','staff'] },
      { to: '/warehouse', label: 'Kho', icon: Warehouse, roles: ['admin','seller','staff'] },
      { to: '/files', label: 'Quản Lý File', icon: FolderOpen, roles: ['admin','seller','staff'] },
      { to: '/pipeline', label: 'Pipeline', icon: GitBranch, roles: ['admin','seller'] },
      { to: '/expenses', label: 'Thu Chi Nội Bộ', icon: Receipt, roles: ['admin','seller','staff'] },
      { to: '/reports', label: 'Báo Cáo', icon: BarChart2, roles: ['admin','seller'] },
      { to: '/users', label: 'Người Dùng', icon: Users, roles: ['admin'] },
    ]
  },
]

export default function Sidebar({ onClose }) {
  const { user } = useAuth()

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">VISON XNK</p>
            <p className="text-slate-400 text-xs">Hệ Thống Nội Bộ</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-700 rounded"><X size={18} /></button>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navGroups.map(group => {
          const filtered = group.items.filter(i => i.roles.includes(user?.role))
          if (filtered.length === 0) return null
          return (
            <div key={group.label}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">{group.label}</div>
              <div className="space-y-0.5">
                {filtered.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                      ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                    }>
                    <Icon size={17} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User info */}
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
