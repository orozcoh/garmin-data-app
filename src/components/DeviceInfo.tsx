import type { ParseResult } from '@/lib/parseFit'
import StatCard from './StatCard'

interface DeviceInfoProps {
  parseResult: ParseResult | null
}

export default function DeviceInfo({ parseResult }: DeviceInfoProps) {
  if (!parseResult) return null

  const stats = [
    { label: 'Manufacturer', value: parseResult.device.manufacturer || '' },
    { label: 'Model', value: parseResult.device.model || '' },
    { label: 'GPS', value: parseResult.device.gps_enabled ? 'Yes' : 'No' },
  ]

  const filteredStats = stats.filter(stat => {
    const val = String(stat.value).trim()
    return val !== '' && val !== '0' && val !== 'N/A'
  })

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Device</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredStats.map(stat => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  )
}
