import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DriverLocationState, Entrega } from '../types';

interface LiveDriversMapProps {
  locations: DriverLocationState[];
  deliveries: Entrega[];
  focusedDriverId?: string | null;
  onSelectDriver: (driverId: string) => void;
  className?: string;
}

function FitLocations({ positions, focusedPosition }: { positions: LatLngExpression[]; focusedPosition?: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    if (focusedPosition) map.setView(focusedPosition, 16);
    else if (positions.length > 1) map.fitBounds(positions as LatLngBoundsExpression, { padding: [32, 32], maxZoom: 15 });
    else if (positions.length === 1) map.setView(positions[0], 15);
  }, [map, positions, focusedPosition]);
  return null;
}

export default function LiveDriversMap({ locations, deliveries, focusedDriverId, onSelectDriver, className = 'h-[360px]' }: LiveDriversMapProps) {
  const positions = locations.map(location => [location.latitude, location.longitude] as LatLngExpression);
  const focused = locations.find(location => location.driverId === focusedDriverId);
  const focusedPosition = focused ? [focused.latitude, focused.longitude] as LatLngExpression : undefined;
  const center = focusedPosition || positions[0] || [-23.5505, -46.6333] as LatLngExpression;

  return (
    <div className={`${className} overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs`} aria-label="Mapa ao vivo dos entregadores">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 0 && <FitLocations positions={positions} focusedPosition={focusedPosition} />}
        {locations.map(location => {
          const delivery = deliveries.find(item => item.id === location.currentDeliveryId || (item.motoristaId === location.driverId && item.status === 'em_rota'));
          const isFocused = location.driverId === focusedDriverId;
          return (
            <CircleMarker
              key={location.driverId}
              center={[location.latitude, location.longitude]}
              radius={isFocused ? 12 : 9}
              pathOptions={{ color: isFocused ? '#92400e' : '#065f46', fillColor: isFocused ? '#f59e0b' : '#10b981', fillOpacity: 0.95, weight: 3 }}
              eventHandlers={{ click: () => onSelectDriver(location.driverId) }}
            >
              <Tooltip direction="top">
                <strong>{location.driverName}</strong><br />
                {delivery ? `NF #${delivery.numeroNF} · ${location.speed || 0} km/h` : 'Sem entrega em rota'}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
