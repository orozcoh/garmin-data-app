import StatCard from './StatCard'

interface SummaryStatsProps {
  summary: {
    records: number
    distance: string
    timeFormatted: string
    avgHeartRate: number
    avgTemp: string
    maxTemp: string
    np: string
    tss: string
    best20min: string
  } | null
}

export default function SummaryStats({ summary }: SummaryStatsProps) {
  if (!summary) return null

  const stats = [
    { label: 'Data points', value: summary.records.toLocaleString() },
    { label: 'Distance (km)', value: summary.distance },
    { label: 'Duration', value: summary.timeFormatted },
    { label: 'Avg BPM', value: summary.avgHeartRate },
    { label: 'Avg Temp (°C)', value: summary.avgTemp },
    { label: 'Max Temp (°C)', value: summary.maxTemp },
    { label: 'NP (W)', value: summary.np },
    { label: 'TSS', value: summary.tss },
    { label: "20' Best (W)", value: summary.best20min },
  ]

  const filteredStats = stats.filter(stat => {
    const val = String(stat.value).trim()
    return val !== '' && val !== '0' && val !== 'N/A'
  })

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4">
      {filteredStats.map(stat => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </section>
  )
}
