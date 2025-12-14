# Weather Widget

Displays current weather conditions and forecast for any location worldwide.

## Data Sources

Both APIs are provided by **Open-Meteo** - free, unlimited, no API key required, CORS-enabled.

### 1. Geocoding API

**Purpose:** Convert human-readable location names to coordinates (latitude/longitude)

**Endpoint:** `https://geocoding-api.open-meteo.com/v1/search`

**Parameters:**
- `name` - Location name (city, address, etc.)
- `count` - Number of results to return (we use 1)
- `language` - Response language (en)
- `format` - Response format (json)

**Response:**
```json
{
  "results": [
    {
      "id": 3067696,
      "name": "Prague",
      "latitude": 50.08804,
      "longitude": 14.42076,
      "elevation": 191.0,
      "feature_code": "PPLC",
      "country_code": "CZ",
      "country": "Czechia",
      "timezone": "Europe/Prague",
      "population": 1165581,
      "admin1": "Prague",
      "admin1_id": 3067695
    }
  ]
}
```

### 2. Weather Forecast API

**Purpose:** Get current weather conditions and forecast

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Parameters:**
- `latitude` - Latitude from geocoding
- `longitude` - Longitude from geocoding
- `current` - Current weather variables (temperature_2m, relative_humidity_2m, apparent_temperature, precipitation, weather_code, wind_speed_10m)
- `daily` - Daily forecast variables (weather_code, temperature_2m_max, temperature_2m_min, precipitation_sum)
- `timezone` - Timezone (auto-detect based on coordinates)

**Response:**
```json
{
  "latitude": 50.08,
  "longitude": 14.42,
  "generationtime_ms": 0.123,
  "utc_offset_seconds": 7200,
  "timezone": "Europe/Prague",
  "timezone_abbreviation": "CEST",
  "elevation": 191.0,
  "current_units": {
    "time": "iso8601",
    "interval": "seconds",
    "temperature_2m": "°C",
    "relative_humidity_2m": "%",
    "apparent_temperature": "°C",
    "precipitation": "mm",
    "weather_code": "wmo code",
    "wind_speed_10m": "km/h"
  },
  "current": {
    "time": "2025-10-17T14:30",
    "interval": 900,
    "temperature_2m": 15.2,
    "relative_humidity_2m": 65,
    "apparent_temperature": 13.8,
    "precipitation": 0.0,
    "weather_code": 3,
    "wind_speed_10m": 12.5
  },
  "daily_units": {
    "time": "iso8601",
    "weather_code": "wmo code",
    "temperature_2m_max": "°C",
    "temperature_2m_min": "°C",
    "precipitation_sum": "mm"
  },
  "daily": {
    "time": ["2025-10-17", "2025-10-18", ...],
    "weather_code": [3, 61, ...],
    "temperature_2m_max": [18.5, 16.2, ...],
    "temperature_2m_min": [10.3, 11.1, ...],
    "precipitation_sum": [0.0, 2.3, ...]
  }
}
```

## Data Flow

1. User configures widget with location parameter (e.g., "Prague", "New York", "Tokyo")
2. Widget calls **Geocoding API** to resolve location name → coordinates
3. If no results found, display error
4. Widget calls **Weather API** using coordinates from step 2
5. Weather data is fetched with current conditions and daily forecast
6. Display weather information (design TBD)

## Configuration

**Parameters:**
- `location` (string) - Location name, default: "Prague"

**Preferences:**
- `theme` - Dark/Light theme
- `numberFormat` - Number formatting for temperature/wind speed
- `dateFormat` - Date formatting for forecast dates
- `timezone` - Timezone for displaying times

## Weather Icons

Weather conditions use **WMO Weather Interpretation Codes**. Icon mapping:

| Icon ID | WMO Codes | Description |
|---------|-----------|-------------|
| `clear-day` | 0 | Clear sky (daytime) |
| `clear-night` | 0 | Clear sky (nighttime) |
| `partly-cloudy-day` | 1, 2 | Mainly clear/partly cloudy (daytime) |
| `partly-cloudy-night` | 1, 2 | Mainly clear/partly cloudy (nighttime) |
| `cloudy` | 3 | Overcast |
| `fog` | 45, 48 | Fog and depositing rime fog |
| `drizzle` | 51, 53, 55 | Drizzle (light to dense) |
| `rain` | 61, 63 | Rain (slight to moderate) |
| `rain-heavy` | 65 | Heavy rain |
| `freezing-rain` | 56, 57, 66, 67 | Freezing drizzle/rain |
| `snow` | 71, 73, 75, 77 | Snow fall and snow grains |
| `rain-showers` | 80, 81, 82 | Rain showers |
| `snow-showers` | 85, 86 | Snow showers |
| `thunderstorm` | 95 | Thunderstorm |
| `thunderstorm-hail` | 96, 99 | Thunderstorm with hail |

**Total: 15 icons** (7 base + 8 variants)

Icons are stored as individual SVG files in `icons/` directory and compiled into a single SVG sprite atlas using a build script. The atlas is inlined into `index.html` and referenced via `<use href="#icon-name">`.

## Notes

- TTL set to 300 seconds (5 minutes) - weather data doesn't change that frequently
- No API key needed - completely free and unlimited
- CORS-enabled - can be called directly from browser
- Worldwide coverage from reputable meteorological sources (NOAA, DWD, ECMWF)
- Layout adapts based on widget size: full (8-day + hourly), large (4-day), medium (5-hour), small (current only)
