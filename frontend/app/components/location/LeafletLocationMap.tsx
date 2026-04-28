'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

type Coordinates = {
  lat: number;
  lng: number;
};

type LeafletLocationMapProps = {
  center: Coordinates;
  zoom: number;
  markerPosition: Coordinates | null;
  onSelectLocation: (lat: number, lng: number) => void;
  onMapTileError: () => void;
};

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

function MapClickHandler({ onSelectLocation }: { onSelectLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onSelectLocation(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapRecenter({ center, zoom }: { center: Coordinates; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

export default function LeafletLocationMap({
  center,
  zoom,
  markerPosition,
  onSelectLocation,
  onMapTileError,
}: LeafletLocationMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
      <MapClickHandler onSelectLocation={onSelectLocation} />
      <MapRecenter center={center} zoom={zoom} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          tileerror: onMapTileError,
        }}
      />

      {markerPosition ? (
        <Marker
          icon={markerIcon}
          position={markerPosition}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const nextPosition = event.target.getLatLng();
              onSelectLocation(nextPosition.lat, nextPosition.lng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
