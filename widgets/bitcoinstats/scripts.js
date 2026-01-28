/// <reference path="../../sdk/v1/scripts.js" />

function normalizeBaseUrl(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function fetchJson(net, url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await net.fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} from ${url}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}


async function getData({ net, url }) {
    const msg1 = `${url}/api/blocks/tip`;
    const msg3 = `${url}/api/mempool/summary`;
    const msg4 = `${url}/api/blockchain/next-halving`;
    const msg5 = `${url}/api/mining/next-block`;
    const msg6 = `${url}/api/blockchain/coins`;
    const msg8 = `${url}/api/networkinfo`;
    const msg9 = `${url}/api/getnettotals`;

    const results = await Promise.allSettled([
        fetchJson(net, msg1),
        fetchJson(net, msg3),
        fetchJson(net, msg4),
        fetchJson(net, msg5),
        fetchJson(net, msg6),
        fetchJson(net, msg8),
        fetchJson(net, msg9),
    ]);

    const tipRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const mempoolRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const halvingRes = results[2].status === 'fulfilled' ? results[2].value : null;
    const nextBlockRes = results[3].status === 'fulfilled' ? results[3].value : null;
    const coinsRes = results[4].status === 'fulfilled' ? results[4].value : null;
    const netInfoRes = results[5].status === 'fulfilled' ? results[5].value : null;
    const totalsRes = results[6].status === 'fulfilled' ? results[6].value : null;

    const blockheight = typeof tipRes?.height === 'number' ? tipRes.height : 0;
    const nextBlock = nextBlockRes || {};
    const min_fees = Number.isFinite(Number(nextBlock.minFeeRate)) ? Number(nextBlock.minFeeRate) : 0;
    const med_fees = Number.isFinite(Number(nextBlock.medianFeeRate)) ? Number(nextBlock.medianFeeRate) : 0;
    const max_fees = Number.isFinite(Number(nextBlock.maxFeeRate)) ? Number(nextBlock.maxFeeRate) : 0;

    const supply = Number.isFinite(Number(coinsRes?.supply)) ? Number(coinsRes.supply) : 0;

    const mempool_max = mempoolRes?.maxmempool ?? mempoolRes?.maxMempool ?? mempoolRes?.maxMemPool ?? 0;
    const mempool_usage = mempoolRes?.usage ?? 0;
    const txcount = mempoolRes?.size ?? 0;
    const halving = halvingRes?.blocksUntilNextHalving ?? 0;

    const connections = netInfoRes?.connections ?? 0;
    const connections_out = netInfoRes?.connections_out ?? 0;
    const connections_in = netInfoRes?.connections_in ?? 0;
    const localservicesnames = Array.isArray(netInfoRes?.localservicesnames)
        ? netInfoRes.localservicesnames
        : [];
    const networks = Array.isArray(netInfoRes?.networks) ? netInfoRes.networks : [];
    const localaddresses = Array.isArray(netInfoRes?.localaddresses) ? netInfoRes.localaddresses : [];
    let version = '0.0';
    if (netInfoRes?.version != null) {
        const raw = String(netInfoRes.version).padStart(6, '0');
        const major = String(parseInt(raw.slice(0, 2), 10));
        const minor = String(parseInt(raw.slice(2, 4), 10));
        const rcNum = parseInt(raw.slice(4, 6), 10);
        version = rcNum ? `${major}.${minor}-rc${rcNum}` : `${major}.${minor}`;
    }

    const bytesrecv = totalsRes?.totalbytesrecv ? totalsRes.totalbytesrecv / 1000000 : 0;
    const bytessent = totalsRes?.totalbytessent ? totalsRes.totalbytessent / 1000000 : 0;

    return {
        blockheight,
        min_fees,
        med_fees,
        max_fees,
        mempool_max,
        mempool_usage,
        supply,
        txcount,
        halving,
        connections,
        connections_out,
        connections_in,
        localservicesnames,
        networks,
        localaddresses,
        version,
        bytesrecv,
        bytessent,
    };
}

async function main() {
    const { params, select, ready, net, overlay, create, view } = sdk();

    try {
        // Template URL for btc-rpc-explorer API
        const rawUrl = params.getAny('url', 'http://host.docker.internal:3002');
        const url = normalizeBaseUrl(rawUrl);
        const {
            blockheight,
            min_fees,
            med_fees,
            max_fees,
            mempool_max,
            mempool_usage,
            supply,
            txcount,
            halving,
            connections,
            connections_out,
            connections_in,
            localservicesnames,
            networks,
            localaddresses,
            version,
            bytesrecv,
            bytessent,
        } = await getData({ net, url });
        const container = select.id('container');
        const size = params.size;
        const theme = (params.theme || 'light').toLowerCase();
        const classNames = [size, theme];
        if (size === view.BREAKPOINTS.full.name) {
            classNames.push('large');
        }
        container.className = classNames.join(' ');

        const mempoolUsageMb = mempool_usage / 1000000;
        const mempoolMaxMb = mempool_max / 1000000;
        const mempoolPercent = mempool_max > 0 ? Math.min(100, (mempool_usage / mempool_max) * 100) : 0;

        const buildForecast = (rows) => {
            const forecast = create.element('div', { className: 'forecast' });
            for (const [label, value, kind] of rows) {
                const item = create.element('div', { className: `forecast-item${kind ? ` ${kind}` : ''}` });
                const dayLabel = create.element('div', { className: 'day-label' });
                dayLabel.appendChild(create.element('span', { className: 'day-name', textContent: label }));
                const range = create.element('div', { className: 'temp-range' });
                range.appendChild(create.element('span', { className: 'forecast-temp high', textContent: String(value) }));
                if (kind === 'mempool-usage') {
                    const bar = create.element('div', { className: 'usage-bar' });
                    const fill = create.element('div', { className: 'usage-fill' });
                    fill.style.width = `${mempoolPercent.toFixed(1)}%`;
                    bar.appendChild(fill);
                    range.appendChild(bar);
                }
                item.appendChild(dayLabel);
                item.appendChild(range);
                forecast.appendChild(item);
            }
            return forecast;
        };

        const abbreviateServiceName = (name) => {
            const map = {
                NETWORK: 'NET',
                BLOOM: 'BLM',
                WITNESS: 'WIT',
                COMPACT_FILTERS: 'CF',
                NETWORK_LIMITED: 'NET-LIM',
                P2P_V2: 'P2PV2',
            };
            if (map[name]) {
                return map[name];
            }
            return String(name).replace(/_/g, '').slice(0, 4).toUpperCase();
        };

        const buildInfoTable = (rows) => {
            const table = create.element('div', { className: 'info-table' });
            for (const [label, value] of rows) {
                const row = create.element('div', { className: 'info-row' });
                row.appendChild(create.element('div', { className: 'info-label', textContent: label }));
                const valueCell = create.element('div', { className: 'info-value' });
                if (value && typeof value === 'object' && value.nodeType) {
                    valueCell.appendChild(value);
                } else {
                    valueCell.textContent = String(value);
                }
                row.appendChild(valueCell);
                table.appendChild(row);
            }
            return table;
        };

        const localServicesAbbr = localservicesnames.map((name) => abbreviateServiceName(name));
        const localServicesDisplay = localServicesAbbr.length ? localServicesAbbr.join(', ') : '—';

        const addressList = create.element('div', { className: 'address-list' });
        const addresses = localaddresses
            .map((entry) => {
                if (!entry?.address) {
                    return null;
                }
                return entry.port ? `${entry.address}:${entry.port}` : String(entry.address);
            })
            .filter(Boolean);
        if (addresses.length) {
            for (const address of addresses) {
                addressList.appendChild(create.element('div', { className: 'address-item', textContent: address }));
            }
        } else {
            addressList.appendChild(create.element('div', { className: 'address-item', textContent: '—' }));
        }

        const networkOrder = [
            ['ipv4', 'IPv4'],
            ['ipv6', 'IPv6'],
            ['onion', 'Tor'],
            ['i2p', 'I2P'],
            ['cjdns', 'CJDNS'],
        ];
        const networkMap = new Map(networks.map((network) => [network?.name, network]));
        const networkBadges = create.element('div', { className: 'network-badges' });
        for (const [key, label] of networkOrder) {
            const netEntry = networkMap.get(key);
            const reachable = netEntry?.reachable === true;
            const badge = create.element('div', {
                className: `network-badge ${reachable ? 'status-ok' : 'status-no'}`,
            });
            badge.appendChild(create.element('span', { className: 'network-label', textContent: label }));
            badge.appendChild(create.element('span', { className: 'network-status', textContent: reachable ? '✓' : 'x' }));
            networkBadges.appendChild(badge);
        }

        //
        // Small
        //
        if (size === view.BREAKPOINTS.small.name) {
            container.appendChild(create.element('div', { className: 'temp', textContent: blockheight }));
            container.appendChild(create.element('div', { className: 'desc', textContent: `Fees: ${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB` }));
            container.appendChild(create.element('div', { className: 'desc', textContent: `Mempool: ${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)} MB` }));
            container.appendChild(create.element('div', { className: 'desc', textContent: `Traffic: ↓ ${bytesrecv.toFixed(0)} | ↑ ${bytessent.toFixed(0)} MB` }));            
        }

        //
        // Medium
        //
        else if (size === view.BREAKPOINTS.medium.name) {
        }

        //
        // Large
        //
        else if (size === view.BREAKPOINTS.large.name) {

            const headline = create.element('div', { className: 'today' });
            const left = create.element('div', { className: 'left' });
            const right = create.element('div', { className: 'right' });

            left.appendChild(create.element('div', { className: 'location-header', textContent: 'Bitcoin Node' }));
            left.appendChild(create.element('div', { className: 'temp-large', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc', textContent: `Fees: ${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB`}));

            const headlineStats = [
                ['Bitcoin Version', version],
                ['Next Halving', halving],
            ];

            for (const [label, value] of headlineStats) {
                const statItem = create.element('div', { className: 'stat-item' });
                const statHeader = create.element('div', { className: 'stat-header' });
                statHeader.appendChild(create.element('span', { className: 'stat-label', textContent: label }));
                statItem.appendChild(statHeader);
                statItem.appendChild(create.element('div', { className: 'stat-value', textContent: String(value) }));
                right.appendChild(statItem);
            }

            headline.appendChild(left);
            headline.appendChild(right);
            container.appendChild(headline);

            const supplyFixed = Number.isFinite(supply) ? supply.toFixed(2) : '0.00';
            const supplyUs = supplyFixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const rows = [
                ['Connections ( ∑ / ↓ / ↑ )', `${connections} / ${connections_in} / ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)}`, 'mempool-usage'],
                ['Bytes recv / sent (MB)', `${bytesrecv.toFixed(0)} / ${bytessent.toFixed(0)}`],
                ['Coin Supply', supplyUs],
            ];

            container.appendChild(buildForecast(rows));
        }

        //
        // Full
        //
        else if (size === view.BREAKPOINTS.full.name) {
            const layout = create.element('div', { className: 'full-layout' });
            const mainColumn = create.element('div', { className: 'full-main' });
            const sideColumn = create.element('div', { className: 'full-side' });

            const headline = create.element('div', { className: 'today full-headline' });
            const left = create.element('div', { className: 'left' });
            const right = create.element('div', { className: 'right' });

            left.appendChild(create.element('div', { className: 'location-header', textContent: 'Bitcoin Node' }));
            left.appendChild(create.element('div', { className: 'temp-large', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc', textContent: `Fees: ${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB`}));

            const headlineStats = [
                ['Bitcoin Version', version],
                ['Blocks Until Next Halving', halving],
            ];

            for (const [label, value] of headlineStats) {
                const statItem = create.element('div', { className: 'stat-item' });
                const statHeader = create.element('div', { className: 'stat-header' });
                statHeader.appendChild(create.element('span', { className: 'stat-label', textContent: label }));
                statItem.appendChild(statHeader);
                statItem.appendChild(create.element('div', { className: 'stat-value', textContent: String(value) }));
                right.appendChild(statItem);
            }

            headline.appendChild(left);
            headline.appendChild(right);
            container.appendChild(headline);

            const divider = create.element('div', { className: 'full-divider' });
            container.appendChild(divider);

            const supplyFixed = Number.isFinite(supply) ? supply.toFixed(2) : '0.00';
            const supplyUs = supplyFixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const leftRows = [
                ['Connections ( ∑ / ↓ / ↑ )', `${connections} / ${connections_in} / ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)}`, 'mempool-usage'],
                ['Bytes recv / sent (MB)', `${bytesrecv.toFixed(0)} / ${bytessent.toFixed(0)}`],
                ['Coin Supply', supplyUs],
            ];

            mainColumn.appendChild(buildForecast(leftRows));


            const rightRows = [
                ['Services', localServicesDisplay],
                ['Addresses', addressList],
                ['Networks', networkBadges],
            ];
            sideColumn.appendChild(buildInfoTable(rightRows));

            layout.appendChild(mainColumn);
            layout.appendChild(sideColumn);
            container.appendChild(layout);
        }

        //
        // Failed to match any size
        //
        else {
            container.textContent = `Size "${size}" not implemented yet. Viewport: ${window.innerWidth}x${window.innerHeight}`;
            container.style.fontSize = '24px';
        }
    } catch (error) {
        console.error('Error fetching bitcoin data:', error);
        overlay.showError(error.message || 'Unexpected error while loading bitcoin data.');
    } finally {
        ready();
    }
}

main();
