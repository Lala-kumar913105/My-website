'use client';

import dynamic from 'next/dynamic';
import { KeyboardEvent, useMemo, useState } from 'react';

type Coordinates = {
  lat: number;
  lng: number;
};

type LocationPickerProps = {
  label?: string;
  helperText?: string;
  latitude: string;
  longitude: string;
  address: string;
  latitudeError?: string;
  longitudeError?: string;
  addressError?: string;
  required?: boolean;
  onChange: (next: { latitude?: string; longitude?: string; address?: string }) => void;
};

const DEFAULT_CENTER: Coordinates = { lat: 20.5937, lng: 78.9629 };

const LeafletLocationMap = dynamic(() => import('./LeafletLocationMap'), {
  ssr: false,
});

const buildDisplayAddress = (data: Record<string, string | undefined>) => {
  const city = data.city || data.town || data.village || data.county || data.state_district;
  const state = data.state;
  const country = data.country;
  return [city, state, country].filter(Boolean).join(', ');
};

export default function LocationPicker({
  label = 'Location',
  helperText = 'Tap on the map to choose your listing location',
  latitude,
  longitude,
  address,
  latitudeError,
  longitudeError,
  addressError,
  required = true,
  onChange,
}: LocationPickerProps) {
  const [searchText, setSearchText] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [mapMessage, setMapMessage] = useState('');

  const markerPosition = useMemo(() => {
    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
    return { lat: parsedLat, lng: parsedLng };
  }, [latitude, longitude]);

  const mapCenter = markerPosition || DEFAULT_CENTER;
  const zoom = markerPosition ? 14 : 5;

  const updateCoordinates = async (lat: number, lng: number) => {
    onChange({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
    setMapMessage('');
    setLoadingAddress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Unable to fetch address from selected location.');
      }

      const data = await response.json();
      const nextAddress = data?.display_name || buildDisplayAddress(data?.address || {});
      onChange({ address: nextAddress || '' });
    } catch {
      onChange({ address: '' });
      setMapMessage('Location selected. Could not resolve a readable address automatically.');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;

    setSearching(true);
    setMapMessage('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchText.trim())}&limit=1`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const first = Array.isArray(data) ? data[0] : null;

      if (!first) {
        setMapMessage('No matching location found. Try a more specific area or landmark.');
        return;
      }

      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setMapMessage('Search returned an invalid location result.');
        return;
      }

      onChange({ address: first.display_name || searchText.trim() });
      await updateCoordinates(lat, lng);
    } catch {
      setMapMessage('Unable to search this location right now. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSearch();
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapMessage('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    setMapMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateCoordinates(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMapMessage('Unable to access current location. Please allow permission or set location manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  return (
    <section className="ds-card">
      <h2 className="ds-title">{label}</h2>
      <p className="ds-note">{helperText}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={handleSearchInputKeyDown}
          placeholder="Search address, city, area, or landmark"
          className="ds-input"
        />
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searching}
          className="ds-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="ds-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {locating ? 'Locating…' : 'Use Current Location'}
        </button>
      </div>

      {mapUnavailable ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Map is unavailable right now. You can still submit using manual latitude/longitude fields below.
        </div>
      ) : (
        <div className="mt-4 h-64 overflow-hidden rounded-xl border border-slate-200 sm:h-80">
          <LeafletLocationMap
            center={mapCenter}
            zoom={zoom}
            markerPosition={markerPosition}
            onSelectLocation={updateCoordinates}
            onMapTileError={() => setMapUnavailable(true)}
          />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">Selected address</p>
        <p className="mt-1 text-sm text-slate-800">
          {loadingAddress ? 'Fetching readable address…' : address || 'No address selected yet.'}
        </p>
      </div>

      {(mapMessage || addressError) && (
        <p className={`mt-2 text-xs ${addressError ? 'text-red-600' : 'text-amber-700'}`}>{addressError || mapMessage}</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="ds-label" htmlFor="latitude">
            Latitude{required ? ' *' : ''}
          </label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="0.000001"
            value={latitude}
            onChange={(event) => onChange({ latitude: event.target.value })}
            placeholder="e.g. 28.6139"
            className="ds-input"
          />
          {latitudeError ? <p className="mt-1 text-xs text-red-600">{latitudeError}</p> : null}
        </div>

        <div>
          <label className="ds-label" htmlFor="longitude">
            Longitude{required ? ' *' : ''}
          </label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="0.000001"
            value={longitude}
            onChange={(event) => onChange({ longitude: event.target.value })}
            placeholder="e.g. 77.2090"
            className="ds-input"
          />
          {longitudeError ? <p className="mt-1 text-xs text-red-600">{longitudeError}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <label className="ds-label" htmlFor="address">
          Address (optional fallback input)
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={address}
          onChange={(event) => onChange({ address: event.target.value })}
          placeholder="House / area / city"
          className="ds-input"
        />
      </div>
    </section>
  );
}
