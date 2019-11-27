import { SDKFactory } from "dav-js";
import { NeedFilterParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const identity = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'charger')).toString());

async function main() {

    const DAV = SDKFactory({
        apiSeedUrls: ['http://localhost:8080'],
        kafkaSeedUrls: ['localhost:9092'],
        ethNodeUrl: wallet.nodeUrl
    });

    const charger = await DAV.getIdentity(identity.address);
    console.log('Charger', charger);

    const needFilterParams = new NeedFilterParams({
        location: {
            lat: 32.050382,
            long: 34.766149
        },
        radius: 1000,
    });
    const needs = await charger.needsForType(needFilterParams);
    console.log('Waiting for Needs...', needs.topic);
    needs.subscribe(need => {
        console.log('Need', need);
    });
}

main().then(() => { }, (err) => { console.error('Failed', err); process.exit(0); });
