import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mausam-app-v1';
const APP_NAME = 'Mausam';
const DEFAULT_LOCATION = {
  id: 'bengaluru-india',
  name: 'Bengaluru',
  admin1: 'Karnataka',
  country: 'India',
  latitude: 12.9716,
  longitude: 77.5946
};

const DEFAULT_QUERY = 'Bengaluru';
const UNITS = {
  c: { label: 'Celsius', symbol: '°C', temperature: 'celsius', wind: 'kmh' },
  f: { label: 'Fahrenheit', symbol: '°F', temperature: 'fahrenheit', wind: 'mph' }
};

const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: '☀️', tone: 'sun' },
  1: { label: 'Mainly clear', icon: '🌤️', tone: 'sun' },
  2: { label: 'Partly cloudy', icon: '⛅', tone: 'cloud' },
  3: { label: 'Overcast', icon: '☁️', tone: 'cloud' },
  45: { label: 'Fog', icon: '🌫️', tone: 'mist' },
  48: { label: 'Rime fog', icon: '🌫️', tone: 'mist' },
  51: { label: 'Light drizzle', icon: '🌦️', tone: 'rain' },
  53: { label: 'Drizzle', icon: '🌦️', tone: 'rain' },
  55: { label: 'Dense drizzle', icon: '🌦️', tone: 'rain' },
  56: { label: 'Freezing drizzle', icon: '🌧️', tone: 'rain' },
  57: { label: 'Dense freezing drizzle', icon: '🌧️', tone: 'rain' },
  61: { label: 'Slight rain', icon: '🌧️', tone: 'rain' },
  63: { label: 'Rain', icon: '🌧️', tone: 'rain' },
  65: { label: 'Heavy rain', icon: '🌧️', tone: 'rain' },
  66: { label: 'Freezing rain', icon: '🌧️', tone: 'rain' },
  67: { label: 'Heavy freezing rain', icon: '🌧️', tone: 'rain' },
  71: { label: 'Slight snow', icon: '🌨️', tone: 'snow' },
  73: { label: 'Snow', icon: '🌨️', tone: 'snow' },
  75: { label: 'Heavy snow', icon: '🌨️', tone: 'snow' },
  77: { label: 'Snow grains', icon: '🌨️', tone: 'snow' },
  80: { label: 'Rain showers', icon: '🌦️', tone: 'rain' },
  81: { label: 'Rain showers', icon: '🌦️', tone: 'rain' },
  82: { label: 'Violent rain showers', icon: '🌧️', tone: 'rain' },
  85: { label: 'Snow showers', icon: '🌨️', tone: 'snow' },
  86: { label: 'Heavy snow showers', icon: '🌨️', tone: 'snow' },
  95: { label: 'Thunderstorm', icon: '⛈️', tone: 'storm' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️', tone: 'storm' },
  99: { label: 'Thunderstorm with hail', icon: '⛈️', tone: 'storm' }
};

function readSeed() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatLocation(location) {
  if (!location) {
    return '';
  }

  return [location.name, location.admin1, location.country].filter(Boolean).join(', ');
}

function cToF(value) {
  return value * 9 / 5 + 32;
}

function convertTemperature(value, unit) {
  if (value == null) {
    return '--';
  }

  return `${Math.round(unit === 'f' ? cToF(value) : value)}${UNITS[unit].symbol}`;
}

function convertWind(value, unit) {
  if (value == null) {
    return '--';
  }

  return `${Math.round(value)} ${unit === 'f' ? 'mph' : 'km/h'}`;
}

function formatTimeLabel(isoString) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoString));
}

function formatDayLabel(isoString) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric'
  }).format(new Date(`${isoString}T12:00:00`));
}

function getWeatherMeta(code, isDay = true) {
  if (code === 0) {
    return isDay ? { label: 'Clear sky', icon: '☀️', tone: 'sun' } : { label: 'Clear night', icon: '🌙', tone: 'moon' };
  }

  if (code === 1 || code === 2 || code === 3) {
    return WEATHER_CODES[code];
  }

  return WEATHER_CODES[code] ?? { label: 'Unknown', icon: '❓', tone: 'cloud' };
}

function iconClassForTone(tone) {
  return `weather-icon weather-icon--${tone}`;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function searchLocations(query, signal) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json'
  }).toString();

  const data = await fetchJson(url, signal);
  return data.results ?? [];
}

async function fetchWeather(location, unit, signal) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: UNITS[unit].temperature,
    wind_speed_unit: UNITS[unit].wind
  }).toString();

  return fetchJson(url, signal);
}

function WeatherStat({ label, value, hint }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function SearchChip({ label, onClick, active = false }) {
  return (
    <button className={`chip ${active ? 'chip--active' : ''}`} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function ForecastCard({ time, temp, code, unit, isCurrent = false }) {
  const meta = getWeatherMeta(code, true);

  return (
    <article className={`forecast-card ${isCurrent ? 'forecast-card--active' : ''}`}>
      <span>{time}</span>
      <div className={iconClassForTone(meta.tone)}>{meta.icon}</div>
      <strong>{convertTemperature(temp, unit)}</strong>
      <small>{meta.label}</small>
    </article>
  );
}

function DailyCard({ day, min, max, code, precipitation, unit }) {
  const meta = getWeatherMeta(code, true);

  return (
    <div className="daily-card">
      <div>
        <strong>{day}</strong>
        <span>{meta.label}</span>
      </div>
      <div className={iconClassForTone(meta.tone)}>{meta.icon}</div>
      <div className="daily-card__temps">
        <strong>{convertTemperature(max, unit)}</strong>
        <span>{convertTemperature(min, unit)}</span>
      </div>
      <div className="daily-card__precip">
        <span>Rain chance</span>
        <strong>{precipitation ?? '--'}%</strong>
      </div>
    </div>
  );
}

function App() {
  const seed = readSeed();
  const [unit, setUnit] = useState(seed?.unit ?? 'c');
  const [query, setQuery] = useState(seed?.lastQuery ?? DEFAULT_QUERY);
  const [activeLocation, setActiveLocation] = useState(seed?.lastLocation ?? DEFAULT_LOCATION);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(seed?.recentSearches ?? []);
  const [favorites, setFavorites] = useState(seed?.favorites ?? [DEFAULT_LOCATION]);

  const currentMeta = useMemo(() => {
    if (!weather?.current) {
      return { label: 'No data', icon: '⛅', tone: 'cloud' };
    }

    return getWeatherMeta(weather.current.weather_code, Boolean(weather.current.is_day));
  }, [weather]);

  const forecastHours = useMemo(() => {
    if (!weather?.hourly?.time || !weather?.current?.time) {
      return [];
    }

    const index = weather.hourly.time.findIndex((time) => time >= weather.current.time);
    const start = index >= 0 ? index : 0;

    return weather.hourly.time.slice(start, start + 12).map((time, idx) => ({
      time: formatTimeLabel(time),
      temp: weather.hourly.temperature_2m[start + idx],
      code: weather.hourly.weather_code[start + idx]
    }));
  }, [weather]);

  const dailyForecast = useMemo(() => {
    if (!weather?.daily?.time) {
      return [];
    }

    return weather.daily.time.map((day, index) => ({
      day: formatDayLabel(day),
      min: weather.daily.temperature_2m_min[index],
      max: weather.daily.temperature_2m_max[index],
      code: weather.daily.weather_code[index],
      precipitation: weather.daily.precipitation_probability_max?.[index]
    }));
  }, [weather]);

  useEffect(() => {
    if (!activeLocation) {
      return;
    }

    const controller = new AbortController();

    async function loadWeather() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchWeather(activeLocation, unit, controller.signal);
        setWeather(data);
        setRecentSearches((current) => {
          const next = [activeLocation, ...current.filter((item) => item.id !== activeLocation.id)].slice(0, 5);
          return next;
        });
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError('We could not load weather right now. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadWeather();
    return () => controller.abort();
  }, [activeLocation, unit]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        unit,
        lastQuery: query,
        lastLocation: activeLocation,
        recentSearches,
        favorites
      })
    );
  }, [unit, query, activeLocation, recentSearches, favorites]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setError('Please enter a city name.');
      return;
    }

    setLoading(true);
    setError('');

    const controller = new AbortController();

    try {
      const results = await searchLocations(trimmed, controller.signal);

      if (!results.length) {
        setSearchResults([]);
        setError('No matching city found. Try Bengaluru, Mumbai, Delhi, Pune, or Chennai.');
        return;
      }

      const normalized = results.map((result) => ({
        id: `${result.latitude}-${result.longitude}`,
        name: result.name,
        admin1: result.admin1,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude
      }));

      setSearchResults(normalized);

      if (normalized.length === 1) {
        setActiveLocation(normalized[0]);
      }
    } catch (err) {
      setError('Search failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = (location) => {
    setActiveLocation(location);
    setQuery(location.name);
    setSearchResults([]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = {
          id: 'current-location',
          name: 'Current location',
          admin1: '',
          country: '',
          latitude,
          longitude
        };

        setActiveLocation(location);
        setQuery(location.name);
        setSearchResults([]);
        setLoading(false);
      },
      () => {
        setError('Location access was denied. Showing the previous city instead.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const toggleFavorite = (location) => {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === location.id);
      if (exists) {
        return current.filter((item) => item.id !== location.id);
      }
      return [location, ...current].slice(0, 6);
    });
  };

  const isFavorite = favorites.some((item) => item.id === activeLocation?.id);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Weather dashboard</p>
          <h1>{APP_NAME}</h1>
          <p className="hero__copy">
            Search any city, check the current weather, and skim the forecast in a clean,
            beginner-friendly React app built for freshers.
          </p>
        </div>

        <div className="hero__actions">
          <button className="secondary-button" type="button" onClick={useCurrentLocation}>
            Use my location
          </button>
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            <button
              className={unit === 'c' ? 'unit-toggle__button unit-toggle__button--active' : 'unit-toggle__button'}
              type="button"
              onClick={() => setUnit('c')}
            >
              °C
            </button>
            <button
              className={unit === 'f' ? 'unit-toggle__button unit-toggle__button--active' : 'unit-toggle__button'}
              type="button"
              onClick={() => setUnit('f')}
            >
              °F
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="main-panel">
          <form className="search-card" onSubmit={handleSearch}>
            <label className="search-card__label" htmlFor="city-search">
              Search city
            </label>
            <div className="search-card__row">
              <input
                id="city-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try Mumbai, Bengaluru, Delhi..."
              />
              <button className="primary-button" type="submit">
                Search
              </button>
            </div>
            {searchResults.length > 1 ? (
              <div className="search-results">
                <span className="search-results__label">Choose a result</span>
                <div className="search-results__list">
                  {searchResults.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      className="result-chip"
                      onClick={() => selectLocation(location)}
                    >
                      <strong>{location.name}</strong>
                      <span>{[location.admin1, location.country].filter(Boolean).join(', ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </form>

          {error ? <div className="notice notice--error">{error}</div> : null}
          {loading ? <div className="notice">Loading weather data...</div> : null}

          {weather ? (
            <>
              <section className="current-weather">
                <div className="current-weather__left">
                  <div className={iconClassForTone(currentMeta.tone)}>{currentMeta.icon}</div>
                  <div>
                    <p className="location-label">{formatLocation(activeLocation)}</p>
                    <h2>{convertTemperature(weather.current.temperature_2m, unit)}</h2>
                    <p className="condition-text">{currentMeta.label}</p>
                  </div>
                </div>

                <button className="favorite-button" type="button" onClick={() => toggleFavorite(activeLocation)}>
                  {isFavorite ? '★ Saved' : '☆ Save city'}
                </button>
              </section>

              <section className="stats-grid">
                <WeatherStat
                  label="Feels like"
                  value={convertTemperature(weather.current.apparent_temperature, unit)}
                  hint="Current conditions"
                />
                <WeatherStat
                  label="Humidity"
                  value={`${Math.round(weather.current.relative_humidity_2m)}%`}
                  hint="Indoor comfort"
                />
                <WeatherStat
                  label="Wind"
                  value={convertWind(weather.current.wind_speed_10m, unit)}
                  hint="Direction updated"
                />
                <WeatherStat
                  label="Rain"
                  value={`${Math.round(weather.current.precipitation ?? 0)} mm`}
                  hint="Current period"
                />
              </section>

              <section className="forecast-section">
                <div className="section-heading">
                  <h3>Hourly forecast</h3>
                  <span>Next 12 hours</span>
                </div>
                <div className="forecast-strip">
                  {forecastHours.map((item, index) => (
                    <ForecastCard
                      key={`${item.time}-${index}`}
                      time={item.time}
                      temp={item.temp}
                      code={item.code}
                      unit={unit}
                      isCurrent={index === 0}
                    />
                  ))}
                </div>
              </section>

              <section className="forecast-section">
                <div className="section-heading">
                  <h3>7 day forecast</h3>
                  <span>Daily summary</span>
                </div>
                <div className="daily-list">
                  {dailyForecast.map((day) => (
                    <DailyCard
                      key={`${day.day}-${day.max}-${day.min}`}
                      day={day.day}
                      min={day.min}
                      max={day.max}
                      code={day.code}
                      precipitation={day.precipitation}
                      unit={unit}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </section>

        <aside className="sidebar">
          <section className="side-panel">
            <div className="section-heading">
              <h3>Saved cities</h3>
              <span>{favorites.length} saved</span>
            </div>
            <div className="chip-row">
              {favorites.length ? (
                favorites.map((location) => (
                  <SearchChip
                    key={location.id}
                    label={location.name}
                    active={activeLocation?.id === location.id}
                    onClick={() => selectLocation(location)}
                  />
                ))
              ) : (
                <p className="empty-copy">Save a city to keep it here.</p>
              )}
            </div>
          </section>

          <section className="side-panel">
            <div className="section-heading">
              <h3>Recent searches</h3>
              <span>Last 5</span>
            </div>
            <div className="chip-row">
              {recentSearches.length ? (
                recentSearches.map((location) => (
                  <SearchChip
                    key={location.id}
                    label={location.name}
                    active={activeLocation?.id === location.id}
                    onClick={() => selectLocation(location)}
                  />
                ))
              ) : (
                <p className="empty-copy">Your latest searches will show up here.</p>
              )}
            </div>
          </section>

          <section className="side-panel">
            <div className="section-heading">
              <h3>Weather code key</h3>
              <span>Open-Meteo</span>
            </div>
            <ul className="code-list">
              <li><span>☀️</span> Clear and sunny</li>
              <li><span>🌤️</span> Partly cloudy</li>
              <li><span>🌧️</span> Rain and showers</li>
              <li><span>🌨️</span> Snow</li>
              <li><span>⛈️</span> Thunderstorm</li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
