const colors = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-emerald-600 bg-emerald-50',
  yellow: 'text-amber-600 bg-amber-50',
  red: 'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50',
  teal: 'text-teal-600 bg-teal-50',
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', onClick }) {
  return (
    <div onClick={onClick} className={`card p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 truncate">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {Icon && <div className={`p-2.5 rounded-xl ml-3 shrink-0 ${colors[color]}`}><Icon size={22} /></div>}
      </div>
    </div>
  )
}
