# deck-feeder-local

Self-hosted widget server for remote widgets on your Deck.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- x86_64 Linux machine

### 1. Start the services

```bash
docker compose up -d
```

### 2. Push widgets to the database

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

### 3. Verify it works

```bash
# list available widgets
curl http://localhost:8080/

# render a widget
curl -X POST http://localhost:8080/weather/invoke \
  -H 'Content-Type: application/json' \
  -d '{"widget_version":"latest","size":"medium","params":{"location":"Prague"}}'
```

### 4. Connect your Deck

Point your Deck to your server's IP address on port 8080.

## Notes: Reverse Proxy + Docker Networking (Linux)

If a widget needs to call a local service (e.g., btc-rpc-explorer) from inside the
renderer, prefer a same-origin reverse proxy to avoid CORS and self-signed TLS
issues. One approach is to run nginx on a separate host port (e.g. 8081) and proxy:

- `/` -> `http://127.0.0.1:8080/` (deck-feeder)
- `/btc-rpc-explorer/` -> `http://127.0.0.1:3002/` (local service)

Then set the widget URL to `http://<host-lan-ip>:8081/btc-rpc-explorer`.

On Linux with UFW enabled, traffic from the Docker bridge to the host can be
blocked. You may need an explicit rule for the deck-feeder network bridge:

```bash
# Find the bridge name for the compose network
docker network inspect deck-feeder-local_default --format '{{.Id}}'
# Use the first 12 chars of the Id -> br-<id>
sudo ufw allow in on br-<id> to any port 8081 proto tcp
sudo ufw reload
```

Also ensure UFW forwarding is enabled:

```bash
# /etc/default/ufw
DEFAULT_FORWARD_POLICY="ACCEPT"
```

## Creating Widgets

See [DEVELOPMENT.md](DEVELOPMENT.md) for technical details and widget development guide.

The `widgets/weather/` directory contains an example weather widget you can use as a starting point.
