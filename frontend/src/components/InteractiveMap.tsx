import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapProps {
  stops: Array<{ name: string; lat: number; lng: number }>;
  path: Array<{ lat: number; lng: number }>;
  currentLocation: { lat: number; lng: number; speedKmh?: number } | null;
  deviationAlert?: boolean;
}

export const InteractiveMap: React.FC<MapProps> = ({ stops, path, currentLocation, deviationAlert }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const busMarker = useRef<L.Marker | null>(null);
  const routePolyline = useRef<L.Polyline | null>(null);
  const stopMarkers = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    leafletMap.current = L.map(mapRef.current).setView([34.0978, 74.8564], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;

    if (routePolyline.current) {
      routePolyline.current.remove();
      routePolyline.current = null;
    }
    stopMarkers.current.forEach(m => m.remove());
    stopMarkers.current = [];

    if (path && path.length > 0) {
      const latLngs = path.map(p => [p.lat, p.lng] as L.LatLngTuple);
      routePolyline.current = L.polyline(latLngs, {
        color: '#13a8a3',
        weight: 5,
        opacity: 0.8,
      }).addTo(leafletMap.current);

      try {
        leafletMap.current.fitBounds(routePolyline.current.getBounds(), { padding: [30, 30] });
      } catch (e) {
        // Fallback if bounds are invalid
      }
    }

    if (stops && stops.length > 0) {
      stops.forEach((stop, index) => {
        const stopIcon = L.divIcon({
          className: 'custom-stop-icon',
          html: `<div style="width: 14px; height: 14px; background: white; border: 3px solid #13a8a3; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const label = index === 0 ? 'Start' : index === stops.length - 1 ? 'School' : 'Stop';
        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .bindPopup(`<b>${stop.name}</b> (${label})`)
          .addTo(leafletMap.current!);
        stopMarkers.current.push(marker);
      });
    }
  }, [stops, path]);

  useEffect(() => {
    if (!leafletMap.current) return;

    if (busMarker.current) {
      busMarker.current.remove();
      busMarker.current = null;
    }

    if (currentLocation) {
      const markerColor = deviationAlert ? '#d9515d' : '#0a2e4d';
      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="width: 32px; height: 32px; border: 3px solid white; border-radius: 50%; background: ${markerColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-family: sans-serif;">
            🚌
          </div>
          ${deviationAlert ? '<div style="position: absolute; width: 44px; height: 44px; border: 3px solid #d9515d; border-radius: 50%; animation: pulse-red 1.2s infinite;"></div>' : ''}
        </div>
      `;

      // Inject temporary CSS animation for pulsing red ring
      if (deviationAlert && !document.getElementById('map-animations')) {
        const style = document.createElement('style');
        style.id = 'map-animations';
        style.innerHTML = `
          @keyframes pulse-red {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(1.3); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      const busIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      busMarker.current = L.marker([currentLocation.lat, currentLocation.lng], { icon: busIcon })
        .bindPopup(`<b>Assigned Bus</b><br/>Speed: ${Math.round(currentLocation.speedKmh ?? 0)} km/h`)
        .addTo(leafletMap.current);

      leafletMap.current.panTo([currentLocation.lat, currentLocation.lng]);
    }
  }, [currentLocation, deviationAlert]);

  return (
    <div className="relative w-full h-[280px] border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-slate-50">
      <div ref={mapRef} className="w-full h-full" />
      {deviationAlert && (
        <div className="absolute top-2 right-2 z-[999] bg-red-100 border border-red-400 text-red-700 px-3 py-1.5 rounded-md text-xs font-semibold shadow-md flex items-center gap-1.5 animate-pulse">
          Route deviation alert
        </div>
      )}
    </div>
  );
};
