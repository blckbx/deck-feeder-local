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
        const major = raw.slice(0, 2);
        const minor = raw.slice(2, 4);
        const rc = raw.slice(4, 6);
        version = rc !== '00' ? `${major}.${minor}-rc${rc}` : `${major}.${minor}`;
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

        let fees = `${min_fees} / ${med_fees} / ${max_fees}`;
     
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

            left.appendChild(create.element('div', { className: 'location-header', textContent: 'Bitcoin' }));
            left.appendChild(create.element('div', { className: 'temp-large', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc-large', textContent: `Fees: ${fees}` }));

            const headlineStats = [
                ['Bitcoin Core', version],
                //['Mempool tx', txcount],
                //['Mempool usage (MB)', (mempool_usage / 1000000).toFixed(2)],
                //['Halving (blocks)', halving],
                //['Connections', `${connections} / ${connections_in} (in) / ${connections_out} (out)`],
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

            const rows = [
                ['Connections (sum / in / out)', `${connections} / ${connections_in} / ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${(mempool_usage / 1000000).toFixed(2)} / ${(mempool_max / 1000000).toFixed(2)}`],
                ['Bytes recv (MB)', bytesrecv.toFixed(2)],
                ['Bytes sent (MB)', bytessent.toFixed(2)],
            ];

            const forecast = create.element('div', { className: 'forecast' });
            for (const [label, value] of rows) {
                const item = create.element('div', { className: 'forecast-item' });
                const dayLabel = create.element('div', { className: 'day-label' });
                dayLabel.appendChild(create.element('span', { className: 'day-name', textContent: label }));
                const range = create.element('div', { className: 'temp-range' });
                range.appendChild(create.element('span', { className: 'forecast-temp high', textContent: String(value) }));
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
