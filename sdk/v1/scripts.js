// SDK IIFE - only exposes the sdk() function globally
(() => {
const timeStart = performance.now();

//
// Constants
//

const THEMES = ['dark', 'light'];

/**
 * Widget size breakpoints
 * @typedef {{width: number, height: number, name: string}} Rect
 * @type {Record<'full' | 'large' | 'medium' | 'small', Rect>}
 */
const BREAKPOINTS = {
    full: {
        width: 1280,
        height: 480,
        name: 'full',
    },
    large: {
        width: 638,
        height: 480,
        name: 'large',
    },
    medium: {
        width: 638,
        height: 238,
        name: 'medium',
    },
    small: {
        width: 317,
        height: 238,
        name: 'small',
    },
};
const NUMBER_FORMAT = {
    // 1 234 567,89 (space for thousands, comma for decimal)
    NUMBER_FORMAT_SPACE_GROUP_COMMA_DECIMAL: { locale: 'cs-CZ', options: {} },
    // 1,234,567.89 (comma for thousands, dot for decimal)
    NUMBER_FORMAT_COMMA_GROUP_DOT_DECIMAL: { locale: 'en-US', options: {} },
    // 1.234.567,89 (dot for thousands, comma for decimal)
    NUMBER_FORMAT_DOT_GROUP_COMMA_DECIMAL: { locale: 'de-DE', options: {} },
    // 1 234 567.89 (space for thousands, dot for decimal)
    NUMBER_FORMAT_SPACE_GROUP_DOT_DECIMAL: { locale: 'fr-FR', options: { useGrouping: true } },
};
const TIME_FORMAT = {
    TIME_FORMAT_12_HOUR: null,
    TIME_FORMAT_24_HOUR: null,
};
const DATE_FORMAT = {
    DATE_FORMAT_DD_MM_YYYY_DOT: null,
    DATE_FORMAT_DD_MM_YYYY_SLASH: null,
    DATE_FORMAT_D_M_YYYY_SLASH: null,
    DATE_FORMAT_M_D_YYYY_SLASH: null,
    DATE_FORMAT_DD_MM_YYYY_DASH: null,
    DATE_FORMAT_YYYY_M_D_SLASH: null,
    DATE_FORMAT_YYYY_MM_DD_DOT: null,
    DATE_FORMAT_YYYY_MM_DD_DASH: null,
};
const TEMPERATURE_UNIT = {
    /**
     * @param {number} value
     * @param {boolean} withUnit
     * @returns {string}
     */
    TEMPERATURE_UNIT_CELSIUS(value, withUnit = true) {
        let res = `${Math.round(value)}°`;
        if (withUnit) res += 'C';
        return res;
    },
    /**
     * @param {number} value
     * @param {boolean} withUnit
     * @returns {string}
     */
    TEMPERATURE_UNIT_FAHRENHEIT(value, withUnit = true) {
        let res = `${Math.round(value)}°`;
        if (withUnit) res += 'F';
        return res;
    },
};
/**
 * Symbol configuration for ticker icons
 * Maps symbol prefixes to display character and background color
 * @type {Record<string, {char: string, bg: string}>}
 */
const SYMBOL_ICONS = {
    // Crypto
    BTC: { char: '₿', bg: 'linear-gradient(135deg, #f7931a 0%, #ff9800 100%)' },
    ETH: { char: 'Ξ', bg: 'linear-gradient(135deg, #627eea 0%, #8c9eff 100%)' },
    // Fiat currencies
    USD: { char: '$', bg: 'linear-gradient(135deg, #85bb65 0%, #a0d468 100%)' },
    EUR: { char: '€', bg: 'linear-gradient(135deg, #003399 0%, #4d79ff 100%)' },
    GBP: { char: '£', bg: 'linear-gradient(135deg, #012169 0%, #4d6db3 100%)' },
    JPY: { char: '¥', bg: 'linear-gradient(135deg, #bc002d 0%, #e63950 100%)' },
    CHF: { char: 'F', bg: 'linear-gradient(135deg, #d52b1e 0%, #e85a4f 100%)' },
    AUD: { char: '$', bg: 'linear-gradient(135deg, #00008b 0%, #4d4db3 100%)' },
    CAD: { char: '$', bg: 'linear-gradient(135deg, #ff0000 0%, #ff4d4d 100%)' },
    CNY: { char: '¥', bg: 'linear-gradient(135deg, #de2910 0%, #e85a4f 100%)' },
    INR: { char: '₹', bg: 'linear-gradient(135deg, #ff9933 0%, #ffb366 100%)' },
    CZK: { char: 'Kč', bg: 'linear-gradient(135deg, #11457e 0%, #4d79b3 100%)' },
    PLN: { char: 'zł', bg: 'linear-gradient(135deg, #dc143c 0%, #e85a6a 100%)' },
};

const TIMEZONES = [
    'UTC',
    'Africa/Abidjan',
    'Africa/Accra',
    'Africa/Addis_Ababa',
    'Africa/Algiers',
    'Africa/Asmara',
    'Africa/Bamako',
    'Africa/Bangui',
    'Africa/Banjul',
    'Africa/Bissau',
    'Africa/Blantyre',
    'Africa/Brazzaville',
    'Africa/Bujumbura',
    'Africa/Cairo',
    'Africa/Casablanca',
    'Africa/Ceuta',
    'Africa/Conakry',
    'Africa/Dakar',
    'Africa/Dar_es_Salaam',
    'Africa/Djibouti',
    'Africa/Douala',
    'Africa/El_Aaiun',
    'Africa/Freetown',
    'Africa/Gaborone',
    'Africa/Harare',
    'Africa/Johannesburg',
    'Africa/Juba',
    'Africa/Kampala',
    'Africa/Khartoum',
    'Africa/Kigali',
    'Africa/Kinshasa',
    'Africa/Lagos',
    'Africa/Libreville',
    'Africa/Lome',
    'Africa/Luanda',
    'Africa/Lubumbashi',
    'Africa/Lusaka',
    'Africa/Malabo',
    'Africa/Maputo',
    'Africa/Maseru',
    'Africa/Mbabane',
    'Africa/Mogadishu',
    'Africa/Monrovia',
    'Africa/Nairobi',
    'Africa/Ndjamena',
    'Africa/Niamey',
    'Africa/Nouakchott',
    'Africa/Ouagadougou',
    'Africa/Porto_Novo',
    'Africa/Sao_Tome',
    'Africa/Tripoli',
    'Africa/Tunis',
    'Africa/Windhoek',
    'America/Adak',
    'America/Anchorage',
    'America/Anguilla',
    'America/Antigua',
    'America/Araguaina',
    'America/Argentina/Buenos_Aires',
    'America/Argentina/Catamarca',
    'America/Argentina/Cordoba',
    'America/Argentina/Jujuy',
    'America/Argentina/La_Rioja',
    'America/Argentina/Mendoza',
    'America/Argentina/Rio_Gallegos',
    'America/Argentina/Salta',
    'America/Argentina/San_Juan',
    'America/Argentina/San_Luis',
    'America/Argentina/Tucuman',
    'America/Argentina/Ushuaia',
    'America/Aruba',
    'America/Asuncion',
    'America/Atikokan',
    'America/Bahia',
    'America/Bahia_Banderas',
    'America/Barbados',
    'America/Belem',
    'America/Belize',
    'America/Blanc-Sablon',
    'America/Boa_Vista',
    'America/Bogota',
    'America/Boise',
    'America/Cambridge_Bay',
    'America/Campo_Grande',
    'America/Cancun',
    'America/Caracas',
    'America/Cayenne',
    'America/Cayman',
    'America/Chicago',
    'America/Chihuahua',
    'America/Ciudad_Juarez',
    'America/Costa_Rica',
    'America/Coyhaique',
    'America/Creston',
    'America/Cuiaba',
    'America/Curacao',
    'America/Danmarkshavn',
    'America/Dawson',
    'America/Dawson_Creek',
    'America/Denver',
    'America/Detroit',
    'America/Dominica',
    'America/Edmonton',
    'America/Eirunepe',
    'America/El_Salvador',
    'America/Fortaleza',
    'America/Fort_Nelson',
    'America/Glace_Bay',
    'America/Goose_Bay',
    'America/Grand_Turk',
    'America/Grenada',
    'America/Guadeloupe',
    'America/Guatemala',
    'America/Guayaquil',
    'America/Guyana',
    'America/Halifax',
    'America/Havana',
    'America/Hermosillo',
    'America/Indiana/Indianapolis',
    'America/Indiana/Knox',
    'America/Indiana/Marengo',
    'America/Indiana/Petersburg',
    'America/Indiana/Tell_City',
    'America/Indiana/Vevay',
    'America/Indiana/Vincennes',
    'America/Indiana/Winamac',
    'America/Inuvik',
    'America/Iqaluit',
    'America/Jamaica',
    'America/Juneau',
    'America/Kentucky/Louisville',
    'America/Kentucky/Monticello',
    'America/Kralendijk',
    'America/La_Paz',
    'America/Lima',
    'America/Los_Angeles',
    'America/Lower_Princes',
    'America/Maceio',
    'America/Managua',
    'America/Manaus',
    'America/Marigot',
    'America/Martinique',
    'America/Matamoros',
    'America/Mazatlan',
    'America/Menominee',
    'America/Merida',
    'America/Metlakatla',
    'America/Mexico_City',
    'America/Miquelon',
    'America/Moncton',
    'America/Monterrey',
    'America/Montevideo',
    'America/Montserrat',
    'America/Nassau',
    'America/New_York',
    'America/Nome',
    'America/Noronha',
    'America/North_Dakota/Beulah',
    'America/North_Dakota/Center',
    'America/North_Dakota/New_Salem',
    'America/Nuuk',
    'America/Ojinaga',
    'America/Panama',
    'America/Paramaribo',
    'America/Phoenix',
    'America/Port-au-Prince',
    'America/Port_of_Spain',
    'America/Porto_Velho',
    'America/Puerto_Rico',
    'America/Punta_Arenas',
    'America/Rankin_Inlet',
    'America/Recife',
    'America/Regina',
    'America/Resolute',
    'America/Rio_Branco',
    'America/Santarem',
    'America/Santiago',
    'America/Santo_Domingo',
    'America/Sao_Paulo',
    'America/Scoresbysund',
    'America/Sitka',
    'America/St_Barthelemy',
    'America/St_Johns',
    'America/St_Kitts',
    'America/St_Lucia',
    'America/St_Thomas',
    'America/St_Vincent',
    'America/Swift_Current',
    'America/Tegucigalpa',
    'America/Thule',
    'America/Tijuana',
    'America/Toronto',
    'America/Tortola',
    'America/Vancouver',
    'America/Whitehorse',
    'America/Winnipeg',
    'America/Yakutat',
    'Antarctica/Casey',
    'Antarctica/Davis',
    'Antarctica/DumontDUrville',
    'Antarctica/Macquarie',
    'Antarctica/Mawson',
    'Antarctica/McMurdo',
    'Antarctica/Palmer',
    'Antarctica/Rothera',
    'Antarctica/Syowa',
    'Antarctica/Troll',
    'Antarctica/Vostok',
    'Arctic/Longyearbyen',
    'Asia/Aden',
    'Asia/Almaty',
    'Asia/Amman',
    'Asia/Anadyr',
    'Asia/Aqtau',
    'Asia/Aqtobe',
    'Asia/Ashgabat',
    'Asia/Atyrau',
    'Asia/Baghdad',
    'Asia/Bahrain',
    'Asia/Baku',
    'Asia/Bangkok',
    'Asia/Barnaul',
    'Asia/Beirut',
    'Asia/Bishkek',
    'Asia/Brunei',
    'Asia/Chita',
    'Asia/Colombo',
    'Asia/Damascus',
    'Asia/Dhaka',
    'Asia/Dili',
    'Asia/Dubai',
    'Asia/Dushanbe',
    'Asia/Famagusta',
    'Asia/Gaza',
    'Asia/Hebron',
    'Asia/Ho_Chi_Minh',
    'Asia/Hong_Kong',
    'Asia/Hovd',
    'Asia/Irkutsk',
    'Asia/Jakarta',
    'Asia/Jayapura',
    'Asia/Jerusalem',
    'Asia/Kabul',
    'Asia/Kamchatka',
    'Asia/Karachi',
    'Asia/Kathmandu',
    'Asia/Khandyga',
    'Asia/Kolkata',
    'Asia/Krasnoyarsk',
    'Asia/Kuala_Lumpur',
    'Asia/Kuching',
    'Asia/Kuwait',
    'Asia/Macau',
    'Asia/Magadan',
    'Asia/Makassar',
    'Asia/Manila',
    'Asia/Muscat',
    'Asia/Nicosia',
    'Asia/Novokuznetsk',
    'Asia/Novosibirsk',
    'Asia/Omsk',
    'Asia/Oral',
    'Asia/Phnom_Penh',
    'Asia/Pontianak',
    'Asia/Pyongyang',
    'Asia/Qatar',
    'Asia/Qostanay',
    'Asia/Qyzylorda',
    'Asia/Riyadh',
    'Asia/Sakhalin',
    'Asia/Samarkand',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Srednekolymsk',
    'Asia/Taipei',
    'Asia/Tashkent',
    'Asia/Tbilisi',
    'Asia/Tehran',
    'Asia/Thimphu',
    'Asia/Tokyo',
    'Asia/Tomsk',
    'Asia/Ulaanbaatar',
    'Asia/Urumqi',
    'Asia/Ust-Nera',
    'Asia/Vientiane',
    'Asia/Vladivostok',
    'Asia/Yakutsk',
    'Asia/Yangon',
    'Asia/Yekaterinburg',
    'Asia/Yerevan',
    'Atlantic/Azores',
    'Atlantic/Bermuda',
    'Atlantic/Canary',
    'Atlantic/Cape_Verde',
    'Atlantic/Faroe',
    'Atlantic/Madeira',
    'Atlantic/Reykjavik',
    'Atlantic/South_Georgia',
    'Atlantic/Stanley',
    'Atlantic/St_Helena',
    'Australia/Adelaide',
    'Australia/Brisbane',
    'Australia/Broken_Hill',
    'Australia/Darwin',
    'Australia/Eucla',
    'Australia/Hobart',
    'Australia/Lindeman',
    'Australia/Lord_Howe',
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Sydney',
    'Etc/GMT',
    'Etc/GMT+1',
    'Etc/GMT-1',
    'Etc/GMT+10',
    'Etc/GMT-10',
    'Etc/GMT+11',
    'Etc/GMT-11',
    'Etc/GMT+12',
    'Etc/GMT-12',
    'Etc/GMT-13',
    'Etc/GMT-14',
    'Etc/GMT+2',
    'Etc/GMT-2',
    'Etc/GMT+3',
    'Etc/GMT-3',
    'Etc/GMT+4',
    'Etc/GMT-4',
    'Etc/GMT+5',
    'Etc/GMT-5',
    'Etc/GMT+6',
    'Etc/GMT-6',
    'Etc/GMT+7',
    'Etc/GMT-7',
    'Etc/GMT+8',
    'Etc/GMT-8',
    'Etc/GMT+9',
    'Etc/GMT-9',
    'Europe/Amsterdam',
    'Europe/Andorra',
    'Europe/Astrakhan',
    'Europe/Athens',
    'Europe/Belgrade',
    'Europe/Berlin',
    'Europe/Bratislava',
    'Europe/Brussels',
    'Europe/Bucharest',
    'Europe/Budapest',
    'Europe/Busingen',
    'Europe/Chisinau',
    'Europe/Copenhagen',
    'Europe/Dublin',
    'Europe/Gibraltar',
    'Europe/Guernsey',
    'Europe/Helsinki',
    'Europe/Isle_of_Man',
    'Europe/Istanbul',
    'Europe/Jersey',
    'Europe/Kaliningrad',
    'Europe/Kirov',
    'Europe/Kyiv',
    'Europe/Lisbon',
    'Europe/Ljubljana',
    'Europe/London',
    'Europe/Luxembourg',
    'Europe/Madrid',
    'Europe/Malta',
    'Europe/Mariehamn',
    'Europe/Minsk',
    'Europe/Monaco',
    'Europe/Moscow',
    'Europe/Oslo',
    'Europe/Paris',
    'Europe/Podgorica',
    'Europe/Prague',
    'Europe/Riga',
    'Europe/Rome',
    'Europe/Samara',
    'Europe/San_Marino',
    'Europe/Sarajevo',
    'Europe/Saratov',
    'Europe/Simferopol',
    'Europe/Skopje',
    'Europe/Sofia',
    'Europe/Stockholm',
    'Europe/Tallinn',
    'Europe/Tirane',
    'Europe/Ulyanovsk',
    'Europe/Vaduz',
    'Europe/Vatican',
    'Europe/Vienna',
    'Europe/Vilnius',
    'Europe/Volgograd',
    'Europe/Warsaw',
    'Europe/Zagreb',
    'Europe/Zurich',
    'Indian/Antananarivo',
    'Indian/Chagos',
    'Indian/Christmas',
    'Indian/Cocos',
    'Indian/Comoro',
    'Indian/Kerguelen',
    'Indian/Mahe',
    'Indian/Maldives',
    'Indian/Mauritius',
    'Indian/Mayotte',
    'Indian/Reunion',
    'Pacific/Apia',
    'Pacific/Auckland',
    'Pacific/Bougainville',
    'Pacific/Chatham',
    'Pacific/Chuuk',
    'Pacific/Easter',
    'Pacific/Efate',
    'Pacific/Fakaofo',
    'Pacific/Fiji',
    'Pacific/Funafuti',
    'Pacific/Galapagos',
    'Pacific/Gambier',
    'Pacific/Guadalcanal',
    'Pacific/Guam',
    'Pacific/Honolulu',
    'Pacific/Kanton',
    'Pacific/Kiritimati',
    'Pacific/Kosrae',
    'Pacific/Kwajalein',
    'Pacific/Majuro',
    'Pacific/Marquesas',
    'Pacific/Midway',
    'Pacific/Nauru',
    'Pacific/Niue',
    'Pacific/Norfolk',
    'Pacific/Noumea',
    'Pacific/Pago_Pago',
    'Pacific/Palau',
    'Pacific/Pitcairn',
    'Pacific/Pohnpei',
    'Pacific/Port_Moresby',
    'Pacific/Rarotonga',
    'Pacific/Saipan',
    'Pacific/Tahiti',
    'Pacific/Tarawa',
    'Pacific/Tongatapu',
    'Pacific/Wake',
    'Pacific/Wallis',
];

const params = {
    /** @type {URLSearchParams} */
    get all() {
        const searchString = window.deck_view_query ?? window.location.search;
        const searchObject = new URLSearchParams(searchString);
        return searchObject;
    },

    /**
     * Get a parameter value.
     *
     * @param {string} name
     * @param {string|number|boolean} [defaultValue]
     */
    getAny(name, defaultValue) {
        return this.all.get(name) ?? defaultValue;
    },

    /**
     * Get a parameter value as boolean.
     *
     * @param {string} name
     * @param {boolean} [defaultValue]
     * @returns {boolean}
     */
    getBool(name, defaultValue = false) {
        const raw = this.getAny(name, defaultValue);
        switch (raw) {
            case '1':
            case 'true':
                return true;

            case '0':
            case 'false':
                return false;

            default:
                return defaultValue;
        }
    },

    /**
     * Get a parameter from a set of valid values.
     *
     * @param {string} name
     * @param {T[]} validValues
     * @param {T} [defaultValue]
     * @template T
     */
    getAllowed(name, validValues, defaultValue) {
        const value = this.getAny(name);
        return validValues.includes(value) ? value : defaultValue;
    },

    /** @type {'full'|'large'|'medium'|'small'} */
    get size() {
        const sizes = Object.keys(BREAKPOINTS);
        return this.getAllowed('size', sizes, 'full');
    },

    /** @type {'dark' | 'light'} */
    get theme() {
        return this.getAllowed('theme', THEMES, THEMES[0]);
    },
    /** @type {string} */
    get timezone() {
        return this.getAllowed('timezone', TIMEZONES, TIMEZONES[0]);
    },
    /** @type {string} */
    get numberFormat() {
        const options = Object.keys(NUMBER_FORMAT);
        return this.getAllowed('numberFormat', options, options[0]);
    },
    /** @type {string} */
    get timeFormat() {
        const options = Object.keys(TIME_FORMAT);
        return this.getAllowed('timeFormat', options, options[0]);
    },
    /** @type {string} */
    get dateFormat() {
        const options = Object.keys(DATE_FORMAT);
        return this.getAllowed('dateFormat', options, options[0]);
    },
    /** @type {string} */
    get temperatureUnit() {
        const options = Object.keys(TEMPERATURE_UNIT);
        return this.getAllowed('temperatureUnit', options, options[0]);
    },
};

/**
 * Formatting utilities using Intl API
 * ===================================
 */
const format = {
    /**
     * Format a number
     * @param {number} value - The numeric value to format
     * @param {object} [options] - Additional Intl.NumberFormat options
     * @returns {string} Formatted number string
     */
    number(value, options = {}) {
        const config = NUMBER_FORMAT[params.numberFormat] || NUMBER_FORMAT.NUMBER_FORMAT_SPACE_GROUP_COMMA_DECIMAL;
        return new Intl.NumberFormat(config.locale, { ...config.options, ...options }).format(value);
    },

    /**
     * Format a chart decimal tick value with smart decimal places based on magnitude
     * Respects user's number format preferences for separators
     * @param {number} value - The numeric value to format
     * @param {object} [options] - Additional Intl.NumberFormat options to override defaults
     * @returns {string} Formatted chart tick value string
     *
     * Decimal place rules based on magnitude:
     * - value < 0.01: Show enough decimals to display at least 2 significant non-zero digits (e.g., 0.0012, 0.012)
     * - 0.01 <= value < 100000: Always show exactly 2 decimal places (e.g., 1.23, 12.34, 1234.56)
     * - value >= 100000: Show as integer with 0 decimal places (e.g., 123456)
     */
    chartDecimalTick(value, options = {}) {
        const absValue = Math.abs(value);
        let decimals;

        if (absValue < 0.01 && absValue > 0) {
            // For very small values, show enough decimals to get at least 2 significant non-zero digits
            // Calculate how many decimal places needed
            decimals = Math.max(2, Math.ceil(-Math.log10(absValue)) + 1);
        } else if (absValue < 100000) {
            decimals = 2;
        } else {
            decimals = 0;
        }

        const config = NUMBER_FORMAT[params.numberFormat] || NUMBER_FORMAT.NUMBER_FORMAT_SPACE_GROUP_COMMA_DECIMAL;
        return new Intl.NumberFormat(config.locale, {
            ...config.options,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            ...options,
        }).format(value);
    },

    /**
     * Format a number as currency
     * @param {number} value - The numeric value to format
     * @param {string} currencyCode - Three-letter currency code (e.g., 'USD', 'EUR')
     * @returns {string} Formatted currency string
     */
    currency(value, currencyCode) {
        const config = NUMBER_FORMAT[params.numberFormat] || NUMBER_FORMAT.NUMBER_FORMAT_SPACE_GROUP_COMMA_DECIMAL;
        return new Intl.NumberFormat(config.locale, {
            ...config.options,
            style: 'currency',
            currency: currencyCode.toUpperCase(),
        }).format(value);
    },

    /**
     * Format a date
     * @param {Date|number} date - The date to format (Date object or Unix timestamp in seconds)
     * @returns {string} Formatted date string
     */
    date(date) {
        const { dateFormat, timezone } = params;

        try {
            // Use Intl.DateTimeFormat to get date in the specified timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });

            // Convert Unix timestamp to Date if necessary
            const dateObj = date instanceof Date ? date : new Date(date * 1000);
            const parts = formatter.formatToParts(dateObj);

            const yyyy = parts.find(p => p.type === 'year').value;
            const mm = parts.find(p => p.type === 'month').value;
            const dd = parts.find(p => p.type === 'day').value;
            const d = Number.parseInt(dd, 10).toString();
            const m = Number.parseInt(mm, 10).toString();

            const formats = {
                DATE_FORMAT_DD_MM_YYYY_DOT: `${dd}.${mm}.${yyyy}`,
                DATE_FORMAT_DD_MM_YYYY_SLASH: `${dd}/${mm}/${yyyy}`,
                DATE_FORMAT_D_M_YYYY_SLASH: `${d}/${m}/${yyyy}`,
                DATE_FORMAT_M_D_YYYY_SLASH: `${m}/${d}/${yyyy}`,
                DATE_FORMAT_DD_MM_YYYY_DASH: `${dd}-${mm}-${yyyy}`,
                DATE_FORMAT_YYYY_M_D_SLASH: `${yyyy}/${m}/${d}`,
                DATE_FORMAT_YYYY_MM_DD_DOT: `${yyyy}.${mm}.${dd}`,
                DATE_FORMAT_YYYY_MM_DD_DASH: `${yyyy}-${mm}-${dd}`,
            };

            return formats[dateFormat] || formats.DATE_FORMAT_DD_MM_YYYY_DOT;
        } catch (_) {
            return `[Invalid timezone: ${timezone}]`;
        }
    },

    /**
     * Format a date with custom components (for chart axes, etc.)
     * @param {Date|number} date - The date to format (Date object or Unix timestamp in seconds)
     * @param {Object} options - Formatting options
     * @param {boolean} [options.year] - Include year
     * @param {boolean} [options.month] - Include month
     * @param {boolean} [options.day] - Include day
     * @param {boolean} [options.hour] - Include hour
     * @param {boolean} [options.minute] - Include minute
     * @returns {string} Formatted date/time string respecting user's dateFormat preference
     */
    dateTime(date, options = {}) {
        const { dateFormat, timezone } = params;

        try {
            // Convert Unix timestamp to Date if necessary
            const dateObj = date instanceof Date ? date : new Date(date * 1_000);

            // Build date parts if any date component is requested
            const needsDate = options.year || options.month || options.day;
            const needsTime = options.hour || options.minute;

            if (!needsDate && !needsTime) return '';

            const result = [];

            if (needsDate) {
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    year: options.year ? 'numeric' : undefined,
                    month: options.month || options.day ? '2-digit' : undefined,
                    day: options.day ? '2-digit' : undefined,
                });

                const parts = formatter.formatToParts(dateObj);
                const yyyy = parts.find(p => p.type === 'year')?.value;
                const mm = parts.find(p => p.type === 'month')?.value;
                const dd = parts.find(p => p.type === 'day')?.value;
                const d = dd ? Number.parseInt(dd, 10).toString() : undefined;
                const m = mm ? Number.parseInt(mm, 10).toString() : undefined;

                // Map dateFormat to separator and order
                const dateFormats = {
                    DATE_FORMAT_DD_MM_YYYY_DOT: { sep: '.', order: [dd, mm, yyyy] },
                    DATE_FORMAT_DD_MM_YYYY_SLASH: { sep: '/', order: [dd, mm, yyyy] },
                    DATE_FORMAT_D_M_YYYY_SLASH: { sep: '/', order: [d, m, yyyy] },
                    DATE_FORMAT_M_D_YYYY_SLASH: { sep: '/', order: [m, d, yyyy] },
                    DATE_FORMAT_DD_MM_YYYY_DASH: { sep: '-', order: [dd, mm, yyyy] },
                    DATE_FORMAT_YYYY_M_D_SLASH: { sep: '/', order: [yyyy, m, d] },
                    DATE_FORMAT_YYYY_MM_DD_DOT: { sep: '.', order: [yyyy, mm, dd] },
                    DATE_FORMAT_YYYY_MM_DD_DASH: { sep: '-', order: [yyyy, mm, dd] },
                };

                const config = dateFormats[dateFormat] || dateFormats.DATE_FORMAT_DD_MM_YYYY_DOT;
                const datePart = config.order.filter(v => v !== undefined).join(config.sep);
                result.push(datePart);
            }

            if (needsTime) result.push(this.time(dateObj));

            return result.join(' ');
        } catch (_) {
            return `[Invalid timezone: ${timezone}]`;
        }
    },

    /**
     * Format a time
     * @param {Date} date - The date/time to format
     * @param {Object} [options] - Formatting options
     * @param {boolean} [options.includeMinutes=true] - Whether to include minutes
     * @returns {string} Formatted time string
     */
    time(date, options = {}) {
        const { includeMinutes = true } = options;
        const { timeFormat, timezone } = params;
        const is12Hour = timeFormat === 'TIME_FORMAT_12_HOUR';

        try {
            const formatOptions = {
                hour: 'numeric',
                hour12: is12Hour,
                timeZone: timezone,
            };

            if (includeMinutes) formatOptions.minute = '2-digit';

            return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
        } catch (_) {
            return `[Invalid timezone: ${timezone}]`;
        }
    },

    /**
     * Format a date as day name (e.g., "Monday", "Tuesday")
     *
     * @param {Date} date - The date to format
     * @returns {string} Day name
     */
    dayName(date) {
        const { timezone } = params;

        try {
            return new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                timeZone: timezone,
            }).format(date);
        } catch (_) {
            return `[Invalid timezone: ${timezone}]`;
        }
    },

    /**
     * Format a temperature
     *
     * @param {number} value
     * @param {'C' | 'F'} inputUnit
     * @param {boolean} withUnit - Include unit letter (C/F) after degree symbol
     * @returns {string}
     */
    temperature(value, inputUnit, withUnit = true) {
        const unit = params.temperatureUnit;

        if (unit === 'TEMPERATURE_UNIT_CELSIUS') {
            if (inputUnit === 'C') return TEMPERATURE_UNIT.TEMPERATURE_UNIT_CELSIUS(value, withUnit);
            return TEMPERATURE_UNIT.TEMPERATURE_UNIT_CELSIUS(((value - 32) * 5) / 9, withUnit);
        }

        if (unit === 'TEMPERATURE_UNIT_FAHRENHEIT') {
            if (inputUnit === 'F') return TEMPERATURE_UNIT.TEMPERATURE_UNIT_FAHRENHEIT(value, withUnit);
            return TEMPERATURE_UNIT.TEMPERATURE_UNIT_FAHRENHEIT((value * 9) / 5 + 32, withUnit);
        }
    },
};

/**
 * Parsing utilities
 * =================
 */
const parse = {
    /**
     * Parse a timezone-naive ISO string (e.g., "2025-12-09T07:53") as a time in the given timezone.
     * Useful when an API returns times without timezone info but you know what timezone they represent.
     * @param {string} isoString - Timezone-naive ISO string (e.g., from Open-Meteo API)
     * @param {string} [timezone] - IANA timezone identifier the string represents (defaults to params.timezone)
     * @returns {Date} Date object for the correct instant
     */
    timeInTimezone(isoString, timezone = params.timezone) {
        // Extract components from the ISO string
        const [datePart, timePart = '00:00'] = isoString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute = 0] = timePart.split(':').map(Number);

        // Create a formatter that outputs full date/time parts in the target timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        // Binary search for the correct timestamp
        // Start with a rough estimate assuming UTC
        let guess = Date.UTC(year, month - 1, day, hour, minute);
        const targetKey = `${year}-${month}-${day}-${hour}-${minute}`;

        for (let i = 0; i < 3; i++) {
            const parts = formatter.formatToParts(new Date(guess));
            const get = type => parseInt(parts.find(p => p.type === type).value, 10);

            const guessKey = `${get('year')}-${get('month')}-${get('day')}-${get('hour')}-${get('minute')}`;
            if (guessKey === targetKey) return new Date(guess);

            // Calculate difference and adjust
            const diffMs =
                (year - get('year')) * 365.25 * 24 * 60 * 60 * 1_000 +
                (month - get('month')) * 30 * 24 * 60 * 60 * 1_000 +
                (day - get('day')) * 24 * 60 * 60 * 1_000 +
                (hour - get('hour')) * 60 * 60 * 1_000 +
                (minute - get('minute')) * 60 * 1_000;

            guess += diffMs;
        }

        return new Date(guess);
    },
};

/** Shortcuts element selectors */
const select = {
    id: document.getElementById.bind(document),
    $: document.querySelector.bind(document),
    $$: document.querySelectorAll.bind(document),
};

/**
 * DOM manipulation utilities
 * ==========================
 */
const create = {
    /**
     * @template K extends keyof HTMLElementTagNameMap
     *
     * @param {K} tag
     * @param {Partial<HTMLElementTagNameMap[K]>} [attrs]
     * @param {HTMLElementTagNameMap[K] | HTMLElementTagNameMap[K][] | null} [children]
     *
     * @returns {HTMLElementTagNameMap[K]}
     */
    element(tag, attrs = {}, children = null) {
        const el = document.createElement(tag);
        Object.assign(el, attrs);

        if (Array.isArray(children)) {
            children.forEach(child => {
                el.appendChild(child);
            });
        } else if (children) el.appendChild(children);

        return el;
    },

    /**
     * @template K extends keyof HTMLElementTagNameMap
     * @param {K} tag
     * @param {Partial<SVGElementTagNameMap[K]>} [attrs]
     * @param {SVGElementTagNameMap[K] | SVGElementTagNameMap[K][] | null} [children]
     * @returns {SVGElementTagNameMap[K]}
     */
    svg(tag, attrs = {}, children = null) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);

        if (Array.isArray(children)) children.map(child => el.appendChild(child));
        else if (children) el.appendChild(children);

        return el;
    },
};

/**
 * CSS utilities
 * =============
 */
const css = {
    /**
     * Get CSS variable value
     * @param {string} varName - CSS variable name (e.g., '--text-primary')
     * @returns {string} The computed CSS variable value
     */
    getVar(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    },
};

/**
 * Overlay utilities
 * =================
 */
const overlay = {
    /**
     * Show offline overlay
     * Creates overlay elements if they don't exist
     */
    showOffline() {
        let overlayEl = document.getElementById('offline-overlay');

        // Create overlay elements if they don't exist
        if (!overlayEl) {
            const iconEl = create.element('div', { id: 'offline-icon', textContent: '📡' });
            iconEl.style.cssText = 'font-size: 3rem; opacity: 0.8;';

            const messageEl = create.element('div', { id: 'offline-message', textContent: 'Offline' });
            messageEl.style.cssText =
                'font-size: 1.5rem; font-weight: 500; color: var(--text-secondary); font-family: "Braiins Sans", sans-serif; max-width: 80%; word-wrap: break-word;';

            const contentEl = create.element('div', { id: 'offline-content' }, [iconEl, messageEl]);
            contentEl.style.cssText =
                'position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; text-align: center;';

            overlayEl = create.element('div', { id: 'offline-overlay' }, contentEl);
            overlayEl.style.cssText =
                'position: absolute; z-index: 10; inset: 0; background: color-mix(in srgb, var(--background) 95%, transparent); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center;';
            document.body.appendChild(overlayEl);
        }

        overlayEl.style.display = 'flex';
    },

    /**
     * Show error overlay with message
     * Creates overlay elements if they don't exist
     * @param {string} message - The error message to display
     */
    showError(message) {
        let overlayEl = document.getElementById('error-overlay');

        let messageEl = document.getElementById('error-message');

        // Create overlay elements if they don't exist
        if (!overlayEl) {
            const iconEl = create.svg('svg', { viewBox: '0 0 24 24', width: '48', height: '48' }, [
                create.svg('path', {
                    d: 'M12 2L2 22h20L12 2zm0 4l7.5 14h-15L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z',
                    fill: 'var(--text-secondary)',
                }),
            ]);
            iconEl.style.cssText = 'opacity: 0.6;';

            messageEl = create.element('div', { id: 'error-message' });
            messageEl.style.cssText = `
                font-size: 1.1rem;
                line-height: 1.3;
                font-weight: 400;
                color: var(--text-secondary);
                font-family: "Braiins Sans", sans-serif;
                max-width: 80%;
            `;

            const contentEl = create.element('div', { id: 'error-content' }, [iconEl, messageEl]);
            contentEl.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.75rem;
                padding: 2rem;
                text-align: center;
            `;

            overlayEl = create.element('div', { id: 'error-overlay' }, contentEl);
            overlayEl.style.cssText =
                'position: absolute; z-index: 10; inset: 0; background: color-mix(in srgb, var(--background) 95%, transparent); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center;';
            document.body.appendChild(overlayEl);
        }

        messageEl.textContent = message;
        overlayEl.style.display = 'flex';
    },
};

/**
 * Network utilities
 * =================
 */
const net = {
    /**
     * Detect if running in dev environment (not in render chrome)
     * @returns {boolean}
     */
    isDevEnvironment() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    /**
     * Fetch wrapper that automatically uses CORS proxy in dev environment
     * @param {string} url - The URL to fetch
     * @param {RequestInit} [options] - Fetch options
     * @returns {ReturnType<typeof window.fetch>}
     */
    async fetch(url, options = {}) {
        if (this.isDevEnvironment()) {
            // In dev environment, use the CORS proxy
            const proxyUrl = new URL('/cors-proxy', window.location.origin);
            proxyUrl.searchParams.set('uri', url);

            return fetch(proxyUrl.toString(), options);
        }

        // In production (render chrome), use native fetch
        return window.fetch(url, options);
    },

    /**
     * Check if error is due to network/offline issue
     * @param {Error} error
     * @returns {boolean}
     */
    isNetworkError(error) {
        return !navigator.onLine || (error.message.includes('Failed to fetch') && navigator.onLine === false);
    },
};

/**
 * Document related utilities
 * ==========================
 */
const view = {
    /**
     * Widget size breakpoints
     */
    BREAKPOINTS,
};

let readyCalled = false;

/**
 * Mark the widget as ready for screenshot rendering.
 * Call this after all async content (API calls, images, etc.) has loaded.
 */
function ready() {
    if (readyCalled) return;
    readyCalled = true;

    const timeToFirstReady = performance.now() - timeStart;
    log.info(`Time to first ready: ${timeToFirstReady.toFixed(2)}ms`);

    const marker = document.createElement('div');
    marker.id = 'widget-ready';
    marker.style.display = 'none';
    document.body.appendChild(marker);

    if ('deckFeederRenderReady' in window) {
        try {
            window.deckFeederRenderReady('ready');
        } catch (error) {
            const msg = 'deckFeederRenderReady() threw up';
            overlay.showError(msg);
            console.warn(msg);
            console.warn(error);
        }
    }
}

/**
 * @typedef {object} Logger
 * @property {(...data: any[]) => void} trace
 * @property {(...data: any[]) => void} debug
 * @property {(...data: any[]) => void} info
 * @property {(...data: any[]) => void} warn
 * @property {(...data: any[]) => void} error
 */

/**
 * Send a structured log message to the render worker (if supported).
 * Falls back to console logging in local previews.
 *
 * @param {'trace'|'debug'|'info'|'warn'|'error'} severity
 * @param {any} data
 * @returns {void}
 */
function $log(severity, data) {
    /** @type {{ severity: string, data: any }} */
    const payload = { severity: String(severity || 'info').toLowerCase(), data };

    const fn = window.deckFeederLog;
    if (typeof fn === 'function') {
        try {
            return fn(JSON.stringify(payload));
        } catch (error) {
            console.group('Failed to "deckFeederLog"');
            console.error(error);
            console.log(payload);
            console.groupEnd();
        }
    } else {
        (console[payload.severity] || console.log)('[widget/sdk/log]', payload.data);
    }
}

/** @type {Logger & { getLoggerWithContext(widgetName: string): Logger }} */
const log = {
    trace: (...args) => $log('trace', args),
    debug: (...args) => $log('debug', args),
    info: (...args) => $log('info', args),
    warn: (...args) => $log('warn', args),
    error: (...args) => $log('error', args),

    /**
     * @param {string} widgetName
     * @returns {Logger}
     */
    getLoggerWithContext(widgetName) {
        const context = { widgetName };
        return {
            trace: (...data) => $log('trace', { context, data }),
            debug: (...data) => $log('debug', { context, data }),
            info: (...data) => $log('info', { context, data }),
            warn: (...data) => $log('warn', { context, data }),
            error: (...data) => $log('error', { context, data }),
        };
    },
};

/**
 * Show a timeout error overlay
 */
function showTimeoutError() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(255, 0, 0, 0.9);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
        font-weight: bold;
        z-index: 9999;
    `;
    overlay.textContent = 'TIMEOUT';
    document.body.appendChild(overlay);
    ready();
}

/**
 * Chart utilities for creating sparkline charts with uPlot
 */
const charts = {
    /**
     * Create gradient fill for sparkline chart
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} height
     * @param {string} color
     * @returns {CanvasGradient}
     */
    createGradient(ctx, height, color) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        return gradient;
    },

    /**
     * Create a sparkline chart using uPlot
     * @param {HTMLElement} chartEl - Chart container element
     * @param {{timestamps: number[], prices: number[]}} data - Chart data
     * @param {boolean} isPositive - Whether to use success (green) or error (red) color
     * @param {string} [colorOverride] - Optional CSS variable name to override color (e.g., '--text-secondary')
     * @returns {uPlot} The created uPlot instance
     */
    createSparkline(chartEl, data, isPositive, colorOverride) {
        const colorVar = colorOverride || (isPositive ? '--support-success' : '--support-error');
        const color = css.getVar(colorVar);

        /** @type {uPlot.Options} */
        const opts = {
            width: chartEl.clientWidth,
            height: chartEl.clientHeight,
            scales: { x: { time: true } },
            axes: [{ show: false }, { show: false }],
            series: [
                {},
                {
                    stroke: color,
                    width: 2,
                    fill: (u, _seriesIdx) => {
                        const ctx = u.ctx;
                        return charts.createGradient(ctx, u.bbox.height, color);
                    },
                    points: { show: false },
                    spanGaps: false,
                },
            ],
            legend: { show: false },
            cursor: { show: false },
            padding: [0, 0, 0, 0],
        };

        /** @type {uPlot.AlignedData} */
        const plotData = [data.timestamps, data.prices];

        const plot = new uPlot(opts, plotData, chartEl);

        // Handle resize
        window.addEventListener('resize', () => {
            plot.setSize({
                width: chartEl.clientWidth,
                height: chartEl.clientHeight,
            });
        });

        return plot;
    },
};

// biome-ignore lint/correctness/noUnusedVariables: Global SDK object
function sdk() {
    // Apply theme on load
    document.documentElement.setAttribute('data-theme', params.theme);

    // Add widget-body class and size class to body for widget-specific styling
    const size = params.size;
    document.body.classList.add('widget-body', `size-${size}`);

    // Set a 5 second timeout
    setTimeout(() => {
        if (!readyCalled) {
            showTimeoutError();
        }
    }, 10_000);

    /**
     * Get icon configuration for a ticker symbol
     * @param {string} symbol - Ticker symbol (e.g., 'BTC-USD', 'EURUSD=X')
     * @returns {{char: string, bg: string}}
     */
    function getSymbolIcon(symbol) {
        // Extract base currency: 'BTC-USD' -> 'BTC', 'EURUSD=X' -> 'EUR'
        const base = symbol.split(/[-=]/)[0].toUpperCase();
        return SYMBOL_ICONS[base] || { char: base.charAt(0), bg: 'linear-gradient(135deg, #666 0%, #888 100%)' };
    }

    return {
        params,
        format,
        parse,
        select,
        create,
        css,
        net,
        overlay,
        log,
        ready,
        view,
        charts,
        getSymbolIcon,
    };
}

// Expose sdk globally
window.sdk = sdk;
})();
