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
    const msg2 = `${url}/api/mempool/fees`;
    const msg3 = `${url}/api/mempool/summary`;
    const msg4 = `${url}/api/blockchain/next-halving`;
    const msg8 = `${url}/api/networkinfo`;
    const msg9 = `${url}/api/getnettotals`;

    const results = await Promise.allSettled([
        fetchJson(net, msg1),
        fetchJson(net, msg2),
        fetchJson(net, msg3),
        fetchJson(net, msg4),
        fetchJson(net, msg8),
        fetchJson(net, msg9),
    ]);

    const tipRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const feesRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const mempoolRes = results[2].status === 'fulfilled' ? results[2].value : null;
    const halvingRes = results[3].status === 'fulfilled' ? results[3].value : null;
    const netInfoRes = results[4].status === 'fulfilled' ? results[4].value : null;
    const totalsRes = results[5].status === 'fulfilled' ? results[5].value : null;

    const blockheight = typeof tipRes?.height === 'number' ? tipRes.height : 0;
    const nextBlock = feesRes?.nextBlock || {};
    const min_fees = nextBlock.min ?? "0";
    const med_fees = nextBlock.median ?? "0";
    const max_fees = nextBlock.max ?? 0;

    const mempool_max = mempoolRes?.maxmempool ?? mempoolRes?.maxMempool ?? mempoolRes?.maxMemPool ?? 0;
    const mempool_usage = mempoolRes?.usage ?? 0;
    const txcount = mempoolRes?.size ?? 0;
    const halving = halvingRes?.blocksUntilNextHalving ?? 0;

    const connections = netInfoRes?.connections ?? 0;
    const connections_out = netInfoRes?.connections_out ?? 0;
    const connections_in = netInfoRes?.connections_in ?? 0;
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
        txcount,
        halving,
        connections,
        connections_out,
        connections_in,
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
            txcount,
            halving,
            connections,
            connections_out,
            connections_in,
            version,
            bytesrecv,
            bytessent,
        } = await getData({ net, url });

    
        const container = select.id('container');
        const size = params.size;
        const theme = (params.theme || 'light').toLowerCase();
        container.className = `${size} ${theme}`;

        //
        // Small
        //
        if (size === view.BREAKPOINTS.small.name) {
            container.appendChild(
                create.element('div', { className: 'temp', textContent: blockheight })
            );
            container.appendChild(create.element('div', { className: 'desc', textContent: fees }));
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

            const today = create.element('div', { className: 'today' });
            const left = create.element('div', { className: 'left' });
            const right = create.element('div', { className: 'right' });

            left.appendChild(create.element('div', { className: 'location-header', textContent: 'Bitcoin Node' }));
            left.appendChild(create.element('div', { className: 'temp-large', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc-large', textContent: `Fees: ${min_fees} / ${med_fees} / ${max_fees} sat/vB`}));

            const headlineStats = [
                ['Bitcoin Core', version],
            ];

            for (const [label, value] of headlineStats) {
                const statItem = create.element('div', { className: 'stat-item' });
                const statHeader = create.element('div', { className: 'stat-header' });
                statHeader.appendChild(create.element('span', { className: 'stat-label', textContent: label }));
                statItem.appendChild(statHeader);
                statItem.appendChild(create.element('div', { className: 'stat-value', textContent: String(value) }));
                right.appendChild(statItem);
            }

            today.appendChild(left);
            today.appendChild(right);
            container.appendChild(today);

            const mempoolUsageMb = mempool_usage / 1000000;
            const mempoolMaxMb = mempool_max / 1000000;
            const mempoolPercent = mempool_max > 0 ? Math.min(100, (mempool_usage / mempool_max) * 100) : 0;

            const rows = [
                ['Connections (∑ / ↓ / ↑)', `${connections} / ${connections_in} / ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)}`, 'mempool-usage'],
                ['Bytes recv / sent (MB)', `${bytesrecv.toFixed(0)} / ${bytessent.toFixed(0)}`],
            ];

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
            container.appendChild(forecast);
        }

        //
        // Full
        //
        else if (size === view.BREAKPOINTS.full.name) {
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
