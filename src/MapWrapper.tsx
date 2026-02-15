import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import L, { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapWrapperProps {
  positions: Array<{ lat: number; lng: number }>
}

// Helper component to handle map instance
function MapController({ positions }: { positions: Array<{ lat: number; lng: number }> }) {
  const map = useMap()

  useEffect(() => {
    if (!map || positions.length === 0) return

    // Force a resize check to ensure map tiles load correctly
    setTimeout(() => {
      map.invalidateSize()
    }, 100)

    if (positions.length > 1) {
      const bounds = L.latLngBounds(positions.map(({ lat, lng }) => [lat, lng] as [number, number]))
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, positions])

  return null
}

const MapWrapper = React.memo(function MapWrapper({ positions }: MapWrapperProps) {
  if (!positions || positions.length === 0) return null

  const center: [number, number] = [positions[0].lat, positions[0].lng]

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-slate-100">Route Map</h3>
        <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">GPS ({positions.length} points)</span>
      </div>
      <div className="h-100 sm:h-125 rounded-lg overflow-hidden leaflet-container-parent">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <MapController positions={positions} />
          {positions.length > 1 && (
            <Polyline
              positions={positions.map(({lat, lng}) => [lat, lng]) as LatLngExpression[]}
              pathOptions={{
                color: '#3b82f6',
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
})

export default MapWrapper
