# Development Guide

## Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Deck   │────▶│   API   │────▶│ Worker  │
└─────────┘     └────┬────┘     └────┬────┘
                     │               │
                     ▼               ▼
              ┌──────────┐    ┌──────────┐
              │ Postgres │    │  Chrome  │
              └──────────┘    └──────────┘
```

1. Deck requests a widget render from the API
2. API queues a render job via RabbitMQ
3. Worker renders HTML to PNG using headless Chrome
4. API returns the image URL to the Deck

## Ports

| Service | Port | Description |
|---------|------|-------------|
| API | 8080 | Main API endpoint |
| API (internal) | 9180 | Internal metrics |
| Worker | 9101 | Worker metrics |
| RabbitMQ | 5672 | AMQP |
| RabbitMQ | 15672 | Management UI |
| Redis | 6379 | Cache |
| PostgreSQL | 5432 | Database |

## Configuration

Configuration files are in `config/`:

- `api.docker.toml` - API server settings (database, redis, rabbitmq)
- `worker.docker.toml` - worker settings (Chrome pool size, render format)

## Creating Widgets

A widget is a directory containing:

```
my-widget/
├── meta.json5      # widget metadata and parameters
├── index.html      # main HTML template
├── styles.css      # CSS styles
├── scripts.js      # JavaScript logic
└── static/         # static assets (icons, images)
    └── icon.svg
```

### meta.json5

Defines widget metadata and configurable parameters:

```json5
{
    // refresh interval in seconds
    ttl: 60,

    // supported sizes: 'full', 'large', 'medium', 'small'
    sizes: ['full', 'large', 'medium', 'small'],

    // display info
    name: 'My Widget',
    description: 'What this widget does',

    // assets
    assets: {
        icon: 'static/icon.svg',
    },

    // deck preferences to use (provided by the device)
    // available: theme, timezone, temperatureUnit, numberFormat, dateFormat, timeFormat
    prefs: ['theme', 'timezone'],

    // custom parameters users can configure
    params: {
        myParam: {
            name: 'My Parameter',
            description: 'What this parameter does',
            type: 'string',  // string, number, integer, boolean, array
            default: 'default value',
        },
    },
}
```

### scripts.js

Widget JavaScript uses the SDK provided by the renderer:

```javascript
async function main() {
    // get SDK helpers
    const { params, select, net, ready, overlay, view } = sdk();

    try {
        // get parameter values
        const myParam = params.getAny('myParam', 'fallback');
        const size = params.size;        // 'small', 'medium', 'large', 'full'
        const theme = params.theme;      // 'LIGHT' or 'DARK'
        const timezone = params.timezone; // IANA timezone string

        // fetch external data (goes through caching proxy)
        const data = await net.fetch('https://api.example.com/data')
            .then(r => r.json());

        // update the DOM
        select.id('container').textContent = data.value;
        select.class('title').textContent = myParam;

    } catch (error) {
        // show error overlay
        overlay.showError(error.message);
    } finally {
        // IMPORTANT: always call ready() when done
        // this signals the renderer to take a screenshot
        ready();
    }
}

main();
```

### SDK Reference

The `sdk()` function returns:

- `params` - parameter access
  - `params.size` - widget size ('small', 'medium', 'large', 'full')
  - `params.theme` - theme ('LIGHT' or 'DARK')
  - `params.timezone` - IANA timezone string
  - `params.getAny(name, fallback)` - get custom parameter value

- `select` - DOM selection helpers
  - `select.id(id)` - get element by ID
  - `select.class(className)` - get first element by class

- `net` - network helpers
  - `net.fetch(url)` - fetch URL (goes through caching proxy)

- `ready()` - signal that rendering is complete (MUST be called)

- `overlay` - error display
  - `overlay.showError(message)` - show error message

- `view` - viewport info
  - `view.BREAKPOINTS` - size breakpoint definitions

### Tips

1. **Always call `ready()`** - the worker waits for this signal before taking a screenshot. If you don't call it, the render will timeout after ~8 seconds.

2. **Handle errors gracefully** - use `overlay.showError()` to display user-friendly error messages.

3. **Use the caching proxy** - `net.fetch()` routes requests through a caching proxy, reducing load on external APIs.

4. **Test all sizes** - widgets should look good at all supported sizes. Use CSS to adjust layout per size.

5. **Keep it simple** - widgets render to static images. Animations won't work.

## Publishing Widgets

After creating or modifying widgets, publish them to the database:

```bash
docker compose exec api /usr/local/bin/push_templates \
  --widgets-dir /widgets \
  --db-host postgres \
  --db-port 5432 \
  --db-username deck_feeder \
  --db-password deck_feeder \
  --db-name deck_feeder \
  --migrations-dir /app/migrations \
  --device-prefs-file /sdk/v1/prefs.json5
```

The API automatically reloads widget metadata every 60 seconds.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List all widgets |
| `/{id}/metadata` | GET | Get widget metadata and schema |
| `/{id}/invoke` | POST | Render a widget |
| `/{id}/image` | GET | Get rendered image |
| `/{id}/icon` | GET | Get widget icon |
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |

### Invoke Request

```bash
curl -X POST http://localhost:8080/weather/invoke \
  -H 'Content-Type: application/json' \
  -d '{
    "widget_version": "latest",
    "size": "medium",
    "params": {
      "location": "Prague",
      "timezone": "Europe/Prague",
      "theme": "DARK"
    }
  }'
```

Response includes `image_url` to fetch the rendered PNG.
