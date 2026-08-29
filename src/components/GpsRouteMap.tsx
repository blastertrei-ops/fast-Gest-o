import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DriverLocationState, GpsLogPoint } from '../types';

interface GpsRouteMapProps {
  points: GpsLogPoint[];
  currentLocation?: DriverLocationState | null;
  destination?: { latitude?: number; longitude?: number };
}

function FitRoute({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions as LatLngBoundsExpression, { padding: [28, 28], maxZoom: 16 });
    else if (positions.length === 1) map.setView(positions[0], 15);
  }, [map, positions]);
  return null;
}

export default function GpsRouteMap({ points, currentLocation, destination }: GpsRouteMapProps) {
  const routePositions = points.map(point => [point.latitude, point.longitude] as LatLngExpression);
  const currentPosition = currentLocation ? [currentLocation.latitude, currentLocation.longitude] as LatLngExpression : undefined;
  const destinationPosition = destination?.latitude !== undefined && destination?.longitude !== undefined
    ? [destination.latitude, destination.longitude] as LatLngExpression
    : undefined;
  const positions = [...routePositions, ...(currentPosition ? [currentPosition] : []), ...(destinationPosition ? [destinationPosition] : [])];
  const center = positions[0] || [-23.5505, -46.6333] as LatLngExpression;

  return (
    <div className="h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100" aria-label="Mapa da rota registrada">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 0 && <FitRoute positions={positions} />}
        {routePositions.length > 1 && <Polyline positions={routePositions} pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.85 }} />}
        {routePositions.map((position, index) => (
          <CircleMarker key={`${points[index].timestamp}-${index}`} center={position} radius={index === routePositions.length - 1 ? 7 : 4} pathOptions={{ color: '#92400e', fillColor: '#fbbf24', fillOpacity: 0.9, weight: 1 }}>
            <Tooltip>{new Date(points[index].timestamp).toLocaleTimeString('pt-BR')}</Tooltip>
          </CircleMarker>
        ))}
        {currentPosition && (
          <CircleMarker center={currentPosition} radius={9} pathOptions={{ color: '#065f46', fillColor: '#10b981', fillOpacity: 1, weight: 3 }}>
            <Tooltip permanent direction="top">Posição atual</Tooltip>
          </CircleMarker>
        )}
        {destinationPosition && (
          <CircleMarker center={destinationPosition} radius={9} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}>
            <Tooltip permanent direction="top">Destino</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
