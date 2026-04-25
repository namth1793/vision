import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/axios'

const pageTitles = {
  '/dashboard': 'Dashboard', '/contracts': 'Quản Lý Hợp Đồng', '/orders': 'Đơn Hàng XNK',
  '/warehouse': 'Kho Ngoại Quan', '/debts': 'Công Nợ & Thanh Toán', '/commissions': 'Hoa Hồng',
  '/files': 'Quản Lý File', '/pipeline': 'Pipeline', '/expenses': 'Thu Chi Nội Bộ',
  '/reports': 'Báo Cáo & Thống Kê', '/users': 'Quản Lý Người Dùng',
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const notifRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !n.read).length
  const title = pageTitles[location.pathname] || 'Vision'

  const markAllRead = async () => {
    await api.put('/notifications/read-all')
    setNotifications(p => p.map(n => ({ ...n, read: 1 })))
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
          <Menu size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotif(p => !p)} className="relative p-2 hover:bg-slate-100 rounded-lg">
            <Bell size={20} className="text-slate-600" />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-slate-800 text-sm">Thông báo</span>
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Đọc tất cả</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Không có thông báo</p>}
                {notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!n.read ? 'bg-blue-50/50' : ''}`}
                    onClick={() => { api.put(`/notifications/${n.id}/read`); setNotifications(p => p.map(x => x.id === n.id ? { ...x, read: 1 } : x)); if (n.link) { navigate(n.link); setShowNotif(false) } }}>
                    <p className={`text-sm font-medium ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={userRef}>
          <button onClick={() => setShowUser(p => !p)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-lg">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.[0]}</span>
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-12 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
