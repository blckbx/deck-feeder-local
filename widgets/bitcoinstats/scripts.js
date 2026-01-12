/// <reference path="../../sdk/v1/scripts.js" />

async function getData({ url }) {
    let blockheight = 0;
    let min_fees = "0";
    let med_fees = "0";
    let max_fees = 0;
    let satsperdollar = 0;
    let usdprice = 0;
    let satspereur = 0;
    let eurprice = 0;
    let halving = 0;
    let txcount = 0;
    let hashrate = "0";
    let mempool_max = 0;
    let mempool_usage = 0;
    let supply = "0";
    let connections = 0;
    let connections_in = 0;
    let connections_out = 0;
    let version = "0";
    let bytesrecv = 0;
    let bytessent = 0;

    let msg1 = `${url}/api/blocks/tip`;
    let msg2 = `${url}/api/mempool/fees`;
    let msg3 = `${url}/api/mempool/summary`;
    let msg4 = `${url}/api/blockchain/next-halving`;
    let msg5 = `${url}/api/mining/hashrate`;
    let msg6 = `${url}/api/blockchain/coins`;
    let msg7 = `${url}/api/mining/next-block`;
    let msg8 = `${url}/api/networkinfo`;
    let msg9 = `${url}/api/getnettotals`;

    /*
    const response1 = await net.fetch(msg1, { agent: httpsAgent });

    if (response1.ok) {
        let res = await response1.json();
        blockheight = res.height;
    }

    const response2 = await net.fetch(msg2, { agent: httpsAgent });

    if (response2.ok) {
        let res = await response2.json();
        min_fees = res.nextBlock.min;
        med_fees = res.nextBlock.median;
        max_fees = res.nextBlock.max;
    }
    */

    /*
    if (msg2.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data (msg2.response_body.data, -1);

        var root_object = parser.get_root ().get_object ();
        var next_block = root_object.get_object_member ("nextBlock");
        min_fees = next_block.get_int_member ("min");
        max_fees = next_block.get_int_member ("max");
        med_fees = (int) next_block.get_int_member ("median");
    }
    */

    //session_internal.send_message(msg3);

    /*
    if (msg3.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data (msg3.response_body.data, -1);

        var root_object = parser.get_root ().get_object ();
        txcount = root_object.get_int_member ("size");
        mempool_max = root_object.get_int_member ("maxmempool") / 1000000;
        mempool_usage = root_object.get_int_member ("usage") / 1000000;
    }
    */                

    //session_internal.send_message(msg4);

    /*
    if (msg4.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data (msg4.response_body.data, -1);
        var root_object = parser.get_root ().get_object ();
        halving = root_object.get_int_member("blocksUntilNextHalving");
    }

    /*
    session_internal.send_message(msg5);

    if (msg5.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data((string)msg5.response_body.data, -1);
        var root_object = parser.get_root ().get_object ();
        var week = root_object.get_object_member ("7Day");
        double value = week.get_double_member ("val");
        GLib.Intl.setlocale(GLib.LocaleCategory.ALL, "us_US.UTF-8");
        string unitAbb = (string) week.get_string_member ("unitAbbreviation");
        hashrate = "%'0.2f".printf(value) + " " + unitAbb;
    }

                
    session_internal.send_message(msg6);

    if (msg6.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data ((string)msg6.response_body.data, -1);
        var root_object = parser.get_root ().get_object ();
        double tmp = double.parse(root_object.get_string_member ("supply"));
        GLib.Intl.setlocale(GLib.LocaleCategory.ALL, "us_US.UTF-8");
        supply = "%'0.2f".printf(tmp);
    }
    */

    //session_internal.send_message(msg7);

    /*
    if (msg7.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data (msg7.response_body.data, -1);
        var root_object = parser.get_root ().get_object ();
        minFeeRate = root_object.get_double_member ("minFeeRate");
        medFeeRate = root_object.get_double_member ("medianFeeRate");
        GLib.Intl.setlocale(GLib.LocaleCategory.ALL, "us_US.UTF-8");
        min_fees = "%'0.2f".printf(minFeeRate);
        med_fees = "%'0.2f".printf(medFeeRate);
    }

    //session_internal.send_message(msg8);

    if (msg8.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data (msg8.response_body.data, -1);
        var root_object = parser.get_root ().get_object ();                    
        connections = root_object.get_int_member ("connections");
        connections_out = root_object.get_int_member ("connections_out");
        connections_in = root_object.get_int_member ("connections_in");
        tmp_version = (root_object.get_int_member ("version")).to_string();
        major = tmp_version.substring(0, 2);
        minor = tmp_version.substring(3, 1);
        rc = tmp_version.substring(5, 1);
        if (rc != "0") {
            version = "%s.%s-rc%s".printf(major, minor, rc);
        } else {
            version = "%s.%s".printf(major, minor);
        }
    }

    //session_internal.send_message(msg9);

    if (msg9.status_code == 200) {
        var parser = new Json.Parser ();
        parser.load_from_data (msg9.response_body.data, -1);
        var root_object = parser.get_root ().get_object ();                    
        bytesrecv = root_object.get_int_member ("totalbytesrecv") / 1000000;
        bytessent = root_object.get_int_member ("totalbytessent") / 1000000;
     }
        
     */

     //session_internal.abort();

    let results = [blockheight];
    return results;
}

class WidgetInputError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WidgetInputError';
    }
}

async function main() {
    const { params, select, ready, net, overlay, create, view } = sdk();

    try {
        // Template URL for btc-rpc-explorer API
        const url = params.getAny('url', 'http://host.docker.internal:3002');

        const response = await net.fetch(`${url}/api/blocks/tip`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} from ${url}`);
        }
        const res = await response.json();
        let blockheight = 0;
        blockheight = res.height;
     
        const container = select.id('container');
        const size = params.size;
        container.className = `${size} ${params.theme.toLowerCase()}`;

        //
        // Small
        //
        if (size === view.BREAKPOINTS.small.name) {
            container.appendChild(
                create.element('div', { className: 'temp', textContent: blockheight })
            );
            container.appendChild(create.element('div', { className: 'desc', textContent: 'hello' }));
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
        if (error instanceof WidgetInputError) {
            overlay.showError(error.message);
        } else {
            console.error('Error fetching bitcoin data:', error);
            overlay.showError(error.message || 'Unexpected error while loading bitcoin data.');
        }
    } finally {
        ready();
    }
}

main();
