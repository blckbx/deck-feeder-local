# deck-feeder-local

Self-hosted widget server for remote widgets on your Deck.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- x86_64 Linux machine

## Local Bitcoin Stats Widget Setup

To run the Bitcoin stats widget locally you need:

- A local Bitcoin node
- `btc-rpc-explorer` connected to your node with the additional APIs enabled
- `deck-feeder-local` running (this repo)
- nginx reverse proxy (config below in this README)
- UFW rules for the nginx port and Docker bridge (if UFW is enabled; rules below in this README)

Repositories:

```text
btc-rpc-explorer (with extra APIs): https://github.com/blckbx/btc-rpc-explorer
deck-feeder-local (this repo): https://github.com/blckbx/deck-feeder-local/tree/dev
```

### Run it

From the `deck-feeder-local` repo:

```bash
docker compose up -d
```

Then load the widgets into the database (run from the parent directory of `deck-feeder-local`):

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

### Setup Nginx

If a widget needs to call a local service (e.g., btc-rpc-explorer) from inside the
renderer, prefer a same-origin reverse proxy to avoid CORS and self-signed TLS
issues. One approach is to run nginx on a separate host port (e.g. 8081) and proxy:

- `/` -> `http://127.0.0.1:8080/` (deck-feeder)
- `/btc-rpc-explorer/` -> `http://127.0.0.1:3002/` (local service)

```nginx
        server {
            listen 8081;
            server_name _;

            # deck-feeder (docker on host:8080)
            location / {
                proxy_pass http://127.0.0.1:8080/;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Forwarded-For $remote_addr;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            # btc-rpc-explorer
            location /bitcoinstats/ {
                proxy_pass http://127.0.0.1:3002/;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Forwarded-For $remote_addr;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }
```

### Verify it works

```bash
# list available widgets
curl http://localhost:8081/

# render a widget
curl -X POST http://localhost:8081/weather/invoke \
  -H 'Content-Type: application/json' \
  -d '{"widget_version":"latest","size":"medium","params":{"location":"Prague"}}'
```

### Connect your Deck

Then set the widget URL to `http://<host-lan-ip>:8081/bitcoinstats`



### Notes: Docker Networking (Linux)

On Linux with UFW enabled, traffic from the Docker bridge to the host can be
blocked. You may need an explicit rule for the deck-feeder network bridge. 
The deck-feeder network bridge is permanently set to `br-deckfeeder` in `docker-compose.yml`:

```bash
sudo ufw allow in on br-deckfeeder to any port 8081 proto tcp
sudo ufw reload
```


## Creating Widgets

See [DEVELOPMENT.md](DEVELOPMENT.md) for technical details and widget development guide.

The `widgets/weather/` directory contains an example weather widget you can use as a starting point.
