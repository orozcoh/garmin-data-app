import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { parseFitFile, type ParseResult, type FitRecord } from './lib/parseFit'
import ChartWrapper from './ChartWrapper'
import { askAI } from './lib/askAI'



function App() {
  const [fileName, setFileName] = useState<string>('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  // Early return optimization (7.8 Early Return from Functions)
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isValidFile = fileName.endsWith('.fit') || fileName.endsWith('.fir') ||
                       file.type === 'application/octet-stream' || file.type === ''

    if (!isValidFile) {
      setError('Please select a valid FIT file (.fit or .fir).')
      return
    }

    setFileName(file.name)
    setError('')
    setIsLoading(true)
    setParseResult(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const data = await parseFitFile(arrayBuffer, { ftp: 300, hrmax: 190, weight: 75 }) // <<<<<<<<<<-----------------
      console.log("Parsed data:", data) // Debug log to inspect parsed data structure
      setParseResult(data)
    } catch (err) {
      setError(err instanceof Error ? `Error parsing FIT file: ${err.message}` : 'Error parsing FIT file. Please ensure it\'s a valid Garmin FIT file.')
      console.error('Parse error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Enhanced summary using ParseResult
  const summary = useMemo(() => {
    if (!parseResult) return null

    const records = parseResult.raw.records
    const session = parseResult.session
    const np = session.normalized_power || 0
    const tss = session.training_stress_score || 0
    const best20min = parseResult.powerProfile.best_20min

    const stats = {
      records: records.length,
      distance: session.distance_m ? (session.distance_m / 1000).toFixed(2) : '0',
      time: 0,
      timeFormatted: '',
      avgHeartRate: session.avg_heart_rate || 0,
      np: np.toFixed(0),
      tss: tss.toFixed(0),
      best20min: best20min.toFixed(0),
    }

    if (session.total_elapsed_time) {
      stats.time = session.total_elapsed_time / 60
      // Format time display
      const totalMinutes = Math.round(session.total_elapsed_time / 60)
      if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        stats.timeFormatted = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      } else {
        stats.timeFormatted = `${totalMinutes}min`
      }
    }

    return stats
  }, [parseResult])

  // Prepare chart data (derived during render)
  const chartData = useMemo(() => {
    if (!parseResult) return null

    const records = parseResult.raw.records
    const timestamps: number[] = []
    const heartRates: number[] = []
    const speeds: number[] = []
    const elevations: number[] = []

    // Combine iterations (7.6 Combine Multiple Array Iterations)
    for (const record of records) {
      if (record.timestamp) timestamps.push(record.timestamp)
      if (record.heart_rate) heartRates.push(record.heart_rate)
      if (record.speed) speeds.push(record.speed)
      if (record.altitude) elevations.push(record.altitude)
    }

    return {
      timestamps: timestamps.map(t => new Date(t * 1000).toLocaleTimeString()),
      heartRates,
      speeds,
      elevations
    }
  }, [parseResult])

  useEffect(() => {
    (async () => {
  try {
    const reply = await askAI("in not more than 200 words, how to train bycle using heart rate data?");
    console.log(reply);
  } catch (error) {
    console.error("Error:", error);
  }
})();
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">
        {/* Header */}
        <header className="flex items-center flex-col gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Garmin FIT Data Viewer</h1>
          <p className="text-sm text-slate-400 max-w-2xl text-center px-2">
            Upload a FIT file to view summary stats and simple line charts. The layout is kept
            intentionally minimal for focus on the data.
          </p>
        </header>

        {/* File Upload Card */}
        <section className="border border-slate-800 bg-slate-900/70 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col flex-wrap items-center gap-3">
              <label htmlFor="file-input" className="inline-flex cursor-pointer items-center gap-3 px-6 py-3 sm:px-4 sm:py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-base sm:text-sm font-medium hover:bg-slate-750 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Choose FIT file</span>
                  </>
                )}
              </label>
              {fileName && (
                <span className="text-sm text-slate-300 truncate">{fileName}</span>
              )}
            </div>

            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".fit,application/octet-stream"
              onChange={handleFileChange}
              disabled={isLoading}
              className="hidden"
            />

            {error && (
              <div className="text-sm text-rose-300 border border-rose-800/60 bg-rose-900/40 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Summary Stats */}
        {summary && (
          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <StatCard label="Data points" value={summary.records.toLocaleString()} />
            <StatCard label="Distance (km)" value={summary.distance} />
            <StatCard label="Duration" value={summary.timeFormatted} />
            <StatCard label="Avg BPM" value={summary.avgHeartRate} />
            <StatCard label="NP (W)" value={summary.np} />
            <StatCard label="TSS" value={summary.tss} />
            <StatCard label="20' Best (W)" value={summary.best20min} />
          </section>
        )}

        {/* Device Info */}
        {parseResult && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Device</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Manufacturer" value={parseResult.device.manufacturer || 'N/A'} />
              <StatCard label="Model" value={parseResult.device.model || 'N/A'} />
              <StatCard label="GPS" value={parseResult.device.gps_enabled ? 'Yes' : 'No'} />
            </div>
          </section>
        )}

        {/* Charts */}
        {chartData && (
          <section className="space-y-6">
            <ChartWrapper
              timestamps={chartData.timestamps}
              heartRates={chartData.heartRates}
              speeds={chartData.speeds}
              elevations={chartData.elevations}
            />
          </section>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  )
}

export default App
