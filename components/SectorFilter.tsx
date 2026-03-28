'use client'

interface SectorFilterProps {
  sectors: string[]
  selected: string
  status: string
  category: string
}

export function SectorFilter({ sectors, selected, status, category }: SectorFilterProps) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (category) params.set('category', category)
    if (e.target.value) params.set('sector', e.target.value)
    window.location.href = `/ipos?${params.toString()}`
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-md px-3 py-1.5 focus:outline-none"
    >
      <option value="">All Sectors</option>
      {sectors.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
