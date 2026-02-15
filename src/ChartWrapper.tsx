import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'

interface ChartWrapperProps {
  timestamps: string[]
  heartRates: number[]
  speeds: number[]
  elevations: number[]
  distances: number[]
  temperatures: number[]
}

const ChartWrapper = React.memo(function ChartWrapper({ timestamps, heartRates, speeds, elevations, distances, temperatures }: ChartWrapperProps) {
  const sampleRate = 300
  // Prepare data for Recharts (combine arrays into objects)
  const chartData = useMemo(() => {
    if (timestamps.length === 0) return []

    // Parse timestamps to get the actual timestamps for sampling
    // timestamps are in locale time string format, we need to calculate indices to sample
    // Since we don't have raw timestamps, we'll sample based on array indices
    // The records in FIT files are typically 1-second intervals
    
    const data: Array<{
      time: string
      heartRate: number | null
      speed: number | null
      elevation: number | null
      distance: number | null
      temperature: number | null
    }> = []

    // Always include first point
    data.push({
      time: timestamps[0] || '',
      heartRate: heartRates[0] || null,
      speed: speeds[0] || null,
      elevation: elevations[0] || null,
      distance: distances[0] || null,
      temperature: temperatures[0] || null,
    })

    // Sample at the specified rate (every N records)
    // Assuming ~1 second intervals in the data
    for (let i = sampleRate; i < timestamps.length; i += sampleRate) {
      data.push({
        time: timestamps[i] || '',
        heartRate: heartRates[i] || null,
        speed: speeds[i] || null,
        elevation: elevations[i] || null,
        distance: distances[i] || null,
        temperature: temperatures[i] || null,
      })
    }

    // Always include last point if not already included
    const lastIndex = timestamps.length - 1
    if (lastIndex > 0 && (lastIndex % sampleRate) !== 0) {
      data.push({
        time: timestamps[lastIndex] || '',
        heartRate: heartRates[lastIndex] || null,
        speed: speeds[lastIndex] || null,
        elevation: elevations[lastIndex] || null,
        distance: distances[lastIndex] || null,
        temperature: temperatures[lastIndex] || null,
      })
    }

    return data
  }, [timestamps, heartRates, speeds, elevations, distances, temperatures])

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

  const elevationTemperatureConfig = {
    elevation: {
      label: "Elevation",
      color: "hsl(var(--chart-3))",
    },
    temperature: {
      label: "Temperature",
      color: "hsl(var(--chart-5))",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      {heartRates.length > 0 && (
        <ChartCard title="Heart rate" tag="BPM">
          <ChartContainer config={heartRateConfig} className="h-[280px] sm:h-[320px] w-full">
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
          <ChartContainer config={speedConfig} className="h-[280px] sm:h-[320px] w-full">
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

      {(elevations.length > 0 || temperatures.length > 0) && (
        <ChartCard title="Elevation & Temperature" tag="m / °C">
          <ChartContainer config={elevationTemperatureConfig} className="h-[280px] sm:h-[320px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" stroke="#0ea5e9" />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-800 border-slate-700 text-slate-100 [&>div>span:last-child]:text-white" />} />
              {elevations.length > 0 && (
                <Line
                  type="monotone"
                  yAxisId="left"
                  dataKey="elevation"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {temperatures.length > 0 && (
                <Line
                  type="monotone"
                  yAxisId="right"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ChartContainer>
        </ChartCard>
      )}

      {distances.length > 0 && (
        <ChartCard title="Distance" tag="km">
          <ChartContainer config={{
            distance: { label: "Distance", color: "hsl(var(--chart-4))" }
          }} className="h-[280px] sm:h-[320px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-800 border-slate-700 text-slate-100 [&>div>span:last-child]:text-white" />} />
              <Line
                type="monotone"
                dataKey="distance"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      )}

    </div>
  )
})

export default ChartWrapper

function ChartCard({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">{tag}</span>
      </div>
      {children}
    </div>
  )
}
