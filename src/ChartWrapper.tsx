import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'

interface ChartWrapperProps {
  timestamps: string[]
  heartRates: number[]
  speeds: number[]
  elevations: number[]
}

function ChartWrapper({ timestamps, heartRates, speeds, elevations }: ChartWrapperProps) {
  // Prepare data for Recharts (combine arrays into objects)
  const chartData = useMemo(() => {
    const maxLength = Math.max(timestamps.length, heartRates.length, speeds.length, elevations.length)
    const data = []

    for (let i = 0; i < maxLength; i++) {
      data.push({
        time: timestamps[i] || '',
        heartRate: heartRates[i] || null,
        speed: speeds[i] || null,
        elevation: elevations[i] || null,
      })
    }

    return data
  }, [timestamps, heartRates, speeds, elevations])

  const heartRateConfig = {
    heartRate: {
      label: "Heart Rate",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig

  const speedConfig = {
    speed: {
      label: "Speed",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig

  const elevationConfig = {
    elevation: {
      label: "Elevation",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      {heartRates.length > 0 && (
        <ChartCard title="Heart rate" tag="BPM">
          <ChartContainer config={heartRateConfig} className="h-[320px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-800 border-slate-700 text-slate-100 [&>div>span:last-child]:text-white" />} />
              <Line
                type="monotone"
                dataKey="heartRate"
                stroke="#e11d48"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      )}

      {speeds.length > 0 && (
        <ChartCard title="Speed" tag="km/h">
          <ChartContainer config={speedConfig} className="h-[320px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-800 border-slate-700 text-slate-100 [&>div>span:last-child]:text-white" />} />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      )}

      {elevations.length > 0 && (
        <ChartCard title="Elevation" tag="meters">
          <ChartContainer config={elevationConfig} className="h-[320px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-800 border-slate-700 text-slate-100 [&>div>span:last-child]:text-white" />} />
              <Line
                type="monotone"
                dataKey="elevation"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      )}
    </div>
  )
}

export default ChartWrapper

function ChartCard({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">{tag}</span>
      </div>
      {children}
    </div>
  )
}
