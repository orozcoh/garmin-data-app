interface StatCardProps {
  label: string
  value: string | number
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  )
}
