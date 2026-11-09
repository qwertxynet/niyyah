import { useEffect, useMemo, useState } from 'react';
import { cityLabel, loadCities, searchCities, type City } from '../../domain/cities';
import { deviceTimeZone } from '../../domain/format';
import type { Place } from '../../domain/types';
import { Icon } from './Icons';

export function LocationPicker({
  value,
  onChange,
}: {
  value: Place | null;
  onChange: (place: Place) => void;
}) {
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<City[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [lat, setLat] = useState(value ? String(value.lat) : '');
  const [lng, setLng] = useState(value ? String(value.lng) : '');

  useEffect(() => {
    let alive = true;
    loadCities()
      .then((list) => {
        if (alive) setCities(list);
      })
      .catch(() => {
        if (alive) setError('The bundled city list could not be read. Use coordinates instead.');
      });
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => (cities ? searchCities(cities, query) : []), [cities, query]);

  function useGps() {
    setError(null);
    if (!('geolocation' in navigator)) {
      setError('This device has no location service. Search for your city instead.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false);
        onChange({
          lat: Number(position.coords.latitude.toFixed(3)),
          lng: Number(position.coords.longitude.toFixed(3)),
          label: 'Current location',
          source: 'gps',
          timezone: deviceTimeZone(),
        });
      },
      () => {
        setBusy(false);
        setError('No GPS fix came back. Searching for your city works just as well.');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  }

  function useCoordinates() {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Those coordinates do not look right.');
      return;
    }
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setError('Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }
    setError(null);
    onChange({
      lat: latitude,
      lng: longitude,
      label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      source: 'manual',
      timezone: deviceTimeZone(),
    });
  }

  return (
    <div>
      {value ? (
        <div className="chosen" style={{ marginBottom: 14 }}>
          <span className="chosen-icon">
            <Icon name="pin" size={18} />
          </span>
          <div>
            <b>{value.label}</b>
            <span>
              {value.lat.toFixed(3)}, {value.lng.toFixed(3)}
            </span>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          type="search"
          inputMode="search"
          placeholder="Search 3,000 cities…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search for your city"
          autoComplete="off"
        />
        <button type="button" className="btn btn-quiet" onClick={useGps} disabled={busy} style={{ flex: 'none' }}>
          <Icon name="location" size={17} />
          {busy ? 'Locating…' : 'GPS'}
        </button>
      </div>

      {results.length > 0 ? (
        <div className="search-results" role="listbox" aria-label="City results">
          {results.map((city) => (
            <button
              key={`${city.name}-${city.country}-${city.lat}`}
              type="button"
              className="search-item"
              role="option"
              aria-selected={false}
              onClick={() => {
                onChange({
                  lat: city.lat,
                  lng: city.lng,
                  label: cityLabel(city),
                  source: 'search',
                  timezone: city.timezone,
                });
                setQuery('');
              }}
            >
              <b>{city.name}</b>
              <span>{cityLabel(city).split(', ')[1] ?? city.country}</span>
            </button>
          ))}
        </div>
      ) : null}

      {query.trim().length >= 2 && results.length === 0 ? (
        <p className="setting-hint" style={{ marginTop: 10 }}>
          Nothing matched “{query.trim()}”. Try a nearby larger city, or enter coordinates.
        </p>
      ) : null}

      {error ? (
        <div className="note warn" style={{ marginTop: 12 }} role="status">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-quiet"
        style={{ marginTop: 12 }}
        onClick={() => setManualOpen((open) => !open)}
        aria-expanded={manualOpen}
      >
        <Icon name="pin" size={15} />
        {manualOpen ? 'Hide coordinates' : 'Enter coordinates instead'}
      </button>

      {manualOpen ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="lat">Latitude</label>
              <input
                id="lat"
                className="input"
                inputMode="decimal"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                placeholder="51.507"
              />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="lng">Longitude</label>
              <input
                id="lng"
                className="input"
                inputMode="decimal"
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                placeholder="-0.128"
              />
            </div>
          </div>
          <button type="button" className="btn btn-quiet btn-block" style={{ marginTop: 10 }} onClick={useCoordinates}>
            Use these coordinates
          </button>
        </div>
      ) : null}

      <p className="setting-hint" style={{ marginTop: 12 }}>
        Search runs against a city list bundled inside Niyyah — no network, no account.
      </p>
    </div>
  );
}
