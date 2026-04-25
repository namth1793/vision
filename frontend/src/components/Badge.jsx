const cfg = {
  // contract status
  draft: ['bg-slate-100 text-slate-700', 'Nháp'],
  active: ['bg-blue-100 text-blue-700', 'Hoạt động'],
  completed: ['bg-emerald-100 text-emerald-700', 'Hoàn thành'],
  cancelled: ['bg-red-100 text-red-700', 'Đã hủy'],
  // order status
  pending: ['bg-amber-100 text-amber-700', 'Chờ xử lý'],
  in_transit: ['bg-sky-100 text-sky-700', 'Đang vận chuyển'],
  arrived: ['bg-indigo-100 text-indigo-700', 'Đã đến cảng'],
  // debt status
  partial: ['bg-orange-100 text-orange-700', 'Thanh toán 1 phần'],
  paid: ['bg-emerald-100 text-emerald-700', 'Đã thanh toán'],
  overdue: ['bg-red-100 text-red-700', 'Quá hạn'],
  // commission status
  approved: ['bg-blue-100 text-blue-700', 'Đã duyệt'],
  rejected: ['bg-red-100 text-red-700', 'Từ chối'],
  // expense status
  // type
  export: ['bg-violet-100 text-violet-700', 'Xuất khẩu'],
  import: ['bg-teal-100 text-teal-700', 'Nhập khẩu'],
  receivable: ['bg-blue-100 text-blue-700', 'Phải thu'],
  payable: ['bg-orange-100 text-orange-700', 'Phải trả'],
  // priority
  high: ['bg-red-100 text-red-700', 'Cao'],
  medium: ['bg-amber-100 text-amber-700', 'Trung bình'],
  low: ['bg-slate-100 text-slate-600', 'Thấp'],
  // expense type
  expense: ['bg-red-100 text-red-700', 'Chi'],
  income: ['bg-emerald-100 text-emerald-700', 'Thu'],
}

export default function Badge({ value, label }) {
  const [cls, lbl] = cfg[value] || ['bg-slate-100 text-slate-600', value]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label || lbl}
    </span>
  )
}
