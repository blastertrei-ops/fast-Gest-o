import { GpsLogPoint, DriverLocationState, DeliveryRouteHistory } from '../types';
import { Database } from './db';
import { OfflineStorage } from './offlineDb';

let activeWatchId: number | null = null;
let activeIntervalId: any = null;
let currentTrackingDriverId: string | null = null;
let currentTrackingCompanyId: string | null = null;
let currentDeliveryId: string | null = null;
let lastTransmittedPoint: GpsLogPoint | null = null;

const MIN_TRANSMIT_INTERVAL_MS = 12_000;
const MIN_TRANSMIT_DISTANCE_KM = 0.015;

/**
 * Haversine formula to calculate distance between two coordinates in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Estimate ETA (Estimated Time of Arrival)
 */
export function calculateEta(
  distanceKm: number,
  currentSpeedKmH: number = 30
): { minutes: number; formattedEta: string; speedUsed: number } {
  // Urban average speed fallback if stopped or speed < 5 km/h
  const speed = currentSpeedKmH > 5 ? currentSpeedKmH : 30;
  const hours = distanceKm / speed;
  const minutes = Math.max(1, Math.round(hours * 60));

  const targetTime = new Date(Date.now() + minutes * 60 * 1000);
  const hoursStr = String(targetTime.getHours()).padStart(2, '0');
  const minsStr = String(targetTime.getMinutes()).padStart(2, '0');

  return {
    minutes,
    formattedEta: `${hoursStr}:${minsStr} (${minutes} min)`,
    speedUsed: speed
  };
}

/**
 * Reverse geocoding fallback string
 */
export function formatCoordinatesAddress(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Start active GPS tracking for a driver
 */
export function startDriverGpsTracking(
  driverId: string,
  driverName: string,
  companyId: string,
  activeDeliveryId?: string,
  onUpdate?: (point: GpsLogPoint) => void
) {
  stopDriverGpsTracking();

  currentTrackingDriverId = driverId;
  currentTrackingCompanyId = companyId;
  currentDeliveryId = activeDeliveryId || null;

  const updatePosition = async (position: GeolocationPosition, eventType: GpsLogPoint['event'] = 'periodic') => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    // convert m/s to km/h if available
    const rawSpeed = position.coords.speed;
    const speedKmH = rawSpeed && rawSpeed > 0 ? Math.round(rawSpeed * 3.6) : 0;
    const heading = position.coords.heading || 0;

    const point: GpsLogPoint = {
      latitude: lat,
      longitude: lng,
      accuracy,
      speed: speedKmH,
      timestamp: new Date().toISOString(),
      address: formatCoordinatesAddress(lat, lng),
      event: eventType,
      deliveryId: currentDeliveryId || undefined
    };

    const elapsedMs = lastTransmittedPoint
      ? Date.now() - new Date(lastTransmittedPoint.timestamp).getTime()
      : Number.POSITIVE_INFINITY;
    const movedKm = lastTransmittedPoint
      ? calculateDistanceKm(lastTransmittedPoint.latitude, lastTransmittedPoint.longitude, lat, lng)
      : Number.POSITIVE_INFINITY;
    const shouldTransmit = eventType === 'aceito' ||
      elapsedMs >= MIN_TRANSMIT_INTERVAL_MS ||
      movedKm >= MIN_TRANSMIT_DISTANCE_KM;

    if (!shouldTransmit) return;

    lastTransmittedPoint = point;

    // Save offline locally first
    OfflineStorage.saveGpsLogLocally(point);

    // Update real-time driver state
    const driverState: DriverLocationState = {
      driverId,
      driverName,
      companyId,
      latitude: lat,
      longitude: lng,
      accuracy,
      speed: speedKmH,
      address: point.address,
      lastUpdated: new Date().toISOString(),
      isOnline: navigator.onLine,
      isMoving: speedKmH > 3,
      currentDeliveryId: currentDeliveryId || undefined,
      heading
    };

    if (onUpdate) onUpdate(point);

    // Send to Database/Firestore
    try {
      await Database.updateDriverGpsLocation(driverState);
      if (currentDeliveryId) {
        await Database.appendDeliveryRoutePoint(currentDeliveryId, point);
      }
    } catch (err) {
      // Enqueue offline if network fails
      OfflineStorage.enqueueAction(companyId, 'gps_log', { driverState, point });
    }
  };

  if ('geolocation' in navigator) {
    // Initial fetch
    navigator.geolocation.getCurrentPosition(
      (pos) => updatePosition(pos, 'aceito'),
      (err) => console.warn('GPS initial error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Watch position
    activeWatchId = navigator.geolocation.watchPosition(
      (pos) => updatePosition(pos, 'em_rota'),
      (err) => console.warn('GPS watch error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    // Interval backup ping every 20 seconds
    activeIntervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updatePosition(pos, 'periodic'),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }, 20000);
  }
}

/**
 * Stop active GPS tracking
 */
export function stopDriverGpsTracking() {
  if (activeWatchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
  if (activeIntervalId !== null) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
  currentTrackingDriverId = null;
  currentTrackingCompanyId = null;
  currentDeliveryId = null;
  lastTransmittedPoint = null;
}
