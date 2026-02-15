import { useState, useCallback, useMemo } from 'react'
import { parseFitFile, type ParseResult } from './lib/parseFit'
import { askAI } from './lib/askAI'
import ChartWrapper from './ChartWrapper'
import MapWrapper from './MapWrapper'
import FileUpload from './components/FileUpload'
import ViewToggle from './components/ViewToggle'
import SummaryStats from './components/SummaryStats'
import DeviceInfo from './components/DeviceInfo'
import AITrainingView from './components/AITrainingView'

function App() {
  const [fileName, setFileName] = useState<string>('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'fileData' | 'aiTraining'>('fileData')
  const sampleRate = 300
  
  // AI state
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  
const handleAskAI = useCallback(async () => {
  if (!parseResult) return

  setAiLoading(true)
  setAiError('')

  try {
    const {
      session,
      powerProfile,
      powerZones,
      hrZones,
      efficiency,
      device,
      decoupling
    } = parseResult

    const lines: string[] = []

    // ================================
    // 🔒 ELITE COACH SYSTEM PROMPT
    // ================================
    lines.push(`
You are an elite cycling coach and performance analyst.

Analyze the following cycling workout data and return a structured markdown report.

STRICT OUTPUT RULES:
- Max 600 words.
- Use clean GitHub-flavored markdown.
- No greetings or generic introductions.
- Use ONLY the sections listed below.
- Short paragraphs and bullet points.
- Use emojis ONLY in section titles.
- Use bold for key conclusions.
- No tables.
- If data is missing, skip silently.
- Be analytical, precise, coach-level.
- Avoid motivational fluff.

TSS CLASSIFICATION:
- <50: Recovery
- 50–90: Endurance
- 90–150: Moderate/Hard
- 150–250: Very Hard
- >250: Extremely Demanding

FORMAT EXACTLY LIKE THIS:

# 🧠 Workout Analysis

## 1. Session Overview
(1 bold summary sentence + bullet insights)

## 2. Power & Intensity
- NP vs Avg Power interpretation
- Intensity Factor meaning
- TSS load classification
- Variability Index assessment

## 3. Power Duration Profile
- 5s = neuromuscular
- 1min = anaerobic
- 5–10min = VO2
- 20min = threshold
- 60min = aerobic capacity
- Strengths vs limiters

## 4. Heart Rate & Efficiency
- HR response vs power
- Decoupling meaning
- Efficiency Factor assessment

## 5. Training Effect
- Primary system trained
- Fatigue cost
- Estimated recovery time

## 6. Actionable Recommendations
- 3–5 training recommendations
- 1 recovery suggestion
- 1 progression idea
`)

    // ================================
    // 📊 WORKOUT DATA SECTION
    // ================================
    lines.push(`\n---\nWORKOUT DATA:\n`)

    const overview: string[] = []
    if (session?.date) overview.push(`- Date: ${session.date}`)
    if (session?.total_elapsed_time) overview.push(`- Duration: ${Math.round(session.total_elapsed_time / 60)} minutes`)
    if (session?.distance_m) overview.push(`- Distance: ${(session.distance_m / 1000).toFixed(2)} km`)
    if (session?.total_work_kj) overview.push(`- Total Work: ${session.total_work_kj.toFixed(1)} kJ`)
    if (session?.total_calories) overview.push(`- Calories: ${session.total_calories}`)
    if (overview.length) lines.push('\nWORKOUT OVERVIEW:\n' + overview.join('\n'))

    const speedElev: string[] = []
    if (session?.avg_speed) speedElev.push(`- Avg Speed: ${session.avg_speed.toFixed(1)} km/h`)
    if (session?.max_speed) speedElev.push(`- Max Speed: ${session.max_speed.toFixed(1)} km/h`)
    if (session?.elevation_gain) speedElev.push(`- Elevation Gain: ${session.elevation_gain} m`)
    if (session?.elevation_loss) speedElev.push(`- Elevation Loss: ${session.elevation_loss} m`)
    if (speedElev.length) lines.push('\nSPEED & ELEVATION:\n' + speedElev.join('\n'))

    const hr: string[] = []
    if (session?.avg_heart_rate) hr.push(`- Avg HR: ${session.avg_heart_rate} BPM`)
    if (session?.max_heart_rate) hr.push(`- Max HR: ${session.max_heart_rate} BPM`)
    if (hr.length) lines.push('\nHEART RATE:\n' + hr.join('\n'))

    if (hrZones) {
      const z: string[] = []
      if (hrZones.hr_z1_time) z.push(`- Z1: ${Math.round(hrZones.hr_z1_time / 60)}m`)
      if (hrZones.hr_z2_time) z.push(`- Z2: ${Math.round(hrZones.hr_z2_time / 60)}m`)
      if (hrZones.hr_z3_time) z.push(`- Z3: ${Math.round(hrZones.hr_z3_time / 60)}m`)
      if (hrZones.hr_z4_time) z.push(`- Z4: ${Math.round(hrZones.hr_z4_time / 60)}m`)
      if (hrZones.hr_z5_time) z.push(`- Z5: ${Math.round(hrZones.hr_z5_time / 60)}m`)
      if (z.length) lines.push('\nHR ZONES:\n' + z.join('\n'))
    }

    const power: string[] = []
    if (session?.avg_power) power.push(`- Avg Power: ${Math.round(session.avg_power)} W`)
    if (session?.max_power) power.push(`- Max Power: ${Math.round(session.max_power)} W`)
    if (session?.normalized_power) power.push(`- Normalized Power: ${Math.round(session.normalized_power)} W`)
    if (session?.intensity_factor) power.push(`- Intensity Factor: ${session.intensity_factor.toFixed(2)}`)
    if (session?.training_stress_score) power.push(`- TSS: ${Math.round(session.training_stress_score)}`)
    if (power.length) lines.push('\nPOWER:\n' + power.join('\n'))

    if (powerProfile) {
      const p: string[] = []
      if (powerProfile.best_5s) p.push(`- 5s: ${Math.round(powerProfile.best_5s)} W`)
      if (powerProfile.best_1min) p.push(`- 1min: ${Math.round(powerProfile.best_1min)} W`)
      if (powerProfile.best_5min) p.push(`- 5min: ${Math.round(powerProfile.best_5min)} W`)
      if (powerProfile.best_10min) p.push(`- 10min: ${Math.round(powerProfile.best_10min)} W`)
      if (powerProfile.best_20min) p.push(`- 20min: ${Math.round(powerProfile.best_20min)} W`)
      if (powerProfile.best_60min) p.push(`- 60min: ${Math.round(powerProfile.best_60min)} W`)
      if (powerProfile.watts_per_kg_best_20min) p.push(`- 20min W/kg: ${powerProfile.watts_per_kg_best_20min.toFixed(2)}`)
      if (p.length) lines.push('\nPOWER PROFILE:\n' + p.join('\n'))
    }

    if (powerZones) {
      const zones: string[] = []
      if (powerZones.z1_time_sec) zones.push(`- Z1: ${Math.round(powerZones.z1_time_sec / 60)}m`)
      if (powerZones.z2_time_sec) zones.push(`- Z2: ${Math.round(powerZones.z2_time_sec / 60)}m`)
      if (powerZones.z3_time_sec) zones.push(`- Z3: ${Math.round(powerZones.z3_time_sec / 60)}m`)
      if (powerZones.z4_time_sec) zones.push(`- Z4: ${Math.round(powerZones.z4_time_sec / 60)}m`)
      if (powerZones.z5_time_sec) zones.push(`- Z5: ${Math.round(powerZones.z5_time_sec / 60)}m`)
      if (powerZones.z6_time_sec) zones.push(`- Z6: ${Math.round(powerZones.z6_time_sec / 60)}m`)
      if (powerZones.z7_time_sec) zones.push(`- Z7: ${Math.round(powerZones.z7_time_sec / 60)}m`)
      if (zones.length) lines.push('\nPOWER ZONES:\n' + zones.join('\n'))
    }

    if (efficiency) {
      const eff: string[] = []
      if (efficiency.efficiency_factor) eff.push(`- Efficiency Factor: ${efficiency.efficiency_factor.toFixed(2)}`)
      if (efficiency.variability_index) eff.push(`- Variability Index: ${efficiency.variability_index.toFixed(2)}`)
      if (efficiency.power_hr_ratio) eff.push(`- Power/HR Ratio: ${efficiency.power_hr_ratio.toFixed(2)}`)
      if (efficiency.left_right_balance) eff.push(`- L/R Balance: ${efficiency.left_right_balance.toFixed(1)}%`)
      if (eff.length) lines.push('\nEFFICIENCY:\n' + eff.join('\n'))
    }

    if (decoupling?.hr_power_drift_percentage) {
      lines.push(`\nDECOUPLING:\n- HR/Power Drift: ${decoupling.hr_power_drift_percentage.toFixed(1)}%`)
    }

    if (device?.manufacturer || device?.model) {
      lines.push(`\nDEVICE:\n- ${device.manufacturer || ''} ${device.model || ''}`)
    }

    const response = await askAI(lines.join('\n'))
    setAiResponse(response)

  } catch (err) {
    setAiError(err instanceof Error ? err.message : 'Failed to get AI response')
  } finally {
    setAiLoading(false)
  }
}, [parseResult])



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
    setViewMode('fileData')
    // Clear AI state for new file
    setAiResponse(null)
    setAiLoading(false)
    setAiError('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const data = await parseFitFile(arrayBuffer, { ftp: 300, hrmax: 190, weight: 75 })
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

        {/* File Upload */}
        <FileUpload
          fileName={fileName}
          isLoading={isLoading}
          error={error}
          onFileChange={handleFileChange}
        />

          {parseResult && (
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}

        {/* Content based on view mode */}
        {viewMode === 'fileData' ? (
          <>
            {/* Summary Stats */}
            <SummaryStats summary={summary} />

            {/* Device Info */}
            <DeviceInfo parseResult={parseResult} />

            {/* Charts */}
            {chartData && (
              <section className="space-y-6">
                {chartData.positions && chartData.positions.length > 1 && (
                  <MapWrapper positions={chartData.positions} />
                )}
                <ChartWrapper
                  timestamps={chartData.timestamps}
                  heartRates={chartData.heartRates}
                  speeds={chartData.speeds}
                  elevations={chartData.elevations}
                  distances={chartData.distances}
                  temperatures={chartData.temperatures}
                />
              </section>
            )}
          </>
        ) : (
          /* AI Training View */
          <AITrainingView 
            aiResponse={aiResponse}
            aiLoading={aiLoading}
            aiError={aiError}
            onAskAI={handleAskAI}
          />
        )}
      </div>
    </div>
  )
}

export default App
