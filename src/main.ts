import './style.css'
import Chart from 'chart.js/auto'
import FitParser from 'fit-file-parser'

const selectFileBtn = document.getElementById('selectFileBtn') as HTMLButtonElement
const fileInput = document.getElementById('fitInput') as HTMLInputElement
const fileNameDiv = document.getElementById('fileName') as HTMLDivElement
const dataSummaryDiv = document.getElementById('dataSummary') as HTMLDivElement
const heartRateCanvas = document.getElementById('heartRateChart') as HTMLCanvasElement
const speedCanvas = document.getElementById('speedChart') as HTMLCanvasElement
const elevationCanvas = document.getElementById('elevationChart') as HTMLCanvasElement

let heartRateChart: Chart | null = null
let speedChart: Chart | null = null
let elevationChart: Chart | null = null

selectFileBtn.addEventListener('click', () => {
  fileInput.click()
})

fileInput.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  fileNameDiv.textContent = `Selected file: ${file.name}`

  const reader = new FileReader()
  reader.onload = (e) => {
    const arrayBuffer = e.target?.result as ArrayBuffer
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
    })

    fitParser.parse(arrayBuffer, (error: any, data: any) => {
      if (error) {
        console.error('Error parsing file:', error)
        dataSummaryDiv.textContent = 'Error parsing FIT file.'
        return
      }

      console.log('Parsed FIT Data:', data)
      const records = data.records
      console.log(`Found ${records.length} data points.`)

      // Display summary
      let summary = `<p>Records: ${records.length}</p>`
      if (data.sessions && data.sessions.length > 0) {
        const session = data.sessions[0]
        if (session.total_distance) summary += `<p>Total Distance: ${session.total_distance.toFixed(2)} km</p>`
        if (session.total_elapsed_time) summary += `<p>Total Time: ${(session.total_elapsed_time / 60).toFixed(2)} min</p>`
        if (session.avg_heart_rate) summary += `<p>Avg Heart Rate: ${session.avg_heart_rate} bpm</p>`
      }
      dataSummaryDiv.innerHTML = summary

      // Prepare data for charts
      const timestamps: number[] = []
      const heartRates: number[] = []
      const speeds: number[] = []
      const elevations: number[] = []

      records.forEach((record: any) => {
        if (record.timestamp) timestamps.push(record.timestamp)
        if (record.heart_rate) heartRates.push(record.heart_rate)
        if (record.speed) speeds.push(record.speed)
        if (record.altitude) elevations.push(record.altitude)
      })

      // Heart Rate Chart
      if (heartRates.length > 0) {
        if (heartRateChart) heartRateChart.destroy()
        heartRateChart = new Chart(heartRateCanvas, {
          type: 'line',
          data: {
            labels: timestamps.map(t => new Date(t * 1000).toLocaleTimeString()),
            datasets: [{
              label: 'Heart Rate (bpm)',
              data: heartRates,
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.1
            }]
          }
        })
      }

      // Speed Chart
      if (speeds.length > 0) {
        if (speedChart) speedChart.destroy()
        speedChart = new Chart(speedCanvas, {
          type: 'line',
          data: {
            labels: timestamps.map(t => new Date(t * 1000).toLocaleTimeString()),
            datasets: [{
              label: 'Speed (km/h)',
              data: speeds,
              borderColor: 'rgb(54, 162, 235)',
              tension: 0.1
            }]
          }
        })
      }

      // Elevation Chart
      if (elevations.length > 0) {
        if (elevationChart) elevationChart.destroy()
        elevationChart = new Chart(elevationCanvas, {
          type: 'line',
          data: {
            labels: timestamps.map(t => new Date(t * 1000).toLocaleTimeString()),
            datasets: [{
              label: 'Elevation (m)',
              data: elevations,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          }
        })
      }
    })
  }
  reader.readAsArrayBuffer(file)
})
