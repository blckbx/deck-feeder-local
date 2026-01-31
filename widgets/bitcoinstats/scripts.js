/// <reference path="../../sdk/v1/scripts.js" />

function normalizeBaseUrl(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

const MB_DIVISOR = 1000000;

function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
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
    const endpoints = {
        mempool: `${url}/api/mempool/summary`,
        halving: `${url}/api/blockchain/next-halving`,
        nextBlock: `${url}/api/mining/next-block`,
        coins: `${url}/api/blockchain/coins`,
        utxo: `${url}/api/blockchain/utxo-set`,
        blockchainInfo: `${url}/api/blockchaininfo`,
        netInfo: `${url}/api/networkinfo`,
        totals: `${url}/api/getnettotals`,
    };

    const keys = Object.keys(endpoints);
    const results = await Promise.allSettled(
        keys.map((key) => fetchJson(net, endpoints[key]))
    );
    const responses = Object.fromEntries(
        results.map((result, index) => [
            keys[index],
            result.status === 'fulfilled' ? result.value : null,
        ])
    );

    const mempoolRes = responses.mempool;
    const halvingRes = responses.halving;
    const nextBlockRes = responses.nextBlock;
    const coinsRes = responses.coins;
    const utxoRes = responses.utxo;
    const blockchainInfoRes = responses.blockchainInfo;
    const netInfoRes = responses.netInfo;
    const totalsRes = responses.totals;

    const blockheight = safeNumber(blockchainInfoRes?.blocks);
    const nextBlock = nextBlockRes || {};
    const min_fees = safeNumber(nextBlock.minFeeRate);
    const med_fees = safeNumber(nextBlock.medianFeeRate);
    const max_fees = safeNumber(nextBlock.maxFeeRate);

    const supply = safeNumber(coinsRes?.supply);

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
    let version = '0.0';
    if (netInfoRes?.version != null) {
        const raw = String(netInfoRes.version).padStart(6, '0');
        const major = String(parseInt(raw.slice(0, 2), 10));
        const minor = String(parseInt(raw.slice(2, 4), 10));
        const rcNum = parseInt(raw.slice(4, 6), 10);
        version = rcNum ? `${major}.${minor}-rc${rcNum}` : `${major}.${minor}`;
    }

    const bytesrecv = totalsRes?.totalbytesrecv ? totalsRes.totalbytesrecv / MB_DIVISOR : 0;
    const bytessent = totalsRes?.totalbytessent ? totalsRes.totalbytessent / MB_DIVISOR : 0;
    const utxoTxouts = safeNumber(utxoRes?.txouts);
    const chainstateDiskMb = safeNumber(utxoRes?.disk_size) / MB_DIVISOR;
    const blockchainDiskMb = safeNumber(blockchainInfoRes?.size_on_disk) / MB_DIVISOR;
    const isPruned = blockchainInfoRes?.pruned === true;
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
        version,
        bytesrecv,
        bytessent,
        utxoTxouts,
        chainstateDiskMb,
        blockchainDiskMb,
        isPruned,
    };
}

async function main() {
    const { params, select, ready, net, overlay, create, view } = sdk();

    try {
        // Template URL for btc-rpc-explorer API
        const rawUrl = params.getAny('url', 'http://lan-ip:8081/bitcoinstats/');
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
            version,
            bytesrecv,
            bytessent,
            utxoTxouts,
            chainstateDiskMb,
            blockchainDiskMb,
            isPruned,
        } = await getData({ net, url });
        const container = select.id('container');
        const size = params.size;
        const theme = (params.theme || 'light').toLowerCase();
        const classNames = [size, theme];
        if (size === view.BREAKPOINTS.full.name) {
            classNames.push('large');
        }
        container.className = classNames.join(' ');

        const mempoolUsageMb = mempool_usage / MB_DIVISOR;
        const mempoolMaxMb = mempool_max / MB_DIVISOR;
        const mempoolPercent = mempool_max > 0 ? Math.min(100, (mempool_usage / mempool_max) * 100) : 0;

        const supplyFixed = Number.isFinite(supply) ? supply.toFixed(2) : '0.00';
        const supplyUs = supplyFixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const maxSupply = 21000000;
        const supplyPercent = maxSupply > 0 ? (supply / maxSupply) * 100 : 0;

        const buildForecast = (rows) => {
            const forecast = create.element('div', { className: 'forecast' });
            for (const [label, value, kind] of rows) {
                const item = create.element('div', { className: `forecast-item${kind ? ` ${kind}` : ''}` });
                const dayLabel = create.element('div', { className: 'day-label' });
                dayLabel.appendChild(create.element('span', { className: 'day-name', textContent: label }));
                const range = create.element('div', { className: 'temp-range' });
                const valueNode = create.element('div', { className: 'forecast-temp high' });
                if (value && typeof value === 'object' && value.nodeType) {
                    valueNode.appendChild(value);
                } else {
                    valueNode.textContent = String(value);
                }
                range.appendChild(valueNode);
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

        const localServicesAbbr = localservicesnames.map((name) => abbreviateServiceName(name));
        const localServicesDisplay = localServicesAbbr.length ? localServicesAbbr.join(', ') : '—';

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
            const left = create.element('div', { className: 'left' });
            const rightWrapper = create.element('div', { className: 'right-wrapper' });
            const right = create.element('div', { className: 'right' });

            left.appendChild(create.element('div', { className: 'temp', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc', textContent: `Bitcoin Version: ${version}` }));

            const rightItems = [
                ['Fees', `${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB`],
                ['Mempool', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)} MB`],
                ['Traffic', `↓ ${bytesrecv.toFixed(0)} | ↑ ${bytessent.toFixed(0)} MB`],
            ];

            for (const [label, value] of rightItems) {
                const item = create.element('div', { className: 'hour-item' });
                item.appendChild(create.element('div', { className: 'hour-time', textContent: label }));
                item.appendChild(create.element('div', { className: 'hour-temp', textContent: value }));
                right.appendChild(item);
            }

            rightWrapper.appendChild(right);
            container.appendChild(left);
            container.appendChild(rightWrapper);
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

            const rows = [
                ['Connections', `∑ ${connections} / ↓ ${connections_in} / ↑ ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)}`, 'mempool-usage'],
                ['Bytes recv / sent (MB)', `↓ ${bytesrecv.toFixed(0)} / ↑ ${bytessent.toFixed(0)}`],
                ['Coin Supply', `${supplyUs} (${supplyPercent.toFixed(2)}%)`],
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

            const headlineStats = [
                ['Next Block Fees', `${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB`],
                ['Bitcoin Version', version],
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

            const leftRows = [
                ['Connections', `∑ ${connections} / ↓ ${connections_in} / ↑ ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)}`, 'mempool-usage'],
                ['Bytes recv / sent (MB)', `↓ ${bytesrecv.toFixed(0)} / ↑ ${bytessent.toFixed(0)}`],
                ['Coin Supply', `${supplyUs} (${supplyPercent.toFixed(2)}%)`],
            ];

            mainColumn.appendChild(buildForecast(leftRows));

            const rightRows = [
                ['Networks', networkBadges],
                ['Services', localServicesDisplay],
                ['UTXO Set', utxoTxouts.toLocaleString('en-US')],
                ['Chainstate Disk Size (MB)', chainstateDiskMb.toLocaleString('en-US', { maximumFractionDigits: 0 })],
                ['Blockchain Disk Size (MB)', blockchainDiskMb.toLocaleString('en-US', { maximumFractionDigits: 0 })],
                ['Node Type', isPruned ? 'Pruned' : 'Archival'],
            ];
            sideColumn.appendChild(buildForecast(rightRows));

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
