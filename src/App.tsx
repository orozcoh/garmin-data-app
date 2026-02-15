import React, { useState, useCallback, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { parseFitFile, type ParseResult } from './lib/parseFit'
import ChartWrapper from './ChartWrapper'
import MapWrapper from './MapWrapper'
import { askAI } from './lib/askAI'



function App() {
  const [fileName, setFileName] = useState<string>('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'fileData' | 'aiTraining'>('fileData')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [sampleRate, setSampleRate] = useState<number>(10)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sampleRateOptions = [
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
    { value: 15, label: '15s' },
    { value: 20, label: '20s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1min' },
    { value: 300, label: '5min' },
  ]


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
    setAiResponse(null)
    setViewMode('fileData')

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
      avgTemp: session.avg_temperature ? session.avg_temperature.toFixed(1) : 'N/A',
      maxTemp: session.max_temperature ? session.max_temperature.toFixed(1) : 'N/A',
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
    const distances: number[] = []
    const temperatures: number[] = []
    let positions: Array<{lat: number; lng: number}> = []

    // Combine iterations (7.6 Combine Multiple Array Iterations)
    for (const record of records) {
      if (record.timestamp) timestamps.push(record.timestamp)
      if (record.heart_rate) heartRates.push(record.heart_rate)
      if (record.speed) speeds.push(record.speed)
      if (record.altitude) elevations.push(record.altitude)
      if (record.distance) distances.push(record.distance / 1000)
      if (record.temperature !== undefined) temperatures.push(record.temperature)
      if (record.position_lat !== undefined && record.position_long !== undefined) {
        positions.push({ lat: record.position_lat, lng: record.position_long })
      }
    }
    console.log("Extracted positions:", positions) // Debug log to inspect position data

    // Sample positions for map performance (100-200 points max)
    if (positions.length > 200) {
      const target = 150
      const step = Math.floor(positions.length / target)
      const sampled = [positions[0]]
      for (let i = step; i < positions.length - step; i += step) {
        sampled.push(positions[i])
      }
      sampled.push(positions[positions.length - 1])
      positions = sampled
    }

    console.log("Sampled positions for map:", positions) // Debug log to inspect sampled position data

    // Compute cumulative distance if not available
    if (distances.length === 0 && speeds.length > 0 && timestamps.length > 0) {
      let cumDist = 0
      for (let i = 1; i < timestamps.length; i++) {
        const deltaSeconds = timestamps[i] - timestamps[i - 1]
        const deltaHours = deltaSeconds / 3600
        const speed = speeds[i - 1] || 0
        cumDist += speed * deltaHours
        distances.push(cumDist)
      }
    }

    return {
      timestamps: timestamps.map(t => new Date(t * 1000).toLocaleTimeString()),
      heartRates,
      speeds,
      elevations,
      distances,
      temperatures,
      positions
    }
  }, [parseResult])

/*   useEffect(() => {
    (async () => {
  try {
    const reply = await askAI("in not more than 200 words, how to train bycle using heart rate data?");
    console.log(reply);
  } catch (error) {
    console.error("Error:", error);
  }
})();
  }, []) */

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
          {parseResult && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('fileData')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'fileData'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  File Data
                </button>
                <button
                  onClick={() => setViewMode('aiTraining')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'aiTraining'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  AI Training
                </button>
              </div>
              {viewMode === 'fileData' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Sample:</label>
                  <select
                    value={sampleRate}
                    onChange={(e) => setSampleRate(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {sampleRateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
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

        {/* Content based on view mode */}
        {viewMode === 'fileData' ? (
          <>
            {/* Summary Stats */}
            {summary && (
              <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4">
                {[
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
                  .filter(stat => {
                    const val = String(stat.value).trim()
                    return val !== '' && val !== '0' && val !== 'N/A'
                  })
                  .map(stat => (
                    <StatCard key={stat.label} label={stat.label} value={stat.value} />
                  ))}
              </section>
            )}

            {/* Device Info */}
            {parseResult && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Device</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Manufacturer', value: parseResult.device.manufacturer || '' },
                    { label: 'Model', value: parseResult.device.model || '' },
                    { label: 'GPS', value: parseResult.device.gps_enabled ? 'Yes' : 'No' },
                  ]
                    .filter(stat => {
                      const val = String(stat.value).trim()
                      return val !== '' && val !== '0' && val !== 'N/A'
                    })
                    .map(stat => (
                      <StatCard key={stat.label} label={stat.label} value={stat.value} />
                    ))}
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
                  distances={chartData.distances}
                  temperatures={chartData.temperatures}
                  sampleRate={sampleRate}
                />
                {chartData.positions && chartData.positions.length > 1 && (
                  <MapWrapper positions={chartData.positions} />
                )}
              </section>
            )}
          </>
        ) : (
          /* AI Training View */
          <section className="space-y-6">
            {!aiResponse ? (
              <div className="flex justify-center py-8">
                <button
                  onClick={async () => {
                    if (aiResponse) return
                    setIsAiLoading(true)
                    try {
                      const prompt = `Analyze this cycling workout and provide training insights in markdown format. Workout data: Distance ${summary?.distance}km, Duration ${summary?.timeFormatted}, Avg HR ${summary?.avgHeartRate} BPM, NP ${summary?.np}W, TSS ${summary?.tss}, 20min best ${summary?.best20min}W.`
                      const response = await askAI(prompt)
                      setAiResponse(response)
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to get AI response')
                    } finally {
                      setIsAiLoading(false)
                    }
                  }}
                  disabled={isAiLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
                >
                  {isAiLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    'Ask AI for training'
                  )}
                </button>
              </div>
            ) : (
              <div className="prose prose-invert prose-slate max-w-none">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            )}
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
