/// <reference path="../../sdk/v1/scripts.js" />

// Open-Meteo API key (leave empty for free tier)
const OPEN_METEO_API_KEY = '';

// Forecast configuration constants
const FORECAST_CONFIG = {
    MEDIUM_HOURLY_COUNT: 5,
    LARGE_DAILY_COUNT: 4,
    FULL_HOURLY_COUNT: 9,
    FULL_DAILY_COUNT: 8,
    FULL_DAYS_PER_COLUMN: 4,
    TODAY_INDEX: 0,
};

/**
 * Find the index of the current hour in the hourly forecast array
 * @param {Array<string>} hourlyTimes - Array of ISO timestamp strings (timezone-naive, in given timezone)
 * @param {string} currentTime - Current time ISO string (timezone-naive, in given timezone)
 * @param {string} timezone - IANA timezone identifier
 * @returns {number} Index of current hour (or 0 if not found)
 */
function getCurrentHourIndex(hourlyTimes, currentTime, timezone) {
    const currentDate = parse.timeInTimezone(currentTime, timezone);

    for (let i = 0; i < hourlyTimes.length; i++) {
        const forecastDate = parse.timeInTimezone(hourlyTimes[i], timezone);
        if (forecastDate >= currentDate) {
            return i;
        }
    }

    return 0;
}

/**
 * Map WMO weather code to icon ID
 * @see https://open-meteo.com/en/docs - Weather code documentation (WMO Code)
 * @param {number} code - WMO weather code
 * @param {boolean} isDay - Whether it's daytime
 * @returns {string|null} Icon ID or null if unknown
 */
function getWeatherIcon(code, isDay = true) {
    if (code === 0) return isDay ? 'clear-day' : 'clear-night';
    if (code === 1 || code === 2) return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
    if (code === 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 55) return 'drizzle';
    if (code >= 56 && code <= 57) return 'freezing-rain';
    if (code >= 61 && code <= 65) return 'rain';
    if (code >= 66 && code <= 67) return 'freezing-rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rain-showers';
    if (code >= 85 && code <= 86) return 'snow';
    if (code === 95) return 'thunderstorm';
    if (code >= 96) return 'thunderstorm-hail';
    return null; // unknown code
}

/**
 * Convert wind direction in degrees to cardinal direction
 * @param {number} degrees - Wind direction in degrees (0-360)
 * @returns {string} Cardinal direction (e.g., "North", "South")
 */
function getWindDirection(degrees) {
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

/**
 * Map WMO weather code to description
 * @see https://open-meteo.com/en/docs - Weather code documentation (WMO Code)
 * @param {number} code - WMO weather code
 * @returns {string}
 */
function getWeatherDescription(code) {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Mainly Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 56 && code <= 57) return 'Freezing Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 66 && code <= 67) return 'Freezing Rain';
    if (code >= 71 && code <= 75) return 'Snow';
    if (code === 77) return 'Snow Grains';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 85 && code <= 86) return 'Snow Showers';
    if (code === 95) return 'Thunderstorm';
    if (code >= 96) return 'Thunderstorm with Hail';
    return 'Unknown';
}

/**
 * Create a weather icon SVG element
 * @param {object} create - SDK create helper
 * @param {string} id - Icon ID
 * @param {string} className - CSS class name for the SVG element
 * @returns {SVGElement|null} SVG icon element or null if id is invalid
 */
function createWeatherIcon(create, id, className = 'icon') {
    if (!id) return null;

    const icon = create.svg('svg', {
        class: ['icon', className].filter(Boolean).join(' '),
        viewBox: '0 0 32 32',
    });
    const use = create.svg('use', { href: `#${id}` });
    icon.appendChild(use);

    return icon;
}

/**
 * Create a temperature range slider with optional current temp indicator
 * @param {object} config - Configuration object
 * @param {object} config.create - SDK create helper
 * @param {number} config.low - Low temperature for this day
 * @param {number} config.high - High temperature for this day
 * @param {number} config.globalMin - Global minimum temperature across all days (for normalization)
 * @param {number} config.globalMax - Global maximum temperature across all days (for normalization)
 * @param {number|null} config.current - Current temperature (shows dot on slider, null for non-current days)
 * @returns {HTMLElement} Temperature slider element
 */
function createTempSlider({ create, low, high, globalMin, globalMax, current = null }) {
    const tempRange = globalMax - globalMin;
    const slider = create.element('div', { className: 'temp-slider' });
    const sliderBg = create.element('div', { className: 'slider-bg' });
    const sliderFg = create.element('div', { className: 'slider-fg' });

    const lowPos = ((low - globalMin) / tempRange) * 100;
    const highPos = ((high - globalMin) / tempRange) * 100;
    const width = highPos - lowPos;

    sliderFg.style.left = `${lowPos}%`;
    sliderFg.style.width = `${width}%`;

    slider.appendChild(sliderBg);
    slider.appendChild(sliderFg);

    if (current !== null) {
        const currentPos = ((current - globalMin) / tempRange) * 100;
        const dot = create.element('div', { className: 'temp-dot' });
        dot.style.left = `${currentPos}%`;
        slider.appendChild(dot);
    }

    return slider;
}

/**
 * Create an hourly forecast item
 * @param {object} config - Configuration object
 * @param {object} config.create - SDK create helper
 * @param {string} config.time - ISO timestamp string for the hour (timezone-naive, in given timezone)
 * @param {string} config.timezone - IANA timezone identifier
 * @param {number} config.temp - Temperature in degrees (rounded)
 * @param {string} config.iconId - Weather icon ID from getWeatherIcon()
 * @returns {HTMLElement} Hourly forecast item element
 */
function createHourlyItem({ create, time, timezone, temp, iconId }) {
    const hourItem = create.element('div', { className: 'hour-item' }, [
        create.element('div', {
            className: 'hour-time',
            textContent: format.time(parse.timeInTimezone(time, timezone), { includeMinutes: false }),
        }),
    ]);

    const hourIcon = createWeatherIcon(create, iconId, 'hour-icon');
    if (hourIcon) hourItem.appendChild(hourIcon);

    hourItem.appendChild(create.element('div', { className: 'hour-temp', textContent: `${temp}°` }));
    return hourItem;
}

/**
 * Create a daily forecast item with temperature range slider
 * @param {object} config - Configuration object
 * @param {object} config.create - SDK create helper
 * @param {string} config.dayName - Display name for the day (e.g., 'Today', 'Monday')
 * @param {string} config.iconId - Weather icon ID from getWeatherIcon()
 * @param {number} config.low - Low temperature for this day (rounded)
 * @param {number} config.high - High temperature for this day (rounded)
 * @param {number} config.globalMin - Global minimum temperature across all days (for normalization)
 * @param {number} config.globalMax - Global maximum temperature across all days (for normalization)
 * @param {number|null} config.current - Current temperature (shows dot on slider, null for non-current days)
 * @returns {HTMLElement} Forecast item element
 */
function createForecastItem({ create, dayName, iconId, low, high, globalMin, globalMax, current = null }) {
    const forecastItem = create.element('div', { className: 'forecast-item' });

    const dayLabel = create.element('div', { className: 'day-label' }, [
        create.element('span', { className: 'day-name', textContent: dayName }),
        createWeatherIcon(create, iconId, 'forecast-icon'),
    ]);

    const tempRange = create.element('div', { className: 'temp-range' }, [
        create.element('div', {
            className: 'forecast-temp low',
            textContent: `${low}°`,
        }),
        createTempSlider({ create, low, high, globalMin, globalMax, current }),
        create.element('div', {
            className: 'forecast-temp high',
            textContent: `${high}°`,
        }),
    ]);

    forecastItem.appendChild(dayLabel);
    forecastItem.appendChild(tempRange);
    return forecastItem;
}

/**
 * Create a stat item with icon, label, and value
 * @param {object} config - Configuration object
 * @param {object} config.create - SDK create helper
 * @param {string} config.iconId - Icon ID for the stat (e.g., 'temp-low', 'temp-high', 'time-sunrise')
 * @param {string} config.label - Display label for the stat (e.g., 'Low T.', 'Sunrise')
 * @param {string} config.value - Formatted value to display (e.g., '12°C', '6:30 AM')
 * @returns {HTMLElement} Stat item element
 */
function createStatItem({ create, iconId, label, value }) {
    return create.element('div', { className: 'stat-item' }, [
        create.element('div', { className: 'stat-header' }, [
            createWeatherIcon(create, iconId, 'stat-icon'),
            create.element('div', { className: 'stat-label', textContent: label }),
        ]),
        create.element('div', { className: 'stat-value', textContent: value }),
    ]);
}

class WidgetInputError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WidgetInputError';
    }
}

async function main() {
    const { params, select, net, ready, overlay, create, view } = sdk();

    try {
        const location = params.getAny('location', 'Prague');
        const size = params.size;

        // Use paid API endpoints when API key is provided
        const geocodingHost = OPEN_METEO_API_KEY
            ? 'customer-geocoding-api.open-meteo.com'
            : 'geocoding-api.open-meteo.com';
        const weatherHost = OPEN_METEO_API_KEY ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';
        const apiKeyParam = OPEN_METEO_API_KEY ? `&apikey=${encodeURIComponent(OPEN_METEO_API_KEY)}` : '';

        // Step 1: Geocode the location
        const geocodeUrl = `https://${geocodingHost}/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json${apiKeyParam}`;
        const geocodeData = await net.fetch(geocodeUrl).then(response => response.json());

        if (!geocodeData.results || geocodeData.results.length === 0) {
            throw new WidgetInputError(
                `Location "${location}" not found. Please check the spelling and try a valid city name (e.g., "Helsinki", "New York", "Tokyo").`
            );
        }

        const { latitude, longitude } = geocodeData.results[0];
        // Use the user's search term as the display name to avoid API language inconsistencies
        const locationName = location;

        // Step 2: Fetch weather data
        const timezone = params.timezone;
        const weatherUrl = `https://${weatherHost}/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=${encodeURIComponent(timezone)}&forecast_days=8${apiKeyParam}`;
        const weatherData = await net.fetch(weatherUrl).then(response => response.json());
        const container = select.id('container');

        // Common data extraction
        const currentTemp = Math.round(weatherData.current.temperature_2m);
        const weatherCode = weatherData.current.weather_code;
        const description = getWeatherDescription(weatherCode);

        // Determine if it's day or night
        const currentTime = parse.timeInTimezone(weatherData.current.time, timezone);
        const sunrise = parse.timeInTimezone(weatherData.daily.sunrise[0], timezone);
        const sunset = parse.timeInTimezone(weatherData.daily.sunset[0], timezone);
        const isDay = currentTime >= sunrise && currentTime <= sunset;

        const iconId = getWeatherIcon(weatherCode, isDay);

        container.className = `${size} ${params.theme.toLowerCase()}`;

        //
        // Small
        //
        if (size === view.BREAKPOINTS.small.name) {
            const icon = createWeatherIcon(create, iconId);
            if (icon) container.appendChild(icon);
            else container.appendChild(create.element('div', { class: 'icon-error', textContent: '?' }));

            container.appendChild(
                create.element('div', { className: 'temp', textContent: format.temperature(currentTemp, 'C') })
            );
            container.appendChild(create.element('div', { className: 'desc', textContent: description }));
            container.appendChild(create.element('div', { className: 'location', textContent: locationName }));
        }

        //
        // Medium
        //
        else if (size === view.BREAKPOINTS.medium.name) {
            const leftSection = create.element('div', { className: 'left' }, [
                createWeatherIcon(create, iconId),
                create.element('div', { className: 'temp', textContent: format.temperature(currentTemp, 'C') }),
                create.element('div', { className: 'desc', textContent: description }),
            ]);
            container.appendChild(leftSection);

            const rightWrapper = create.element('div', { className: 'right-wrapper' });
            rightWrapper.appendChild(create.element('div', { className: 'location', textContent: locationName }));

            const rightSection = create.element('div', { className: 'right' });
            const currentHourIndex = getCurrentHourIndex(weatherData.hourly.time, weatherData.current.time, timezone);
            const endIndex = currentHourIndex + FORECAST_CONFIG.MEDIUM_HOURLY_COUNT;
            for (let i = currentHourIndex; i < endIndex && i < weatherData.hourly.time.length; i++) {
                const hourItem = createHourlyItem({
                    create,
                    time: weatherData.hourly.time[i],
                    timezone,
                    temp: Math.round(weatherData.hourly.temperature_2m[i]),
                    iconId: getWeatherIcon(weatherData.hourly.weather_code[i], isDay),
                });
                rightSection.appendChild(hourItem);
            }
            rightWrapper.appendChild(rightSection);
            container.appendChild(rightWrapper);
        }

        //
        // Large
        //
        else if (size === view.BREAKPOINTS.large.name) {
            // Calculate global min/max for temperature normalization
            const dailyLows = weatherData.daily.temperature_2m_min.slice(0, FORECAST_CONFIG.LARGE_DAILY_COUNT);
            const dailyHighs = weatherData.daily.temperature_2m_max.slice(0, FORECAST_CONFIG.LARGE_DAILY_COUNT);
            const globalMin = Math.min(...dailyLows);
            const globalMax = Math.max(...dailyHighs);

            // Today section wrapper
            const todaySection = create.element('div', { className: 'today' });

            // Left section - location and current weather
            const leftSection = create.element('div', { className: 'left' }, [
                create.element('div', { className: 'location-header', textContent: locationName }),
                createWeatherIcon(create, iconId, 'icon-large'),
                create.element('div', { className: 'temp-large', textContent: format.temperature(currentTemp, 'C') }),
                create.element('div', { className: 'desc-large', textContent: description }),
            ]);
            todaySection.appendChild(leftSection);

            // Right section - low/high/sunrise/sunset stats
            const sunriseTime = format.time(
                parse.timeInTimezone(weatherData.daily.sunrise[FORECAST_CONFIG.TODAY_INDEX], timezone),
                {
                    includeMinutes: true,
                }
            );
            const sunsetTime = format.time(
                parse.timeInTimezone(weatherData.daily.sunset[FORECAST_CONFIG.TODAY_INDEX], timezone),
                {
                    includeMinutes: true,
                }
            );
            const dailyLow = Math.round(weatherData.daily.temperature_2m_min[FORECAST_CONFIG.TODAY_INDEX]);
            const dailyHigh = Math.round(weatherData.daily.temperature_2m_max[FORECAST_CONFIG.TODAY_INDEX]);

            const rightSection = create.element('div', { className: 'right' }, [
                createStatItem({
                    create,
                    iconId: 'temp-low',
                    label: 'Low T.',
                    value: format.temperature(dailyLow, 'C'),
                }),
                createStatItem({
                    create,
                    iconId: 'temp-high',
                    label: 'High T.',
                    value: format.temperature(dailyHigh, 'C'),
                }),
                createStatItem({
                    create,
                    iconId: 'time-sunrise',
                    label: 'Sunrise',
                    value: sunriseTime,
                }),
                createStatItem({
                    create,
                    iconId: 'time-sunset',
                    label: 'Sunset',
                    value: sunsetTime,
                }),
            ]);

            todaySection.appendChild(rightSection);
            container.appendChild(todaySection);

            // Forecast section
            const forecastSection = create.element('div', { className: 'forecast' });

            for (let i = 0; i < FORECAST_CONFIG.LARGE_DAILY_COUNT; i++) {
                const dayTime = new Date(weatherData.daily.time[i]);
                const forecastItem = createForecastItem({
                    create,
                    dayName: i === FORECAST_CONFIG.TODAY_INDEX ? 'Today' : format.dayName(dayTime),
                    iconId: getWeatherIcon(weatherData.daily.weather_code[i], true),
                    low: Math.round(dailyLows[i]),
                    high: Math.round(dailyHighs[i]),
                    globalMin,
                    globalMax,
                    current: i === FORECAST_CONFIG.TODAY_INDEX ? currentTemp : null,
                });
                forecastSection.appendChild(forecastItem);
            }

            container.appendChild(forecastSection);
        }

        //
        // Full
        //
        else if (size === view.BREAKPOINTS.full.name) {
            // Calculate global min/max for temperature normalization
            const dailyLows = weatherData.daily.temperature_2m_min.slice(0, FORECAST_CONFIG.FULL_DAILY_COUNT);
            const dailyHighs = weatherData.daily.temperature_2m_max.slice(0, FORECAST_CONFIG.FULL_DAILY_COUNT);
            const globalMin = Math.min(...dailyLows);
            const globalMax = Math.max(...dailyHighs);

            // Today section wrapper
            const todaySection = create.element('div', { className: 'today-section' });

            // Current weather block (left side)
            const currentBlock = create.element('div', { className: 'current' }, [
                create.element('div', { className: 'location-header', textContent: locationName }),
                create.element('div', { className: 'temp-and-icon' }, [
                    create.element('span', { textContent: format.temperature(currentTemp, 'C') }),
                    createWeatherIcon(create, iconId, 'current-icon'),
                ]),
                create.element('div', { className: 'current-desc', textContent: description }),
            ]);
            todaySection.appendChild(currentBlock);

            // Hourly section (right side)
            const hourlySection = create.element('div', { className: 'hourly-section' });

            // Hourly forecast
            const hourlyForecast = create.element('div', { className: 'hourly-forecast' });
            const currentHourIndex = getCurrentHourIndex(weatherData.hourly.time, weatherData.current.time, timezone);
            for (
                let i = currentHourIndex;
                i < currentHourIndex + FORECAST_CONFIG.FULL_HOURLY_COUNT && i < weatherData.hourly.time.length;
                i++
            ) {
                const hourItem = createHourlyItem({
                    create,
                    time: weatherData.hourly.time[i],
                    timezone,
                    temp: Math.round(weatherData.hourly.temperature_2m[i]),
                    iconId: getWeatherIcon(weatherData.hourly.weather_code[i], isDay),
                });
                hourlyForecast.appendChild(hourItem);
            }
            hourlySection.appendChild(hourlyForecast);

            // Weather info (wind + sun times)
            const windSpeed = Math.round(weatherData.current.wind_speed_10m);
            const windDirection = weatherData.current.wind_direction_10m;
            const windDirectionText = getWindDirection(windDirection);

            const sunriseTime = format.time(
                parse.timeInTimezone(weatherData.daily.sunrise[FORECAST_CONFIG.TODAY_INDEX], timezone),
                {
                    includeMinutes: true,
                }
            );
            const sunsetTime = format.time(
                parse.timeInTimezone(weatherData.daily.sunset[FORECAST_CONFIG.TODAY_INDEX], timezone),
                {
                    includeMinutes: true,
                }
            );

            const weatherInfo = create.element('div', { className: 'weather-info' }, [
                create.element('div', {
                    className: 'wind-info',
                    textContent: `Light Wind From The ${windDirectionText} ${windSpeed} M/S`,
                }),
                create.element('div', { className: 'sun-times' }, [
                    create.element('div', { className: 'time-entry' }, [
                        createWeatherIcon(create, 'time-sunrise'),
                        create.element('span', { textContent: sunriseTime }),
                    ]),
                    create.element('div', { className: 'time-entry' }, [
                        createWeatherIcon(create, 'time-sunset'),
                        create.element('span', { textContent: sunsetTime }),
                    ]),
                ]),
            ]);
            hourlySection.appendChild(weatherInfo);
            todaySection.appendChild(hourlySection);
            container.appendChild(todaySection);

            // Forecast grid
            const forecastGrid = create.element('div', { className: 'forecast-grid' });

            // Left column
            const leftColumn = create.element('div', { className: 'forecast-column' });
            for (let i = 0; i < FORECAST_CONFIG.FULL_DAYS_PER_COLUMN; i++) {
                const dayTime = new Date(weatherData.daily.time[i]);
                const forecastItem = createForecastItem({
                    create,
                    dayName: i === FORECAST_CONFIG.TODAY_INDEX ? 'Today' : format.dayName(dayTime),
                    iconId: getWeatherIcon(weatherData.daily.weather_code[i], true),
                    low: Math.round(dailyLows[i]),
                    high: Math.round(dailyHighs[i]),
                    globalMin,
                    globalMax,
                    current: i === FORECAST_CONFIG.TODAY_INDEX ? currentTemp : null,
                });
                leftColumn.appendChild(forecastItem);
            }
            forecastGrid.appendChild(leftColumn);

            // Right column
            const rightColumn = create.element('div', { className: 'forecast-column' });
            for (let i = FORECAST_CONFIG.FULL_DAYS_PER_COLUMN; i < FORECAST_CONFIG.FULL_DAILY_COUNT; i++) {
                const dayTime = new Date(weatherData.daily.time[i]);
                const forecastItem = createForecastItem({
                    create,
                    dayName: format.dayName(dayTime),
                    iconId: getWeatherIcon(weatherData.daily.weather_code[i], true),
                    low: Math.round(dailyLows[i]),
                    high: Math.round(dailyHighs[i]),
                    globalMin,
                    globalMax,
                    current: null,
                });
                rightColumn.appendChild(forecastItem);
            }
            forecastGrid.appendChild(rightColumn);
            container.appendChild(forecastGrid);
        }

        //
        // Failed to match any size
        //
        else {
            container.textContent = `Size "${size}" not implemented yet. Viewport: ${window.innerWidth}x${window.innerHeight}`;
            container.style.fontSize = '24px';
        }
    } catch (error) {
        if (error instanceof WidgetInputError) {
            overlay.showError(error.message);
        } else {
            console.error('Error fetching weather data:', error);
            overlay.showError(error.message || 'Unexpected error while loading weather data.');
        }
    } finally {
        ready();
    }
}

main();
